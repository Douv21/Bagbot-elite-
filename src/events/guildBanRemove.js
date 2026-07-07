const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban, client) {
    const logEmbed = new EmbedBuilder()
      .setTitle('🔓 Membre Débanni')
      .setDescription(`**Utilisateur :** ${ban.user.tag} (<@${ban.user.id}>)\n**ID :** ${ban.user.id}`)
      .setColor('#2ECC71')
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    sendLog(ban.guild, 'moderation', logEmbed);
  }
};
