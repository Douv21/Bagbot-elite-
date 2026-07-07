const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;

    const typeLabels = {
      0: 'Texte',
      2: 'Vocal',
      4: 'Catégorie',
      5: 'Annonce',
      13: 'Stage',
      15: 'Forum'
    };

    const typeLabel = typeLabels[channel.type] || 'Inconnu';

    let moderator = 'Inconnu';
    try {
      const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete,
      });
      const channelLog = fetchedLogs.entries.first();
      if (channelLog && channelLog.target.id === channel.id) {
        moderator = `<@${channelLog.executor.id}> (${channelLog.executor.tag})`;
      }
    } catch (e) {
      console.error(e);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('🗑️ Salon Supprimé')
      .setDescription(`**Nom :** \`#${channel.name}\`\n**Type :** ${typeLabel}\n**ID :** ${channel.id}\n**Supprimé par :** ${moderator}`)
      .setColor('#E74C3C')
      .setTimestamp();

    sendLog(channel.guild, 'channelUpdate', logEmbed);
  }
};
