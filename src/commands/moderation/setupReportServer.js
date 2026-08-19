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
    .setDescription('🔨 Créer un serveur de Signalement & Protection Inter-Serveurs (Forums)')
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

    try {
      await interaction.editReply({ content: '⚙️ **[1/4] Création des rôles en cours...**' });

      // ── 1. CREATION DES ROLES ────────────────────────────────────────────────
      const roleDirection = await guild.roles.create({
        name: '👑 Direction',
        color: '#FFD700',
        hoist: true,
        mentionable: true,
        permissions: [PermissionsBitField.Flags.Administrator],
        reason: 'Setup Serveur Report'
      });

      const roleReportTeam = await guild.roles.create({
        name: '🛡️ Équipe Report',
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
        reason: 'Setup Serveur Report'
      });

      const roleOwnerOther = await guild.roles.create({
        name: '👑 Owner Inter-Serveur',
        color: '#9B59B6',
        hoist: true,
        mentionable: true,
        reason: 'Setup Serveur Report'
      });

      const roleCoOwnerOther = await guild.roles.create({
        name: '🤝 Co-Owner Inter-Serveur',
        color: '#3498DB',
        hoist: true,
        mentionable: true,
        reason: 'Setup Serveur Report'
      });

      const roleStaffOther = await guild.roles.create({
        name: '⚡ Staff Inter-Serveur',
        color: '#2ECC71',
        hoist: true,
        mentionable: true,
        reason: 'Setup Serveur Report'
      });

      const roleMembre = await guild.roles.create({
        name: '✨ Membre',
        color: '#95A5A6',
        hoist: true,
        reason: 'Setup Serveur Report'
      });

      const roleMuted = await guild.roles.create({
        name: '🔇 Muet',
        color: '#7F8C8D',
        reason: 'Setup Serveur Report'
      });

      // Attribuer le rôle Direction au créateur du serveur
      if (interaction.member) {
        await interaction.member.roles.add(roleDirection).catch(() => null);
      }

      await interaction.editReply({ content: '⚙️ **[2/4] Création des catégories, forums par thème et salons...**' });

      // ── 2. CREATION DES CATEGORIES & SALONS ──────────────────────────────────

      // CAT 1 : ACCUEIL & INFORMATIONS
      const catAccueil = await guild.channels.create({
        name: '📌 │ ACCUEIL & INFORMATIONS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] },
          { id: roleReportTeam.id, allow: [PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chReglement = await guild.channels.create({ name: '📜-règlement-report', type: ChannelType.GuildText, parent: catAccueil.id });
      const chConsignes = await guild.channels.create({ name: '📌-consignes-signalements', type: ChannelType.GuildText, parent: catAccueil.id });
      const chBienvenue = await guild.channels.create({ name: '👋-bienvenue', type: ChannelType.GuildText, parent: catAccueil.id });
      const chRoles = await guild.channels.create({ name: '🎭-rôles', type: ChannelType.GuildText, parent: catAccueil.id });

      // CAT 2 : SIGNALEMENTS MEMBRES (FORUMS PAR THÈME)
      const catSignalementsMembres = await guild.channels.create({
        name: '🚨 │ SIGNALEMENTS MEMBRES (FORUMS)',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.SendMessagesInThreads, PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.AttachFiles] },
          { id: roleMuted.id, deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.SendMessagesInThreads] }
        ]
      });

      // Forum Harcèlement
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

      // Forum Forceurs & Doxxing
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

      // Forum Danger Mineurs
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

      // Forum Arnaques & Vols
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

      // CAT 3 : SIGNALEMENTS SERVEURS (FORUMS PAR THÈME)
      const catSignalementsServeurs = await guild.channels.create({
        name: '⚠️ │ SIGNALEMENTS SERVEURS (FORUMS)',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.SendMessagesInThreads, PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.AttachFiles] },
          { id: roleMuted.id, deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.SendMessagesInThreads] }
        ]
      });

      // Forum Raids
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

      // Forum Serveurs Toxiques & Illégaux
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

      // Salon Dépôt de Preuves
      const chPreuves = await guild.channels.create({ name: '📑-dossiers-et-preuves', type: ChannelType.GuildText, parent: catSignalementsServeurs.id });

      // CAT 4 : ESPACE TICKETS & SUPPORT
      const catTickets = await guild.channels.create({
        name: '📩 │ ESPACE TICKETS & SUPPORT',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chTicket = await guild.channels.create({ name: '🎫-ouvrir-un-ticket', type: ChannelType.GuildText, parent: catTickets.id });

      // CAT 5 : ENTRAIDE INTER-SERVEURS
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
          { id: roleReportTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
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
          { id: roleReportTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      // CAT 6 : ESPACE COMMUNAUTÉ & ÉCHANGES
      const catCommunaute = await guild.channels.create({
        name: '🌐 │ ESPACE COMMUNAUTÉ & ÉCHANGES',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
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
          { id: roleReportTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chPresentationServeurs = await guild.channels.create({ name: '📜-présentation-serveurs', type: ChannelType.GuildText, parent: catCommunaute.id });
      const chRecensementStaff = await guild.channels.create({ name: '📋-recensement-staff', type: ChannelType.GuildText, parent: catCommunaute.id });
      const chJuridiqueSecu = await guild.channels.create({ name: '⚖️-juridique-et-sécurité', type: ChannelType.GuildText, parent: catCommunaute.id });

      // CAT 7 : ÉQUIPE REPORT & INTERNE (Privé Staff Report)
      const catInterne = await guild.channels.create({
        name: '🔒 │ ÉQUIPE REPORT & INTERNE',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleReportTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleDirection.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      await guild.channels.create({ name: '🔒-discussion-interne', type: ChannelType.GuildText, parent: catInterne.id });
      await guild.channels.create({ name: '🔒-traitement-signalements', type: ChannelType.GuildText, parent: catInterne.id });
      await guild.channels.create({ name: '🔒-logs-signalements', type: ChannelType.GuildText, parent: catInterne.id });

      // CAT 8 : SALONS VOCAUX
      const catVocaux = await guild.channels.create({
        name: '🔊 │ SALONS VOCAUX',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] }
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
          { id: roleReportTeam.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
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

      await interaction.editReply({ content: '⚙️ **[3/4] Publication des Embeds d\'information et de règlement...**' });

      // ── 3. PUBLICATION DES EMBEDS D'INFORMATIONS ────────────────────────────

      // Embed Règlement
      const embedReglement = new EmbedBuilder()
        .setTitle('📜 RÈGLEMENT OFFICIEL — SERVEUR DE SIGNALEMENT & PROTECTION')
        .setDescription(
          `Bienvenue sur la plateforme centrale de signalement et de protection inter-serveurs.\n\n` +
          `**1. Utilité & Objectif :** Ce serveur permet de recenser, traiter et diffuser les signalements de comportements graves (harcèlement, forceurs, mineurs en danger, arnaqueurs, raids).\n\n` +
          `**2. Preuves Obligatoires :** Tout signalement doit être accompagné de captures d'écran NON censurées et de l'ID Discord complet des personnes ou serveurs incriminés.\n\n` +
          `**3. Interdiction Absolue de Faux Signalement :** Tout faux signalement ou diffamation entraînera un bannissement définitif immédiat et un blacklisting.\n\n` +
          `**4. Confidentialité :** Pour les cas extrêmement graves ou sensibles, utilisez le salon <#${chTicket.id}> pour échanger en privé avec la <@&${roleReportTeam.id}>.`
        )
        .setColor('#E74C3C')
        .setFooter({ text: `${guild.name} • Protection & Sécurité Inter-Serveurs` })
        .setTimestamp();

      await chReglement.send({ embeds: [embedReglement] });

      // Embed Consignes & Forums
      const embedConsignes = new EmbedBuilder()
        .setTitle('📌 CONSIGNES POUR EFFECTUER UN SIGNALEMENT DANS LES FORUMS')
        .setDescription(
          `Afin que votre signalement soit classé et traité rapidement par la <@&${roleReportTeam.id}>, rendez-vous dans le salon **FORUM** correspondant au thème de votre signalement :\n\n` +
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

      // Embed Juridique & Sécurité
      const embedJuridique = new EmbedBuilder()
        .setTitle('⚖️ JURIDIQUE, SÉCURITÉ & CONDITIONS DISCORD (TOS)')
        .setDescription(
          `Ce serveur opère dans le respect strict des Conditions d'Utilisation de Discord (TOS) et de la législation en vigueur.\n\n` +
          `• 🛡️ **Protection des Mineurs :** Tout contenu suspect impliquant des mineurs est immédiatement transmis et signalé aux autorités compétentes et à l'équipe Discord Trust & Safety.\n` +
          `• ⚖️ **Harcèlement & Cyberharcèlement :** Le harcèlement ciblé est sévèrement réprimé par les lois sur la cybercriminalité.\n` +
          `• 🔒 **Droit à l'image & Données Personnelles :** Le doxxing (divulgation d'informations personnelles privées telles qu'adresse ou identité réelle) est formellement interdit.`
        )
        .setColor('#F1C40F')
        .setFooter({ text: `${guild.name} • Cadre Légal & Sécurité` })
        .setTimestamp();

      await chJuridiqueSecu.send({ embeds: [embedJuridique] });

      // Enregistrer l'option de ticket dans la base de données
      const { db } = require('../../database/db');
      try {
        db.prepare(`
          INSERT OR REPLACE INTO ticket_options (guild_id, value, label, description, emoji, category_id, support_role_id)
          VALUES (?, 'report', 'Signalement & Support', 'Ouvrir un ticket de signalement confidentiel', '🎫', ?, ?)
        `).run(guild.id, catTickets.id, roleReportTeam.id);
      } catch (e) {}

      // Embed Ticket
      const embedTicket = new EmbedBuilder()
        .setTitle('📩 ESPACE TICKETS — SIGNALEMENT PRIVÉ & CONFIDENTIEL')
        .setDescription(
          `Vous souhaitez effectuer un signalement en toute confidentialité ou échanger directement avec la <@&${roleDirection.id}> et l'<@&${roleReportTeam.id}> ?\n\n` +
          `Cliquez sur le bouton ci-dessous pour ouvrir votre salon de ticket privé !`
        )
        .setColor('#9B59B6')
        .setFooter({ text: `${guild.name} • Support Confidentiel` })
        .setTimestamp();

      const btnTicket = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_open_report')
          .setLabel('🎫 Ouvrir un Ticket Confidentiel')
          .setStyle(ButtonStyle.Primary)
      );

      await chTicket.send({ embeds: [embedTicket], components: [btnTicket] });

      await interaction.editReply({ content: '⚙️ **[4/4] Finalisation de la configuration...**' });

      // ── 4. RESUME FINAL ─────────────────────────────────────────────────────
      const summaryEmbed = new EmbedBuilder()
        .setTitle('✅ SERVEUR REPORT (FORUMS PAR THÈME) CRÉÉ AVEC SUCCÈS !')
        .setDescription(
          `Le serveur de signalement et de protection inter-serveurs avec **Forums par Thème** est maintenant **100 % opérationnel** !\n\n` +
          `**Forums Signalements Membres :**\n` +
          `• <#${forumHarcèlement.id}>\n` +
          `• <#${forumForceurs.id}>\n` +
          `• <#${forumMineurs.id}>\n` +
          `• <#${forumArnaques.id}>\n\n` +
          `**Forums Signalements Serveurs :**\n` +
          `• <#${forumRaids.id}>\n` +
          `• <#${forumToxiques.id}>\n\n` +
          `**Salons clés :**\n` +
          `• Consignes : <#${chConsignes.id}>\n` +
          `• Preuves : <#${chPreuves.id}>\n` +
          `• Tickets : <#${chTicket.id}>\n` +
          `• Entraide Staff : <#${chEntraideModo.id}> & <#${chEntraideFonda.id}>`
        )
        .setColor('#2ECC71')
        .setTimestamp();

      return interaction.editReply({ content: '🎉 **Création du Serveur Report (Forums) terminée !**', embeds: [summaryEmbed] });

    } catch (error) {
      console.error('Erreur lors du setup du serveur report :', error);
      return interaction.editReply({
        content: `❌ Une erreur est survenue lors de la création du serveur report : ${error.message}`
      });
    }
  }
};
