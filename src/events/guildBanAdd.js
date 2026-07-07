const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    let moderator = 'Inconnu';
    try {
      const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd,
      });
      const banLog = fetchedLogs.entries.first();
      if (banLog && banLog.target.id === ban.user.id) {
        moderator = `<@${banLog.executor.id}> (${banLog.executor.tag})`;
      }
    } catch (e) {
      console.error(e);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('🔨 Membre Banni')
      .setDescription(`**Utilisateur :** ${ban.user.tag} (<@${ban.user.id}>)\n**ID :** ${ban.user.id}\n**Modérateur :** ${moderator}\n**Raison :** ${ban.reason || 'Aucune raison fournie'}`)
      .setColor('#E74C3C')
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    sendLog(ban.guild, 'moderation', logEmbed);
  }
};
