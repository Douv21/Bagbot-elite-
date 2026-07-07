const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    const logEmbed = new EmbedBuilder()
      .setTitle('🗑️ Rôle Supprimé')
      .setDescription(`**Nom :** ${role.name}\n**Couleur :** \`${role.hexColor}\`\n**ID :** ${role.id}`)
      .setColor('#E74C3C')
      .setTimestamp();

    sendLog(role.guild, 'roleUpdate', logEmbed);
  }
};
