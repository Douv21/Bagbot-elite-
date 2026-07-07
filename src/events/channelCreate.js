const { EmbedBuilder } = require('discord.js');
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

    const logEmbed = new EmbedBuilder()
      .setTitle('📁 Salon Créé')
      .setDescription(`**Nom :** \`#${channel.name}\` (<#${channel.id}>)\n**Type :** ${typeLabel}\n**ID :** ${channel.id}`)
      .setColor('#2ECC71')
      .setTimestamp();

    sendLog(channel.guild, 'channelUpdate', logEmbed);
  }
};
