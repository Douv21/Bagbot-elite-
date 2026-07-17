const { db } = require('../database/db');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user, client) {
    if (user.bot) return;

    // Charger les partials si nécessaire
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        console.error('Error fetching reaction partial:', err);
        return;
      }
    }

    const messageId = reaction.message.id;
    const guildId = reaction.message.guildId;
    if (!guildId) return;

    // (Système de copie d'émoji par réaction retiré à la demande de l'utilisateur)

    // Vérifier si ce message est enregistré comme un rôle réaction
    const embedRule = db.prepare('SELECT type, mode FROM autorole_embeds WHERE message_id = ?').get(messageId);
    if (!embedRule || embedRule.type !== 'reactions') return;

    const emojiStr = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const option = db.prepare('SELECT role_id FROM autorole_options WHERE message_id = ? AND (emoji = ? OR emoji = ?)').get(messageId, emojiStr, reaction.emoji.name);
    
    if (!option) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const botMember = guild.members.me;
    const role = guild.roles.cache.get(option.role_id);
    if (!role || role.position >= botMember.roles.highest.position) return;

    const mode = embedRule.mode || 'normal';

    if (mode === 'unique') {
      // Retirer les autres rôles du même message
      const allOptions = db.prepare('SELECT role_id FROM autorole_options WHERE message_id = ?').all(messageId);
      const rolesToRemove = allOptions.map(o => o.role_id).filter(r => r !== option.role_id && member.roles.cache.has(r));
      
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove).catch(console.error);
      }
      if (!member.roles.cache.has(option.role_id)) {
        await member.roles.add(option.role_id).catch(console.error);
      }
      
      // Retirer les autres réactions de l'utilisateur sur ce message pour garder la cohérence visuelle
      const userReactions = reaction.message.reactions.cache.filter(r => r.emoji.name !== reaction.emoji.name);
      for (const r of userReactions.values()) {
        await r.users.remove(user.id).catch(() => {});
      }
    } else if (mode === 'verify') {
      if (!member.roles.cache.has(option.role_id)) {
        await member.roles.add(option.role_id).catch(console.error);
      }
    } else if (mode === 'reversed') {
      // Mode inversé : réagir retire le rôle
      if (member.roles.cache.has(option.role_id)) {
        await member.roles.remove(option.role_id).catch(console.error);
      }
    } else {
      // Mode normal : réagir donne le rôle
      if (!member.roles.cache.has(option.role_id)) {
        await member.roles.add(option.role_id).catch(console.error);
      }
    }
  }
};
