const { EmbedBuilder } = require('discord.js');
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

    const logEmbed = new EmbedBuilder()
      .setTitle('🗑️ Salon Supprimé')
      .setDescription(`**Nom :** \`#${channel.name}\`\n**Type :** ${typeLabel}\n**ID :** ${channel.id}`)
      .setColor('#E74C3C')
      .setTimestamp();

    sendLog(channel.guild, 'channelUpdate', logEmbed);
  }
};
