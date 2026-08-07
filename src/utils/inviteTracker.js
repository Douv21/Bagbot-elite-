const { EmbedBuilder } = require('discord.js');
const { getInviteConfig, recordInviteJoin, recordInviteLeave, getUserInviteStats } = require('../database/db');

// Cache global en mémoire des invitations par serveur
// Structure : invitesCache.get(guildId) = Map(code => { uses, maxUses, inviterId, inviterUser, isVanity })
const invitesCache = new Map();
const vanityCache = new Map();

async function initInviteCache(client) {
  for (const [guildId, guild] of client.guilds.cache) {
    await refreshGuildInvites(guild);
  }
}

async function refreshGuildInvites(guild) {
  if (!guild) return;
  const guildId = guild.id;
  const codeMap = new Map();

  try {
    const invites = await guild.invites.fetch();
    invites.forEach(inv => {
      codeMap.set(inv.code, {
        code: inv.code,
        uses: inv.uses || 0,
        maxUses: inv.maxUses || 0,
        inviterId: inv.inviter ? inv.inviter.id : 'unknown',
        inviterUser: inv.inviter || null
      });
    });
  } catch (e) {
    // Si pas la permission ManageGuild
  }
  invitesCache.set(guildId, codeMap);

  try {
    if (guild.features && guild.features.includes('VANITY_URL')) {
      const vanityData = await guild.fetchVanityData().catch(() => null);
      if (vanityData) {
        vanityCache.set(guildId, vanityData.uses || 0);
      }
    }
  } catch (e) {}
}

async function handleMemberJoinInvite(member) {
  const guild = member.guild;
  const guildId = guild.id;
  const cachedInvites = invitesCache.get(guildId) || new Map();
  
  let usedInvite = null;
  let inviterUser = null;
  let isVanity = false;

  // 1. Vérifier si l'URL personnalisée (Vanity) a été utilisée
  try {
    if (guild.features && guild.features.includes('VANITY_URL')) {
      const vanityData = await guild.fetchVanityData().catch(() => null);
      const prevVanity = vanityCache.get(guildId) || 0;
      if (vanityData && vanityData.uses > prevVanity) {
        vanityCache.set(guildId, vanityData.uses);
        isVanity = true;
      }
    }
  } catch (e) {}

  if (!isVanity) {
    try {
      const currentInvites = await guild.invites.fetch();
      const newCache = new Map();

      // Trouver si une invitation existante a vu son compteur d'utilisations augmenter
      for (const [code, inv] of currentInvites) {
        const cached = cachedInvites.get(code);
        const prevUses = cached ? cached.uses : 0;
        
        if (inv.uses > prevUses && !usedInvite) {
          usedInvite = {
            code: inv.code,
            uses: inv.uses,
            maxUses: inv.maxUses,
            inviterId: inv.inviter ? inv.inviter.id : 'unknown',
            inviterUser: inv.inviter || null
          };
          inviterUser = inv.inviter || null;
        }

        newCache.set(code, {
          code: inv.code,
          uses: inv.uses || 0,
          maxUses: inv.maxUses || 0,
          inviterId: inv.inviter ? inv.inviter.id : 'unknown',
          inviterUser: inv.inviter || null
        });
      }

      // Si aucune invitation n'a augmenté en nombre d'utilisations dans currentInvites,
      // cela signifie qu'une invitation à usage unique (maxUses = 1) a été utilisée et immédiatement supprimée par Discord !
      if (!usedInvite) {
        for (const [code, cached] of cachedInvites) {
          if (!newCache.has(code)) {
            // L'invitation existait dans le cache mais n'existe plus dans currentInvites -> elle a été consommée !
            usedInvite = cached;
            inviterUser = cached.inviterUser || null;
            break;
          }
        }
      }

      invitesCache.set(guildId, newCache);
    } catch (e) {
      console.error('Erreur récupération invitations au join:', e);
    }
  }

  let inviterId = 'unknown';
  let inviteCode = 'inconnu';

  if (isVanity) {
    inviterId = 'vanity';
    inviteCode = guild.vanityURLCode || 'vanity';
  } else if (usedInvite) {
    inviterId = usedInvite.inviterId || (inviterUser ? inviterUser.id : 'unknown');
    inviteCode = usedInvite.code || 'inconnu';
  }

  // Enregistrer en BDD
  recordInviteJoin(guildId, member.id, inviterId, inviteCode);

  // Statistiques de l'inviteur
  let stats = { total: 0 };
  if (inviterId && inviterId !== 'unknown' && inviterId !== 'vanity') {
    stats = getUserInviteStats(guildId, inviterId);
  }

  const inviterMention = isVanity
    ? 'Lien Personnalisé (Vanity)'
    : (inviterUser ? `<@${inviterUser.id}>` : (inviterId !== 'unknown' ? `<@${inviterId}>` : 'Inconnu / Direct'));

  const joinEmbed = new EmbedBuilder()
    .setTitle('📥 Nouveau Membre Rejoint !')
    .setDescription(
      `**Membre :** <@${member.id}> (${member.user.tag})\n` +
      `**Invité par :** ${inviterMention}\n` +
      `**Code utilisé :** \`${inviteCode}\`\n` +
      `**Total d'invitations de l'inviteur :** **${stats.total}**`
    )
    .setColor('#2ECC71')
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  // Envoyer via invite_config si un salon d'invitation est configuré
  const config = getInviteConfig(guildId);
  if (config && config.enabled === 1 && config.log_channel_id) {
    const logChan = guild.channels.cache.get(config.log_channel_id);
    if (logChan) {
      logChan.send({ embeds: [joinEmbed] }).catch(console.error);
    }
  }

  return { inviterUser, inviteCode, inviterId, totalInvites: stats.total };
}

async function handleMemberLeaveInvite(member) {
  const guild = member.guild;
  const guildId = guild.id;

  const tracked = recordInviteLeave(guildId, member.id);
  const inviterId = tracked ? tracked.inviter_id : null;

  let stats = { total: 0 };
  if (inviterId && inviterId !== 'unknown' && inviterId !== 'vanity') {
    stats = getUserInviteStats(guildId, inviterId);
  }

  const inviterMention = inviterId && inviterId !== 'unknown' && inviterId !== 'vanity' ? `<@${inviterId}>` : 'Inconnu';
  const leaveEmbed = new EmbedBuilder()
    .setTitle('📤 Départ d\'un Membre')
    .setDescription(
      `**Membre :** <@${member.id}> (${member.user.tag})\n` +
      `**Était invité par :** ${inviterMention}\n` +
      `**Total actuel de l'inviteur :** **${stats.total}**`
    )
    .setColor('#E74C3C')
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  // Envoyer via invite_config si un salon d'invitation est configuré
  const config = getInviteConfig(guildId);
  if (config && config.enabled === 1 && config.log_channel_id) {
    const logChan = guild.channels.cache.get(config.log_channel_id);
    if (logChan) {
      logChan.send({ embeds: [leaveEmbed] }).catch(console.error);
    }
  }
}

module.exports = {
  initInviteCache,
  refreshGuildInvites,
  handleMemberJoinInvite,
  handleMemberLeaveInvite
};
