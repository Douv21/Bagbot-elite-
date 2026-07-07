const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'channelUpdate',
  async execute(oldChannel, newChannel, client) {
    if (!oldChannel.guild) return;

    const changes = [];
    if (oldChannel.name !== newChannel.name) {
      changes.push(`**Nom :** \`#${oldChannel.name}\` ➡️ \`#${newChannel.name}\``);
    }
    if (oldChannel.topic !== newChannel.topic) {
      const oldTopic = oldChannel.topic || '*Aucun sujet*';
      const newTopic = newChannel.topic || '*Aucun sujet*';
      changes.push(`**Description (Sujet) :**\nAncien : \`${oldTopic}\`\nNouveau : \`${newTopic}\``);
    }
    if (oldChannel.nsfw !== newChannel.nsfw) {
      changes.push(`**NSFW :** \`${oldChannel.nsfw ? 'Activé' : 'Désactivé'}\` ➡️ \`${newChannel.nsfw ? 'Activé' : 'Désactivé'}\``);
    }
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      changes.push(`**Mode lent :** \`${oldChannel.rateLimitPerUser}s\` ➡️ \`${newChannel.rateLimitPerUser}s\``);
    }
    if (oldChannel.parentId !== newChannel.parentId) {
      const oldCategory = oldChannel.parent ? oldChannel.parent.name : 'Aucune catégorie';
      const newCategory = newChannel.parent ? newChannel.parent.name : 'Aucune catégorie';
      changes.push(`**Catégorie parente :** \`${oldCategory}\` ➡️ \`${newCategory}\``);
    }

    if (changes.length === 0) return;

    let moderator = 'Inconnu';
    try {
      const fetchedLogs = await newChannel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelUpdate,
      });
      const channelLog = fetchedLogs.entries.first();
      if (channelLog && channelLog.target.id === newChannel.id) {
        moderator = `<@${channelLog.executor.id}> (${channelLog.executor.tag})`;
      }
    } catch (e) {
      console.error(e);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('📝 Salon Modifié')
      .setDescription(`**Salon :** <#${newChannel.id}> (\`#${newChannel.name}\`)\n**ID :** ${newChannel.id}\n**Modérateur :** ${moderator}\n\n**Modifications :**\n${changes.join('\n')}`)
      .setColor('#E67E22')
      .setTimestamp();

    sendLog(newChannel.guild, 'structure', logEmbed);
  }
};
