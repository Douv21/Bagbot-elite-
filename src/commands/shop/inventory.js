const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Afficher votre inventaire privé et interagir avec vos objets')
    .setDMPermission(false),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const items = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND quantity > 0').all(guildId, userId);

    if (items.length === 0) {
      return interaction.reply({
        content: '🎒 **Votre inventaire est actuellement vide.**\n*Visitez la `/boutique` pour acquérir des suites privées, des objets sensuels ou des jokers !*',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎒 Votre Inventaire Exclusif — ${interaction.user.username}`)
      .setDescription(
        `💋 **Voici les trésors et objets précieux en votre possession :**\n\n` +
        items.map(item => `• **${item.item_name}** — \`x${item.quantity}\``).join('\n') +
        `\n\n👇 *Sélectionnez un objet ci-dessous pour l'utiliser avec un membre, l'offrir ou le jeter :*`
      )
      .setColor('#9B59B6')
      .setFooter({ text: '🎒 Gestionnaire d\'Inventaire Privé • B&G Elite' })
      .setTimestamp();

    const options = items.slice(0, 25).map(item => ({
      label: item.item_name.substring(0, 25),
      description: `Quantité : x${item.quantity} • Utiliser / Offrir / Jeter`,
      value: item.item_name,
      emoji: '📦'
    }));

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('inv_select_item')
        .setPlaceholder('Choisissez un objet dans votre inventaire...')
        .addOptions(options)
    );

    return interaction.reply({
      embeds: [embed],
      components: [selectRow],
      ephemeral: true
    });
  }
};
