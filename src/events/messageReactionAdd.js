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

    // --- Système de copie automatique d'émoji par réaction (Admin unique) ---
    try {
      const guild = reaction.message.guild;
      const member = await guild.members.fetch(user.id).catch(() => null);
      
      if (member && (member.permissions.has('ManageGuildExpressions') || member.permissions.has('Administrator'))) {
        // Cas A : L'Admin réagit avec un émoji personnalisé externe (qui n'est pas déjà sur le serveur)
        if (reaction.emoji.id && !guild.emojis.cache.has(reaction.emoji.id)) {
          const isAnimated = reaction.emoji.animated;
          const emojiUrl = `https://cdn.discordapp.com/emojis/${reaction.emoji.id}.${isAnimated ? 'gif' : 'png'}`;
          const cleanName = reaction.emoji.name.replace(/[^a-zA-Z0-9_]/g, '');

          // Télécharger et créer
          const res = await fetch(emojiUrl);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            await guild.emojis.create({ attachment: buffer, name: cleanName });
            
            const channel = reaction.message.channel;
            await channel.send({ content: `✅ Émoji externe **:${cleanName}:** cloné avec succès par <@${user.id}> !` }).then(msg => {
              setTimeout(() => msg.delete().catch(() => {}), 5000);
            }).catch(() => {});
          }
        }
        
        // Cas B : L'Admin réagit avec ➕ ou 📥 sur un message pour en copier les émojis
        if (reaction.emoji.name === '➕' || reaction.emoji.name === '📥') {
          const emojiRegex = /<?(a)?:[a-zA-Z0-9_]+:([0-9]+)>/g;
          const matches = [...reaction.message.content.matchAll(emojiRegex)];
          
          if (matches.length > 0) {
            let copiedCount = 0;
            for (const match of matches) {
              const isAnimated = !!match[1];
              const emojiId = match[2];
              const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;
              
              const nameMatch = match[0].match(/:([a-zA-Z0-9_]+):/);
              const cleanName = nameMatch ? nameMatch[1] : `emoji_${emojiId}`;

              const res = await fetch(emojiUrl);
              if (res.ok) {
                const buffer = Buffer.from(await res.arrayBuffer());
                await guild.emojis.create({ attachment: buffer, name: cleanName });
                copiedCount++;
              }
            }
            if (copiedCount > 0) {
              const channel = reaction.message.channel;
              await channel.send({ content: `✅ **${copiedCount}** émoji(s) cloné(s) avec succès par <@${user.id}> !` }).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 5000);
              }).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      console.error('Erreur clonage émoji par réaction:', e);
    }

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
