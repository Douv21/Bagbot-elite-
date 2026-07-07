const { EmbedBuilder } = require('discord.js');
const { db, getLeveling, updateLeveling, getLevelingConfig } = require('../database/db');

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
function sendLog(guild, eventType, embed, options = {}) {
  const config = db.prepare('SELECT * FROM logs_config WHERE guild_id = ?').get(guild.id);
  if (!config || !config.channel_id) return;

  // Déterminer la catégorie
  let category = 'messages';
  if (['messageDelete', 'messageUpdate', 'messageDeleteBulk'].includes(eventType)) {
    category = 'messages';
  } else if (['memberAdd', 'memberRemove', 'memberUpdate'].includes(eventType)) {
    category = 'members';
  } else if (eventType === 'voiceState') {
    category = 'voice';
  } else if (eventType === 'moderation') {
    category = 'moderation';
  } else if (['channelUpdate', 'roleUpdate'].includes(eventType)) {
    category = 'structure';
  } else if (eventType === 'confession') {
    category = 'confessions';
  }

  // Rediriger vers la catégorie "bots" si c'est un bot
  if (options.isBot) {
    category = 'bots';
  }

  let channelId = null;
  if (config.channel_id.startsWith('{')) {
    try {
      const channelMap = JSON.parse(config.channel_id);
      channelId = channelMap[category];
      
      const activeCategories = config.events ? config.events.split(',') : [];
      if (!activeCategories.includes(category)) return;
    } catch (e) {
      console.error('Error parsing JSON channel_id:', e);
    }
  } else {
    // Mode d'ancien salon unique
    channelId = config.channel_id;
    if (config.events !== 'all') {
      const activeEvents = config.events.split(',');
      if (!activeEvents.includes(eventType)) return;
    }
  }

  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    const payload = { embeds: [embed] };
    if (options.files) {
      payload.files = options.files;
    }
    channel.send(payload).catch(console.error);
  }
}

// Gérer l'XP et le Level Up (texte ou vocal)
async function addXP(guild, member, xpToAdd, channelToNotify = null) {
  const guildId = guild.id;
  const userId = member.id;

  const data = getLeveling(guildId, userId);
  let newXp = data.xp + xpToAdd;
  let newLevel = data.level;

  // Calcul du seuil d'XP requis pour monter de niveau (formule exponentielle de Bagbot-lite : 100 * 1.2^lvl)
  const xpNeededForNextLevel = (lvl) => Math.max(1, Math.round(100 * Math.pow(1.2, Math.max(0, lvl))));

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
    // Gestion des récompenses de rôles
    const rewards = db.prepare('SELECT role_id FROM level_rewards WHERE guild_id = ? AND level <= ?').all(guildId, newLevel);
    if (rewards.length > 0) {
      const roleIds = rewards.map(r => r.role_id);
      for (const roleId of roleIds) {
        const role = guild.roles.cache.get(roleId);
        if (role && !member.roles.cache.has(roleId)) {
          await member.roles.add(role).catch(console.error);
        }
      }
    }

    // Vérifier s'il y a un rôle de récompense débloqué spécifiquement à ce niveau
    const rewardThisLevel = db.prepare('SELECT role_id FROM level_rewards WHERE guild_id = ? AND level = ?').get(guildId, newLevel);

    // Annonce du level up
    const lvlConfig = getLevelingConfig(guildId);
    const announceChannelSetting = lvlConfig.announce_channel || 'current';

    if (announceChannelSetting !== 'disabled') {
      let targetChannel = null;
      if (announceChannelSetting === 'current') {
        targetChannel = channelToNotify;
      } else {
        targetChannel = guild.channels.cache.get(announceChannelSetting);
      }

      if (targetChannel) {
        let msgTemplate = lvlConfig.announce_msg || 'Bravo {user} ! Tu passes au niveau {level} !';
        let desc = msgTemplate
          .replace(/{user}/g, `<@${userId}>`)
          .replace(/{level}/g, newLevel);

        if (rewardThisLevel) {
          desc += `\n\n🏆 **Récompense débloquée :** Tu as obtenu le rôle <@&${rewardThisLevel.role_id}> !`;
        }

        let cardAttachment = null;
        try {
          const generateCard = require('../carte/holographique');
          const memberEconomy = db.prepare('SELECT karma FROM economy WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
          const currentKarma = memberEconomy ? memberEconomy.karma : 0;
          
          let rewardRoleName = 'Nouveau Niveau !';
          if (rewardThisLevel) {
            const roleObj = guild.roles.cache.get(rewardThisLevel.role_id);
            if (roleObj) rewardRoleName = roleObj.name;
          }

          const cardPayload = {
            roleName: rewardRoleName,
            panelTitle: "NIVEAU SUPÉRIEUR",
            displayNumStr: `LVL ${newLevel}`,
            xpPercent: 1.0,
            barLabel: `Félicitations pour le niveau ${newLevel} !`,
            karma: currentKarma
          };
          
          cardAttachment = await generateCard(member, cardPayload, 'holographique');
        } catch (error) {
          console.error("Erreur génération de carte de level up:", error);
        }

        const embed = new EmbedBuilder()
          .setTitle('🎉 Nouvelle Montée de Niveau !')
          .setDescription(desc)
          .setColor('#F1C40F')
          .setTimestamp();

        if (cardAttachment) {
          targetChannel.send({ content: `<@${userId}>`, embeds: [embed], files: [cardAttachment] }).catch(console.error);
        } else {
          targetChannel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(console.error);
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
