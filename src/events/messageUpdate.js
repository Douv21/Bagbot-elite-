const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!oldMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;

    const authorTag = oldMessage.author ? oldMessage.author.tag : 'Inconnu';
    const authorMention = oldMessage.author ? `<@${oldMessage.author.id}>` : 'Inconnu';
    const isBot = oldMessage.author ? oldMessage.author.bot : false;

    const logEmbed = new EmbedBuilder()
      .setTitle('✏️ Message Modifié')
      .setDescription(`**Auteur :** ${authorMention} (${authorTag})\n**Salon :** <#${oldMessage.channel.id}>\n\n**Avant :**\n${oldMessage.content || '*Vide*'}\n\n**Après :**\n${newMessage.content || '*Vide*'}`)
      .setColor('#FFFF00')
      .setTimestamp();

    sendLog(oldMessage.guild, 'messageUpdate', logEmbed, { isBot });
  }
};
