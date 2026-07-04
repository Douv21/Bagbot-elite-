const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (oldMessage.author?.bot || !oldMessage.guild) return;
    if (oldMessage.content === newMessage.content) return; // Par exemple si seul un embed est modifié

    const logEmbed = new EmbedBuilder()
      .setTitle('✏️ Message Modifié')
      .setDescription(`**Auteur :** <@${oldMessage.author.id}> (${oldMessage.author.tag})\n**Salon :** <#${oldMessage.channel.id}>\n\n**Avant :**\n${oldMessage.content || '*Vide*'}\n\n**Après :**\n${newMessage.content || '*Vide*'}`)
      .setColor('#FFFF00')
      .setTimestamp();

    sendLog(oldMessage.guild, 'messageUpdate', logEmbed);
  }
};
