const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Afficher votre inventaire ou celui d\'un membre')
    .addUserOption(option => option.setName('membre').setDescription('Le membre dont vous voulez voir l\'inventaire (optionnel)').setRequired(false)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild.id;

    const items = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ?').all(guildId, targetUser.id);

    if (items.length === 0) {
      return interaction.reply({ content: targetUser.id === interaction.user.id ? '🎒 Votre inventaire est vide.' : `🎒 L'inventaire de **${targetUser.tag}** est vide.` });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎒 Inventaire de ${targetUser.username}`)
      .setColor('#2ECC71')
      .setTimestamp();

    let desc = '';
    items.forEach(item => {
      desc += `📦 **${item.item_name}** x${item.quantity}\n`;
    });

    embed.setDescription(desc);
    await interaction.reply({ embeds: [embed] });
  }
};
