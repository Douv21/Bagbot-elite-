const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild) return;
    const authorTag = message.author ? message.author.tag : 'Inconnu';
    const authorMention = message.author ? `<@${message.author.id}>` : 'Inconnu';
    const isBot = message.author ? message.author.bot : false;

    let deleteDetails = '';
    if (message.author) {
      try {
        const fetchedLogs = await message.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MessageDelete,
        });
        const deleteLog = fetchedLogs.entries.first();
        if (deleteLog) {
          const targetMatches = deleteLog.target && deleteLog.target.id === message.author.id;
          const channelMatches = deleteLog.extra.channel.id === message.channel.id;
          const isRecent = Date.now() - deleteLog.createdTimestamp < 5000;
          if (targetMatches && channelMatches && isRecent) {
            deleteDetails = `\n**Supprimé par :** <@${deleteLog.executor.id}> (${deleteLog.executor.tag})`;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('🗑️ Message Supprimé')
      .setDescription(`**Auteur :** ${authorMention} (${authorTag})\n**Salon :** <#${message.channel.id}>${deleteDetails}\n**Message :**\n${message.content || '*Contenu indisponible (Embed ou Fichier)*'}`)
      .setColor('#FF0000')
      .setTimestamp();

    sendLog(message.guild, 'messageDelete', logEmbed, { isBot });
  }
};
