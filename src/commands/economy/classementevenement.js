const { 
  SlashCommandBuilder, 
  PermissionsBitField, 
  PermissionFlagsBits, 
  EmbedBuilder 
} = require('discord.js');
const { 
  getEventLeaderboard, 
  resetEventDrops, 
  syncDraftbotCandies 
} = require('../../utils/eventLeaderboardManager');
const { EVENT_PRESETS, getEventItemDetails } = require('../../utils/eventDropManager');
const { getEventDropConfig } = require('../../database/db');

module.exports = {
  name: 'classement-evenement',

  data: new SlashCommandBuilder()
    .setName('classement-evenement')
    .setDescription('Classement et gestion des drops d\'événements (Admin & Modo uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    
    // Sous-commande : VOIR LE CLASSEMENT
    .addSubcommand(sub =>
      sub.setName('voir')
        .setDescription('Consulter le classement des membres pour un événement')
        .addStringOption(option =>
          option.setName('evenement')
            .setDescription('Type d\'événement (par défaut: événement actif)')
            .setRequired(false)
            .addChoices(
              { name: '🍬 Bonbons d\'Halloween', value: 'bonbon' },
              { name: '🎁 Cadeaux de Noël', value: 'cadeau' },
              { name: '🍫 Chocolats de Pâques', value: 'chocolat' },
              { name: '💖 Cœurs de St-Valentin', value: 'coeur' },
              { name: '✨ Événement Personnalisé', value: 'custom' }
            )
        )
    )

    // Sous-commande : RÉINITIALISER LE CLASSEMENT
    .addSubcommand(sub =>
      sub.setName('reinitialiser')
        .setDescription('Remettre à zéro les objets et le classement d\'un événement (Admin uniquement)')
        .addStringOption(option =>
          option.setName('evenement')
            .setDescription('Événement à remettre à zéro')
            .setRequired(true)
            .addChoices(
              { name: '🍬 Bonbons d\'Halloween', value: 'bonbon' },
              { name: '🎁 Cadeaux de Noël', value: 'cadeau' },
              { name: '🍫 Chocolats de Pâques', value: 'chocolat' },
              { name: '💖 Cœurs de St-Valentin', value: 'coeur' },
              { name: '✨ Événement Personnalisé', value: 'custom' },
              { name: '⚠️ TOUS les événements', value: 'tous' }
            )
        )
        .addBooleanOption(option =>
          option.setName('confirmer')
            .setDescription('Confirmez-vous la remise à zéro définitive ?')
            .setRequired(true)
        )
    )

    // Sous-commande : SYNCHRONISER AVEC DRAFTBOT
    .addSubcommand(sub =>
      sub.setName('sync-draftbot')
        .setDescription('Importer tous les bonbons récoltés via DraftBot dans le classement')
    ),

  description: "Classement, remise à zéro et synchronisation des drops d'événements (Admin/Modo)",

  async execute(interaction) {
    const memberPerms = interaction.memberPermissions || interaction.member?.permissions;
    const isStaff = Boolean(
      memberPerms?.has(PermissionsBitField.Flags.Administrator) ||
      memberPerms?.has(PermissionsBitField.Flags.ModerateMembers) ||
      memberPerms?.has(PermissionsBitField.Flags.ManageMessages)
    );

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Cette commande est strictement réservée aux Administrateurs et Modérateurs.',
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const guildId = guild.id;

    // ==========================================
    // 1. VOIR LE CLASSEMENT
    // ==========================================
    if (sub === 'voir') {
      await interaction.deferReply({ ephemeral: true });

      const eventInput = interaction.options.getString('evenement', false);
      const { eventType, config, leaderboard } = getEventLeaderboard(guildId, eventInput);
      const details = getEventItemDetails(config, null, null, eventType);

      if (!leaderboard || leaderboard.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setTitle(`🏆 Classement : ${details.event_name}`)
          .setDescription(`Aucun membre n'a encore récolté d'objets **${details.item_name}** sur le serveur.\nLancez des drops avec \`/dropevenement\` ou activez les drops automatiques dans le Dashboard !`)
          .setColor(details.color || '#F1C40F')
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

      // Calculer le total pour les suivants si > 25
      for (let i = 25; i < leaderboard.length; i++) {
        totalServerItems += leaderboard[i].total_qty;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Classement des Drops : ${details.event_name}`)
        .setDescription(
          `Voici le classement actuel des meilleurs récolteurs de **${details.item_name}** !\n\n` +
          lines.join('\n')
        )
        .addFields(
          { name: '👥 Participants', value: `\`${leaderboard.length} membres\``, inline: true },
          { name: '📦 Total récolté', value: `\`${totalServerItems.toLocaleString('fr-FR')} ${details.emoji}\``, inline: true }
        )
        .setColor(details.color || '#F1C40F')
        .setFooter({ text: `Bagbot Elite • Visible uniquement par le staff` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ==========================================
    // 2. RÉINITIALISER LE CLASSEMENT
    // ==========================================
    if (sub === 'reinitialiser') {
      const isAdmin = memberPerms?.has(PermissionsBitField.Flags.Administrator);
      if (!isAdmin) {
        return interaction.reply({
          content: '❌ Seul un **Administrateur** peut effectuer une remise à zéro du classement d\'un événement.',
          ephemeral: true
        });
      }

      const confirm = interaction.options.getBoolean('confirmer', true);
      if (!confirm) {
        return interaction.reply({
          content: '⚠️ Action annulée : vous devez cocher `confirmer: Vrai` pour réinitialiser le classement.',
          ephemeral: true
        });
      }

      const eventTarget = interaction.options.getString('evenement', true);
      const result = resetEventDrops(guildId, eventTarget);

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Remise à Zéro Effectuée')
        .setDescription(
          `Le classement et les objets de l'événement **${eventTarget.toUpperCase()}** ont été réinitialisés avec succès pour l'ensemble du serveur.\n\n` +
          `• **Enregistrements purgés :** \`${result.count}\` entrée(s) d'inventaire.`
        )
        .setColor('#E74C3C')
        .setFooter({ text: `Effectué par ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ==========================================
    // 3. SYNCHRONISER LES BONBONS DRAFTBOT
    // ==========================================
    if (sub === 'sync-draftbot') {
      await interaction.deferReply({ ephemeral: true });

      const syncResult = await syncDraftbotCandies(guild, 150);
      if (!syncResult.success) {
        return interaction.editReply({
          content: `❌ Erreur lors de la synchronisation DraftBot : ${syncResult.error}`
        });
      }

      const lines = syncResult.importedSummary.slice(0, 15).map(item => {
        return `• <@${item.userId}> : **${item.quantity}** 🍬`;
      });

      const embed = new EmbedBuilder()
        .setTitle('🔄 Synchronisation des Bonbons DraftBot Terminée')
        .setDescription(
          `Le bot a scanné l'ensemble des salons Discord et a synchronisé les bonbons récoltés avec DraftBot !\n\n` +
          (lines.length > 0 ? lines.join('\n') : '*Aucun nouveau bonbon trouvé dans les messages scannés.*')
        )
        .addFields(
          { name: '👥 Membres crédités', value: `\`${syncResult.membersCount}\``, inline: true },
          { name: '🍬 Total bonbons injectés', value: `\`${syncResult.totalCandies} bonbons\``, inline: true }
        )
        .setColor('#FF7518')
        .setFooter({ text: 'Bagbot Elite • Les données sont désormais visibles dans /classement-evenement voir' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
