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

    // Déterminer s'il s'agit d'une Suite Privée / VIP
    const isSuite = /suite|privat|prive|vip/i.test(option.value) || /suite|privat|prive|vip/i.test(option.label);
    const prefix = isSuite ? '👑┆suite-' : '🎫┆ticket-';

    // Créer le salon
    const channelName = `${prefix}${option.value}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9\-_]/g, '-').substring(0, 100);
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: permissionOverwrites,
      topic: isSuite 
        ? `👑 Suite Privée VIP appartenant à ${interaction.user.tag}. Espace sécurisé et confidentiel.`
        : `🎫 Ticket ouvert par ${interaction.user.tag} dans la catégorie ${option.label}.`
    }).catch(async (err) => {
      console.error(err);
      await interaction.followUp({ content: '❌ Impossible de créer le salon du ticket. Vérifiez mes permissions.', ephemeral: true });
      return null;
    });

    if (!ticketChannel) return;

    // Enregistrer le ticket en base de données
    addActiveTicket(ticketChannel.id, guildId, member.id, option.id);

    // Embed de bienvenue dans le ticket / Suite Privée
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(isSuite ? `👑 🛋️ ✨ SUITE PRIVÉE VIP & PRIVATIVE ✨ 🛋️ 👑` : `🎫 ✨ TICKET D'ASSISTANCE — ${option.label}`)
      .setDescription(
        option.description 
          ? option.description.replace(/{user}/g, `<@${interaction.user.id}>`) 
          : isSuite
            ? `Bonjour <@${interaction.user.id}> et bienvenue dans votre **Suite Privée VIP** !\n\n*Cet espace haut de gamme et entièrement sécurisé est votre havre d'intimité d'exception. Vous et vos invités triés sur le volet pouvez échanger en toute discrétion et confidentialité.*\n\n>>> **"Un havre d'intimité, de luxe et de volupté réservé à l'élite..."** 🥂💋\n\nPour gérer ou clôturer cette suite, utilisez les boutons ci-dessous.`
            : `Bonjour <@${interaction.user.id}> !\nLe personnel a été notifié et prendra en charge votre demande rapidement. N'hésitez pas à décrire votre problème en détail.\n\nPour fermer ce ticket, cliquez sur le bouton 🔒 ci-dessous.`
      )
      .setColor(isSuite ? '#F1C40F' : '#5865F2')
      .setTimestamp();

    if (option.image_url) {
      welcomeEmbed.setImage(option.image_url);
    }

    const buttons = [
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Prendre en charge 🙋‍♂️')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_assign')
        .setLabel('Assigner 👤')
        .setStyle(ButtonStyle.Primary)
    ];

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

    const row = new ActionRowBuilder().addComponents(buttons);

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
      components: [row] 
    });

    await interaction.followUp({ content: `✅ Votre ticket a été créé avec succès dans <#${ticketChannel.id}>.`, ephemeral: true });
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

    await interaction.reply({ content: '📁 **Fermeture du ticket dans 5 secondes...**' });

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
    
    if (claimedField) {
      return interaction.reply({ content: '❌ Ce ticket est déjà pris en charge par un autre membre du personnel.', ephemeral: true });
    }

    embed.addFields({ name: '🙋‍♂️ Pris en charge par', value: `<@${interaction.user.id}>`, inline: true });
    
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
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
    }

    const targetUserId = interaction.values[0];
    const messages = await interaction.channel.messages.fetch({ limit: 50 });
    const welcomeMsg = messages.find(m => m.embeds.length > 0 && m.embeds[0].title && m.embeds[0].title.startsWith("🎫 Ticket d'Assistance"));
    
    if (welcomeMsg) {
      const embed = EmbedBuilder.from(welcomeMsg.embeds[0]);
      const currentFields = embed.data.fields || [];
      const newFields = currentFields.filter(f => f.name !== '🙋‍♂️ Pris en charge par');
      newFields.push({ name: '🙋‍♂️ Pris en charge par', value: `<@${targetUserId}>`, inline: true });
      embed.setFields(newFields);
      
      await welcomeMsg.edit({ embeds: [embed] });
    }

    await interaction.channel.setTopic(`Ticket assigné à <@${targetUserId}>.`).catch(() => {});
    await interaction.reply({ content: `👤 Le ticket a été assigné à <@${targetUserId}>.` });
  }

  else if (customId === 'ticket_manage_member') {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
    }

    const manageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_add_member_btn')
        .setLabel('Ajouter un membre ➕')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_remove_member_btn')
        .setLabel('Retirer un membre ➖')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ content: '👥 **Que souhaitez-vous faire ?**', components: [manageRow], ephemeral: true });
  }

  else if (customId === 'ticket_add_member_btn') {
    const isStaff = await checkIsTicketStaff(interaction);
    if (!isStaff) {
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
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
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
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
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
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
      return interaction.reply({ content: '❌ Cette action est réservée au personnel d\'assistance.', ephemeral: true });
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

  // Propriétaire du serveur et administrateurs
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

  const allStaffRoles = new Set([...supportRoles, ...pingRoles]);
  return member.roles.cache.some(role => allStaffRoles.has(role.id));
}

module.exports = { handleTicketInteraction };
