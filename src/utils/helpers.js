const { EmbedBuilder } = require('discord.js');
const { db, getLeveling, updateLeveling, getLevelingConfig } = require('../database/db');

// Remplacer les variables pour les messages de bienvenue/départ
function formatWelcomeLeaveMessage(text, member, extra = {}) {
  if (!text) return '';
  let result = text
    .replace(/{user}/g, member.user.username)
    .replace(/{user.tag}/g, member.user.tag)
    .replace(/{user.mention}/g, `<@${member.user.id}>`)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount);

  if (extra.inviterMention) {
    result = result.replace(/{inviter}/g, extra.inviterMention);
  } else {
    result = result.replace(/{inviter}/g, 'Inconnu');
  }
  if (extra.totalInvites !== undefined) {
    result = result.replace(/{invites}/g, extra.totalInvites);
  } else {
    result = result.replace(/{invites}/g, '0');
  }

  return result;
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
  } else if (eventType === 'tickets') {
    category = 'tickets';
  } else if (eventType === 'pseudo') {
    category = 'pseudo';
  } else if (['roleAdd', 'roleRemove', 'roles'].includes(eventType)) {
    category = 'roles';
  } else if (eventType === 'bots') {
    category = 'bots';
  }

  // Rediriger vers la catégorie "bots" si c'est un bot
  if (options.isBot && eventType !== 'tickets' && eventType !== 'confession') {
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

  // Appliquer le multiplicateur d'XP en fonction du Karma
  const { getKarmaConfig } = require('../database/db');
  const karmaConfig = getKarmaConfig(guildId);

  const memberEco = db.prepare('SELECT karma FROM economy WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  const karma = memberEco ? memberEco.karma : 0;
  
  let xpMultiplier = 1;
  if (karmaConfig.is_active) {
    if (karma >= karmaConfig.threshold_3) {
      xpMultiplier = karmaConfig.xp_mult_3;
    } else if (karma >= karmaConfig.threshold_2) {
      xpMultiplier = karmaConfig.xp_mult_2;
    } else if (karma >= karmaConfig.threshold_1) {
      xpMultiplier = karmaConfig.xp_mult_1;
    }
  }

  const finalXpToAdd = Math.round(xpToAdd * xpMultiplier);
  let newXp = data.xp + finalXpToAdd;
  let newLevel = data.level;

  const lvlConfig = getLevelingConfig(guildId);
  const xpBase = lvlConfig.xp_base ?? 120;
  const xpFactor = lvlConfig.xp_factor ?? 1.35;

  // Calcul du seuil d'XP requis pour monter de niveau (formule exponentielle configurable)
  const xpNeededForNextLevel = (lvl) => Math.max(1, Math.round(xpBase * Math.pow(xpFactor, Math.max(0, lvl))));

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
        const { generateSensualText } = require('./aiActionHelper');
        const { getMemberGender, formatGenderMessage } = require('./genderHelper');
        
        // Récupérer les rôles les plus récents du membre
        const updatedMember = await guild.members.fetch(userId).catch(() => member);
        const genderInfo = getMemberGender(updatedMember);
        
        let desc = '';
        try {
          const genderDesc = genderInfo.gender === 'femme'
            ? `C'est une FEMME (pronom elle, félicite-la en tant que reine/déesse sensuelle). Fais TOUS les accords de adjectifs/participes au FÉMININ.`
            : `C'est un HOMME (pronom il, félicite-le en tant que roi/prince séducteur). Fais TOUS les accords au MASCULIN.`;

          const defaultPrompt = `Félicite chaleureusement le membre <@${userId}> (${updatedMember.displayName}) pour son passage au niveau ${newLevel}. ${genderDesc} Le message doit être très coquin, torride, sensuel, élégant et flatteur.`;
          
          const customPrompt = rewardThisLevel
            ? `${defaultPrompt} Mentionne également avec enthousiasme qu'${genderInfo.pronoun} a débloqué le rôle <@&${rewardThisLevel.role_id}> en récompense de ses désirs.`
            : defaultPrompt;

          desc = await generateSensualText(customPrompt, 350, guildId, updatedMember);
        } catch (e) {
          console.error("Erreur appel IA annonce level up:", e.message);
        }

        if (!desc) {
          let msgTemplate = lvlConfig.announce_msg || 'Bravo {user} ! Tu passes au niveau {level} !';
          desc = msgTemplate
            .replace(/{user}/g, `<@${userId}>`)
            .replace(/{level}/g, newLevel);

          desc = formatGenderMessage(desc, updatedMember);

          if (rewardThisLevel) {
            desc += `\n\n🏆 **Récompense débloquée :** Tu as obtenu le rôle <@&${rewardThisLevel.role_id}> !`;
          }
        }

        let cardAttachment = null;
        try {
          const generateCard = require('../carte/holographique');
          const memberEconomy = db.prepare('SELECT karma FROM economy WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
          const currentKarma = memberEconomy ? memberEconomy.karma : 0;
          
          // Récupérer le membre mis à jour pour s'assurer que ses rôles récents soient dans le cache Discord.js
          const updatedMember = await guild.members.fetch(userId).catch(() => member);

          // Calculer le plus haut rôle de récompense actuel
          let rewardRoleName = 'MEMBRE DU SERVEUR';
          const reward = db.prepare('SELECT role_id FROM level_rewards WHERE guild_id = ? AND level <= ? ORDER BY level DESC LIMIT 1')
            .get(guildId, newLevel);
          if (reward) {
            const roleObj = guild.roles.cache.get(reward.role_id);
            if (roleObj) rewardRoleName = roleObj.name;
          }

          const levelingData = getLeveling(guildId, userId);

          const xpRequired = xpNeededForNextLevel(newLevel);

          const cardPayload = {
            level: newLevel,
            xp: newXp,
            required: xpRequired,
            roleName: rewardRoleName,
            panelTitle: "NIVEAU SUPÉRIEUR",
            displayNumStr: `LVL ${newLevel}`,
            karma: currentKarma,
            messages: levelingData.total_messages || 0,
            voiceMinutes: levelingData.voice_minutes || 0,
            streak: levelingData.nsfw_messages || 0
          };
          const { getMemberCardTheme } = require('./themeHelper');
          const theme = getMemberCardTheme(guild, updatedMember);
          cardAttachment = await generateCard(updatedMember, cardPayload, theme);
        } catch (error) {
          console.error("Erreur génération de carte de level up:", error);
        }

        const embed = new EmbedBuilder()
          .setTitle('❤️‍🔥 Nouvelle Montée de Niveau Torride !')
          .setDescription(desc)
          .setColor('#E74C3C')
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

// Récupérer dynamiquement l'URL publique active (en interrogeant cloudflared si Quick Tunnel actif)
async function getActivePublicUrl() {
  // 1. Essayer Cloudflare Quick Tunnel métriques en temps réel
  try {
    const fetch = require('node-fetch');
    const res = await fetch('http://127.0.0.1:20241/metrics', { timeout: 1500 }).then(r => r.text());
    const match = res.match(/userHostname="([^"]+trycloudflare\.com[^"]*)"/);
    if (match && match[1]) {
      const activeUrl = match[1].startsWith('http') ? match[1] : `https://${match[1]}`;
      return activeUrl;
    }
  } catch (_) {}

  // 2. Si PUBLIC_URL ou DASHBOARD_PUBLIC_URL est défini (et pas périmé)
  if (process.env.PUBLIC_URL && !process.env.PUBLIC_URL.includes('trycloudflare.com')) {
    return process.env.PUBLIC_URL;
  }
  if (process.env.DASHBOARD_PUBLIC_URL && !process.env.DASHBOARD_PUBLIC_URL.includes('trycloudflare.com')) {
    return process.env.DASHBOARD_PUBLIC_URL;
  }
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;

  // 3. Fallback IP / Port local
  const ip = process.env.PUBLIC_IP || '82.65.75.176';
  const port = process.env.PORT || process.env.DASHBOARD_PORT || 49601;
  return `http://${ip}:${port}`;
}

async function updateGuildBotProfileOnDiscord(client, guildId, customName, customLogoUrl) {
  let rateLimited = false;
  let errorMsg = null;
  try {
    if (!client || !guildId) return { success: false, error: 'Client ou guildId manquant' };
    const { REST, Routes } = require('discord.js');
    const fs = require('fs');
    const path = require('path');

    const guild = client.guilds.cache.get(guildId);

    // 1. Mettre à jour le surnom du bot sur le serveur Discord
    if (guild && guild.members && guild.members.me) {
      if (customName && customName.trim()) {
        await guild.members.me.setNickname(customName.trim()).catch(err => console.error('Erreur setNickname:', err.message));
      } else {
        await guild.members.me.setNickname(null).catch(() => null);
      }
    }

    // 2. Mettre à jour l'avatar du bot sur la liste des membres du serveur Discord (Guild Member Avatar)
    if (customLogoUrl && client.token) {
      let imageBuffer = null;
      if (customLogoUrl.startsWith('/uploads/')) {
        const absPath = path.join(__dirname, '../../public', customLogoUrl);
        if (fs.existsSync(absPath)) {
          imageBuffer = fs.readFileSync(absPath);
        }
      } else if (customLogoUrl.startsWith('http://') || customLogoUrl.startsWith('https://')) {
        const response = await fetch(customLogoUrl).catch(() => null);
        if (response && response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }
      }

      if (imageBuffer) {
        const base64 = imageBuffer.toString('base64');
        let mime = 'image/png';
        if (customLogoUrl.endsWith('.jpg') || customLogoUrl.endsWith('.jpeg')) mime = 'image/jpeg';
        else if (customLogoUrl.endsWith('.gif')) mime = 'image/gif';
        else if (customLogoUrl.endsWith('.webp')) mime = 'image/webp';

        const dataURI = `data:${mime};base64,${base64}`;
        const rest = new REST({ version: '10' }).setToken(client.token);
        await rest.patch(Routes.guildMember(guildId, '@me'), {
          body: { avatar: dataURI }
        }).catch(err => {
          console.error('Erreur PATCH guild member avatar Discord:', err.message);
          if (err.message && err.message.includes('AVATAR_RATE_LIMIT')) {
            rateLimited = true;
            errorMsg = 'Discord limite la modification d\'avatar du bot (maximum 2 modifications toutes les 10 minutes). L\'image a été enregistrée en base et s\'appliquera dès que le délai Discord sera écoulé.';
          }
        });
      }
    } else if (client.token) {
      const rest = new REST({ version: '10' }).setToken(client.token);
      await rest.patch(Routes.guildMember(guildId, '@me'), {
        body: { avatar: null }
      }).catch(err => {
        if (err.message && err.message.includes('AVATAR_RATE_LIMIT')) {
          rateLimited = true;
          errorMsg = 'Discord limite la modification d\'avatar du bot (maximum 2 modifications toutes les 10 minutes). L\'avatar par défaut s\'appliquera dès que le délai Discord sera écoulé.';
        }
      });
    }

    if (rateLimited) {
      return { success: true, rateLimited: true, warning: errorMsg };
    }
    return { success: true };
  } catch (e) {
    console.error('Erreur updateGuildBotProfileOnDiscord:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = {
  formatWelcomeLeaveMessage,
  sendLog,
  addXP,
  getActivePublicUrl,
  updateGuildBotProfileOnDiscord
};
