const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getActionVeriteConfig, getRandomActionVeriteItem } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('action-verite')
    .setDescription('Lancer une partie d\'Action ou Vérité (Truth or Dare)')
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Mode de jeu en MP (SFW tout public ou NSFW +18)')
        .setRequired(false)
        .addChoices(
          { name: '🟢 SFW (Tout public)', value: 'sfw' },
          { name: '🔞 NSFW (Adulte +18)', value: 'nsfw' }
        )
    ),

  async execute(interaction) {
    const guildId = interaction.guild ? interaction.guild.id : 'DM';
    const chosenMode = interaction.options.getString('mode');

    // ── SUR SERVEUR : Lancement direct sans option mode/type (Auto SFW/NSFW) ────
    if (interaction.guild) {
      const config = getActionVeriteConfig(guildId);
      if (config.sfw_channel_id || config.nsfw_channel_id) {
        const isSfwAllowed = config.sfw_channel_id && interaction.channel.id === config.sfw_channel_id;
        const isNsfwAllowed = config.nsfw_channel_id && interaction.channel.id === config.nsfw_channel_id;

        if (!isSfwAllowed && !isNsfwAllowed) {
          let msg = '❌ Ce jeu ne peut être joué que dans les salons configurés :';
          if (config.sfw_channel_id) msg += `\n- SFW : <#${config.sfw_channel_id}>`;
          if (config.nsfw_channel_id) msg += `\n- NSFW : <#${config.nsfw_channel_id}>`;
          return interaction.reply({ content: msg, ephemeral: true });
        }
      }

      const isNsfw = Boolean(interaction.channel?.nsfw || (config.nsfw_channel_id && interaction.channel.id === config.nsfw_channel_id));
      const category = isNsfw ? 'nsfw' : 'sfw';

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`av_action_${category}`).setLabel('Action 🎬').setStyle(category === 'nsfw' ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`av_verite_${category}`).setLabel('Vérité 💬').setStyle(ButtonStyle.Primary)
      );

      const embed = new EmbedBuilder()
        .setTitle(`🎲 Action ou Vérité ${isNsfw ? '🔞' : '🟢'}`)
        .setDescription(`<@${interaction.user.id}> a lancé une partie d'**Action ou Vérité** !\n\nCliquez ci-dessous pour tirer une **Action** ou une **Vérité** :`)
        .setColor(isNsfw ? '#E74C3C' : '#2ECC71')
        .setFooter({ text: `B&G Elite • Mode ${category.toUpperCase()}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // ── EN MP (DM) : Sélection du mode si spécifié, sinon menu de choix ────────
    if (chosenMode) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`av_action_${chosenMode}`).setLabel('Action 🎬').setStyle(chosenMode === 'nsfw' ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`av_verite_${chosenMode}`).setLabel('Vérité 💬').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('av_select_mode').setLabel('Changer de mode 🔄').setStyle(ButtonStyle.Secondary)
      );

      const embed = new EmbedBuilder()
        .setTitle(`🎲 Action ou Vérité en MP ${chosenMode === 'nsfw' ? '🔞' : '🟢'}`)
        .setDescription(`<@${interaction.user.id}> a lancé une partie d'**Action ou Vérité** !\n\nCliquez ci-dessous pour tirer une **Action** ou une **Vérité** :`)
        .setColor(chosenMode === 'nsfw' ? '#E74C3C' : '#2ECC71')
        .setFooter({ text: `B&G Elite • MP (${chosenMode.toUpperCase()})` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // Si aucun mode spécifié en MP : afficher le choix SFW / NSFW
    const rowMode = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('av_mode_sfw').setLabel('🟢 Mode SFW (Tout Public)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('av_mode_nsfw').setLabel('🔞 Mode NSFW (Adulte +18)').setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle('🎲 Action ou Vérité en MP')
      .setDescription(
        `Prêt(e) à relever le défi ?\n` +
        `Choisissez ci-dessous votre mode de jeu :`
      )
      .setColor('#7289DA')
      .addFields(
        { name: '🟢 Mode SFW (Tout Public)', value: 'Actions rigolotes & questions amicales sans vulgarité', inline: true },
        { name: '🔞 Mode NSFW (+18)', value: 'Défis coquins, sensuels & vérités intimes pimentées', inline: true }
      )
      .setFooter({ text: 'B&G Elite • Action ou Vérité' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], components: [rowMode] });
  }
};
