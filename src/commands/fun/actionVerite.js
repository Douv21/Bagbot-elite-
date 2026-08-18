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

    // Création des 4 boutons interactifs SFW / NSFW
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('av_action_sfw').setLabel('Action SFW 🟢').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('av_verite_sfw').setLabel('Vérité SFW 💬').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('av_action_nsfw').setLabel('Action NSFW 🔞').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('av_verite_nsfw').setLabel('Vérité NSFW 💋').setStyle(ButtonStyle.Secondary)
    );

    // Si les deux options sont spécifiées directement via la commande slash
    if (chosenType && chosenMode) {
      const question = getRandomActionVeriteItem(guildId, chosenType, chosenMode);
      const embed = new EmbedBuilder()
        .setTitle(`🎲 Action ou Vérité — ${chosenType === 'action' ? 'Action 🎬' : 'Vérité 💬'}`)
        .setDescription(`<@${interaction.user.id}>, voici ton défi :\n\n>>> **${question}**`)
        .setColor(chosenMode === 'nsfw' ? '#E74C3C' : (chosenType === 'action' ? '#2ECC71' : '#3498DB'))
        .setFooter({ text: `Mode : ${chosenMode === 'sfw' ? 'SFW 🟢 (Tout public)' : 'NSFW 🔞 (Adulte +18)'}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // Sinon, afficher l'embed menu avec choix
    const embed = new EmbedBuilder()
      .setTitle('🎲 Action ou Vérité (Truth or Dare)')
      .setDescription(
        `Prêt(e) à relever le défi ?\n` +
        `Choisissez ci-dessous votre mode (**SFW** ou **NSFW**) et le type de défi (**Action** ou **Vérité**) !`
      )
      .setColor('#7289DA')
      .addFields(
        { name: '🟢 Mode SFW (Tout Public)', value: 'Actions rigolotes & questions amicales sans vulgarité', inline: true },
        { name: '🔞 Mode NSFW (+18)', value: 'Défis coquins, sensuels & vérités intimes pimentées', inline: true }
      )
      .setFooter({ text: 'B&G Elite • Action ou Vérité' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
