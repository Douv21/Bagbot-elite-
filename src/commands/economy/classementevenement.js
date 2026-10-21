const { 
  SlashCommandBuilder, 
  EmbedBuilder 
} = require('discord.js');
const { getEventLeaderboard } = require('../../utils/eventLeaderboardManager');
const { EVENT_PRESETS, getEventItemDetails } = require('../../utils/eventDropManager');
const { getEventDropConfig } = require('../../database/db');

module.exports = {
  name: 'classement-evenement',

  data: new SlashCommandBuilder()
    .setName('classement-evenement')
    .setDescription('Afficher le classement des drops d\'événements (Bonbons, Cadeaux, etc.)')
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('evenement')
        .setDescription('Type d\'événement (par défaut : l\'événement actuellement actif)')
        .setRequired(false)
        .addChoices(
          { name: '🍬 Bonbons d\'Halloween', value: 'bonbon' },
          { name: '🎁 Cadeaux de Noël', value: 'cadeau' },
          { name: '🍫 Chocolats de Pâques', value: 'chocolat' },
          { name: '💖 Cœurs de St-Valentin', value: 'coeur' },
          { name: '✨ Événement Personnalisé', value: 'custom' }
        )
    ),

  description: "Afficher le classement des drops d'événements (Accessible à tous les membres)",

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const guild = interaction.guild;
    const guildId = guild.id;
    const eventInput = interaction.options.getString('evenement', false);

    const { eventType, config, leaderboard } = getEventLeaderboard(guildId, eventInput);
    const details = getEventItemDetails(config, null, null, eventType);

    if (!leaderboard || leaderboard.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle(`🏆 Classement : ${details.event_name}`)
        .setDescription(`Aucun membre n'a encore récolté d'objets **${details.item_name}** sur le serveur !\nSoyez attentifs aux prochains largages dans les salons pour grimper sur le podium ! ⚡`)
        .setColor(details.color || '#F1C40F')
        .setFooter({ text: 'Bagbot Elite • Chasse aux événements' })
        .setTimestamp();

      return interaction.editReply({ embeds: [emptyEmbed] });
    }

    let totalServerItems = 0;
    const medals = ['🥇', '🥈', '🥉'];

    const lines = leaderboard.slice(0, 25).map((row, index) => {
      totalServerItems += row.total_qty;
      const medal = index < 3 ? medals[index] : `**#${index + 1}**`;
      return `${medal} <@${row.user_id}> : **${row.total_qty.toLocaleString('fr-FR')}** ${details.emoji}`;
    });

    for (let i = 25; i < leaderboard.length; i++) {
      totalServerItems += leaderboard[i].total_qty;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Classement Officiel : ${details.event_name}`)
      .setDescription(
        `Découvrez qui possède le plus de **${details.item_name}** sur le serveur !\n\n` +
        lines.join('\n')
      )
      .addFields(
        { name: '👥 Participants', value: `\`${leaderboard.length} membres\``, inline: true },
        { name: '📦 Total récolté', value: `\`${totalServerItems.toLocaleString('fr-FR')} ${details.emoji}\``, inline: true }
      )
      .setColor(details.color || '#F1C40F')
      .setFooter({ text: `Bagbot Elite • Événement en direct` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
