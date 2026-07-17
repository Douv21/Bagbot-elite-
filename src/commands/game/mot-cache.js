const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db, getEconomy, updateEconomy } = require('../../database/db');
const { addXP } = require('../../utils/helpers');

module.exports = {
  name: "mot-cache",
  
  data: new SlashCommandBuilder()
    .setName('mot-cache')
    .setDescription('Progression ou proposition de réponse pour le jeu du mot caché')
    .addStringOption(option => 
      option.setName('proposition')
        .setDescription('Votre proposition de phrase ou mot mystère (facultatif)')
        .setRequired(false))
    .setDMPermission(false),
  
  description: "Progression ou proposition de réponse pour le jeu du mot caché",

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const guess = interaction.options.getString('proposition');

    // Récupérer le jeu actif
    const game = db.prepare('SELECT * FROM game_config WHERE guild_id = ? AND is_active = 1').get(guildId);

    if (!game) {
      return interaction.reply({ 
        content: '🔞 Il n\'y a pas de jeu du mot caché actif sur ce serveur en ce moment.', 
        ephemeral: true 
      });
    }

    // Cas 1 : Simple demande de statut / progression
    if (!guess) {
      const phrase = game.secret_phrase.toUpperCase();
      
      // Récupérer les lettres trouvées par l'utilisateur
      const userRecord = db.prepare('SELECT unlocked_letters FROM user_letters WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
      const unlocked = userRecord ? userRecord.unlocked_letters.split('') : [];

      // Construire la phrase avec les lettres masquées
      let display = '';
      let totalLettersToFind = [...new Set(phrase.replace(/[^A-Z]/g, ''))].length;

      for (let i = 0; i < phrase.length; i++) {
        const char = phrase[i];
        if (/[A-Z]/.test(char)) {
          if (unlocked.includes(char)) {
            display += `**${char}** `;
          } else {
            display += '\\_ ';
          }
        } else {
          // Afficher directement les symboles (?, !, ;, etc.) et espaces
          display += `${char} `;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('😈 Votre progression - Jeu du Mot Caché')
        .setDescription(`Voici votre grille personnalisée en fonction des lettres que vous avez trouvées :\n\n\`${display.trim()}\``)
        .setColor('#E74C3C')
        .addFields(
          {
            name: '🍒 Statistiques',
            value: `Lettres débloquées : **${unlocked.length} / ${totalLettersToFind}** uniques.\nLettres trouvées : ${unlocked.map(l => `\`${l}\``).join(', ') || 'Aucune pour le moment'}`
          }
        )
        .setFooter({ text: 'Parlez dans les salons pour trouver d\'autres lettres !' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } 
    
    // Cas 2 : L'utilisateur fait une proposition
    else {
      const guessUpper = guess.toUpperCase().trim().replace(/\s+/g, ' ');
      const secret = game.secret_phrase.toUpperCase().trim().replace(/\s+/g, ' ');

      if (guessUpper === secret) {
        // Arrêter le jeu
        db.prepare('UPDATE game_config SET is_active = 0 WHERE guild_id = ?').run(guildId);

        // Distribuer les récompenses
        let rewardMessages = [];
        const member = interaction.guild.members.cache.get(userId);

        // 1. Argent
        if (game.reward_money > 0) {
          const eco = getEconomy(guildId, userId);
          updateEconomy(guildId, userId, {
            wallet: eco.wallet + game.reward_money
          });
          rewardMessages.push(`💰 **${game.reward_money} pièces** (ajoutées à votre poche)`);
        }

        // 2. XP
        if (game.reward_xp > 0) {
          await addXP(interaction.guild, member, game.reward_xp, null);
          rewardMessages.push(`⚡ **${game.reward_xp} XP**`);
        }

        // 3. Rôle
        if (game.reward_role_id) {
          const role = interaction.guild.roles.cache.get(game.reward_role_id);
          if (role) {
            try {
              await member.roles.add(role);
              rewardMessages.push(`🎭 Le rôle <@&${game.reward_role_id}>`);
            } catch (e) {
              console.error(e);
              rewardMessages.push(`🎭 Le rôle <@&${game.reward_role_id}> (erreur lors de l'attribution, vérifiez mes permissions)`);
            }
          }
        }

        const winEmbed = new EmbedBuilder()
          .setTitle('💋 JEU DEVINÉ ! Victoire Torride !')
          .setDescription(`🍒 Félicitations à <@${userId}> qui a percé le secret :\n\n🍑 **"${game.secret_phrase}"** !`)
          .setColor('#E74C3C')
          .setTimestamp();

        if (rewardMessages.length > 0) {
          winEmbed.addFields({
            name: '💋 Récompenses obtenues',
            value: rewardMessages.join('\n')
          });
        }

        await interaction.reply({ content: '💋 Proposition correcte ! Vous avez gagné !', ephemeral: true });
        
        let announceChan = interaction.channel;
        if (game.announce_channel && game.announce_channel !== 'dm') {
          const customChan = interaction.guild.channels.cache.get(game.announce_channel);
          if (customChan) announceChan = customChan;
        }
        await announceChan.send({ embeds: [winEmbed] });

        // Nettoyer les lettres trouvées pour ce serveur
        db.prepare('DELETE FROM user_letters WHERE guild_id = ?').run(guildId);
      } else {
        await interaction.reply({ 
          content: '🔞 Ce n\'est pas la bonne phrase secrète ! Retentez votre chance ou continuez à chercher des lettres.', 
          ephemeral: true 
        });
      }
    }
  }
};
