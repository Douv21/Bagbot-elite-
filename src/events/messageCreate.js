const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getLeveling, updateLeveling, db } = require('../database/db');
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

    // --- AUTOMODÉRATION ---
    
    // Ignorer l'automodération pour les administrateurs
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      let violated = false;
      let reason = '';

      // 1. Anti-invites Discord
      const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
      if (inviteRegex.test(message.content)) {
        violated = true;
        reason = 'Envoi d\'invitations Discord non autorisé';
      }

      // 2. Anti-liens généraux (si activé, ou simple vérification)
      const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;
      if (!violated && linkRegex.test(message.content)) {
        // Optionnel : on peut vérifier en base de données si l'anti-liens est actif.
        // Ici on applique une règle de base (logs et suppression)
        violated = true;
        reason = 'Envoi de liens non autorisé';
      }

      // 3. Anti-insultes
      const messageContentLower = message.content.toLowerCase();
      if (!violated && BANNED_WORDS.some(word => messageContentLower.includes(word))) {
        violated = true;
        reason = 'Utilisation de langage inapproprié';
      }

      // 4. Anti-Mass Mentions (plus de 5 mentions)
      if (!violated && message.mentions.users.size > 5) {
        violated = true;
        reason = 'Mass Mentions (> 5 utilisateurs)';
      }

      // 5. Anti-Spam
      if (!violated) {
        const now = Date.now();
        if (!spamMap.has(userId)) {
          spamMap.set(userId, []);
        }
        const userMessages = spamMap.get(userId);
        userMessages.push(now);

        // Filtrer les messages en dehors de la fenêtre SPAM_TIME
        const activeMessages = userMessages.filter(timestamp => now - timestamp < SPAM_TIME);
        spamMap.set(userId, activeMessages);

        if (activeMessages.length > SPAM_THRESHOLD) {
          violated = true;
          reason = 'Spam de messages';
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

        // Enregistrer la sanction/log
        const logEmbed = new EmbedBuilder()
          .setTitle('🛡️ Automod - Message Supprimé')
          .setDescription(`**Utilisateur :** <@${userId}> (${message.author.tag})\n**Raison :** ${reason}\n**Contenu :** \`\`\`${message.content.substring(0, 1000)}\`\`\``)
          .setColor('#FF8C00')
          .setTimestamp();
        
        sendLog(message.guild, 'automod', logEmbed);
        return; // Ne pas donner d'XP si automod s'applique
      }
    }

    // --- GAIN D'XP (LEVELING TEXTE) ---
    const now = Date.now();
    const cooldownKey = `${guildId}-${userId}`;
    const userCooldown = xpCooldowns.get(cooldownKey);

    if (!userCooldown || (now - userCooldown) > 60000) {
      xpCooldowns.set(cooldownKey, now);
      const randomXp = Math.floor(Math.random() * 11) + 15; // 15 à 25 XP
      await addXP(message.guild, message.member, randomXp, message.channel);

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
                .setDescription(`✨ Bravo <@${userId}> ! Tu as découvert la lettre **${newLetter}** du mot/phrase secret.\nUtilise \`/jeu statut\` pour voir tes lettres trouvées !`)
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
