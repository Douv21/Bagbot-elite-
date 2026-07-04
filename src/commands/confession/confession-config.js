const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confession-config')
    .setDescription('Configurer les salons de confession anonyme')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Ajouter un salon de confession')
        .addChannelOption(option => option.setName('salon').setDescription('Le salon à ajouter').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Retirer un salon de confession')
        .addChannelOption(option => option.setName('salon').setDescription('Le salon à retirer').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Lister les salons de confession actifs')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'add') {
      const channel = interaction.options.getChannel('salon');

      db.prepare('INSERT OR IGNORE INTO confessions (guild_id, channel_id) VALUES (?, ?)').run(guildId, channel.id);

      await interaction.reply({ content: `✅ Le salon <#${channel.id}> a été ajouté à la liste des salons de confession anonyme.`, ephemeral: true });
    } 
    
    else if (subcommand === 'remove') {
      const channel = interaction.options.getChannel('salon');

      db.prepare('DELETE FROM confessions WHERE guild_id = ? AND channel_id = ?').run(guildId, channel.id);

      await interaction.reply({ content: `✅ Le salon <#${channel.id}> a été retiré de la liste des salons de confession.`, ephemeral: true });
    } 
    
    else if (subcommand === 'list') {
      const rows = db.prepare('SELECT channel_id FROM confessions WHERE guild_id = ?').all(guildId);

      if (rows.length === 0) {
        return interaction.reply({ content: 'Aucun salon de confession n\'est configuré pour ce serveur.', ephemeral: true });
      }

      const list = rows.map(r => `<#${r.channel_id}>`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('💬 Salons de confession configurés')
        .setDescription(list)
        .setColor('#9B59B6')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};
