const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs-config')
    .setDescription('Configurer le système de logs complet')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Définir le salon de logs d\'activité')
        .addChannelOption(option => option.setName('salon').setDescription('Le salon de logs').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Désactiver le système de logs')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'set') {
      const channel = interaction.options.getChannel('salon');

      db.prepare('INSERT OR REPLACE INTO logs_config (guild_id, channel_id, events) VALUES (?, ?, ?)')
        .run(guildId, channel.id, 'all');

      await interaction.reply({ content: `✅ Le salon de logs a été défini sur <#${channel.id}>. Tous les événements seront journalisés par défaut.`, ephemeral: true });
    } 
    
    else if (subcommand === 'disable') {
      db.prepare('DELETE FROM logs_config WHERE guild_id = ?').run(guildId);
      await interaction.reply({ content: '✅ Le système de logs a été désactivé pour ce serveur.', ephemeral: true });
    }
  }
};
