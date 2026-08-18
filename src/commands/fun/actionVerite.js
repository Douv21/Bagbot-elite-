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
        .setDescription('Mode de jeu (SFW tout public ou NSFW adultes +18)')
        .setRequired(false)
        .addChoices(
          { name: '🟢 SFW (Tout public)', value: 'sfw' },
          { name: '🔞 NSFW (Adulte +18)', value: 'nsfw' }
        )
    )
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type de défi (Action ou Vérité)')
        .setRequired(false)
        .addChoices(
          { name: '🎬 Action', value: 'action' },
          { name: '💬 Vérité', value: 'verite' }
        )
    ),

  async execute(interaction) {
    const guildId = interaction.guild ? interaction.guild.id : 'DM';
    const chosenMode = interaction.options.getString('mode');
    const chosenType = interaction.options.getString('type');

    // Vérification des salons autorisés pour le serveur
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
    }

    // Vérification de sécurité pour le mode NSFW en salon non-NSFW
    if (chosenMode === 'nsfw' && interaction.guild && !interaction.channel?.nsfw) {
      return interaction.reply({
        content: "🔞 Le mode **NSFW (+18)** ne peut être joué que dans un salon configuré comme soumis à la limite d'âge (salon NSFW) ou en **Message Privé (DM)**.",
        ephemeral: true
      });
    }

    // Si mode SFW spécifié
    if (chosenMode === 'sfw') {
      const rowSfw = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('av_action_sfw').setLabel('Action 🎬').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('av_verite_sfw').setLabel('Vérité 💬').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('av_select_mode').setLabel('Changer de mode 🔄').setStyle(ButtonStyle.Secondary)
      );

      if (chosenType) {
        const question = getRandomActionVeriteItem(guildId, chosenType, 'sfw');
        const embed = new EmbedBuilder()
          .setTitle(`🎲 Action ou Vérité — ${chosenType === 'action' ? 'Action 🎬' : 'Vérité 💬'}`)
          .setDescription(`<@${interaction.user.id}>, voici ton défi SFW :\n\n>>> **${question}**`)
          .setColor(chosenType === 'action' ? '#2ECC71' : '#3498DB')
          .setFooter({ text: 'Mode : SFW 🟢 (Tout public)' })
          .setTimestamp();
        return interaction.reply({ embeds: [embed], components: [rowSfw], ephemeral: false });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎲 Action ou Vérité — Mode SFW 🟢')
        .setDescription(`<@${interaction.user.id}> a lancé une partie en **Mode SFW 🟢** !\n\nCliquez ci-dessous pour tirer une **Action** ou une **Vérité** :`)
        .setColor('#2ECC71')
        .setFooter({ text: 'Mode : SFW 🟢 (Tout public)' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], components: [rowSfw], ephemeral: false });
    }

    // Si mode NSFW spécifié
    if (chosenMode === 'nsfw') {
      const rowNsfw = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('av_action_nsfw').setLabel('Action 🔥').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('av_verite_nsfw').setLabel('Vérité 💋').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('av_select_mode').setLabel('Changer de mode 🔄').setStyle(ButtonStyle.Secondary)
      );

      if (chosenType) {
        const question = getRandomActionVeriteItem(guildId, chosenType, 'nsfw');
        const embed = new EmbedBuilder()
          .setTitle(`🎲 Action ou Vérité — ${chosenType === 'action' ? 'Action 🎬' : 'Vérité 💬'}`)
          .setDescription(`<@${interaction.user.id}>, voici ton défi NSFW :\n\n>>> **${question}**`)
          .setColor('#E74C3C')
          .setFooter({ text: 'Mode : NSFW 🔞 (Adulte +18)' })
          .setTimestamp();
        return interaction.reply({ embeds: [embed], components: [rowNsfw], ephemeral: false });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎲 Action ou Vérité — Mode NSFW 🔞')
        .setDescription(`<@${interaction.user.id}> a lancé une partie en **Mode NSFW 🔞** !\n\nCliquez ci-dessous pour tirer une **Action** ou une **Vérité** :`)
        .setColor('#E74C3C')
        .setFooter({ text: 'Mode : NSFW 🔞 (Adulte +18)' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], components: [rowNsfw], ephemeral: false });
    }

    // Si aucun mode spécifié : afficher le menu de sélection de mode
    const rowMode = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('av_mode_sfw').setLabel('🟢 Mode SFW (Tout Public)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('av_mode_nsfw').setLabel('🔞 Mode NSFW (Adulte +18)').setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle('🎲 Action ou Vérité (Truth or Dare)')
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

    await interaction.reply({ embeds: [embed], components: [rowMode], ephemeral: false });
  }
};
