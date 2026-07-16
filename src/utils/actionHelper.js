const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionGifs, getActionReward } = require('../database/db');
const fs = require('fs');
const path = require('path');

async function executeAction(interaction, actionName, config) {
  const { title, defaultMessage, color = 0x8B0000 } = config;
  
  const guildId = interaction.guild ? interaction.guild.id : null;
  const userId = interaction.user.id;
  let target = interaction.options.getUser('cible');

  if (!target) {
    if (interaction.guild) {
      const members = await interaction.guild.members.fetch({ limit: 100 }).catch(() => null);
      const randomMember = members ? members.filter(m => m.id !== userId).random() : null;
      target = randomMember ? randomMember.user : interaction.user;
    } else {
      target = interaction.user;
    }
  }

  const author = interaction.user;
  
  // Rangs de récompense (configurable par action)
  let minReward = 5;
  let maxReward = 15;
  let karmaMin = 1;
  let karmaMax = 3;

  if (guildId) {
    const actReward = getActionReward(guildId, actionName);
    minReward = actReward.min_money;
    maxReward = actReward.max_money;
    karmaMin = actReward.min_karma;
    karmaMax = actReward.max_karma;
  }
  
  const karmaReward = Math.floor(Math.random() * (karmaMax - karmaMin + 1)) + karmaMin;
  const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
  
  let totalCoins = 0;
  
  if (guildId) {
    const eco = getEconomy(guildId, userId);
    totalCoins = eco.wallet + eco.bank + reward;
    updateEconomy(guildId, userId, {
      wallet: eco.wallet + reward,
      karma: eco.karma + karmaReward
    });
  } else {
    totalCoins = reward;
  }

  const actionMessage = typeof defaultMessage === 'function' 
    ? defaultMessage(author, target)
    : defaultMessage;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(actionMessage)
    .setColor(color)
    .setAuthor({ name: author.username, iconURL: author.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  const files = [];
  const targetFiles = [];
  
  let gifs = [];
  if (guildId) {
    gifs = getActionGifs(guildId, actionName);
  } else {
    const { db } = require('../database/db');
    try {
      gifs = db.prepare('SELECT * FROM action_gifs WHERE action_name = ?').all(actionName);
    } catch (e) {
      console.error('Erreur lecture gifs en MP:', e);
    }
  }

  if (gifs && gifs.length > 0) {
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)].gif_url;
    if (randomGif.startsWith('/uploads/')) {
      const absPath = path.join(__dirname, '../../public', randomGif);
      if (fs.existsSync(absPath)) {
        const filename = path.basename(randomGif);
        files.push(new AttachmentBuilder(absPath, { name: filename }));
        targetFiles.push(new AttachmentBuilder(absPath, { name: filename }));
        embed.setImage(`attachment://${filename}`);
      }
    } else if (randomGif.startsWith('http://') || randomGif.startsWith('https://')) {
      embed.setImage(randomGif);
    }
  }

  if (guildId) {
    embed.setDescription(`${actionMessage}\n\n💰 **+${reward} pièces**  ·  ✨ **+${karmaReward} Karma**`);
    embed.setFooter({ text: `Solde: ${totalCoins} pièces · +${karmaReward} karma` });
  } else {
    embed.setFooter({ text: '💬 Exécuté en message privé (sans gain de pièces ou de karma)' });
  }

  await interaction.editReply({
    embeds: [embed],
    files: files
  });

  if (!guildId && target && target.id !== userId) {
    try {
      await target.send({
        content: `🔔 **<@${userId}>** vous a fait une action en MP !`,
        embeds: [embed],
        files: targetFiles
      });
    } catch (err) {
      console.error('Impossible d\'envoyer le MP de l\'action à la cible :', err);
    }
  }
}

module.exports = { executeAction };
