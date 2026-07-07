const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'messageDeleteBulk',
  async execute(messages, channel, client) {
    if (!channel.guild) return;

    // Sort messages chronologically
    const sortedMessages = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Create transcript content
    let transcript = `TRANSCRIPT DE SUPPRESSION GROUPÉE\n`;
    transcript += `Serveur : ${channel.guild.name} (${channel.guild.id})\n`;
    transcript += `Salon : #${channel.name} (${channel.id})\n`;
    transcript += `Messages supprimés : ${messages.size}\n`;
    transcript += `Généré le : ${new Date().toLocaleString('fr-FR')}\n`;
    transcript += `========================================================================\n\n`;

    let botsCount = 0;
    sortedMessages.forEach(msg => {
      const time = msg.createdAt ? msg.createdAt.toLocaleString('fr-FR') : 'Date inconnue';
      const authorName = msg.author ? `${msg.author.tag} (${msg.author.id})` : 'Auteur inconnu';
      if (msg.author && msg.author.bot) botsCount++;
      const content = msg.content || '*Contenu indisponible (Embed ou Fichier)*';
      transcript += `[${time}] ${authorName} :\n${content}\n------------------------------------------------------------------------\n`;
    });

    const buffer = Buffer.from(transcript, 'utf-8');
    const filename = `bulk-delete-${channel.id}-${Date.now()}.txt`;
    const file = new AttachmentBuilder(buffer, { name: filename });

    const logEmbed = new EmbedBuilder()
      .setTitle('🗑️ Suppression Groupée')
      .setDescription(`**Salon :** <#${channel.id}> (\`#${channel.name}\`)\n**Messages supprimés :** ${messages.size}\n**Messages de bots :** ${botsCount}`)
      .setColor('#FF0000')
      .setTimestamp();

    sendLog(channel.guild, 'messageDeleteBulk', logEmbed, { files: [file] });
  }
};
