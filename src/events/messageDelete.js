const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (message.author?.bot || !message.guild) return;

    const logEmbed = new EmbedBuilder()
      .setTitle('🗑️ Message Supprimé')
      .setDescription(`**Auteur :** <@${message.author.id}> (${message.author.tag})\n**Salon :** <#${message.channel.id}>\n**Message :**\n${message.content || '*Contenu indisponible (Embed ou Fichier)*'}`)
      .setColor('#FF0000')
      .setTimestamp();

    sendLog(message.guild, 'messageDelete', logEmbed);
  }
};
