const { db } = require('../database/db');

module.exports = {
  name: 'messageReactionRemove',
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
      // Retirer la réaction retire le rôle
      if (member.roles.cache.has(option.role_id)) {
        await member.roles.remove(option.role_id).catch(console.error);
      }
    } else if (mode === 'verify') {
      // Mode définitif : retirer la réaction ne retire pas le rôle
      return;
    } else if (mode === 'reversed') {
      // Mode inversé : retirer la réaction donne le rôle
      if (!member.roles.cache.has(option.role_id)) {
        await member.roles.add(option.role_id).catch(console.error);
      }
    } else {
      // Mode normal : retirer la réaction retire le rôle
      if (member.roles.cache.has(option.role_id)) {
        await member.roles.remove(option.role_id).catch(console.error);
      }
    }
  }
};
