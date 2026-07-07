const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    let moderator = 'Inconnu';
    try {
      const fetchedLogs = await role.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleDelete,
      });
      const roleLog = fetchedLogs.entries.first();
      if (roleLog && roleLog.target.id === role.id) {
        moderator = `<@${roleLog.executor.id}> (${roleLog.executor.tag})`;
      }
    } catch (e) {
      console.error(e);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('🗑️ Rôle Supprimé')
      .setDescription(`**Nom :** ${role.name}\n**Couleur :** \`${role.hexColor}\`\n**ID :** ${role.id}\n**Supprimé par :** ${moderator}`)
      .setColor('#E74C3C')
      .setTimestamp();

    sendLog(role.guild, 'roleUpdate', logEmbed);
  }
};
