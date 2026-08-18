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
    .setDescription('🔨 Créer et configurer automatiquement un serveur de Signalement & Protection Inter-Serveurs')
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

      await interaction.editReply({ content: '⚙️ **[2/4] Création des catégories et des salons de signalement...**' });

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

      // CAT 2 : SIGNALEMENTS & REPORTS
      const catSignalements = await guild.channels.create({
        name: '🚨 │ SIGNALEMENTS & REPORTS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
          { id: roleMuted.id, deny: [PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chSignalementMembre = await guild.channels.create({ name: '🚨-signalement-membre', type: ChannelType.GuildText, parent: catSignalements.id });
      const chSignalementServeur = await guild.channels.create({ name: '⚠️-signalement-serveur', type: ChannelType.GuildText, parent: catSignalements.id });
      const chPreuves = await guild.channels.create({ name: '📑-dossiers-et-preuves', type: ChannelType.GuildText, parent: catSignalements.id });

      // CAT 3 : ESPACE TICKETS & SUPPORT
      const catTickets = await guild.channels.create({
        name: '📩 │ ESPACE TICKETS & SUPPORT',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const chTicket = await guild.channels.create({ name: '🎫-ouvrir-un-ticket', type: ChannelType.GuildText, parent: catTickets.id });

      // CAT 4 : ENTRAIDE INTER-SERVEURS
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

      // CAT 5 : ESPACE COMMUNAUTÉ & ÉCHANGES
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

      // CAT 6 : ÉQUIPE REPORT & INTERNE (Privé Staff Report)
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

      // CAT 7 : SALONS VOCAUX
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
          `**2. Preuves Obligatoires :** Tout signalement doit être accompagné de capturs d'écran NON censurées et de l'ID Discord complet (` `<@ID>` `) des personnes ou serveurs incriminés.\n\n` +
          `**3. Interdiction Absolue de Faux Signalement :** Tout faux signalement ou diffamation entraînera un bannissement définitif immédiat et un blacklisting.\n\n` +
          `**4. Confidentialité :** Pour les cas extrêmement graves ou sensibles, utilisez le salon <#${chTicket.id}> pour échanger en privé avec la <@&${roleReportTeam.id}>.`
        )
        .setColor('#E74C3C')
        .setFooter({ text: `${guild.name} • Protection & Sécurité Inter-Serveurs` })
        .setTimestamp();

      await chReglement.send({ embeds: [embedReglement] });

      // Embed Consignes
      const embedConsignes = new EmbedBuilder()
        .setTitle('📌 CONSIGNES POUR EFFECTUER UN SIGNALEMENT VALIDE')
        .setDescription(
          `Afin que votre signalement soit traité rapidement par la <@&${roleReportTeam.id}>, merci de respecter le format suivant :\n\n` +
          `**Formats de Signalement :**\n` +
          `• 👤 **Signalement Membre :** Publiez dans <#${chSignalementMembre.id}>\n` +
          `• 🌐 **Signalement Serveur :** Publiez dans <#${chSignalementServeur.id}>\n` +
          `• 📑 **Dépôt de Preuves :** Ajoutez vos screenshots dans <#${chPreuves.id}>\n\n` +
          `>>> **Modèle de Message :**\n` +
          `• **Type de grief :** (Harcèlement / Forceur / Mineur / Raid / Arnaque)\n` +
          `• **ID Discord du membre/serveur :** (Ex: 123456789012345678)\n` +
          `• **Description rapide :** Explication claire des faits.\n` +
          `• **Preuves :** Captures d'écran jointes.`
        )
        .setColor('#3498DB')
        .setFooter({ text: `${guild.name} • Protocoles de Signalement` })
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
        .setTitle('✅ SERVEUR REPORT & PROTECTION CRÉÉ AVEC SUCCÈS !')
        .setDescription(
          `Le serveur de signalement et de protection inter-serveurs est maintenant **100 % opérationnel** !\n\n` +
          `**Rôles créés :**\n` +
          `• <@&${roleDirection.id}> (Créateur / Direction)\n` +
          `• <@&${roleReportTeam.id}> (Équipe Modération & Report)\n` +
          `• <@&${roleOwnerOther.id}> (Fondateurs partenaires)\n` +
          `• <@&${roleCoOwnerOther.id}> (Co-Fondateurs partenaires)\n` +
          `• <@&${roleStaffOther.id}> (Staffs inter-serveurs)\n` +
          `• <@&${roleMembre.id}> / <@&${roleMuted.id}>\n\n` +
          `**Salons clés :**\n` +
          `• Règlement : <#${chReglement.id}>\n` +
          `• Consignes : <#${chConsignes.id}>\n` +
          `• Signalements : <#${chSignalementMembre.id}> & <#${chSignalementServeur.id}>\n` +
          `• Tickets : <#${chTicket.id}>\n` +
          `• Entraide Staff : <#${chEntraideModo.id}> & <#${chEntraideFonda.id}>`
        )
        .setColor('#2ECC71')
        .setTimestamp();

      return interaction.editReply({ content: '🎉 **Création terminée !**', embeds: [summaryEmbed] });

    } catch (error) {
      console.error('Erreur lors du setup du serveur report :', error);
      return interaction.editReply({
        content: `❌ Une erreur est survenue lors de la création du serveur report : ${error.message}`
      });
    }
  }
};
