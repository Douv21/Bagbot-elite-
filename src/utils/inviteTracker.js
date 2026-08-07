const { EmbedBuilder } = require('discord.js');
const { getInviteConfig, recordInviteJoin, recordInviteLeave, getUserInviteStats } = require('../database/db');

// Cache global en mémoire des invitations par serveur
// Structure : invitesCache.get(guildId) = Map(code => uses)
const invitesCache = new Map();

async function initInviteCache(client) {
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const invites = await guild.invites.fetch();
      const codeMap = new Map();
      invites.forEach(inv => codeMap.set(inv.code, inv.uses));
      invitesCache.set(guildId, codeMap);
    } catch (e) {
      // Le bot peut ne pas avoir la permission de lire les invitations sur certains serveurs
      invitesCache.set(guildId, new Map());
    }
  }
}

async function handleMemberJoinInvite(member) {
  const guild = member.guild;
  const guildId = guild.id;
  const cachedInvites = invitesCache.get(guildId) || new Map();
  
  let usedInvite = null;
  let inviterUser = null;

  try {
    const currentInvites = await guild.invites.fetch();
    const newCache = new Map();

    for (const [code, inv] of currentInvites) {
      newCache.set(code, inv.uses);
      const prevUses = cachedInvites.get(code) || 0;
      if (inv.uses > prevUses) {
        usedInvite = inv;
        inviterUser = inv.inviter;
      }
    }
    invitesCache.set(guildId, newCache);
  } catch (e) {
    console.error('Erreur récupération invitations au join:', e);
  }

  const inviterId = inviterUser ? inviterUser.id : (usedInvite ? usedInvite.inviter?.id : 'unknown');
  const inviteCode = usedInvite ? usedInvite.code : 'inconnu';

  // Enregistrer en BDD
  recordInviteJoin(guildId, member.id, inviterId, inviteCode);

  // Statistiques de l'inviteur
  let stats = { total: 0 };
  if (inviterId && inviterId !== 'unknown' && inviterId !== 'vanity') {
    stats = getUserInviteStats(guildId, inviterId);
  }

  // Vérifier la configuration des logs d'invitation
  const config = getInviteConfig(guildId);
  if (config && config.enabled === 1 && config.log_channel_id) {
    const logChan = guild.channels.cache.get(config.log_channel_id);
    if (logChan) {
      const inviterMention = inviterUser ? `<@${inviterUser.id}>` : (inviterId === 'vanity' ? 'Lien Personnalisé (Vanity)' : 'Inconnu / Direct');
      const embed = new EmbedBuilder()
        .setTitle('📥 Nouveau Membre Rejoins !')
        .setDescription(
          `**Membre :** <@${member.id}> (${member.user.tag})\n` +
          `**Invité par :** ${inviterMention}\n` +
          `**Code utilisé :** \`${inviteCode}\`\n` +
          `**Total d'invitations de l'inviteur :** **${stats.total}**`
        )
        .setColor('#2ECC71')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      logChan.send({ embeds: [embed] }).catch(console.error);
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

  const config = getInviteConfig(guildId);
  if (config && config.enabled === 1 && config.log_channel_id) {
    const logChan = guild.channels.cache.get(config.log_channel_id);
    if (logChan) {
      const inviterMention = inviterId && inviterId !== 'unknown' && inviterId !== 'vanity' ? `<@${inviterId}>` : 'Inconnu';
      const embed = new EmbedBuilder()
        .setTitle('📤 Départ d\'un Membre')
        .setDescription(
          `**Membre :** <@${member.id}> (${member.user.tag})\n` +
          `**Était invité par :** ${inviterMention}\n` +
          `**Total actuel de l'inviteur :** **${stats.total}**`
        )
        .setColor('#E74C3C')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      logChan.send({ embeds: [embed] }).catch(console.error);
    }
  }
}

module.exports = {
  initInviteCache,
  handleMemberJoinInvite,
  handleMemberLeaveInvite
};
