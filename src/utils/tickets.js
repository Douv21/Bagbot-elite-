const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { getTicketPanel, getTicketOptions, updateTicketPanel } = require('../database/db');

async function sendOrUpdateTicketPanel(guildId, client) {
  const panelConfig = getTicketPanel(guildId);
  const options = getTicketOptions(guildId);

  if (!panelConfig.channel_id) return { success: false, error: "Aucun salon configuré pour le panel." };

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { success: false, error: "Guilde introuvable." };

  const channel = await guild.channels.fetch(panelConfig.channel_id).catch(() => null);
  if (!channel) return { success: false, error: "Salon introuvable ou inaccessible." };

  // Créer l'embed
  const embed = new EmbedBuilder()
    .setTitle(panelConfig.title || '🎫 Support / Tickets')
    .setDescription(panelConfig.description || 'Sélectionnez ou cliquez sur le bouton correspondant pour ouvrir un ticket d\'assistance.')
    .setColor(panelConfig.color || '#5865F2')
    .setTimestamp();

  if (panelConfig.thumbnail) {
    embed.setThumbnail(guild.iconURL() || null);
  }

  // Créer les composants
  let components = [];
  
  if (options.length > 0) {
    if (panelConfig.selector_type === 'buttons') {
      const rows = [];
      let currentRow = new ActionRowBuilder();

      options.forEach((opt, idx) => {
        if (idx > 0 && idx % 5 === 0) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }

        let style = ButtonStyle.Primary;
        if (opt.button_style === 'Secondary') style = ButtonStyle.Secondary;
        if (opt.button_style === 'Success') style = ButtonStyle.Success;
        if (opt.button_style === 'Danger') style = ButtonStyle.Danger;

        const button = new ButtonBuilder()
          .setCustomId(`ticket_open_${opt.value}`)
          .setLabel(opt.label)
          .setStyle(style);

        if (opt.emoji) {
          button.setEmoji(opt.emoji);
        }

        currentRow.addComponents(button);
      });

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }
      components = rows;
    } else if (panelConfig.selector_type === 'single_button') {
      // Bouton unique
      const button = new ButtonBuilder()
        .setCustomId('ticket_open_button')
        .setLabel('🎫 Ouvrir un ticket')
        .setStyle(ButtonStyle.Primary);
      components = [new ActionRowBuilder().addComponents(button)];
    } else {
      // Menu déroulant
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_select')
        .setPlaceholder('Sélectionnez une catégorie pour ouvrir un ticket...');

      const selectOptions = options.map(opt => {
        const item = {
          label: opt.label,
          value: opt.value,
          description: `Ouvrir un ticket pour : ${opt.label}`
        };
        if (opt.emoji) {
          item.emoji = opt.emoji;
        }
        return item;
      });

      selectMenu.addOptions(selectOptions);
      components = [new ActionRowBuilder().addComponents(selectMenu)];
    }
  }

  let message = null;
  if (panelConfig.message_id) {
    message = await channel.messages.fetch(panelConfig.message_id).catch(() => null);
  }

  if (message) {
    // Modifier le message existant
    await message.edit({ embeds: [embed], components: components }).catch(() => null);
  } else {
    // Envoyer un nouveau message
    const newMsg = await channel.send({ embeds: [embed], components: components }).catch(() => null);
    if (newMsg) {
      updateTicketPanel(guildId, { message_id: newMsg.id });
    }
  }

  return { success: true };
}

module.exports = { sendOrUpdateTicketPanel };
