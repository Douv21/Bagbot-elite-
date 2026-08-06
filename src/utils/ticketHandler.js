const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const { db, getActiveTicket, addActiveTicket, deleteActiveTicket } = require('../database/db');

async function handleTicketInteraction(interaction, client) {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const customId = interaction.customId;

  // Handler du Bouton Unique "Ouvrir ticket" (filtrage dynamique)
  if (customId === 'ticket_open_button') {
    let options = db.prepare('SELECT * FROM ticket_options WHERE guild_id = ?').all(guildId);
    
    // Si le panel spécifie des catégories autorisées, on filtre
    if (interaction.message && interaction.message.id) {
      const panel = db.prepare('SELECT * FROM ticket_panels WHERE message_id = ?').get(interaction.message.id);
      if (panel && panel.allowed_options) {
        try {
          const allowed = JSON.parse(panel.allowed_options);
          if (Array.isArray(allowed) && allowed.length > 0) {
            options = options.filter(opt => allowed.includes(opt.value));
          }
        } catch (e) {}
      }
    }

    if (options.length === 0) {
      return interaction.reply({ content: '❌ Aucune catégorie de ticket n\'est configurée pour ce panel.', ephemeral: true });
    }

    const member = interaction.member;
    const memberRoles = member.roles.cache.map(r => r.id);

    // Collecter tous les rôles support
    const allSupportRoles = new Set();
    options.forEach(opt => {
      try {
        const roles = JSON.parse(opt.support_roles || '[]');
        roles.forEach(r => allSupportRoles.add(r));
      } catch (e) {}
    });

    const isStaff = memberRoles.some(roleId => allSupportRoles.has(roleId)) || member.permissions.has(PermissionFlagsBits.Administrator);

    // Filtrer les catégories de manière stricte et sécurisée
    const availableOptions = options.filter(opt => {
      // Le propriétaire du serveur et les administrateurs voient tout
      if (member.id === interaction.guild.ownerId || member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
      }

      // Si le membre fait partie des rôles de support de cette option spécifique, il y a accès
      let optionSupportRoles = [];
      try {
        optionSupportRoles = JSON.parse(opt.support_roles || '[]');
      } catch (e) {}
      const isSupportForThisOption = memberRoles.some(roleId => optionSupportRoles.includes(roleId));
      if (isSupportForThisOption) return true;

      // Sinon, on vérifie le rôle requis pour cette option
      const reqRoleId = (opt.required_role_id && opt.required_role_id !== 'null' && opt.required_role_id !== 'undefined') ? opt.required_role_id.trim() : null;
      if (!reqRoleId || reqRoleId === '') return true; // Accessible à tous si aucun rôle requis
      return memberRoles.includes(reqRoleId);
    });

    if (availableOptions.length === 0) {
      return interaction.reply({ content: '❌ Aucune catégorie de ticket n\'est accessible avec vos rôles actuels.', ephemeral: true });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('ticket_open_filtered')
      .setPlaceholder('Sélectionnez une catégorie...')
      .setMinValues(1)
      .setMaxValues(1);

    const opts = availableOptions.slice(0, 25).map(opt => {
      const item = {
        label: opt.label,
        value: opt.value
      };
      if (opt.emoji) {
        item.emoji = opt.emoji;
      }
      return item;
    });

    select.addOptions(opts);
    const row = new ActionRowBuilder().addComponents(select);

    return interaction.reply({
      content: '🎫 **Choisissez une catégorie pour ouvrir un ticket :**',
      components: [row],
      ephemeral: true
    });
  }

  // 1. OUVERTURE DE TICKET
  if (
    (customId.startsWith('ticket_open_') && customId !== 'ticket_open_filtered') ||
    (customId === 'ticket_select' && interaction.isStringSelectMenu()) ||
    (customId === 'ticket_open_filtered' && interaction.isStringSelectMenu())
  ) {
    let value = '';
    if (interaction.isStringSelectMenu()) {
      value = interaction.values[0];
    } else {
      value = customId.substring('ticket_open_'.length);
    }

    // Récupérer l'option depuis la base de données
    const option = db.prepare('SELECT * FROM ticket_options WHERE guild_id = ? AND value = ?').get(guildId, value);
    if (!option) {
      return interaction.reply({ content: '❌ Catégorie de ticket introuvable.', ephemeral: true });
    }

    const member = interaction.member;

    // Vérifier les permissions de rôle requis pour utiliser cette option (avec bypass administrateurs & propriétaire)
    const isOwnerOrAdmin = member.id === interaction.guild.ownerId || member.permissions.has(PermissionFlagsBits.Administrator);
    const reqRoleId = (option.required_role_id && option.required_role_id !== 'null' && option.required_role_id !== 'undefined') ? option.required_role_id.trim() : null;
    if (reqRoleId && reqRoleId !== '' && !member.roles.cache.has(reqRoleId) && !isOwnerOrAdmin) {
      return interaction.reply({ 
        content: `❌ Vous devez avoir le rôle <@&${reqRoleId}> pour pouvoir ouvrir ce type de ticket.`, 
        ephemeral: true 
      });
    }

    // Vérifier s'il y a déjà un ticket actif pour cet utilisateur dans cette catégorie
    const existing = db.prepare('SELECT * FROM active_tickets WHERE guild_id = ? AND user_id = ? AND option_id = ?').get(guildId, member.id, option.id);
    if (existing) {
      const existingChannel = interaction.guild.channels.cache.get(existing.channel_id);
      if (existingChannel) {
        return interaction.reply({ 
          content: `❌ Vous avez déjà un ticket ouvert dans cette catégorie : <#${existing.channel_id}>.`, 
          ephemeral: true 
        });
      } else {
        // Le salon a été supprimé manuellement, on nettoie en base de données
        deleteActiveTicket(existing.channel_id);
      }
    }

    await interaction.deferReply({ ephemeral: true });

    // Configurer les permissions initiales
    const permissionOverwrites = [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ];

    // Toujours donner l'accès au propriétaire du serveur (Owner)
    if (interaction.guild.ownerId && interaction.guild.ownerId !== interaction.user.id) {
      permissionOverwrites.push({
        id: interaction.guild.ownerId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageRoles
        ]
      });
    }

    // Rôles de support ayant accès au ticket
    let supportRoles = [];
    try {
      supportRoles = JSON.parse(option.support_roles || '[]');
    } catch (e) {}

    supportRoles.forEach(roleId => {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    });

    // Déterminer la catégorie parente
    let parentId = option.category_id || null;
    if (parentId) {
      const parentChannel = interaction.guild.channels.cache.get(parentId);
      if (!parentChannel || parentChannel.type !== ChannelType.GuildCategory) {
        parentId = null;
      }
    }

    // Déterminer l'émoji et le slug du ticket selon la catégorie / option
    let emoji = '🎫';
    let catSlug = 'ticket';

    if (/recrutement|staff|mod/i.test(option.value) || /recrutement|staff|mod/i.test(option.label)) {
      emoji = '🛡️';
      catSlug = 'staff';
    } else if (/plainte|report|signalement/i.test(option.value) || /plainte|report|signalement/i.test(option.label)) {
      emoji = '⚠️';
      catSlug = 'plainte';
    } else if (/partenariat|collab/i.test(option.value) || /partenariat|collab/i.test(option.label)) {
      emoji = '🤝';
      catSlug = 'partenariat';
    } else if (/boutique|achat|shop/i.test(option.value) || /boutique|achat|shop/i.test(option.label)) {
      emoji = '💎';
      catSlug = 'boutique';
    } else if (/vip|premium/i.test(option.value) || /vip|premium/i.test(option.label)) {
      emoji = '👑';
      catSlug = 'vip';
    }

    const cleanUser = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanOpt = option.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const channelName = `${emoji}・${catSlug}-${cleanOpt}-${cleanUser}`.substring(0, 95);
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: permissionOverwrites,
      topic: `🎫 Ticket ouvert par ${interaction.user.tag} dans la catégorie ${option.label}.`
    }).catch(async (err) => {
      console.error(err);
      await interaction.followUp({ content: '❌ Impossible de créer le salon du ticket. Vérifiez mes permissions.', ephemeral: true });
      return null;
    });

    if (!ticketChannel) return;

    // Enregistrer le ticket en base de données
    addActiveTicket(ticketChannel.id, guildId, member.id, option.id);

    // Embed de bienvenue dans le ticket
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`🎫 ✨ TICKET D'ASSISTANCE — ${option.label}`)
      .setDescription(
        option.description 
          ? option.description.replace(/{user}/g, `<@${interaction.user.id}>`) 
          : `Bonjour <@${interaction.user.id}> !\nLe personnel a été notifié et prendra en charge votre demande rapidement. N'hésitez pas à décrire votre demande en détail.\n\nPour fermer ce ticket, cliquez sur le bouton 🔒 ci-dessous.`
      )
      .setColor('#5865F2')
      .setTimestamp();

    if (option.image_url) {
      welcomeEmbed.setImage(option.image_url);
    }

    const buttons = [];

    if (option.require_age_verification === 1) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ticket_verify_age')
          .setLabel(`Vérifier d'âge (${option.min_age_required || 18}+) 🔐`)
          .setStyle(ButtonStyle.Primary)
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Prendre en charge 🙋‍♂️')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_assign')
        .setLabel('Assigner 👤')
        .setStyle(ButtonStyle.Primary)
    );

    if (option.show_member_button !== 0) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ticket_member')
          .setLabel('Membre 👥')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if (option.show_certify_button !== 0) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ticket_certify')
          .setLabel('Certifier ✅')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Fermer 🔒')
        .setStyle(ButtonStyle.Danger)
    );

    const actionRows = [];
    while (buttons.length > 0) {
      actionRows.push(new ActionRowBuilder().addComponents(buttons.splice(0, 5)));
    }

    // Pings des rôles
    let pingRoles = [];
    try {
      pingRoles = JSON.parse(option.ping_users || '[]');
    } catch (e) {}

    let pingContent = '';
    const allPings = new Set();
    supportRoles.forEach(roleId => allPings.add(roleId));
    pingRoles.forEach(roleId => allPings.add(roleId));

    allPings.forEach(roleId => {
      pingContent += `<@&${roleId}> `;
    });

    await ticketChannel.send({ 
      content: pingContent.trim() || undefined, 
      embeds: [welcomeEmbed], 
      components: actionRows 
    });

    await interaction.followUp({ content: `✅ Votre ticket a été créé avec succès dans <#${ticketChannel.id}>.`, ephemeral: true });
  }

  // 1b. DEMANDE DE VÉRIFICATION D'ÂGE
  else if (customId === 'ticket_verify_age') {
    const active = getActiveTicket(interaction.channelId);
    if (!active) {
      return interaction.reply({ content: '❌ Ce salon n\'est pas un ticket actif.', ephemeral: true });
    }

    const option = db.prepare('SELECT * FROM ticket_options WHERE id = ?').get(active.option_id);
    const minAge = option ? (option.min_age_required || 18) : 18;

    const crypto = require('crypto');
    const token = crypto.randomUUID ? crypto.randomUUID() : `age_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const { createAgeVerificationSession } = require('../database/db');
    createAgeVerificationSession(token, interaction.guildId, interaction.user.id, interaction.channelId, minAge);

    const verifyUrl = `https://82.65.75.176:49602/verify-age.html?token=${token}`;

    const embed = new EmbedBuilder()
      .setTitle('🔞 Vérification d\'Âge Requise')
      .setDescription(
        `Pour faire valider votre majorité (**${minAge} ans et +**), cliquez sur le bouton ci-dessous pour ouvrir la page de vérification sécurisée.\n\n` +
        `• **Méthodes au choix** : 📸 Reconnaissance Faciale ou 📄 Carte d'Identité / Passeport\n` +
        `• **Confidentialité** : Aucune photo n'est conservée ni stockée sur le serveur.\n\n` +
        `👉 [**Cliquer ici pour accéder à la vérification**](${verifyUrl})`
      )
      .setColor('#D4AF37');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Accéder à la vérification 🔗')
        .setStyle(ButtonStyle.Link)
        .setURL(verifyUrl)
    );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // 2. DEMANDE DE FERMETURE
  else if (customId === 'ticket_close') {
    const active = getActiveTicket(interaction.channelId);
    if (!active) {
      return interaction.reply({ content: '❌ Ce salon n\'est pas un ticket actif ou a déjà été clôturé.', ephemeral: true });
    }

    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🔒 Fermeture du Ticket')
      .setDescription('Êtes-vous sûr de vouloir fermer ce ticket ? Cette action supprimera définitivement le salon.')
      .setColor('#F04747');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close_confirm')
        .setLabel('Confirmer ⚠️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket_close_cancel')
        .setLabel('Annuler ❌')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // 3. CONFIRMATION DE FERMETURE
  else if (customId === 'ticket_close_confirm') {
    const active = getActiveTicket(interaction.channelId);
    if (!active) {
      return interaction.reply({ content: '❌ Ce salon n\'est pas un ticket actif.', ephemeral: true });
    }

    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
    }

    await interaction.reply({ content: '📁 **Génération du transcript et fermeture du ticket dans 5 secondes...**' });

    // Générer et envoyer le transcript détaillé dans les logs
    const { generateAndSendTicketTranscript } = require('./transcriptGenerator');
    await generateAndSendTicketTranscript(interaction.channel, interaction.member).catch(err => {
      console.error('Erreur lors de la création du transcript :', err);
    });

    setTimeout(async () => {
      deleteActiveTicket(interaction.channelId);
      await interaction.channel.delete().catch(() => null);
    }, 5000);
  }

  // 4. ANNULATION DE FERMETURE
  else if (customId === 'ticket_close_cancel') {
    await interaction.message.delete().catch(() => null);
  }

  // --- ACTIONS DE GESTION DE TICKET ---

  else if (customId === 'ticket_claim') {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
    }

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const currentFields = embed.data.fields || [];
    const claimedField = currentFields.find(f => f.name === '🙋‍♂️ Pris en charge par');
    
    if (claimedField && claimedField.value === `<@${interaction.user.id}>`) {
      return interaction.reply({ content: '❌ Vous avez déjà pris en charge ce ticket.', ephemeral: true });
    }

    const newFields = currentFields.filter(f => f.name !== '🙋‍♂️ Pris en charge par');
    newFields.push({ name: '🙋‍♂️ Pris en charge par', value: `<@${interaction.user.id}>`, inline: true });
    embed.setFields(newFields);
    
    await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true
    }).catch(() => {});

    await interaction.message.edit({ embeds: [embed] });
    await interaction.channel.setTopic(`Ticket pris en charge par ${interaction.user.tag}.`).catch(() => {});
    await interaction.reply({ content: `🙋‍♂️ <@${interaction.user.id}> a pris en charge ce ticket.` });
  }

  else if (customId === 'ticket_assign') {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
    }

    const { UserSelectMenuBuilder } = require('discord.js');
    const select = new UserSelectMenuBuilder()
      .setCustomId('ticket_assign_select')
      .setPlaceholder('Sélectionnez un membre du staff...')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(select);
    await interaction.reply({ content: '👤 **Choisissez le membre du personnel à qui assigner ce ticket :**', components: [row], ephemeral: true });
  }

  else if (customId === 'ticket_assign_select' && interaction.isUserSelectMenu()) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate().catch(() => {});
      }

      const isStaff = await checkIsTicketStaff(interaction);
      if (!isStaff) {
        return interaction.followUp({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true }).catch(() => {});
      }

      const targetUserId = interaction.values[0];

      // Donner immédiatement les permissions au membre du staff dans le salon du ticket
      await interaction.channel.permissionOverwrites.edit(targetUserId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      }).catch(err => console.error('Error updating ticket channel permissions:', err));

      // Rechercher le message de bienvenue du bot dans les 50 derniers messages
      const messages = await interaction.channel.messages.fetch({ limit: 50 }).catch(() => new Map());
      const welcomeMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0);
      
      if (welcomeMsg) {
        const embed = EmbedBuilder.from(welcomeMsg.embeds[0]);
        const currentFields = embed.data.fields || [];
        const newFields = currentFields.filter(f => f.name !== '🙋‍♂️ Pris en charge par');
        newFields.push({ name: '🙋‍♂️ Pris en charge par', value: `<@${targetUserId}>`, inline: true });
        embed.setFields(newFields);
        
        await welcomeMsg.edit({ embeds: [embed] }).catch(err => console.error('Error updating welcome embed:', err));
      }

      const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
      const targetTag = targetUser ? targetUser.tag : targetUserId;

      await interaction.channel.setTopic(`Ticket assigné à ${targetTag}.`).catch(() => {});
      await interaction.channel.send({ content: `👤 Le ticket a été assigné à <@${targetUserId}> par <@${interaction.user.id}>.` }).catch(() => {});
      await interaction.editReply({ content: `✅ Ticket assigné avec succès à <@${targetUserId}>.`, components: [] }).catch(() => {});
    } catch (err) {
      console.error('Erreur dans ticket_assign_select:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ Une erreur est survenue lors de l\'assignation du ticket.', ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ Une erreur est survenue lors de l\'assignation du ticket.', ephemeral: true }).catch(() => {});
      }
    }
  }

  else if (customId === 'ticket_member') {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Seuls les membres de l\'équipe support mentionnés à l\'ouverture peuvent effectuer cette action. Vous ne pouvez pas exécuter cette action sur votre propre ticket.', ephemeral: true });
    }

    await interaction.deferReply();

    const active = getActiveTicket(interaction.channelId);
    if (!active) {
      return interaction.editReply({ content: '❌ Impossible de trouver le ticket actif.' });
    }

    const option = db.prepare('SELECT * FROM ticket_options WHERE guild_id = ? AND id = ?').get(guildId, active.option_id);
    if (!option) {
      return interaction.editReply({ content: '❌ Configuration de ticket introuvable.' });
    }

    const ticketCreator = await interaction.guild.members.fetch(active.user_id).catch(() => null);
    if (!ticketCreator) {
      return interaction.editReply({ content: '❌ Membre introuvable sur le serveur.' });
    }

    let rolesToAdd = [];
    let rolesToRemove = [];
    try { rolesToAdd = JSON.parse(option.member_roles_add || '[]'); } catch (e) {}
    try { rolesToRemove = JSON.parse(option.member_roles_remove || '[]'); } catch (e) {}

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      return interaction.editReply({ content: '❌ Aucun rôle "Membre" n\'a été configuré dans le Dashboard pour cette catégorie de ticket.' });
    }

    let addedList = [];
    let removedList = [];

    for (const rId of rolesToAdd) {
      const role = interaction.guild.roles.cache.get(rId);
      if (role && !ticketCreator.roles.cache.has(rId)) {
        await ticketCreator.roles.add(role).catch(console.error);
        addedList.push(`<@&${rId}>`);
      }
    }

    for (const rId of rolesToRemove) {
      const role = interaction.guild.roles.cache.get(rId);
      if (role && ticketCreator.roles.cache.has(rId)) {
        await ticketCreator.roles.remove(role).catch(console.error);
        removedList.push(`<@&${rId}>`);
      }
    }

    let roleMsg = '';
    if (addedList.length > 0) roleMsg += `\n➕ Rôles ajoutés : ${addedList.join(', ')}`;
    if (removedList.length > 0) roleMsg += `\n➖ Rôles retirés : ${removedList.join(', ')}`;

    // Mettre à jour l'embed de bienvenue du ticket
    const messages = await interaction.channel.messages.fetch({ limit: 25 }).catch(() => null);
    const welcomeMsg = messages ? messages.find(m => m.embeds.length > 0 && m.embeds[0].title && m.embeds[0].title.includes("TICKET D'ASSISTANCE")) : null;

    if (welcomeMsg) {
      const embed = EmbedBuilder.from(welcomeMsg.embeds[0]);
      const currentFields = embed.data.fields || [];
      const newFields = currentFields.filter(f => f.name !== '👥 Membre validé par');
      newFields.push({ name: '👥 Membre validé par', value: `<@${interaction.user.id}>`, inline: true });
      embed.setFields(newFields);
      await welcomeMsg.edit({ embeds: [embed] }).catch(console.error);
    }

    await interaction.editReply({ content: `👥 **Statut Membre attribué à <@${active.user_id}> par <@${interaction.user.id}> !**${roleMsg}` });
  }

  else if (customId === 'ticket_certify') {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Seuls les membres de l\'équipe support mentionnés à l\'ouverture peuvent effectuer cette action. Vous ne pouvez pas exécuter cette action sur votre propre ticket.', ephemeral: true });
    }

    await interaction.deferReply();

    const active = getActiveTicket(interaction.channelId);
    if (!active) {
      return interaction.editReply({ content: '❌ Impossible de trouver le ticket actif.' });
    }

    const option = db.prepare('SELECT * FROM ticket_options WHERE guild_id = ? AND id = ?').get(guildId, active.option_id);
    if (!option) {
      return interaction.editReply({ content: '❌ Configuration de ticket introuvable.' });
    }

    const ticketCreator = await interaction.guild.members.fetch(active.user_id).catch(() => null);
    if (!ticketCreator) {
      return interaction.editReply({ content: '❌ Membre introuvable sur le serveur.' });
    }

    let rolesToAdd = [];
    let rolesToRemove = [];
    try { rolesToAdd = JSON.parse(option.certify_roles_add || '[]'); } catch (e) {}
    try { rolesToRemove = JSON.parse(option.certify_roles_remove || '[]'); } catch (e) {}

    let addedList = [];
    let removedList = [];

    for (const rId of rolesToAdd) {
      const role = interaction.guild.roles.cache.get(rId);
      if (role && !ticketCreator.roles.cache.has(rId)) {
        await ticketCreator.roles.add(role).catch(console.error);
        addedList.push(`<@&${rId}>`);
      }
    }

    for (const rId of rolesToRemove) {
      const role = interaction.guild.roles.cache.get(rId);
      if (role && ticketCreator.roles.cache.has(rId)) {
        await ticketCreator.roles.remove(role).catch(console.error);
        removedList.push(`<@&${rId}>`);
      }
    }

    let roleMsg = '';
    if (addedList.length > 0) roleMsg += `\n➕ Rôles certifiés ajoutés : ${addedList.join(', ')}`;
    if (removedList.length > 0) roleMsg += `\n➖ Rôles retirés : ${removedList.join(', ')}`;

    // Mettre à jour l'embed de bienvenue du ticket
    const messages = await interaction.channel.messages.fetch({ limit: 25 }).catch(() => null);
    const welcomeMsg = messages ? messages.find(m => m.embeds.length > 0 && m.embeds[0].title && m.embeds[0].title.includes("TICKET D'ASSISTANCE")) : null;

    if (welcomeMsg) {
      const embed = EmbedBuilder.from(welcomeMsg.embeds[0]);
      const currentFields = embed.data.fields || [];
      const newFields = currentFields.filter(f => f.name !== '✅ Certification');
      newFields.push({ name: '✅ Certification', value: `Membre certifié par <@${interaction.user.id}>`, inline: true });
      embed.setFields(newFields);
      await welcomeMsg.edit({ embeds: [embed] }).catch(console.error);
    }

    await interaction.editReply({ content: `✅ **Membre certifié par <@${interaction.user.id}> !**${roleMsg}` });
  }

  else if (customId === 'ticket_add_member_btn') {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Seuls les membres de l\'équipe support mentionnés à l\'ouverture peuvent effectuer cette action.', ephemeral: true });
    }

    const { UserSelectMenuBuilder } = require('discord.js');
    const select = new UserSelectMenuBuilder()
      .setCustomId('ticket_add_member_select')
      .setPlaceholder('Sélectionnez le membre à ajouter...')
      .setMinValues(1)
      .setMaxValues(1);
    const row = new ActionRowBuilder().addComponents(select);
    await interaction.reply({ content: '➕ **Choisissez le membre à ajouter au ticket :**', components: [row], ephemeral: true });
  }

  else if (customId === 'ticket_remove_member_btn') {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Seuls les membres de l\'équipe support mentionnés à l\'ouverture peuvent effectuer cette action.', ephemeral: true });
    }

    const { UserSelectMenuBuilder } = require('discord.js');
    const select = new UserSelectMenuBuilder()
      .setCustomId('ticket_remove_member_select')
      .setPlaceholder('Sélectionnez le membre à retirer...')
      .setMinValues(1)
      .setMaxValues(1);
    const row = new ActionRowBuilder().addComponents(select);
    await interaction.reply({ content: '➖ **Choisissez le membre à retirer du ticket :**', components: [row], ephemeral: true });
  }

  else if (customId === 'ticket_add_member_select' && interaction.isUserSelectMenu()) {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Seuls les membres de l\'équipe support mentionnés à l\'ouverture peuvent effectuer cette action.', ephemeral: true });
    }

    const targetUserId = interaction.values[0];
    await interaction.channel.permissionOverwrites.create(targetUserId, {
      ViewChannel: true,
      SendMessages: true,
      EmbedLinks: true,
      AttachFiles: true,
      ReadMessageHistory: true
    });
    await interaction.reply({ content: `➕ <@${targetUserId}> a été ajouté au ticket.` });
  }

  else if (customId === 'ticket_remove_member_select' && interaction.isUserSelectMenu()) {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Seuls les membres de l\'équipe support mentionnés à l\'ouverture peuvent effectuer cette action.', ephemeral: true });
    }

    const targetUserId = interaction.values[0];
    await interaction.channel.permissionOverwrites.delete(targetUserId);
    await interaction.reply({ content: `➖ <@${targetUserId}> a été retiré du ticket.` });
  }
}

async function checkIsTicketStaff(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;
  if (!guild || !member) return false;

  // Propriétaire du serveur et administrateurs (toujours autorisés, même sur leur propre ticket)
  if (member.id === guild.ownerId || member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // Récupérer le ticket actif depuis la BDD
  const activeTicket = getActiveTicket(interaction.channelId);
  if (!activeTicket) return false;

  const option = db.prepare('SELECT * FROM ticket_options WHERE guild_id = ? AND id = ?').get(guild.id, activeTicket.option_id);
  if (!option) return false;

  let supportRoles = [];
  try {
    supportRoles = JSON.parse(option.support_roles || '[]');
  } catch (e) {}

  let pingRoles = [];
  try {
    pingRoles = JSON.parse(option.ping_users || '[]');
  } catch (e) {}

  // Si le membre possède un rôle support/staff, il est autorisé même s'il a ouvert le ticket
  const allStaffRoles = new Set([...supportRoles, ...pingRoles]);
  return member.roles.cache.some(role => allStaffRoles.has(role.id));
}

module.exports = { handleTicketInteraction };
