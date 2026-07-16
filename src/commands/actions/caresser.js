const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionGifs, db } = require('../../database/db');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('caresser')
    .setDescription("Caresser doucement quelqu'un")
    .addUserOption(option => option.setName('cible').setDescription('Personne ciblée (optionnel)').setRequired(false))
    .setDMPermission(true),

  async execute(interaction) {
    await interaction.deferReply();
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
    
    // Rangs de récompense par défaut
    const minReward = 5;
    const maxReward = 15;
    const karmaMin = 1;
    const karmaMax = 3;
    
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

    const actionMessage = target.id === userId 
      ? `${author} se caresse les bras doucement.`
      : `${author} caresse tendrement ${target}.`;

    const embed = new EmbedBuilder()
      .setTitle("👋 Caresse")
      .setDescription(actionMessage)
      .setColor(0x8B0000)
      .setAuthor({ name: author.username, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    const files = [];
    const targetFiles = [];
    
    let gifs = [];
    if (guildId) {
      gifs = getActionGifs(guildId, 'caresser');
    } else {
      try {
        gifs = db.prepare('SELECT * FROM action_gifs WHERE action_name = ?').all('caresser');
      } catch (e) {
        console.error('Erreur lecture gifs en MP:', e);
      }
    }

    if (gifs && gifs.length > 0) {
      const randomGif = gifs[Math.floor(Math.random() * gifs.length)].gif_url;
      if (randomGif.startsWith('/uploads/')) {
        const absPath = path.join(__dirname, '../../../public', randomGif);
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

    const mention = target && target.id !== userId ? `<@${target.id}>` : null;
    await interaction.editReply({
      content: mention,
      embeds: [embed],
      files: files,
      allowedMentions: mention ? { users: [target.id] } : { parse: [] }
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
};
