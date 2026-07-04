const { EmbedBuilder } = require('discord.js');
const { db, getLeveling, updateLeveling } = require('../database/db');

// Remplacer les variables pour les messages de bienvenue/départ
function formatWelcomeLeaveMessage(text, member) {
  if (!text) return '';
  return text
    .replace(/{user}/g, member.user.username)
    .replace(/{user.tag}/g, member.user.tag)
    .replace(/{user.mention}/g, `<@${member.user.id}>`)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount);
}

// Envoyer un log dans le salon de logs configuré
function sendLog(guild, eventType, embed) {
  const config = db.prepare('SELECT * FROM logs_config WHERE guild_id = ?').get(guild.id);
  if (!config || !config.channel_id) return;

  // Vérifier si l'événement est activé
  if (config.events !== 'all') {
    const activeEvents = config.events.split(',');
    if (!activeEvents.includes(eventType)) return;
  }

  const channel = guild.channels.cache.get(config.channel_id);
  if (channel) {
    channel.send({ embeds: [embed] }).catch(console.error);
  }
}

// Gérer l'XP et le Level Up (texte ou vocal)
async function addXP(guild, member, xpToAdd, channelToNotify = null) {
  const guildId = guild.id;
  const userId = member.id;

  const data = getLeveling(guildId, userId);
  let newXp = data.xp + xpToAdd;
  let newLevel = data.level;

  // Calcul du seuil d'XP requis pour monter de niveau : 5 * (Lvl^2) + 50 * Lvl + 100
  const xpNeededForNextLevel = (lvl) => 5 * (lvl * lvl) + 50 * lvl + 100;

  let levelUp = false;
  while (newXp >= xpNeededForNextLevel(newLevel)) {
    newXp -= xpNeededForNextLevel(newLevel);
    newLevel++;
    levelUp = true;
  }

  // Mettre à jour la base de données
  updateLeveling(guildId, userId, {
    xp: newXp,
    level: newLevel
  });

  if (levelUp) {
    // Annonce du level up par embed
    if (channelToNotify) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Montée de Niveau !')
        .setDescription(`Félicitations <@${userId}>, tu viens de passer au **niveau ${newLevel}** ! 🚀`)
        .setColor('#FFA500')
        .setTimestamp();
      
      channelToNotify.send({ content: `<@${userId}>`, embeds: [embed] }).catch(console.error);
    }

    // Gestion des récompenses de rôles
    const rewards = db.prepare('SELECT role_id FROM level_rewards WHERE guild_id = ? AND level <= ?').all(guildId, newLevel);
    
    if (rewards.length > 0) {
      const roleIds = rewards.map(r => r.role_id);
      
      // Ajouter les nouveaux rôles de récompense
      for (const roleId of roleIds) {
        const role = guild.roles.cache.get(roleId);
        if (role && !member.roles.cache.has(roleId)) {
          await member.roles.add(role).catch(console.error);
        }
      }
    }
  }
}

module.exports = {
  formatWelcomeLeaveMessage,
  sendLog,
  addXP
};
