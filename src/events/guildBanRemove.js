const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban, client) {
    let moderator = 'Inconnu';
    try {
      const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanRemove,
      });
      const unbanLog = fetchedLogs.entries.first();
      if (unbanLog && unbanLog.target.id === ban.user.id) {
        moderator = `<@${unbanLog.executor.id}> (${unbanLog.executor.tag})`;
      }
    } catch (e) {
      console.error(e);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('🔓 Membre Débanni')
      .setDescription(`**Utilisateur :** ${ban.user.tag} (<@${ban.user.id}>)\n**ID :** ${ban.user.id}\n**Modérateur :** ${moderator}`)
      .setColor('#2ECC71')
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    sendLog(ban.guild, 'moderation', logEmbed);
  }
};
