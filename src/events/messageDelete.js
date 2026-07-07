const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild) return;
    const authorTag = message.author ? message.author.tag : 'Inconnu';
    const authorMention = message.author ? `<@${message.author.id}>` : 'Inconnu';
    const isBot = message.author ? message.author.bot : false;

    const logEmbed = new EmbedBuilder()
      .setTitle('🗑️ Message Supprimé')
      .setDescription(`**Auteur :** ${authorMention} (${authorTag})\n**Salon :** <#${message.channel.id}>\n**Message :**\n${message.content || '*Contenu indisponible (Embed ou Fichier)*'}`)
      .setColor('#FF0000')
      .setTimestamp();

    sendLog(message.guild, 'messageDelete', logEmbed, { isBot });
  }
};
