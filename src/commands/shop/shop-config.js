const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop-config')
    .setDescription('Configurer la boutique du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Ajouter un article à la boutique')
        .addStringOption(option => option.setName('nom').setDescription('Nom de l\'article').setRequired(true))
        .addIntegerOption(option => option.setName('prix').setDescription('Prix en monnaie virtuelle').setRequired(true).setMinValue(1))
        .addStringOption(option => option.setName('description').setDescription('Description de l\'article').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('Rôle associé donné lors de l\'achat (optionnel)').setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Retirer un article de la boutique')
        .addStringOption(option => option.setName('nom').setDescription('Nom de l\'article à retirer').setRequired(true))
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'add') {
      const name = interaction.options.getString('nom');
      const price = interaction.options.getInteger('prix');
      const description = interaction.options.getString('description');
      const role = interaction.options.getRole('role');

      db.prepare('INSERT OR REPLACE INTO shop (guild_id, item_name, price, description, role_id) VALUES (?, ?, ?, ?, ?)')
        .run(guildId, name, price, description, role ? role.id : null);

      await interaction.reply({ content: `✅ L'article **${name}** a été ajouté/mis à jour dans la boutique pour **${price}** pièces !`, ephemeral: true });
    } 
    
    else if (subcommand === 'remove') {
      const name = interaction.options.getString('nom');

      const result = db.prepare('DELETE FROM shop WHERE guild_id = ? AND item_name = ?').run(guildId, name);

      if (result.changes === 0) {
        return interaction.reply({ content: `❌ L'article **${name}** n'existe pas dans la boutique.`, ephemeral: true });
      }

      await interaction.reply({ content: `✅ L'article **${name}** a été retiré de la boutique.`, ephemeral: true });
    }
  }
};
