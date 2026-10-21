const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { db, getEventDropConfig } = require('../database/db');
const { EVENT_PRESETS, getEventItemDetails } = require('./eventDropManager');

/**
 * Récupère les patterns d'articles correspondant à un type d'événement
 */
function getEventItemPatterns(eventType, config = {}) {
  const type = (eventType || config.event_type || 'bonbon').toLowerCase().trim();

  if (type === 'bonbon') {
    return ["%bonbon%", "%Bonbon%"];
  } else if (type === 'cadeau') {
    return ["%cadeau%", "%Cadeau%"];
  } else if (type === 'chocolat') {
    return ["%chocolat%", "%Chocolat%"];
  } else if (type === 'coeur') {
    return ["%coeur%", "%cœur%", "%Coeur%", "%Cœur%"];
  } else if (type === 'custom') {
    const raw = config.custom_name || 'Objet Spécial';
    return [`%${raw}%`];
  }

  return ["%bonbon%", "%Bonbon%"];
}

/**
 * Récupère le classement des membres pour un événement donné
 */
function getEventLeaderboard(guildId, eventType = null) {
  const config = getEventDropConfig(guildId);
  const targetType = eventType || config.event_type || 'bonbon';
  const patterns = getEventItemPatterns(targetType, config);

  const whereClauses = patterns.map(() => `item_name LIKE ?`).join(' OR ');
  const query = `
    SELECT user_id, SUM(quantity) as total_qty
    FROM inventory
    WHERE guild_id = ? AND (${whereClauses})
    GROUP BY user_id
    HAVING total_qty > 0
    ORDER BY total_qty DESC
    LIMIT 50
  `;

  try {
    const rows = db.prepare(query).all(guildId, ...patterns);
    return {
      eventType: targetType,
      config,
      leaderboard: rows
    };
  } catch (err) {
    console.error('[EventLeaderboard] Erreur récupération classement:', err);
    return { eventType: targetType, config, leaderboard: [] };
  }
}

/**
 * Remet à zéro les objets d'un événement pour tous les membres du serveur
 */
function resetEventDrops(guildId, eventType = null) {
  const config = getEventDropConfig(guildId);
  const targetType = (eventType || config.event_type || 'bonbon').toLowerCase().trim();

  let affectedCount = 0;
  if (targetType === 'tous') {
    const allPatterns = ["%bonbon%", "%Bonbon%", "%cadeau%", "%Cadeau%", "%chocolat%", "%Chocolat%", "%coeur%", "%cœur%", "%Coeur%", "%Cœur%"];
    if (config.custom_name) allPatterns.push(`%${config.custom_name}%`);

    const whereClauses = allPatterns.map(() => `item_name LIKE ?`).join(' OR ');
    const info = db.prepare(`DELETE FROM inventory WHERE guild_id = ? AND (${whereClauses})`).run(guildId, ...allPatterns);
    affectedCount = info.changes;
  } else {
    const patterns = getEventItemPatterns(targetType, config);
    const whereClauses = patterns.map(() => `item_name LIKE ?`).join(' OR ');
    const info = db.prepare(`DELETE FROM inventory WHERE guild_id = ? AND (${whereClauses})`).run(guildId, ...patterns);
    affectedCount = info.changes;
  }

  return { success: true, count: affectedCount, eventType: targetType };
}

/**
 * Scanne les messages du serveur pour récupérer les bonbons distribués par DraftBot
 * et les ajoute/synchronise dans la table inventory
 */
async function syncDraftbotCandies(guild, maxMessagesPerChannel = 150) {
  if (!guild) return { success: false, error: "Serveur invalide" };

  const candyTotals = {};
  const logs = [];

  try {
    const channels = await guild.channels.fetch();
    const textChannels = channels.filter(c => c && c.isTextBased() && c.viewable);

    for (const [id, ch] of textChannels) {
      try {
        const messages = await ch.messages.fetch({ limit: maxMessagesPerChannel });
        for (const [mid, msg] of messages) {
          const embedText = msg.embeds.map(e => (e.title || '') + ' ' + (e.description || '') + ' ' + (e.fields || []).map(f => f.name + ' ' + f.value).join(' ')).join(' ');
          const fullText = (msg.content || '') + ' ' + embedText;

          if (fullText.includes('Bonbon') || fullText.includes('bonbon')) {
            // Pattern 1: <@id> vient de gagner [le drop d'objet]..., **X Bonbons ...** ont été ajoutés à son inventaire !
            const m1 = fullText.match(/<@!?(\d+)>\s+vient de gagner.*?[\*\_]{2}(\d+)\s+Bonbon/i);
            // Pattern 2: **X Bonbons ...** ont été ajoutés à l'inventaire de <@id>
            const m2 = fullText.match(/[\*\_]{2}(\d+)\s+Bonbon[^\*\_]*[\*\_]{2}\s+ont été ajoutés à l'inventaire de\s+<@!?(\d+)>/i);
            // Pattern 3: **X Bonbons ...** ont été retirés de l'inventaire de <@id>
            const m3 = fullText.match(/[\*\_]{2}(\d+)\s+Bonbon[^\*\_]*[\*\_]{2}\s+ont été retirés de l'inventaire de\s+<@!?(\d+)>/i);

            if (m1) {
              const uid = m1[1];
              const qty = parseInt(m1[2], 10);
              candyTotals[uid] = (candyTotals[uid] || 0) + qty;
              logs.push(`+${qty} pour <@${uid}> (#${ch.name})`);
            } else if (m2) {
              const qty = parseInt(m2[1], 10);
              const uid = m2[2];
              candyTotals[uid] = (candyTotals[uid] || 0) + qty;
              logs.push(`+${qty} pour <@${uid}> (#${ch.name})`);
            } else if (m3) {
              const qty = parseInt(m3[1], 10);
              const uid = m3[2];
              candyTotals[uid] = (candyTotals[uid] || 0) - qty;
              logs.push(`-${qty} pour <@${uid}> (#${ch.name})`);
            }
          }
        }
      } catch (err) {
        // Ignorer les salons inaccessibles
      }
    }

    // Nom officiel du bonbon dans le système d'événement
    const targetItemName = "🍬 Bonbon d'Halloween";
    let importedCount = 0;
    const importedSummary = [];

    const insertOrUpdate = db.transaction(() => {
      for (const [userId, total] of Object.entries(candyTotals)) {
        const finalQty = Math.max(0, total);
        if (finalQty <= 0) continue;

        // Vérifier si un item 'Bonbons 🍬 ' ou '🍬 Bonbon d'Halloween' existe déjà
        const existing = db.prepare(`
          SELECT rowid, quantity FROM inventory
          WHERE guild_id = ? AND user_id = ? AND (item_name = ? OR item_name LIKE '%Bonbon%')
        `).get(guild.id, userId, targetItemName);

        if (existing) {
          // On s'assure que le membre a au moins le total des bonbons DraftBot
          const newQty = Math.max(existing.quantity, finalQty);
          db.prepare(`UPDATE inventory SET item_name = ?, quantity = ? WHERE rowid = ?`)
            .run(targetItemName, newQty, existing.rowid);
        } else {
          db.prepare(`INSERT INTO inventory (guild_id, user_id, item_name, quantity) VALUES (?, ?, ?, ?)`)
            .run(guild.id, userId, targetItemName, finalQty);
        }

        importedCount += finalQty;
        importedSummary.push({ userId, quantity: finalQty });
      }

      // Nettoyer les doublons de syntaxe ('Bonbons 🍬 ') vers le standard '🍬 Bonbon d'Halloween'
      try {
        db.prepare(`
          UPDATE inventory 
          SET item_name = ?
          WHERE guild_id = ? AND item_name = 'Bonbons 🍬 '
        `).run(targetItemName, guild.id);
      } catch (_) {}
    });

    insertOrUpdate();

    return {
      success: true,
      totalCandies: importedCount,
      membersCount: importedSummary.length,
      importedSummary,
      logsCount: logs.length
    };
  } catch (err) {
    console.error('[SyncDraftbot] Erreur import bonbons:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getEventLeaderboard,
  resetEventDrops,
  syncDraftbotCandies,
  getEventItemPatterns
};
