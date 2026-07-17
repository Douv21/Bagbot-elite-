const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getLeveling, updateLeveling, getLevelingConfig, db } = require('../database/db');
const { addXP, sendLog } = require('../utils/helpers');
const { evaluateMath } = require('../utils/math_eval');

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
    if (!message.guild) return;

    // --- SYSTÈME DE RAPPELS DE BUMPS MULTI-BOT ---
    try {
      const isDisboard = message.author.id === '302050872383242240';
      const isSlashBump = message.interaction && message.interaction.commandName === 'bump';
      
      if (isDisboard || isSlashBump) {
        const botName = isDisboard ? 'disboard' : message.author.username.toLowerCase();
        let shouldBump = false;
        
        if (isSlashBump) {
          shouldBump = true;
        } else if (isDisboard) {
          const embeds = message.embeds;
          const desc = embeds && embeds[0] && embeds[0].description ? embeds[0].description.toLowerCase() : '';
          const content = message.content.toLowerCase();
          if (desc.includes('bump effectué') || desc.includes('bump done') || content.includes('bump effectué') || content.includes('bump done') || desc.includes('page du serveur') || content.includes('page du serveur')) {
            shouldBump = true;
          }
        }

        if (shouldBump) {
          const nextBump = Math.floor(Date.now() / 1000) + 7200; // 2 heures de cooldown (7200s)
          db.prepare(`
            INSERT OR REPLACE INTO bump_reminders (guild_id, bot_name, next_bump_at, channel_id)
            VALUES (?, ?, ?, ?)
          `).run(message.guild.id, botName, nextBump, message.channel.id);
          
          await message.react('🔔').catch(() => {});
        }
      }
    } catch (e) {
      console.error('Erreur détection Bump:', e);
    }

    if (message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    // --- SUIVI DES CONVERSATIONS (LOVE-CALC ÉVOLUTIF) ---
    try {
      const messages = await message.channel.messages.fetch({ limit: 2 }).catch(() => null);
      if (messages && messages.size >= 2) {
        const lastMessages = Array.from(messages.values());
        const previousMsg = lastMessages[1];
        if (previousMsg && !previousMsg.author.bot && previousMsg.author.id !== userId) {
          const { incrementMemberChat } = require('../database/db');
          incrementMemberChat(guildId, userId, previousMsg.author.id);
        }
      }
    } catch (e) {
      console.error('Erreur suivi conversation:', e);
    }

    // --- SYSTÈME DE COMPTAGE (COUNTING) ---
    const countingChan = db.prepare('SELECT * FROM counting_channels WHERE guild_id = ? AND channel_id = ?').get(guildId, message.channel.id);
    if (countingChan) {
      const contentStr = message.content.trim();
      
      // Ignorer les messages contenant des lettres (A à Z)
      if (/[a-zA-Z]/.test(contentStr)) {
        return;
      }
      
      let proposedNumber = null;
      
      if (countingChan.mode === 'math') {
        proposedNumber = evaluateMath(contentStr);
      } else {
        if (/^-?[0-9.]+$/.test(contentStr)) {
          proposedNumber = parseFloat(contentStr);
        }
      }

      if (proposedNumber === null || isNaN(proposedNumber)) {
        await message.react('❌').catch(() => {});
        db.prepare('UPDATE counting_channels SET current_number = start_number, last_user_id = NULL WHERE channel_id = ?').run(message.channel.id);
        await message.reply(`💥 **Erreur !** Ce n'est pas un nombre valide. Le compteur a été réinitialisé à **${countingChan.start_number}** !`).catch(() => {});
        return;
      }

      if (countingChan.last_user_id === userId) {
        await message.react('❌').catch(() => {});
        db.prepare('UPDATE counting_channels SET current_number = start_number, last_user_id = NULL WHERE channel_id = ?').run(message.channel.id);
        await message.reply(`💥 **Erreur !** <@${userId}>, tu ne peux pas compter deux fois de suite ! Le compteur a été réinitialisé à **${countingChan.start_number}** !`).catch(() => {});
        return;
      }

      let isCorrect = false;
      let nextNumber = 0;
      if (countingChan.mode === 'reverse') {
        nextNumber = countingChan.current_number - 1;
        isCorrect = (proposedNumber === nextNumber);
      } else {
        nextNumber = countingChan.current_number + 1;
        isCorrect = (proposedNumber === nextNumber);
      }

      if (isCorrect) {
        await message.react('✅').catch(() => {});
        
        let newHighScore = countingChan.high_score;
        if (countingChan.mode === 'reverse') {
          const currentProgress = countingChan.start_number - nextNumber;
          if (currentProgress > countingChan.high_score) {
            newHighScore = currentProgress;
          }
        } else {
          if (nextNumber > countingChan.high_score) {
            newHighScore = nextNumber;
          }
        }

        db.prepare('UPDATE counting_channels SET current_number = ?, last_user_id = ?, high_score = ? WHERE channel_id = ?')
          .run(nextNumber, userId, newHighScore, message.channel.id);
      } else {
        await message.react('❌').catch(() => {});
        db.prepare('UPDATE counting_channels SET current_number = start_number, last_user_id = NULL WHERE channel_id = ?').run(message.channel.id);
        const expected = countingChan.mode === 'reverse' 
          ? (countingChan.current_number - 1) 
          : (countingChan.current_number + 1);
        await message.reply(`💥 **Erreur !** Le nombre attendu était **${expected}** (tu as écrit **${proposedNumber}**). Le compteur a été réinitialisé à **${countingChan.start_number}** !`).catch(() => {});
      }
      return;
    }

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
    // Note : Cooldown supprimé pour que chaque message compte
    if (true) {
      const lvlConfig = getLevelingConfig(guildId);

      // Gain d'XP standard
      const minXp = lvlConfig.xp_min ?? 15;
      const maxXp = lvlConfig.xp_max ?? 25;
      const range = Math.max(1, maxXp - minXp + 1);
      const randomXp = Math.floor(Math.random() * range) + minXp;
      await addXP(message.guild, message.member, randomXp, message.channel);

      // Gain d'Argent (Solde)
      const minMoney = lvlConfig.money_min ?? 2;
      const maxMoney = lvlConfig.money_max ?? 5;
      const moneyRange = Math.max(1, maxMoney - minMoney + 1);
      const randomMoney = Math.floor(Math.random() * moneyRange) + minMoney;

      // Ajouter l'Argent (avec bonus NSFW inclus)
      const totalMoney = randomMoney + nsfwRewardMoney;
      
      // Assurer l'existence de la table economy pour l'utilisateur
      db.prepare('INSERT OR IGNORE INTO economy (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
      
      // Gain de Karma configurable
      const minKarma = lvlConfig.karma_min ?? 1;
      const maxKarma = lvlConfig.karma_max ?? 3;
      const karmaRange = Math.max(1, maxKarma - minKarma + 1);
      const randomKarma = Math.floor(Math.random() * karmaRange) + minKarma;

      db.prepare(`
        UPDATE economy 
        SET wallet = wallet + ?, karma = karma + ?
        WHERE guild_id = ? AND user_id = ?
      `).run(totalMoney, randomKarma, guildId, userId);

      // Appliquer le bonus d'XP NSFW éventuel
      if (nsfwRewardXp > 0) {
        await addXP(message.guild, message.member, nsfwRewardXp, message.channel);
      }

      // --- JEU DE DEVINETTE (RECHERCHE DE LETTRE) ---
      const game = db.prepare('SELECT * FROM game_config WHERE guild_id = ? AND is_active = 1').get(guildId);
      if (game) {
        const chance = (game.appearance_chance !== undefined && game.appearance_chance !== null) ? game.appearance_chance : 15;
        if (Math.random() * 100 < chance) {
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

              // Réagir au message de l'utilisateur avec l'émoji configuré
              if (game.letter_emoji) {
                let emojiToReact = game.letter_emoji.trim();
                const match = emojiToReact.match(/<?a?:?([a-zA-Z0-9_]+):(\d+)>?/);
                if (match) {
                  emojiToReact = match[2];
                } else if (emojiToReact.startsWith(':') && emojiToReact.endsWith(':')) {
                  const cleanedName = emojiToReact.slice(1, -1);
                  const foundEmoji = message.guild.emojis.cache.find(e => e.name === cleanedName);
                  if (foundEmoji) {
                    emojiToReact = foundEmoji.id;
                  }
                }
                message.react(emojiToReact).catch(err => {
                  console.warn(`Impossible de réagir avec l'émoji ${game.letter_emoji}:`, err.message);
                  message.react('🔍').catch(() => {});
                });
              }
              
              const { generateSensualText } = require('../utils/aiActionHelper');
              const aiDescription = await generateSensualText(`Félicite chaleureusement l'utilisateur <@${userId}> d'avoir découvert la lettre "${newLetter}" dans le jeu du Mot Caché. Fais une phrase très sensuelle, complice et torride, adaptée à un serveur adulte.`);

              const gameEmbed = new EmbedBuilder()
                .setTitle('🍑 Lettre Trouvée !')
                .setDescription(aiDescription || `🔥 Bravo ! Tu as découvert la lettre **${newLetter}** du mot/phrase secret.\nUtilise \`/mot-cache\` pour voir tes lettres trouvées !`)
                .setColor('#E74C3C')
                .setTimestamp();
              
              // Si ephemeral_letters est activé, on envoie en éphémère (autodestruction 6s) dans le salon de discussion
              if (game.ephemeral_letters === 1 || game.ephemeral_letters === undefined || game.ephemeral_letters === null) {
                message.channel.send({ content: `<@${userId}> 🍑 *Ce message s'autodétruira dans 6 secondes...*`, embeds: [gameEmbed] }).then(msg => {
                  setTimeout(() => msg.delete().catch(() => {}), 6000);
                }).catch(console.error);
              } else {
                // Sinon, on envoie dans le salon d'annonce configuré (sans autodestruction)
                let targetAnnounceChannel = null;
                if (game.announce_channel && game.announce_channel !== 'dm') {
                  targetAnnounceChannel = message.guild.channels.cache.get(game.announce_channel);
                }
                const destChan = targetAnnounceChannel || message.channel;
                destChan.send({ content: `<@${userId}>`, embeds: [gameEmbed] }).catch(console.error);
              }
            }
          }
        }
      }
    }
  }
};
