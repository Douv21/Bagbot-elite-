const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'roleUpdate',
  async execute(oldRole, newRole, client) {
    const changes = [];
    if (oldRole.name !== newRole.name) {
      changes.push(`**Nom :** \`${oldRole.name}\` ➡️ \`${newRole.name}\``);
    }
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push(`**Couleur :** \`${oldRole.hexColor}\` ➡️ \`${newRole.hexColor}\``);
    }
    if (oldRole.hoist !== newRole.hoist) {
      changes.push(`**Affiché séparément :** \`${oldRole.hoist ? 'Oui' : 'Non'}\` ➡️ \`${newRole.hoist ? 'Oui' : 'Non'}\``);
    }
    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push(`**Mentionnable :** \`${oldRole.mentionable ? 'Oui' : 'Non'}\` ➡️ \`${newRole.mentionable ? 'Oui' : 'Non'}\``);
    }
    if (!oldRole.permissions.equals(newRole.permissions)) {
      changes.push(`**Permissions modifiées** (les permissions de ce rôle ont été éditées)`);
    }

    if (changes.length === 0) return;

    let moderator = 'Inconnu';
    try {
      const fetchedLogs = await newRole.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleUpdate,
      });
      const roleLog = fetchedLogs.entries.first();
      if (roleLog && roleLog.target.id === newRole.id) {
        moderator = `<@${roleLog.executor.id}> (${roleLog.executor.tag})`;
      }
    } catch (e) {
      console.error(e);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('📝 Rôle Modifié')
      .setDescription(`**Rôle :** <@&${newRole.id}> (${newRole.name})\n**ID :** ${newRole.id}\n**Modérateur :** ${moderator}\n\n**Modifications :**\n${changes.join('\n')}`)
      .setColor('#E67E22')
      .setTimestamp();

    sendLog(newRole.guild, 'roleUpdate', logEmbed);
  }
};
