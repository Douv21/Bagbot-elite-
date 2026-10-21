const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../database/db');

const EVENT_PRESETS = {
  bonbon: {
    item_name: "Bonbon d'Halloween",
    emoji: "🍬",
    event_name: "Halloween 🎃",
    color: "#FF7518",
    description: "Halloween est là ! Des friandises magiques tombent dans le salon !"
  },
  cadeau: {
    item_name: "Cadeau de Noël",
    emoji: "🎁",
    event_name: "Noël 🎄",
    color: "#E74C3C",
    description: "Ho Ho Ho ! Le Père Noël a fait tomber des cadeaux féeriques !"
  },
  chocolat: {
    item_name: "Chocolat de Pâques",
    emoji: "🍫",
    event_name: "Pâques 🐣",
    color: "#9B59B6",
    description: "La chasse est ouverte ! Des chocolats de Pâques sont dissimulés ici !"
  },
  coeur: {
    item_name: "Cœur Saint-Valentin",
    emoji: "💖",
    event_name: "Saint-Valentin 💌",
    color: "#FF69B4",
    description: "L'amour remplit le salon ! Des cœurs romantiques sont à récolter !"
  }
};

function getEventItemDetails(config, customNameInput = null, customEmojiInput = null, eventTypeInput = null) {
  const type = (eventTypeInput || config.event_type || 'bonbon').toLowerCase().trim();
  
  if (type === 'custom') {
    const name = customNameInput || config.custom_name || 'Objet Spécial';
    const emoji = customEmojiInput || config.custom_emoji || '✨';
    return {
      item_name: `${emoji} ${name}`.trim(),
      raw_name: name,
      emoji: emoji,
      event_name: "Événement Spécial ✨",
      color: "#F1C40F",
      description: `Un événement spécial est en cours ! Des objets exclusifs **${name}** sont à récupérer !`
    };
  }

  const preset = EVENT_PRESETS[type] || EVENT_PRESETS.bonbon;
  return {
    item_name: `${preset.emoji} ${preset.item_name}`,
    raw_name: preset.item_name,
    emoji: preset.emoji,
    event_name: preset.event_name,
    color: preset.color,
    description: preset.description
  };
}

async function spawnEventDrop(channel, config, requestedQuantity = null, triggeredByMember = null) {
  if (!channel || !channel.isTextBased()) return null;

  const minQty = Math.max(1, config.min_quantity || 1);
  const maxQty = Math.max(minQty, config.max_quantity || 5);
  
  let quantity = requestedQuantity;
  if (!quantity || isNaN(quantity) || quantity < 1) {
    quantity = Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty;
  }

  const itemDetails = getEventItemDetails(config);
  const guildId = channel.guild.id;

  const embed = new EmbedBuilder()
    .setTitle(`${itemDetails.emoji} LARGAGE D'ÉVÉNEMENT : ${itemDetails.event_name.toUpperCase()} !`)
    .setDescription(
      `🎉 **ALERTE LARGAGE ÉVÉNEMENT !**\n\n` +
      `**${quantity}x ${itemDetails.item_name}** viennent d'apparaître dans <#${channel.id}> !\n\n` +
      `⚡ *Soyez le premier à cliquer sur le bouton ci-dessous pour les ramasser et les ajouter à votre inventaire !*`
    )
    .setColor(itemDetails.color)
    .addFields(
      { name: "📦 Contenu du largage", value: `\`${quantity}x ${itemDetails.item_name}\``, inline: true },
      { name: "⚠️ Statut", value: "🟢 En attente d'un ramasseur...", inline: true }
    )
    .setFooter({ text: `${channel.guild.name} • Événement Spécial` })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId(`claim_event_drop_${Date.now()}`)
    .setLabel(`Ramasser (${quantity}x ${itemDetails.raw_name})`)
    .setEmoji(itemDetails.emoji)
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(button);

  let message = null;
  try {
    message = await channel.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error('[EventDropManager] Erreur envoi message drop:', err.message);
    return null;
  }

  // Mettre à jour last_drop_at dans la base
  try {
    db.prepare('UPDATE event_drop_config SET last_drop_at = ? WHERE guild_id = ?').run(Math.floor(Date.now() / 1000), guildId);
  } catch (_) {}

  const collector = message.createMessageComponentCollector({ time: 300000 }); // 5 minutes
  let claimed = false;

  collector.on('collect', async (btnInteraction) => {
    if (claimed) {
      return btnInteraction.reply({ content: "❌ Trop tard... Quelqu'un d'autre a ramassé les objets avant toi !", ephemeral: true });
    }

    claimed = true;
    collector.stop('claimed');

    const winner = btnInteraction.user;
    const fullItemName = `${itemDetails.emoji} ${itemDetails.raw_name}`;

    // Ajouter à l'inventaire dans la base SQLite
    try {
      db.prepare(`
        INSERT INTO inventory (guild_id, user_id, item_name, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id, item_name) DO UPDATE SET quantity = quantity + ?
      `).run(guildId, winner.id, fullItemName, quantity, quantity);
    } catch (e) {
      // Fallback si la contrainte ON CONFLICT n'est pas configurée
      try {
        const existing = db.prepare('SELECT rowid, quantity FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, winner.id, fullItemName);
        if (existing) {
          db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE rowid = ?').run(quantity, existing.rowid);
        } else {
          db.prepare('INSERT INTO inventory (guild_id, user_id, item_name, quantity) VALUES (?, ?, ?, ?)').run(guildId, winner.id, fullItemName, quantity);
        }
      } catch (err2) {
        console.error('[EventDropManager] Erreur insertion inventaire:', err2.message);
      }
    }

    const updatedEmbed = EmbedBuilder.from(embed)
      .setColor("#2ECC71")
      .setFields(
        { name: "📦 Contenu réclamé", value: `\`${quantity}x ${fullItemName}\``, inline: true },
        { name: "🏆 Ramassé par", value: `<@${winner.id}> (${winner.username})`, inline: true }
      );

    const disabledButton = ButtonBuilder.from(button)
      .setDisabled(true)
      .setLabel(`Ramassé par ${winner.username}`)
      .setStyle(ButtonStyle.Secondary);

    await message.edit({ embeds: [updatedEmbed], components: [new ActionRowBuilder().addComponents(disabledButton)] }).catch(() => {});

    await btnInteraction.reply({
      content: `🎉 **BRAVO <@${winner.id}> !** Tu as été le plus rapide et tu as ramassé **${quantity}x ${fullItemName}** !\n\nIls ont été directement ajoutés à ton inventaire (\`/inventaire\`).`,
      ephemeral: true
    }).catch(() => {});
  });

  collector.on('end', async (collected, reason) => {
    if (!claimed && reason !== 'claimed') {
      const expiredEmbed = EmbedBuilder.from(embed)
        .setColor("#95A5A6")
        .setFields(
          { name: "📦 Contenu expiré", value: `\`${quantity}x ${itemDetails.item_name}\``, inline: true },
          { name: "⚠️ Statut", value: "❌ Expiré (personne n'a ramassé à temps)", inline: true }
        );

      const disabledButton = ButtonBuilder.from(button)
        .setDisabled(true)
        .setLabel("Largage Expiré")
        .setStyle(ButtonStyle.Secondary);

      await message.edit({ embeds: [expiredEmbed], components: [new ActionRowBuilder().addComponents(disabledButton)] }).catch(() => {});
    }
  });

  return message;
}

module.exports = {
  EVENT_PRESETS,
  getEventItemDetails,
  spawnEventDrop
};
