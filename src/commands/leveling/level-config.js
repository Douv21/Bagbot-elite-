const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level-config')
    .setDescription('Configurer les rôles de récompense pour le leveling')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Ajouter un rôle de récompense pour un niveau')
        .addIntegerOption(option => option.setName('niveau').setDescription('Le niveau requis').setRequired(true).setMinValue(1))
        .addRoleOption(option => option.setName('role').setDescription('Le rôle à donner').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Retirer un rôle de récompense pour un niveau')
        .addIntegerOption(option => option.setName('niveau').setDescription('Le niveau requis').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Lister tous les rôles de récompense')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'add') {
      const level = interaction.options.getInteger('niveau');
      const role = interaction.options.getRole('role');

      db.prepare('INSERT OR REPLACE INTO level_rewards (guild_id, level, role_id) VALUES (?, ?, ?)')
        .run(guildId, level, role.id);

      await interaction.reply({ content: `✅ Les membres obtiendront désormais le rôle <@&${role.id}> au niveau **${level}** !`, ephemeral: true });
    } 
    
    else if (subcommand === 'remove') {
      const level = interaction.options.getInteger('niveau');

      const result = db.prepare('DELETE FROM level_rewards WHERE guild_id = ? AND level = ?').run(guildId, level);

      if (result.changes === 0) {
        return interaction.reply({ content: `❌ Aucune récompense configurée pour le niveau **${level}**.`, ephemeral: true });
      }

      await interaction.reply({ content: `✅ La récompense pour le niveau **${level}** a été retirée.`, ephemeral: true });
    } 
    
    else if (subcommand === 'list') {
      const rewards = db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC').all(guildId);

      if (rewards.length === 0) {
        return interaction.reply({ content: 'Aucun rôle de récompense n\'est configuré.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('⭐ Rôles de Récompense par Niveau')
        .setColor('#F1C40F')
        .setTimestamp();

      let desc = '';
      rewards.forEach(r => {
        desc += `Level **${r.level}** : <@&${r.role_id}>\n`;
      });

      embed.setDescription(desc);
      await interaction.reply({ embeds: [embed] });
    }
  }
};
