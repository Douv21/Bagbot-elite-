const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/helpers');

module.exports = {
  name: 'guildUpdate',
  async execute(oldGuild, newGuild, client) {
    const changes = [];
    if (oldGuild.name !== newGuild.name) {
      changes.push(`**Nom du serveur :** \`${oldGuild.name}\` ➡️ \`${newGuild.name}\``);
    }
    if (oldGuild.icon !== newGuild.icon) {
      changes.push(`**Icône du serveur modifiée**`);
    }
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
      changes.push(`**Niveau de vérification :** \`${oldGuild.verificationLevel}\` ➡️ \`${newGuild.verificationLevel}\``);
    }
    if (oldGuild.premiumTier !== newGuild.premiumTier) {
      changes.push(`**Niveau de Boost :** Niveau \`${oldGuild.premiumTier}\` ➡️ Niveau \`${newGuild.premiumTier}\``);
    }

    if (changes.length === 0) return;

    let moderator = 'Inconnu';
    try {
      const fetchedLogs = await newGuild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.GuildUpdate,
      });
      const guildLog = fetchedLogs.entries.first();
      if (guildLog) {
        moderator = `<@${guildLog.executor.id}> (${guildLog.executor.tag})`;
      }
    } catch (e) {
      console.error(e);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('📝 Serveur Modifié')
      .setDescription(`**ID du serveur :** ${newGuild.id}\n**Modérateur :** ${moderator}\n\n**Modifications :**\n${changes.join('\n')}`)
      .setColor('#E67E22')
      .setTimestamp();

    sendLog(newGuild, 'structure', logEmbed);
  }
};
