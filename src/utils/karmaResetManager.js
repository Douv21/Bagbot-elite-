const { getAutoResetKarmaConfigs, resetGuildKarma, updateKarmaConfig } = require('../database/db');

function getISOWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

async function checkKarmaWeeklyResets(client) {
  try {
    const configs = getAutoResetKarmaConfigs();
    if (!configs || configs.length === 0) return;

    const now = new Date();
    // JavaScript getDay(): 0 = Dimanche, 1 = Lundi, 2 = Mardi...
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentYear = now.getFullYear();
    const currentWeek = getISOWeekNumber(now);

    for (const config of configs) {
      const targetDay = parseInt(config.reset_day) !== undefined ? parseInt(config.reset_day) : 1;
      const targetHour = parseInt(config.reset_hour) !== undefined ? parseInt(config.reset_hour) : 0;

      if (currentDay === targetDay && currentHour === targetHour) {
        const resetKey = `${currentYear}-W${currentWeek}-${targetDay}-${targetHour}`;
        if (config.last_reset_key !== resetKey) {
          const res = resetGuildKarma(config.guild_id);
          updateKarmaConfig(config.guild_id, { last_reset_key: resetKey });
          console.log(`[KARMA RESET] Remise à zéro hebdomadaire du Karma effectuée pour le serveur ${config.guild_id} (${res.changes} membres réinitialisés).`);

          if (client) {
            try {
              const guild = client.guilds.cache.get(config.guild_id);
              if (guild) {
                const { getLogsConfig } = require('../database/db');
                const logsCfg = getLogsConfig(config.guild_id);
                if (logsCfg && logsCfg.mod_logs_channel_id) {
                  const logCh = guild.channels.cache.get(logsCfg.mod_logs_channel_id);
                  if (logCh && logCh.isTextBased()) {
                    const { EmbedBuilder } = require('discord.js');
                    const embed = new EmbedBuilder()
                      .setTitle('🔄 Remise à Zéro Hebdomadaire du Karma')
                      .setDescription(` Le Karma de l'ensemble des membres du serveur a été réinitialisé à **0** selon le planning automatique configuré.`)
                      .setColor('#E74C3C')
                      .setTimestamp();
                    logCh.send({ embeds: [embed] }).catch(() => null);
                  }
                }
              }
            } catch (e) {}
          }
        }
      }
    }
  } catch (err) {
    console.error('Erreur checkKarmaWeeklyResets:', err);
  }
}

module.exports = { checkKarmaWeeklyResets };
