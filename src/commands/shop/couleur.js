const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database/db');

const PRESET_COLORS = [
  { name: '🌸 Rose Pastel', hex: 'FFB3BA' },
  { name: '🍑 Pêche Pastel', hex: 'FFDFBA' },
  { name: '🌻 Jaune Pastel', hex: 'FFFFBA' },
  { name: '🌿 Vert Pastel', hex: 'BAFFC9' },
  { name: '💙 Bleu Pastel', hex: 'BAE1FF' },
  { name: '💜 Violet Pastel', hex: 'D4BAFF' },
  { name: '🔴 Rouge Vif', hex: 'FF3333' },
  { name: '🟠 Orange Vif', hex: 'FF9933' },
  { name: '🟢 Vert Vif', hex: '33CC33' },
  { name: '🔵 Bleu Vif', hex: '3366FF' },
  { name: '🖤 Noir Charbon', hex: '111111' },
  { name: '⚪ Blanc Éclatant', hex: 'FFFFFF' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('couleur')
    .setDescription('Changer la couleur de votre pseudo (nécessite l\'article Rôle couleur dans votre inventaire)')
    .setDMPermission(false),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Vérifier l'inventaire
    const invItem = db.prepare("SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name LIKE '%rôle couleur%'").get(guildId, userId);

    if (!invItem || invItem.quantity <= 0) {
      return interaction.reply({
        content: `❌ Vous devez posséder l'article **🌈 Rôle couleur** dans votre inventaire pour changer de couleur. Achetez-le d'abord dans la boutique (\`/boutique\`).`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🎨 Personnalisation de Couleur')
      .setDescription('Choisissez une couleur prédéfinie dans le menu ci-dessous, ou cliquez sur le bouton pour entrer votre propre code couleur personnalisé (HEX) !')
      .setColor('#9B59B6')
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('couleur_preset_select')
      .setPlaceholder('Sélectionnez une couleur prédéfinie...')
      .addOptions(PRESET_COLORS.map(c => ({
        label: c.name,
        value: c.hex,
        description: `#${c.hex}`
      })));

    const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

    const btnCustom = new ButtonBuilder()
      .setCustomId('couleur_custom_btn')
      .setLabel('Saisir un code Hex personnalisé')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✏️');

    const rowBtn = new ActionRowBuilder().addComponents(btnCustom);

    await interaction.reply({
      embeds: [embed],
      components: [rowSelect, rowBtn],
      ephemeral: true
    });
  }
};
