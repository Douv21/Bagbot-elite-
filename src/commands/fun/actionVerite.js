const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getActionVeriteConfig } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('action-verite')
    .setDescription('Lancer une partie d\'Action ou Vérité (Truth or Dare)'),
  async execute(interaction) {
    const guildId = interaction.guild ? interaction.guild.id : 'DM';

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

    const embed = new EmbedBuilder()
      .setTitle('🎲 Action ou Vérité')
      .setDescription('Prêt(e) à relever le défi ? Cliquez sur l\'un des boutons ci-dessous pour obtenir une Action ou une Vérité !')
      .setColor('#7289DA')
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('av_action')
        .setLabel('Action 🎬')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('av_verite')
        .setLabel('Vérité 💬')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
