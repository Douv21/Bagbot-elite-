const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'roleCreate',
  async execute(role, client) {
    let moderator = 'Inconnu';
    try {
      const fetchedLogs = await role.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleCreate,
      });
      const roleLog = fetchedLogs.entries.first();
      if (roleLog && roleLog.target.id === role.id) {
        moderator = `<@${roleLog.executor.id}> (${roleLog.executor.tag})`;
      }
    } catch (e) {
      console.error(e);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('🛡️ Rôle Créé')
      .setDescription(`**Nom :** ${role.name} (<@&${role.id}>)\n**Couleur :** \`${role.hexColor}\`\n**ID :** ${role.id}\n**Créé par :** ${moderator}`)
      .setColor('#2ECC71')
      .setTimestamp();

    sendLog(role.guild, 'roleUpdate', logEmbed);
  }
};
