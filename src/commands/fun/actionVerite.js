const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomActionVeriteItem } = require('../../database/db');

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

    // Vérification du salon NSFW pour le mode adulte
    if (mode === 'nsfw' && interaction.guild && !interaction.channel.nsfw) {
      return interaction.reply({ 
        content: '🔞 Le mode **NSFW** ne peut être joué que dans un salon configuré comme NSFW !', 
        ephemeral: true 
      });
    }

    const question = getRandomActionVeriteItem(guildId, choix, mode);

    const embed = new EmbedBuilder()
      .setTitle(`🎲 Action ou Vérité — ${choix === 'action' ? 'Action 🎬' : 'Vérité 💬'}`)
      .setDescription(`<@${interaction.user.id}>, voici ton défi :\n\n>>> **${question}**`)
      .setColor(choix === 'action' ? '#E74C3C' : '#3498DB')
      .setFooter({ text: `Mode : ${mode === 'sfw' ? 'SFW 🟢' : 'NSFW 🔞'}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
