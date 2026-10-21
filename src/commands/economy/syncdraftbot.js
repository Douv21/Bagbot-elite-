const { 
  SlashCommandBuilder, 
  PermissionsBitField, 
  PermissionFlagsBits, 
  EmbedBuilder 
} = require('discord.js');
const { syncDraftbotCandies } = require('../../utils/eventLeaderboardManager');

module.exports = {
  name: 'sync-draftbot',

  data: new SlashCommandBuilder()
    .setName('sync-draftbot')
    .setDescription('Importer tous les bonbons récoltés avec DraftBot dans le classement (Staff uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  description: "Synchroniser les bonbons DraftBot avec la base de données (Staff uniquement)",

  async execute(interaction) {
    const memberPerms = interaction.memberPermissions || interaction.member?.permissions;
    const isStaff = Boolean(
      memberPerms?.has(PermissionsBitField.Flags.Administrator) ||
      memberPerms?.has(PermissionsBitField.Flags.ModerateMembers) ||
      memberPerms?.has(PermissionsBitField.Flags.ManageMessages)
    );

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Cette commande est réservée aux Modérateurs et Administrateurs.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const syncResult = await syncDraftbotCandies(interaction.guild, 100);
    if (!syncResult.success) {
      return interaction.editReply({
        content: `❌ Erreur lors de la synchronisation DraftBot : ${syncResult.error}`
      });
    }

    const lines = syncResult.importedSummary.slice(0, 15).map(item => {
      return `• <@${item.userId}> : **${item.quantity}** 🍬`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🔄 Synchronisation DraftBot Terminée')
      .setDescription(
        `L'historique des salons a été scanné avec succès et les bonbons DraftBot ont été synchronisés !\n\n` +
        (lines.length > 0 ? lines.join('\n') : '*Tous les bonbons détectés étaient déjà synchronisés.*')
      )
      .addFields(
        { name: '👥 Membres crédités', value: `\`${syncResult.membersCount}\``, inline: true },
        { name: '🍬 Total bonbons injectés', value: `\`${syncResult.totalCandies} bonbons\``, inline: true }
      )
      .setColor('#FF7518')
      .setFooter({ text: 'Bagbot Elite • Visible avec /classement-evenement' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
