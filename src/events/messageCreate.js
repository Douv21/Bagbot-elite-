const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getLeveling, updateLeveling, getLevelingConfig, db } = require('../database/db');
const { addXP, sendLog } = require('../utils/helpers');

// Cooldowns pour l'XP (1 message max toutes les 60 secondes pour XP)
const xpCooldowns = new Map();

// Traitement anti-spam en mémoire
const spamMap = new Map();
const SPAM_THRESHOLD = 5; // 5 messages
const SPAM_TIME = 3000; // en 3 secondes

// Mots bannis pour l'anti-insulte (exemples standards français)
const BANNED_WORDS = ['merde', 'connard', 'salope', 'fdp', 'putain', 'encule', 'pute'];

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    // --- FILTRAGE ET ANONYMISATION DES COMMENTAIRES DE CONFESSIONS ---
    if (message.channel.isThread()) {
      const parentId = message.channel.parentId;
      if (parentId) {
        const confessionChannel = db.prepare('SELECT * FROM confessions WHERE guild_id = ? AND channel_id = ?').get(guildId, parentId);
        if (confessionChannel && confessionChannel.use_thread === 1) {
          // Supprimer le message original pour préserver l'anonymat
          await message.delete().catch(() => null);

          // Renvoyer le message de manière anonyme
          const anonEmbed = new EmbedBuilder()
            .setDescription(message.content)
            .setColor('#8E44AD')
            .setTimestamp();
          
          await message.channel.send({ embeds: [anonEmbed] }).catch(console.error);
          return; // Arrêter le traitement pour éviter le spam/XP sur ce message anonymisé
        }
      }
    }

    // --- AUTOMODÉRATION ---
    const automod = db.prepare('SELECT * FROM automod_config WHERE guild_id = ?').get(guildId) || {
      anti_link: 0,
      anti_spam: 0,
      anti_massmention: 0,
      anti_badwords: 0,
      bypass_roles: '',
      badwords_list: '',
      spam_max_msgs: 5,
      massmention_limit: 5
    };

    const bypassRoles = automod.bypass_roles ? automod.bypass_roles.split(',').map(r => r.trim()).filter(Boolean) : [];
    const hasBypassRole = message.member ? message.member.roles.cache.some(r => bypassRoles.includes(r.id)) : false;

    // Ignorer l'automodération pour les administrateurs et rôles bypass
    if (message.member && !message.member.permissions.has(PermissionFlagsBits.Administrator) && !hasBypassRole) {
      let violated = false;
      let reason = '';

      // 1. Anti-liens généraux / invitations Discord
      if (automod.anti_link === 1) {
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
        const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;
        if (inviteRegex.test(message.content) || linkRegex.test(message.content)) {
          violated = true;
          reason = 'Envoi de liens ou d\'invitations non autorisé';
        }
      }

      // 2. Anti-insultes
      if (!violated && automod.anti_badwords === 1) {
        const customWords = automod.badwords_list ? automod.badwords_list.split(',').map(w => w.trim().toLowerCase()).filter(Boolean) : [];
        const allBadwords = [...BANNED_WORDS, ...customWords];
        const messageContentLower = message.content.toLowerCase();
        if (allBadwords.some(word => messageContentLower.includes(word))) {
          violated = true;
          reason = 'Utilisation de langage inapproprié (mots interdits)';
        }
      }

      // 3. Anti-Mass Mentions
      if (!violated && automod.anti_massmention === 1) {
        const limit = automod.massmention_limit || 5;
        if (message.mentions.users.size > limit) {
          violated = true;
          reason = `Mentions excessives (> ${limit} utilisateurs)`;
        }
      }

      // 4. Anti-Spam
      if (!violated && automod.anti_spam === 1) {
        const now = Date.now();
        if (!spamMap.has(userId)) {
          spamMap.set(userId, []);
        }
        const userMessages = spamMap.get(userId);
        userMessages.push(now);

        const activeMessages = userMessages.filter(timestamp => now - timestamp < SPAM_TIME);
        spamMap.set(userId, activeMessages);

        const spamThreshold = automod.spam_max_msgs || 5;
        if (activeMessages.length > spamThreshold) {
          violated = true;
          reason = 'Spam de messages trop rapide';
        }
      }

      // Traiter la violation d'automod
      if (violated) {
        await message.delete().catch(() => {});
        const warnEmbed = new EmbedBuilder()
          .setTitle('⚠️ Automodération')
          .setDescription(`<@${userId}>, votre message a été supprimé.\nRaison : **${reason}**`)
          .setColor('#FF0000')
          .setTimestamp();
        
        message.channel.send({ content: `<@${userId}>`, embeds: [warnEmbed] })
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000))
          .catch(console.error);

        // Enregistrer l'avertissement dans la base de données
        try {
          db.prepare('INSERT INTO warnings (guild_id, user_id, reason, moderator_id, timestamp) VALUES (?, ?, ?, ?, ?)')
            .run(guildId, userId, `Auto-moderation: ${reason}`, client.user.id, Math.floor(Date.now() / 1000));
        } catch (e) {
          console.error('Erreur enregistrement warn automod:', e);
        }

        // Enregistrer la sanction/log
        const logEmbed = new EmbedBuilder()
          .setTitle('🛡️ Automod - Message Supprimé')
          .setDescription(`**Utilisateur :** <@${userId}> (${message.author.tag})\n**Raison :** ${reason}\n**Contenu :** \`\`\`${message.content.substring(0, 1000)}\`\`\``)
          .setColor('#FF8C00')
          .setTimestamp();
        
        sendLog(message.guild, 'moderation', logEmbed);
        return; // Ne pas donner d'XP si automod s'applique
      }
    }

    // Assurer l'existence des enregistrements en base de données
    getLeveling(guildId, userId);
    
    // Incrémenter le total de messages
    db.prepare('UPDATE leveling SET total_messages = total_messages + 1 WHERE guild_id = ? AND user_id = ?').run(guildId, userId);

    // Gérer l'incrémentation NSFW et récompenses
    let nsfwRewardXp = 0;
    let nsfwRewardMoney = 0;
    if (message.channel.nsfw) {
      db.prepare('UPDATE leveling SET nsfw_messages = nsfw_messages + 1 WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
      const lvlConfig = getLevelingConfig(guildId);
      nsfwRewardXp = lvlConfig.nsfw_xp_reward || 0;
      nsfwRewardMoney = lvlConfig.nsfw_money_reward || 0;
    }

    // --- GAIN D'XP, KARMA ET ARGENT (LEVELING TEXTE) ---
    const now = Date.now();
    const cooldownKey = `${guildId}-${userId}`;
    const userCooldown = xpCooldowns.get(cooldownKey);

    if (!userCooldown || (now - userCooldown) > 60000) {
      xpCooldowns.set(cooldownKey, now);
      const lvlConfig = getLevelingConfig(guildId);

      // Gain d'XP standard
      const minXp = lvlConfig.xp_min ?? 15;
      const maxXp = lvlConfig.xp_max ?? 25;
      const range = Math.max(1, maxXp - minXp + 1);
      const randomXp = Math.floor(Math.random() * range) + minXp;
      await addXP(message.guild, message.member, randomXp, message.channel);

      // Gain de Karma
      const minKarma = lvlConfig.karma_min ?? 1;
      const maxKarma = lvlConfig.karma_max ?? 3;
      const karmaRange = Math.max(1, maxKarma - minKarma + 1);
      const randomKarma = Math.floor(Math.random() * karmaRange) + minKarma;

      // Gain d'Argent (Solde)
      const minMoney = lvlConfig.money_min ?? 2;
      const maxMoney = lvlConfig.money_max ?? 5;
      const moneyRange = Math.max(1, maxMoney - minMoney + 1);
      const randomMoney = Math.floor(Math.random() * moneyRange) + minMoney;

      // Ajouter le Karma et l'Argent (avec bonus NSFW inclus)
      const totalMoney = randomMoney + nsfwRewardMoney;
      
      // Assurer l'existence de la table economy pour l'utilisateur
      db.prepare('INSERT OR IGNORE INTO economy (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
      db.prepare(`
        UPDATE economy 
        SET karma = karma + ?, wallet = wallet + ? 
        WHERE guild_id = ? AND user_id = ?
      `).run(randomKarma, totalMoney, guildId, userId);

      // Appliquer le bonus d'XP NSFW éventuel
      if (nsfwRewardXp > 0) {
        await addXP(message.guild, message.member, nsfwRewardXp, message.channel);
      }

      // --- JEU DE DEVINETTE (RECHERCHE DE LETTRE) ---
      const game = db.prepare('SELECT * FROM game_config WHERE guild_id = ? AND is_active = 1').get(guildId);
      if (game) {
        // 15% de chance de trouver une lettre
        if (Math.random() < 0.15) {
          const phrase = game.secret_phrase.toUpperCase();
          // Trouver toutes les lettres uniques de A à Z
          const allLetters = [...new Set(phrase.replace(/[^A-Z]/g, ''))];
          
          if (allLetters.length > 0) {
            const userRecord = db.prepare('SELECT unlocked_letters FROM user_letters WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
            const unlocked = userRecord ? userRecord.unlocked_letters.split('') : [];
            
            const remainingLetters = allLetters.filter(l => !unlocked.includes(l));
            
            if (remainingLetters.length > 0) {
              const newLetter = remainingLetters[Math.floor(Math.random() * remainingLetters.length)];
              unlocked.push(newLetter);
              
              db.prepare('INSERT OR REPLACE INTO user_letters (guild_id, user_id, unlocked_letters) VALUES (?, ?, ?)')
                .run(guildId, userId, unlocked.join(''));
              
              const gameEmbed = new EmbedBuilder()
                .setTitle('🔍 Lettre Trouvée !')
                .setDescription(`✨ Bravo <@${userId}> ! Tu as découvert la lettre **${newLetter}** du mot/phrase secret.\nUtilise \`/mot-cache statut\` pour voir tes lettres trouvées !`)
                .setColor('#F1C40F')
                .setTimestamp();
              
              message.channel.send({ content: `<@${userId}>`, embeds: [gameEmbed] }).catch(console.error);
            }
          }
        }
      }
    }
  }
};
