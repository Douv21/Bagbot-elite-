const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'channelCreate',
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
        type: AuditLogEvent.ChannelCreate,
      });
      const channelLog = fetchedLogs.entries.first();
      if (channelLog && channelLog.target.id === channel.id) {
        moderator = `<@${channelLog.executor.id}> (${channelLog.executor.tag})`;
      }
    } catch (e) {
      console.error(e);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('📁 Salon Créé')
      .setDescription(`**Nom :** \`#${channel.name}\` (<#${channel.id}>)\n**Type :** ${typeLabel}\n**ID :** ${channel.id}\n**Créé par :** ${moderator}`)
      .setColor('#2ECC71')
      .setTimestamp();

    sendLog(channel.guild, 'channelUpdate', logEmbed);
  }
};
