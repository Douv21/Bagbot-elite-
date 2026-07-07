const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    const logEmbed = new EmbedBuilder()
      .setTitle('🔨 Membre Banni')
      .setDescription(`**Utilisateur :** ${ban.user.tag} (<@${ban.user.id}>)\n**ID :** ${ban.user.id}\n**Raison :** ${ban.reason || 'Aucune raison fournie'}`)
      .setColor('#E74C3C')
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    sendLog(ban.guild, 'moderation', logEmbed);
  }
};
