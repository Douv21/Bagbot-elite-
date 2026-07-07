const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'roleCreate',
  async execute(role, client) {
    const logEmbed = new EmbedBuilder()
      .setTitle('🛡️ Rôle Créé')
      .setDescription(`**Nom :** ${role.name} (<@&${role.id}>)\n**Couleur :** \`${role.hexColor}\`\n**ID :** ${role.id}`)
      .setColor('#2ECC71')
      .setTimestamp();

    sendLog(role.guild, 'roleUpdate', logEmbed);
  }
};
