const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-serveur-report')
    .setDescription('🔨 Créer un serveur complet de Signalement, Protection & Juridique Inter-Serveurs Safecord')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Cette commande doit être exécutée sur un serveur.', ephemeral: true });
    }

    const perms = interaction.memberPermissions || interaction.member?.permissions;
    if (!perms?.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Vous devez posséder la permission **Administrateur** pour exécuter la création globale du serveur de report.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const guild = interaction.guild;
    const everyoneRole = guild.roles.everyone;
    const currentChannelId = interaction.channelId;

    try {
      await interaction.editReply({ content: '🧹 **[1/6] Purge complète et suppression de tous les anciens salons...**' });

      // ── 0. PURGE COMPLETE DE TOUS LES SALONS ET CATEGORIES ─────────────────
      const existingChannels = Array.from(guild.channels.cache.values());
      for (const ch of existingChannels) {
        if (ch.id !== currentChannelId) {
          await ch.delete('Purge automatique avant Setup Server Report Safecord').catch(() => null);
        }
      }

      await interaction.editReply({ content: '⚙️ **[2/6] Création des rôles Safecord et autorôles en cours...**' });

      // ── 1. CREATION DES ROLES ────────────────────────────────────────────────
      const roleDirection = await guild.roles.create({
        name: '👑 Direction',
        color: '#FFD700',
        hoist: true,
        mentionable: true,
        permissions: [PermissionsBitField.Flags.Administrator],
        reason: 'Setup Serveur Safecord'
      });

      const roleSafecordTeam = await guild.roles.create({
        name: '🛡️ Équipe Safecord',
        color: '#E74C3C',
        hoist: true,
        mentionable: true,
        permissions: [
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.KickMembers,
          PermissionsBitField.Flags.BanMembers,
          PermissionsBitField.Flags.ModerateMembers,
          PermissionsBitField.Flags.ManageThreads,
          PermissionsBitField.Flags.ViewAuditLog
        ],
        reason: 'Setup Serveur Safecord'
      });

      const roleOwnerOther = await guild.roles.create({
        name: '👑 Owner Inter-Serveur',
        color: '#9B59B6',
        hoist: true,
        mentionable: true,
        reason: 'Setup Serveur Safecord'
      });

      const roleCoOwnerOther = await guild.roles.create({
        name: '🤝 Co-Owner Inter-Serveur',
        color: '#3498DB',
        hoist: true,
        mentionable: true,
        reason: 'Setup Serveur Safecord'
      });

      const roleStaffOther = await guild.roles.create({
        name: '⚡ Staff Inter-Serveur',
        color: '#2ECC71',
        hoist: true,
        mentionable: true,
        reason: 'Setup Serveur Safecord'
      });

      const roleAlerte = await guild.roles.create({
        name: '🔔 Alerte Signalements',
        color: '#F39C12',
        hoist: true,
        mentionable: true,
        reason: 'Setup Serveur Safecord'
      });

      const roleMembre = await guild.roles.create({
        name: '✨ Membre',
        color: '#95A5A6',
        hoist: true,
        reason: 'Setup Serveur Safecord'
      });

      const roleMuted = await guild.roles.create({
        name: '🔇 Muet',
        color: '#7F8C8D',
        reason: 'Setup Serveur Safecord'
      });

      // Attribuer le rôle Direction au créateur du serveur
      if (interaction.member) {
        await interaction.member.roles.add(roleDirection).catch(() => null);
      }

      await interaction.editReply({ content: '⚙️ **[3/6] Création des catégories séquentiellement étanches avec permissions progressives...**' });

      // ── 2. CREATION DES CATEGORIES & SALONS AVEC PERMISSIONS PROGRESSIVES ───

      // CAT 1 : ACCUEIL & INFORMATIONS
      // @everyone a accès UNIQUEMENT au règlement et à la bienvenue au départ !
      const catAccueil = await guild.channels.create({
        name: '📌 │ ACCUEIL & INFORMATIONS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] },
          { id: roleSafecordTeam.id, allow: [PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chReglement = await guild.channels.create({ name: '📜-règlement-report', type: ChannelType.GuildText, parent: catAccueil.id });
      const chBienvenue = await guild.channels.create({ name: '👋-bienvenue', type: ChannelType.GuildText, parent: catAccueil.id });
      
      const chConsignes = await guild.channels.create({
        name: '📌-consignes-signalements',
        type: ChannelType.GuildText,
        parent: catAccueil.id,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleMembre.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] },
          { id: roleSafecordTeam.id, allow: [PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chRolesPres = await guild.channels.create({
        name: '🎭-obtention-rôles-staff',
        type: ChannelType.GuildText,
        parent: catAccueil.id,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleMembre.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] },
          { id: roleSafecordTeam.id, allow: [PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.SendMessages] }
        ]
      });

      // CAT 2 : SIGNALEMENTS MEMBRES (FORUMS PAR THÈME - Réservé Membres)
      const catSignalementsMembres = await guild.channels.create({
        name: '🚨 │ SIGNALEMENTS MEMBRES (FORUMS)',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleMembre.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.SendMessagesInThreads, PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.AttachFiles] },
          { id: roleMuted.id, deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.SendMessagesInThreads] }
        ]
      });

      const forumHarcèlement = await guild.channels.create({
        name: '🚨-harcèlement-et-menaces',
        type: ChannelType.GuildForum,
        parent: catSignalementsMembres.id,
        topic: 'Ouvrez un sujet pour signaler des faits de harcèlement, cyberharcèlement, menaces ou chantage.',
        availableTags: [
          { name: '🚨 Urgent', emoji: { name: '🚨' } },
          { name: '💬 Harcèlement', emoji: { name: '💬' } },
          { name: '⚠️ Menaces', emoji: { name: '⚠️' } },
          { name: '✅ Traité', emoji: { name: '✅' } }
        ]
      });

      const forumForceurs = await guild.channels.create({
        name: '⛔-forceurs-et-doxxing',
        type: ChannelType.GuildForum,
        parent: catSignalementsMembres.id,
        topic: 'Ouvrez un sujet pour signaler des forceurs insistants, doxxing, divulgation d\'informations privées ou comportement toxique.',
        availableTags: [
          { name: '⛔ Forceur', emoji: { name: '⛔' } },
          { name: '🔒 Doxxing', emoji: { name: '🔒' } },
          { name: '⚠️ Toxique', emoji: { name: '⚠️' } },
          { name: '✅ Traité', emoji: { name: '✅' } }
        ]
      });

      const forumMineurs = await guild.channels.create({
        name: '🔞-mineurs-et-danger',
        type: ChannelType.GuildForum,
        parent: catSignalementsMembres.id,
        topic: 'Ouvrez un sujet pour signaler tout comportement inapproprié/suspect envers des mineurs ou mise en danger.',
        availableTags: [
          { name: '🔞 Danger Mineur', emoji: { name: '🔞' } },
          { name: '🚨 Urgence Absolue', emoji: { name: '🚨' } },
          { name: '🔒 Transmis Discord', emoji: { name: '🔒' } },
          { name: '✅ Traité', emoji: { name: '✅' } }
        ]
      });

      const forumArnaques = await guild.channels.create({
        name: '💸-arnaques-et-vols',
        type: ChannelType.GuildForum,
        parent: catSignalementsMembres.id,
        topic: 'Ouvrez un sujet pour signaler une arnaque, un vol de compte/serveur, ou des offres frauduleuses.',
        availableTags: [
          { name: '💸 Arnaque', emoji: { name: '💸' } },
          { name: '🔑 Vol Compte/Serveur', emoji: { name: '🔑' } },
          { name: '⚠️ Frauduleux', emoji: { name: '⚠️' } },
          { name: '✅ Traité', emoji: { name: '✅' } }
        ]
      });

      // CAT 3 : SIGNALEMENTS SERVEURS (FORUMS PAR THÈME - Réservé Membres)
      const catSignalementsServeurs = await guild.channels.create({
        name: '⚠️ │ SIGNALEMENTS SERVEURS (FORUMS)',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleMembre.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.SendMessagesInThreads, PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.AttachFiles] },
          { id: roleMuted.id, deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.SendMessagesInThreads] }
        ]
      });

      const forumRaids = await guild.channels.create({
        name: '⚔️-raids-et-attaques',
        type: ChannelType.GuildForum,
        parent: catSignalementsServeurs.id,
        topic: 'Ouvrez un sujet pour signaler un raid de serveur, une attaque de bot malveillant, un nuke ou du spam massif.',
        availableTags: [
          { name: '⚔️ Raid En Cours', emoji: { name: '⚔️' } },
          { name: '🤖 Bot Malveillant', emoji: { name: '🤖' } },
          { name: '💥 Nuke', emoji: { name: '💥' } },
          { name: '✅ Traité', emoji: { name: '✅' } }
        ]
      });

      const forumToxiques = await guild.channels.create({
        name: '⚠️-serveurs-toxiques-ou-illégaux',
        type: ChannelType.GuildForum,
        parent: catSignalementsServeurs.id,
        topic: 'Ouvrez un sujet pour signaler un serveur ne respectant pas les TOS Discord, du contenu illégal ou malveillant.',
        availableTags: [
          { name: '⚠️ Violation TOS', emoji: { name: '⚠️' } },
          { name: '🔞 Contenu Illégal', emoji: { name: '🔞' } },
          { name: '🏴‍☠️ Malveillant', emoji: { name: '🏴‍☠️' } },
          { name: '✅ Traité', emoji: { name: '✅' } }
        ]
      });

      const chPreuves = await guild.channels.create({ name: '📑-dossiers-et-preuves', type: ChannelType.GuildText, parent: catSignalementsServeurs.id });

      // CAT 4 : ESPACE TICKETS & SUPPORT (Accessible après obtention du rôle Membre)
      const catTickets = await guild.channels.create({
        name: '📩 │ ESPACE TICKETS & SUPPORT',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleMembre.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chTicket = await guild.channels.create({ name: '🎫-ouvrir-un-ticket', type: ChannelType.GuildText, parent: catTickets.id });

      // Catégorie réservée où les nouveaux tickets seront créés
      const catTicketsOuverts = await guild.channels.create({
        name: '📩 │ TICKETS OUVERTS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleSafecordTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      // CAT 5 : ESPACE JURIDIQUE & SÉCURITÉ (ÉLARGI - Réservé Membres)
      const catJuridique = await guild.channels.create({
        name: '⚖️ │ ESPACE JURIDIQUE & SÉCURITÉ',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleMembre.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chTosDiscord = await guild.channels.create({ name: '📜-tos-et-charte-discord', type: ChannelType.GuildText, parent: catJuridique.id });
      const chMineursJuridique = await guild.channels.create({ name: '🔞-protection-des-mineurs', type: ChannelType.GuildText, parent: catJuridique.id });
      const chHarcèlementJuridique = await guild.channels.create({ name: '⚖️-harcèlement-et-cybercriminalité', type: ChannelType.GuildText, parent: catJuridique.id });
      const chDoxxingJuridique = await guild.channels.create({ name: '⛔-forceurs-doxxing-et-vie-privée', type: ChannelType.GuildText, parent: catJuridique.id });
      const chAutoritesOfficiels = await guild.channels.create({ name: '🛡️-signalements-autorités-officiels', type: ChannelType.GuildText, parent: catJuridique.id });

      // CAT 6 : ENTRAIDE INTER-SERVEURS (Strictement réservé aux Staffs & Fondateurs vérifiés)
      const catEntraide = await guild.channels.create({
        name: '🤝 │ ENTRAIDE INTER-SERVEURS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const chEntraideModo = await guild.channels.create({
        name: '🛡️-entraide-modo',
        type: ChannelType.GuildText,
        parent: catEntraide.id,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleStaffOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleCoOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleSafecordTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chEntraideFonda = await guild.channels.create({
        name: '👑-entraide-fonda-admin',
        type: ChannelType.GuildText,
        parent: catEntraide.id,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleCoOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleSafecordTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      // CAT 7 : ESPACE COMMUNAUTÉ & ÉCHANGES (Réservé Membres)
      const catCommunaute = await guild.channels.create({
        name: '🌐 │ ESPACE COMMUNAUTÉ & ÉCHANGES',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleMembre.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chGeneral = await guild.channels.create({ name: '💬-général', type: ChannelType.GuildText, parent: catCommunaute.id });
      
      const chGeneralFonda = await guild.channels.create({
        name: '👑-général-fonda',
        type: ChannelType.GuildText,
        parent: catCommunaute.id,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleCoOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chGeneralStaff = await guild.channels.create({
        name: '🛡️-général-staff',
        type: ChannelType.GuildText,
        parent: catCommunaute.id,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleStaffOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleCoOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleSafecordTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chPresentationServeurs = await guild.channels.create({ name: '📜-présentation-serveurs', type: ChannelType.GuildText, parent: catCommunaute.id });
      const chRecensementStaff = await guild.channels.create({ name: '📋-recensement-staff', type: ChannelType.GuildText, parent: catCommunaute.id });

      // CAT 8 : ÉQUIPE SAFECORD & INTERNE (Privé Staff Safecord)
      const catInterne = await guild.channels.create({
        name: '🔒 │ ÉQUIPE SAFECORD & INTERNE',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleSafecordTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      await guild.channels.create({ name: '🔒-discussion-interne', type: ChannelType.GuildText, parent: catInterne.id });
      await guild.channels.create({ name: '🔒-traitement-signalements', type: ChannelType.GuildText, parent: catInterne.id });
      const chSignalementsDiscordDirect = await guild.channels.create({ name: '🚨-signalements-officiels-discord', type: ChannelType.GuildText, parent: catInterne.id });
      await guild.channels.create({ name: '🔒-logs-signalements', type: ChannelType.GuildText, parent: catInterne.id });

      // CAT 9 : SALONS VOCAUX (Réservé Membres & Staff)
      const catVocaux = await guild.channels.create({
        name: '🔊 │ SALONS VOCAUX',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleMembre.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] }
        ]
      });

      await guild.channels.create({ name: '🔊 Report General', type: ChannelType.GuildVoice, parent: catVocaux.id });
      await guild.channels.create({
        name: '🛡️ Vocal Staff Inter-Serveur',
        type: ChannelType.GuildVoice,
        parent: catVocaux.id,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleStaffOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
          { id: roleCoOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
          { id: roleOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
          { id: roleSafecordTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] }
        ]
      });

      await guild.channels.create({
        name: '👑 Vocal Fonda & Admin',
        type: ChannelType.GuildVoice,
        parent: catVocaux.id,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
          { id: roleCoOwnerOther.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] }
        ]
      });

      await guild.channels.create({
        name: '🔒 Vocal Direction',
        type: ChannelType.GuildVoice,
        parent: catVocaux.id,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] }
        ]
      });

      await interaction.editReply({ content: '⚙️ **[4/6] Publication du Règlement avec Auto-Rôle et des Consignes...**' });

      // ── 3. PUBLICATION DES EMBEDS D'INFORMATIONS & REGLEMENT ────────────────

      // Embed Règlement avec Auto-Rôle MEMBRE Uniquement & Règle du Pseudo NomDeServeur
      const embedReglement = new EmbedBuilder()
        .setTitle('📜 RÈGLEMENT OFFICIEL SAFECORD & CHARTE DISCORD TOS')
        .setDescription(
          `Bienvenue sur le réseau central de protection et de signalement **Safecord**.\n\n` +
          `🔒 **ÉTAPES D'ACCÈS AU SERVEUR :**\n` +
          `1️⃣ **Étape 1 :** Cliquez sur le bouton ci-dessous pour accepter le règlement et recevoir le rôle <@&${roleMembre.id}>. Cela débloquera l'accès à l'espace Ticket et aux salons de base.\n` +
          `2️⃣ **Étape 2 :** Rendez-vous dans <#${chTicket.id}> et ouvrez un **Ticket de Présentation**.\n` +
          `3️⃣ **Étape 3 :** Un membre de l'**<@&${roleSafecordTeam.id}>** vérifiera votre serveur et vous attribuera vos accès exclusifs (<@&${roleOwnerOther.id}>, <@&${roleCoOwnerOther.id}>, <@&${roleStaffOther.id}>).\n\n` +
          `📌 **OBLIGATION PSEUDO & NOM DE SERVEUR :**\n` +
          `Chaque membre arrivant sur ce serveur **DOIT obligatoirement ajouter le nom de son serveur à côté de son pseudo Discord** (Exemple : **Pseudo | NomDeVotreServeur**).\n\n` +
          `**1. Respect des TOS Discord :** L'ensemble des membres et du staff doit respecter à 100 % les Conditions d'Utilisation de Discord (Terms of Service) et les Directives de la Communauté.\n\n` +
          `**2. Preuves Obligatoires :** Tout signalement doit être accompagné de captures d'écran NON censurées et de l'ID Discord complet des personnes ou serveurs incriminés.\n\n` +
          `**3. Interdiction Absolue de Faux Signalement :** Tout faux signalement ou diffamation entraînera un bannissement définitif immédiat et un blacklisting.`
        )
        .setColor('#E74C3C')
        .setFooter({ text: `${guild.name} • Protection & Accès Sécurisé Safecord` })
        .setTimestamp();

      const btnReglementMembre = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`autorole_${roleMembre.id}`)
          .setLabel('✅ Accepter le Règlement & Obtenir le rôle Membre')
          .setStyle(ButtonStyle.Success)
      );

      await chReglement.send({ embeds: [embedReglement], components: [btnReglementMembre] });

      // Embed Obtention des Rôles Staff Inter-Serveur (Procédure par Ticket)
      const embedRolesProc = new EmbedBuilder()
        .setTitle('🎭 OBTENTION DES RÔLES STAFF & FONDATEUR INTER-SERVEUR')
        .setDescription(
          `Afin de garantir la sécurité du réseau **Safecord**, les rôles de statut ne sont **PAS attribués automatiquement**.\n\n` +
          `📌 **Condition préalable :** N'oubliez pas de renommer votre pseudo sur ce serveur sous la forme : **Pseudo | NomDeVotreServeur**.\n\n` +
          `**Comment obtenir votre rôle ?**\n` +
          `Si vous êtes Fondateur, Co-Fondateur ou membre du Staff d'un autre serveur Discord, vous devez **ouvrir un ticket de présentation** dans <#${chTicket.id}>.\n\n` +
          `>>> **Rôles soumis à vérification par l'Équipe Safecord :**\n` +
          `• <@&${roleOwnerOther.id}>\n` +
          `• <@&${roleCoOwnerOther.id}>\n` +
          `• <@&${roleStaffOther.id}>\n\n` +
          `Un membre de l'**<@&${roleSafecordTeam.id}>** vérifiera vos informations et vous attribuera vos rôles officiels.`
        )
        .setColor('#9B59B6')
        .setFooter({ text: `${guild.name} • Vérification des Rôles` })
        .setTimestamp();

      await chRolesPres.send({ embeds: [embedRolesProc] });

      // Embed Consignes & Forums
      const embedConsignes = new EmbedBuilder()
        .setTitle('📌 CONSIGNES POUR EFFECTUER UN SIGNALEMENT DANS LES FORUMS')
        .setDescription(
          `Afin que votre signalement soit classé et traité rapidement par l'**<@&${roleSafecordTeam.id}>**, rendez-vous dans le salon **FORUM** correspondant au thème de votre signalement :\n\n` +
          `🚨 **SIGNALEMENTS MEMBRES :**\n` +
          `• <#${forumHarcèlement.id}> : Harcèlement, cyberharcèlement, menaces ou chantage.\n` +
          `• <#${forumForceurs.id}> : Forceurs insistants, doxxing, divulgation d'infos privées.\n` +
          `• <#${forumMineurs.id}> : Danger mineur, comportement inapproprié envers mineurs.\n` +
          `• <#${forumArnaques.id}> : Arnaques, vols de compte/serveur, offres frauduleuses.\n\n` +
          `⚠️ **SIGNALEMENTS SERVEURS :**\n` +
          `• <#${forumRaids.id}> : Raids en cours, spams massifs, bots malveillants, nukes.\n` +
          `• <#${forumToxiques.id}> : Serveurs ne respectant pas les TOS Discord ou contenus illégaux.\n\n` +
          `>>> **Format du Post Forum :**\n` +
          `• **Titre du post :** [PSEUDO / NOM SERVEUR] - Motif du signalement\n` +
          `• **ID Discord du membre/serveur :** (Ex: 123456789012345678)\n` +
          `• **Description :** Explication synthétique et précise des faits.\n` +
          `• **Preuves :** Déposez les captures d'écran dans le post.`
        )
        .setColor('#3498DB')
        .setFooter({ text: `${guild.name} • Protocoles de Signalement Forums` })
        .setTimestamp();

      await chConsignes.send({ embeds: [embedConsignes] });

      await interaction.editReply({ content: '⚙️ **[5/6] Publication des Embeds Juridiques complets et du Système de Tickets Safecord...**' });

      // ── 4. PUBLICATION DES EMBEDS JURIDIQUES COMPLETS ──────────────────────────

      // 1. TOS Discord
      const embedTos = new EmbedBuilder()
        .setTitle('📜 TOS DISCORD & DIRECTIVES DE LA COMMUNAUTÉ')
        .setDescription(
          `Ce serveur applique et fait respecter strictement les règles officielles de Discord :\n\n` +
          `• **Conditions d'utilisation (TOS) :** https://dis.gd/tos\n` +
          `• **Directives de la Communauté :** https://dis.gd/guidelines\n\n` +
          `**Règles Clés :**\n` +
          `1. Interdiction d'utiliser des comptes d'auto-bot ou de raider des serveurs.\n` +
          `2. Interdiction de diffuser du contenu piraté ou d'encourager la fraude.\n` +
          `3. Obligation de signaler tout contenu à caractère pédopornographique ou illégal.`
        )
        .setColor('#5865F2')
        .setFooter({ text: `${guild.name} • TOS Discord` })
        .setTimestamp();

      await chTosDiscord.send({ embeds: [embedTos] });

      // 2. Protection des Mineurs
      const embedMineurs = new EmbedBuilder()
        .setTitle('🔞 PROTECTION DES MINEURS & CADRE LÉGAL')
        .setDescription(
          `La protection des mineurs est la priorité absolue du réseau Safecord.\n\n` +
          `• **Article 227-23 du Code Pénal :** La fixation, l'enregistrement ou la transmission d'images à caractère pornographique d'un mineur est punie de 5 ans d'emprisonnement et 75 000 € d'amende.\n` +
          `• **Grooming & Sollicitation :** Tout propos à caractère sexuel ou inapproprié orienté vers un mineur entraîne un bannissement immédiat et un signalement direct aux autorités.`
        )
        .setColor('#E74C3C')
        .setFooter({ text: `${guild.name} • Protection Mineurs` })
        .setTimestamp();

      await chMineursJuridique.send({ embeds: [embedMineurs] });

      // 3. Harcèlement & Cybercriminalité
      const embedHarcèlement = new EmbedBuilder()
        .setTitle('⚖️ CYBERHARCÈLEMENT, MENACES & DIFFAMATION')
        .setDescription(
          `Le harcèlement en ligne et les menaces répétées constituent des délits graves pénalement sanctionnés.\n\n` +
          `• **Article 222-33-2-2 du Code Pénal :** Le fait de harceler une personne par des propos ou comportements répétés est puni de 2 ans d'emprisonnement et 30 000 € d'amende.\n` +
          `• **Menaces et Chantage :** Les menaces de mort ou d'atteinte aux personnes font l'objet d'un dépôt de plainte immédiat.`
        )
        .setColor('#E67E22')
        .setFooter({ text: `${guild.name} • Lutte Cyberharcèlement` })
        .setTimestamp();

      await chHarcèlementJuridique.send({ embeds: [embedHarcèlement] });

      // 4. Forceurs, Doxxing & Atteinte à la vie privée
      const embedDoxxing = new EmbedBuilder()
        .setTitle('⛔ DOXXING, FORCEURS & ATTEINTE À LA VIE PRIVÉE')
        .setDescription(
          `Le respect de la vie privée et des données personnelles est garanti par la loi.\n\n` +
          `• **Article 226-1 du Code Pénal :** La divulgation d'informations personnelles (nom réel, adresse, téléphone, photos privées) sans le consentement de la personne est punie d'1 an d'emprisonnement et 45 000 € d'amende.\n` +
          `• **Forceurs & Comportement Intrusif :** Harceler en privé une personne malgré son refus constitue une atteinte au droit au respect de la vie privée.`
        )
        .setColor('#C0392B')
        .setFooter({ text: `${guild.name} • Protection Vie Privée` })
        .setTimestamp();

      await chDoxxingJuridique.send({ embeds: [embedDoxxing] });

      // 5. Autorités & Organismes Officiels
      const embedAutorites = new EmbedBuilder()
        .setTitle('🛡️ ORGANISMES OFFICIELS & SIGNALEMENT GOUVERNEMENTAL')
        .setDescription(
          `En cas de danger immédiat ou de délit grave, contactez les plateformes officielles :\n\n` +
          `• 🌐 **PHAROS (Gouvernement Français) :** https://www.internet-signalement.gouv.fr\n` +
          `• 📞 **3018 (Net Écoute - Cyberharcèlement Mineurs) :** Appel gratuit au 3018\n` +
          `• 🚨 **Police / Gendarmerie :** Composez le 17 ou le 112 en cas d'urgence.\n` +
          `• 🛡️ **Cybermalveillance.gouv.fr :** Assistance aux victimes de cyberattaques.`
        )
        .setColor('#2ECC71')
        .setFooter({ text: `${guild.name} • Liens Officiels` })
        .setTimestamp();

      await chAutoritesOfficiels.send({ embeds: [embedAutorites] });

      // 6. Signalements Directs Discord Trust & Safety (Espace Interne Équipe Safecord)
      const embedDiscordDirect = new EmbedBuilder()
        .setTitle('🚨 TRANSMISSION DIRECTE DISCORD TRUST & SAFETY')
        .setDescription(
          `Guide pour l'**<@&${roleSafecordTeam.id}>** afin de transmettre un dossier grave directement à Discord Trust & Safety :\n\n` +
          `1. 🌐 **Lien du Formulaire Officiel Discord :** https://dis.gd/report\n` +
          `2. 📄 **Sélectionner la catégorie :** (Trust & Safety / Child Safety / Harassment / Hateful Conduct)\n` +
          `3. 🔗 **Copier le lien du message Discord :** (Clic droit sur le message incriminé -> Copier le lien du message)\n` +
          `4. 🆔 **Fournir les IDs :** ID du membre incriminé, ID du salon, ID du serveur.\n` +
          `5. 🛡️ **En cas de danger mineur (CSAM) :** Signaler également sur https://report.cybertip.org`
        )
        .setColor('#E74C3C')
        .setFooter({ text: `${guild.name} • Procédure Interne Équipe Safecord` })
        .setTimestamp();

      await chSignalementsDiscordDirect.send({ embeds: [embedDiscordDirect] });

      // Enregistrer l'option de ticket dans la base de données
      const { db } = require('../../database/db');
      try {
        db.prepare(`
          INSERT OR REPLACE INTO ticket_options (guild_id, value, label, description, emoji, category_id, support_role_id)
          VALUES (?, 'report', 'Présentation & Signalement Safecord', 'Ouvrir un ticket pour présentation ou signalement', '🎫', ?, ?)
        `).run(guild.id, catTicketsOuverts.id, roleSafecordTeam.id);
      } catch (e) {}

      // Embed Ticket Présentation & Signalement
      const embedTicket = new EmbedBuilder()
        .setTitle('📩 ESPACE TICKETS — PRÉSENTATION STAFF & SIGNALEMENT CONFIDENTIEL')
        .setDescription(
          `Bienvenue dans l'espace Ticket de **Safecord** !\n\n` +
          `📌 **RAPPEL OBLIGATOIRE :** Avant d'ouvrir votre ticket, merci d'avoir ajouté le nom de votre serveur à côté de votre pseudo (Exemple : **Pseudo | NomDeVotreServeur**).\n\n` +
          `**Pourquoi ouvrir un ticket ?**\n` +
          `• 🎭 **Présentation Staff / Fonda :** Pour vous présenter, nous indiquer votre serveur et votre rôle afin qu'un membre de l'**<@&${roleSafecordTeam.id}>** vous attribue vos accès officiels (<@&${roleOwnerOther.id}>, <@&${roleCoOwnerOther.id}>, <@&${roleStaffOther.id}>).\n` +
          `• 🔒 **Signalement Confidentiel :** Pour échanger en toute confidentialité avec la <@&${roleDirection.id}> et l'**<@&${roleSafecordTeam.id}>**.\n\n` +
          `Cliquez sur le bouton ci-dessous pour ouvrir votre salon de ticket privé !`
        )
        .setColor('#9B59B6')
        .setFooter({ text: `${guild.name} • Support & Vérification Safecord` })
        .setTimestamp();

      const btnTicket = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_open_report')
          .setLabel('🎫 Ouvrir un Ticket (Présentation / Signalement)')
          .setStyle(ButtonStyle.Primary)
      );

      await chTicket.send({ embeds: [embedTicket], components: [btnTicket] });

      await interaction.editReply({ content: '⚙️ **[6/6] Finalisation de la configuration...**' });

      // ── 5. RESUME FINAL ─────────────────────────────────────────────────────
      const summaryEmbed = new EmbedBuilder()
        .setTitle('✅ SERVEUR SAFECORD SÉCURISÉ CRÉÉ AVEC SUCCÈS !')
        .setDescription(
          `Le serveur de signalement et de protection inter-serveurs **Safecord** est maintenant **100 % opérationnel** !\n\n` +
          `🔒 **PERMISSIONS EN ARRIVANT :**\n` +
          `• Les nouveaux membres ont accès **UNIQUEMENT** à <#${chReglement.id}>.\n` +
          `• Clic sur la validation du règlement -> Obtention du rôle <@&${roleMembre.id}>.\n` +
          `• Le rôle <@&${roleMembre.id}> débloque le salon de tickets <#${chTicket.id}> et la communauté de base.\n` +
          `• Les salons Staff/Fonda (<#${chGeneralStaff.id}>, <#${chGeneralFonda.id}>...) sont **dévérouillés uniquement après vérification par l'Équipe Safecord dans un Ticket** !\n\n` +
          `📌 **RÈGLE DU PSEUDO :** Mentionnée dans le règlement (` `Pseudo | NomDeVotreServeur` `).`
        )
        .setColor('#2ECC71')
        .setTimestamp();

      await interaction.editReply({ content: '🎉 **Purge complète et création du Serveur Safecord (Permissions progressives + Ticket obligatoire) terminées avec succès !**', embeds: [summaryEmbed] });

      // Supprimer l'ancien salon de lancement s'il existe toujours
      if (currentChannelId && guild.channels.cache.has(currentChannelId)) {
        setTimeout(async () => {
          const oldCh = guild.channels.cache.get(currentChannelId);
          if (oldCh) await oldCh.delete('Nettoyage final salon de lancement').catch(() => null);
        }, 4000);
      }

      return;

    } catch (error) {
      console.error('Erreur lors du setup du serveur report :', error);
      return interaction.editReply({
        content: `❌ Une erreur est survenue lors de la création du serveur report : ${error.message}`
      });
    }
  }
};
