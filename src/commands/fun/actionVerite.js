const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRandomActionVeriteItem, getActionVeriteConfig } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('action-verite')
    .setDescription('Jouer à Action ou Vérité (Truth or Dare)')
    .addStringOption(option =>
      option.setName('choix')
        .setDescription('Choisissez entre Action ou Vérité')
        .setRequired(true)
        .addChoices(
          { name: 'Action', value: 'action' },
          { name: 'Vérité', value: 'verite' }
        )
    )
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Choisissez le niveau de contenu')
        .setRequired(true)
        .addChoices(
          { name: 'SFW (Standard)', value: 'sfw' },
          { name: 'NSFW (Adulte - Salon NSFW requis)', value: 'nsfw' }
        )
    ),
  async execute(interaction) {
    const guildId = interaction.guild ? interaction.guild.id : 'DM';
    const choix = interaction.options.getString('choix');
    const mode = interaction.options.getString('mode');

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

        // Si salon SFW configuré, interdire le mode NSFW dedans
        if (isSfwAllowed && mode === 'nsfw') {
          return interaction.reply({
            content: '🔞 Le mode **NSFW** ne peut pas être joué dans le salon SFW ! Allez dans le salon NSFW si configuré.',
            ephemeral: true
          });
        }
      }

      // Vérification générale NSFW si non configuré mais mode adulte demandé
      if (mode === 'nsfw' && !interaction.channel.nsfw) {
        return interaction.reply({ 
          content: '🔞 Le mode **NSFW** ne peut être joué que dans un salon configuré comme NSFW !', 
          ephemeral: true 
        });
      }
    }

    const question = getRandomActionVeriteItem(guildId, choix, mode);

    const embed = new EmbedBuilder()
      .setTitle(`🎲 Action ou Vérité — ${choix === 'action' ? 'Action 🎬' : 'Vérité 💬'}`)
      .setDescription(`<@${interaction.user.id}>, voici ton défi :\n\n>>> **${question}**`)
      .setColor(choix === 'action' ? '#E74C3C' : '#3498DB')
      .setFooter({ text: `Mode : ${mode === 'sfw' ? 'SFW 🟢' : 'NSFW 🔞'}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`av_${mode}_action`)
        .setLabel('Action 🎬')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`av_${mode}_verite`)
        .setLabel('Vérité 💬')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
