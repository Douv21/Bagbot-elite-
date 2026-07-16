const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-autoroles')
    .setDescription("Synchroniser rétroactivement les liaisons d'auto-rôles pour tous les membres")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const guildId = guild.id;

    try {
      const triggerRoles = db.prepare('SELECT trigger_role_id, target_role_id FROM autoroles_on_role WHERE guild_id = ?').all(guildId);
      if (triggerRoles.length === 0) {
        return interaction.editReply({ content: "❌ Aucune liaison d'auto-rôle n'est configurée sur ce serveur." });
      }

      // Récupérer tous les membres
      const members = await guild.members.fetch();
      const botMember = guild.members.me;
      let syncCount = 0;
      let errorCount = 0;

      for (const member of members.values()) {
        if (member.user.bot) continue;

        for (const rule of triggerRoles) {
          // Si le membre a le rôle déclencheur
          if (member.roles.cache.has(rule.trigger_role_id)) {
            // Mais n'a pas le rôle cible
            if (!member.roles.cache.has(rule.target_role_id)) {
              const targetRole = guild.roles.cache.get(rule.target_role_id);
              if (targetRole && targetRole.position < botMember.roles.highest.position) {
                try {
                  await member.roles.add(rule.target_role_id);
                  syncCount++;
                } catch (e) {
                  errorCount++;
                }
              }
            }
          }
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('🔄 Synchronisation des Auto-Rôles Terminée')
        .setDescription(`La vérification rétroactive des liaisons d'auto-rôles est terminée.`)
        .addFields(
          { name: 'Règles appliquées', value: `\`${triggerRoles.length}\``, inline: true },
          { name: 'Rôles attribués', value: `\`${syncCount}\``, inline: true },
          { name: 'Échecs (permissions)', value: `\`${errorCount}\``, inline: true }
        )
        .setColor('#2ecc71')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur synchronisation auto-rôles:', err);
      await interaction.editReply({ content: `❌ Une erreur est survenue lors de la synchronisation : ${err.message}` });
    }
  }
};
