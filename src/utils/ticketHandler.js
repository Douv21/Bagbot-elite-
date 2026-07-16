const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const { db, getActiveTicket, addActiveTicket, deleteActiveTicket } = require('../database/db');

async function handleTicketInteraction(interaction, client) {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const customId = interaction.customId;

  // Handler du Bouton Unique "Ouvrir ticket" (filtrage dynamique)
  if (customId === 'ticket_open_button') {
    const options = db.prepare('SELECT * FROM ticket_options WHERE guild_id = ?').all(guildId);
    if (options.length === 0) {
      return interaction.reply({ content: '❌ Aucune catégorie de ticket n\'est configurée pour ce serveur.', ephemeral: true });
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

    // Filtrer les catégories
    const availableOptions = options.filter(opt => {
      if (isStaff) return true;
      const reqRoleId = (opt.required_role_id && opt.required_role_id !== 'null' && opt.required_role_id !== 'undefined') ? opt.required_role_id.trim() : null;
      if (!reqRoleId || reqRoleId === '') return true;
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
  if (customId.startsWith('ticket_open_') || (customId === 'ticket_select' && interaction.isStringSelectMenu()) || (customId === 'ticket_open_filtered' && interaction.isStringSelectMenu())) {
    let value = '';
    if (customId.startsWith('ticket_open_')) {
      value = customId.substring('ticket_open_'.length);
    } else {
      value = interaction.values[0];
    }

    // Récupérer l'option depuis la base de données
    const option = db.prepare('SELECT * FROM ticket_options WHERE guild_id = ? AND value = ?').get(guildId, value);
    if (!option) {
      return interaction.reply({ content: '❌ Catégorie de ticket introuvable.', ephemeral: true });
    }

    const member = interaction.member;

    // Vérifier les permissions de rôle requis pour utiliser cette option
    const reqRoleId = (option.required_role_id && option.required_role_id !== 'null' && option.required_role_id !== 'undefined') ? option.required_role_id.trim() : null;
    if (reqRoleId && reqRoleId !== '' && !member.roles.cache.has(reqRoleId)) {
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

    // Créer le salon
    const channelName = `ticket-${option.value}-${interaction.user.username}`.substring(0, 100);
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: permissionOverwrites,
      topic: `Ticket ouvert par ${interaction.user.tag} dans la catégorie ${option.label}.`
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
      .setTitle(`🎫 Ticket d'Assistance — ${option.label}`)
      .setDescription(option.description ? option.description.replace(/{user}/g, `<@${interaction.user.id}>`) : `Bonjour <@${interaction.user.id}> !\nLe personnel a été notifié et prendra en charge votre demande rapidement. N'hésitez pas à décrire votre problème en détail.\n\nPour fermer ce ticket, cliquez sur le bouton 🔒 ci-dessous.`)
      .setColor('#5865F2')
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Fermer 🔒')
        .setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({ embeds: [welcomeEmbed], components: [row] });

    // Pings des membres et rôles
    let pingUsers = [];
    try {
      pingUsers = JSON.parse(option.ping_users || '[]');
    } catch (e) {}

    let pingContent = '';
    supportRoles.forEach(roleId => {
      pingContent += `<@&${roleId}> `;
    });
    pingUsers.forEach(userId => {
      pingContent += `<@${userId}> `;
    });

    if (pingContent.trim().length > 0) {
      const pingMsg = await ticketChannel.send({ content: pingContent });
      // Supprimer le ping après 1.5 seconde
      setTimeout(() => pingMsg.delete().catch(() => null), 1500);
    }

    await interaction.followUp({ content: `✅ Votre ticket a été créé avec succès dans <#${ticketChannel.id}>.`, ephemeral: true });
  }

  // 2. DEMANDE DE FERMETURE
  else if (customId === 'ticket_close') {
    const active = getActiveTicket(interaction.channelId);
    if (!active) {
      return interaction.reply({ content: '❌ Ce salon n\'est pas un ticket actif ou a déjà été clôturé.', ephemeral: true });
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
}

module.exports = { handleTicketInteraction };
