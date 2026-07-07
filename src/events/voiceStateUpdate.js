const { db } = require('../database/db');
const { addXP, sendLog } = require('../utils/helpers');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const guildId = newState.guild.id;
    const userId = member.id;

    // Déterminer si l'utilisateur rejoint, change ou quitte un salon vocal
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    const now = Date.now();

    // Cas 1 : Connexion à un salon vocal (ancien = null, nouveau != null)
    if (!oldChannel && newChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('🔊 Connexion Vocale')
        .setDescription(`**Membre :** ${member.user.tag} (<@${member.id}>)\n**Salon :** \`${newChannel.name}\``)
        .setColor('#2ECC71')
        .setTimestamp();
      sendLog(newState.guild, 'voiceState', logEmbed);

      // Pour éviter les abus, on commence le suivi seulement si l'utilisateur n'est pas seul (hors bots)
      const humanCount = newChannel.members.filter(m => !m.user.bot).size;
      if (humanCount >= 2) {
        db.prepare('INSERT OR REPLACE INTO voice_xp (guild_id, user_id, join_time) VALUES (?, ?, ?)').run(guildId, userId, now);
        
        // Si un autre utilisateur était déjà dans le salon mais seul, on lance aussi son chrono
        newChannel.members.forEach(m => {
          if (!m.user.bot && m.id !== userId) {
            const hasRecord = db.prepare('SELECT join_time FROM voice_xp WHERE guild_id = ? AND user_id = ?').get(guildId, m.id);
            if (!hasRecord) {
              db.prepare('INSERT OR REPLACE INTO voice_xp (guild_id, user_id, join_time) VALUES (?, ?, ?)').run(guildId, m.id, now);
            }
          }
        });
      }
    }

    // Cas 2 : Déconnexion d'un salon vocal (ancien != null, nouveau = null)
    else if (oldChannel && !newChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('🔇 Déconnexion Vocale')
        .setDescription(`**Membre :** ${member.user.tag} (<@${member.id}>)\n**Salon quitté :** \`${oldChannel.name}\``)
        .setColor('#E74C3C')
        .setTimestamp();
      sendLog(newState.guild, 'voiceState', logEmbed);

      await handleVoiceLeave(guildId, member, oldChannel);
    }

    // Cas 3 : Changement de salon vocal (ancien != null, nouveau != null)
    else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
      const logEmbed = new EmbedBuilder()
        .setTitle('🔄 Changement de Salon Vocal')
        .setDescription(`**Membre :** ${member.user.tag} (<@${member.id}>)\n**Ancien salon :** \`${oldChannel.name}\`\n**Nouveau salon :** \`${newChannel.name}\``)
        .setColor('#3498DB')
        .setTimestamp();
      sendLog(newState.guild, 'voiceState', logEmbed);

      // 1. Quitter l'ancien salon (générer l'XP accumulé)
      await handleVoiceLeave(guildId, member, oldChannel);

      // 2. Rejoindre le nouveau salon (relancer le suivi si >= 2 humains)
      const humanCount = newChannel.members.filter(m => !m.user.bot).size;
      if (humanCount >= 2) {
        db.prepare('INSERT OR REPLACE INTO voice_xp (guild_id, user_id, join_time) VALUES (?, ?, ?)').run(guildId, userId, now);
      }
    }
  }
};

// Calcule l'XP vocal d'un membre quittant un salon
async function handleVoiceLeave(guildId, member, channel) {
  const userId = member.id;
  const now = Date.now();
  
  const record = db.prepare('SELECT join_time FROM voice_xp WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  
  if (record && record.join_time > 0) {
    const durationMs = now - record.join_time;
    const durationMins = Math.floor(durationMs / 60000);
    
    // Supprimer l'enregistrement
    db.prepare('DELETE FROM voice_xp WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    
    if (durationMins > 0) {
      // Incrémenter les statistiques vocales cumulées
      db.prepare('INSERT OR IGNORE INTO leveling (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
      db.prepare('UPDATE leveling SET voice_minutes = voice_minutes + ? WHERE guild_id = ? AND user_id = ?').run(durationMins, guildId, userId);

      const xpToGive = durationMins * 10; // 10 XP par minute
      // On essaye d'envoyer la notification de level up dans le premier salon textuel disponible
      const systemChannel = member.guild.systemChannel || member.guild.channels.cache.find(c => c.isTextBased());
      await addXP(member.guild, member, xpToGive, systemChannel);
    }
  }

  // Vérifier si le salon d'où il part ne contient plus qu'une seule personne humaine.
  // Si oui, on coupe le chronomètre de cette personne pour éviter l'abus.
  const remainingHumans = channel.members.filter(m => !m.user.bot);
  if (remainingHumans.size === 1) {
    const lastMember = remainingHumans.first();
    const lastMemberRecord = db.prepare('SELECT join_time FROM voice_xp WHERE guild_id = ? AND user_id = ?').get(guildId, lastMember.id);
    
    if (lastMemberRecord && lastMemberRecord.join_time > 0) {
      const durationMs = now - lastMemberRecord.join_time;
      const durationMins = Math.floor(durationMs / 60000);
      
      db.prepare('DELETE FROM voice_xp WHERE guild_id = ? AND user_id = ?').run(guildId, lastMember.id);
      
      if (durationMins > 0) {
        // Incrémenter les statistiques vocales cumulées
        db.prepare('INSERT OR IGNORE INTO leveling (guild_id, user_id) VALUES (?, ?)').run(guildId, lastMember.id);
        db.prepare('UPDATE leveling SET voice_minutes = voice_minutes + ? WHERE guild_id = ? AND user_id = ?').run(durationMins, guildId, lastMember.id);

        const xpToGive = durationMins * 10;
        const systemChannel = member.guild.systemChannel || member.guild.channels.cache.find(c => c.isTextBased());
        await addXP(member.guild, lastMember, xpToGive, systemChannel);
      }
    }
  }
}
