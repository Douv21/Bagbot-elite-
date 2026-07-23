const { EmbedBuilder } = require('discord.js');
const {
  getStarConfig,
  updateStarConfig,
  getCurrentWeekIdentifier,
  getStarWeeklyLeaderboard,
  recordStarElection,
  db
} = require('../database/db');

/**
  Exécute l'élection de la Star de la Semaine pour un serveur Discord
 */
async function runStarElection(guild, force = false) {
  if (!guild) return null;
  const guildId = guild.id;
  const config = getStarConfig(guildId);

  if (!force && config.is_active !== 1) {
    return null;
  }

  const weekId = getCurrentWeekIdentifier();
  const leaderboard = getStarWeeklyLeaderboard(guildId, weekId, 1);

  if (!leaderboard || leaderboard.length === 0) {
    console.log(`[Star Manager] Aucun participant cette semaine pour ${guild.name}`);
    return null;
  }

  const winnerData = leaderboard[0];
  const winnerUserId = winnerData.user_id;
  const winnerPoints = winnerData.points;

  let winnerMember = null;
  try {
    winnerMember = await guild.members.fetch(winnerUserId).catch(() => null);
  } catch (e) {}

  const previousStarUserId = config.current_star_user_id;
  const starRoleId = config.star_role_id;

  // Gérer le rôle de la Star de la Semaine
  if (starRoleId) {
    const starRole = guild.roles.cache.get(starRoleId);
    if (starRole) {
      // Retirer l'ancien rôle au précédent gagnant s'il existe et est différent
      if (previousStarUserId && previousStarUserId !== winnerUserId) {
        try {
          const prevMember = await guild.members.fetch(previousStarUserId).catch(() => null);
          if (prevMember && prevMember.roles.cache.has(starRoleId)) {
            await prevMember.roles.remove(starRole, 'Ancienne Star de la Semaine').catch(() => null);
          }
        } catch (e) {}
      }

      // Attribuer au nouveau gagnant
      if (winnerMember && !winnerMember.roles.cache.has(starRoleId)) {
        await winnerMember.roles.add(starRole, 'Nouveau vainqueur Star de la Semaine').catch(() => null);
      }
    }
  }

  // Récompenses en argent et karma
  if (config.reward_coins > 0) {
    db.prepare('INSERT OR IGNORE INTO economy (guild_id, user_id) VALUES (?, ?)').run(guildId, winnerUserId);
    db.prepare('UPDATE economy SET wallet = wallet + ? WHERE guild_id = ? AND user_id = ?').run(config.reward_coins, guildId, winnerUserId);
  }
  if (config.reward_karma > 0) {
    db.prepare('INSERT OR IGNORE INTO economy (guild_id, user_id) VALUES (?, ?)').run(guildId, winnerUserId);
    db.prepare('UPDATE economy SET karma = karma + ? WHERE guild_id = ? AND user_id = ?').run(config.reward_karma, guildId, winnerUserId);
  }

  // Enregistrer l'élection en BDD
  recordStarElection(guildId, winnerUserId, winnerPoints, weekId);
  updateStarConfig(guildId, {
    current_star_user_id: winnerUserId,
    last_election_time: Date.now()
  });

  // Envoyer l'annonce dans le salon configuré
  let announceChan = null;
  if (config.announce_channel_id) {
    announceChan = guild.channels.cache.get(config.announce_channel_id);
  }
  if (!announceChan) {
    announceChan = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
  }

  if (announceChan) {
    const roleObj = starRoleId ? guild.roles.cache.get(starRoleId) : null;
    const roleName = roleObj ? `@${roleObj.name}` : 'Star de la Semaine';
    const userMention = `<@${winnerUserId}>`;
    const username = winnerMember ? winnerMember.displayName : 'Aventurier';

    let desc = config.announce_desc || 'Félicitations à {user} qui devient la **Star de la Semaine** avec **{points} points** ! 🌟';
    desc = desc
      .replace(/\{user\}/g, userMention)
      .replace(/\{username\}/g, username)
      .replace(/\{points\}/g, String(winnerPoints))
      .replace(/\{role\}/g, roleName)
      .replace(/\{week\}/g, weekId);

    const embed = new EmbedBuilder()
      .setTitle(config.announce_title || '⭐ Star de la Semaine !')
      .setDescription(desc)
      .setColor(config.announce_color || '#F1C40F')
      .setTimestamp();

    const avatarUrl = winnerMember ? winnerMember.user.displayAvatarURL({ dynamic: true, size: 512 }) : guild.iconURL({ dynamic: true });
    embed.setThumbnail(avatarUrl);
    embed.setFooter({ text: `${guild.name} • Élection hebdomadaire Star`, iconURL: guild.iconURL({ dynamic: true }) });

    if (config.announce_image) {
      embed.setImage(config.announce_image);
    }

    await announceChan.send({
      content: `🎉 Félicitations ${userMention} !`,
      embeds: [embed]
    }).catch(console.error);
  }

  return {
    winnerUserId,
    winnerMember,
    points: winnerPoints,
    weekId
  };
}

/**
  Vérifie s'il est l'heure de lancer l'élection automatique de la Star de la Semaine
 */
async function checkStarElections(client) {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Dimanche
    const currentHour = now.getHours(); // 0 - 23

    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const config = getStarConfig(guildId);
        if (config.is_active === 1) {
          const targetDay = config.election_day ?? 0;
          const targetHour = config.election_hour ?? 23;

          if (currentDay === targetDay && currentHour === targetHour) {
            const lastTime = config.last_election_time || 0;
            const sixDaysMs = 6 * 24 * 3600 * 1000;
            if (Date.now() - lastTime > sixDaysMs) {
              console.log(`[Star Manager] Lancement de l'élection automatique pour ${guild.name}...`);
              await runStarElection(guild, false);
            }
          }
        }
      } catch (err) {
        console.error(`Erreur élection Star guilde ${guildId}:`, err);
      }
    }
  } catch (err) {
    console.error('Erreur global checkStarElections:', err);
  }
}

module.exports = {
  runStarElection,
  checkStarElections
};
