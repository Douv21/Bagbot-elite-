const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionGifs, db } = require('../../database/db');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mordre')
    .setDescription("Mordre quelqu\'un")
    .addUserOption(option => option.setName('cible').setDescription('Personne ciblée (optionnel)').setRequired(false))
    .setDMPermission(true),

  async execute(interaction) {
    await interaction.deferReply();
    const guildId = interaction.guild ? interaction.guild.id : null;
    const userId = interaction.user.id;
    let target = interaction.options.getUser('cible');

    if (!target) {
      target = interaction.user;
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

    const targetMember = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;
    let actionMessage = "";

    // Tenter de générer une phrase unique via l'IA en temps réel
    if (true) {
      const { generateAiActionPhrase } = require('../../utils/aiActionHelper');
      const aiPhrase = await generateAiActionPhrase('mordre', 'Mordre quelqu\'un', interaction.member, targetMember);
      if (aiPhrase) {
        actionMessage = aiPhrase;
      }
    }

    // Fallback aux phrases configurées en base de données / par défaut
    if (!actionMessage) {
      actionMessage = target.id === userId 
        ? `${author} se mord la langue. Aïe !`
        : `${author} mordille délicatement et sauvagement le cou de ${target} ! || ${author} enfonce doucement ses dents dans la chair de ${target} pour éveiller ses désirs... || Une morsure complice et coquine de ${author} fait frissonner ${target}.`;

      if (guildId) {
        const { getCustomActionMessage } = require('../../database/db');
        const customMsg = getCustomActionMessage(guildId, 'mordre');
        if (customMsg) {
          actionMessage = target.id === userId
            ? (customMsg.self_message || actionMessage)
            : (customMsg.target_message || actionMessage);
        }
      }

      // Sélectionner une phrase aléatoire si des alternatives séparées par "||" existent
      if (actionMessage.includes('||')) {
        const parts = actionMessage.split('||').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length > 0) {
          actionMessage = parts[Math.floor(Math.random() * parts.length)];
        }
      }

      const { formatGenderMessage } = require('../../utils/genderHelper');
      actionMessage = formatGenderMessage(actionMessage, interaction.member, targetMember);
    }

    const embed = new EmbedBuilder()
      .setTitle("🦷 Morsure")
      .setDescription(actionMessage)
      .setColor(0x8B0000)
      .setAuthor({ name: author.username, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    const files = [];
    const targetFiles = [];
    
    let gifs = [];
    if (guildId) {
      gifs = getActionGifs(guildId, 'mordre');
    } else {
      try {
        gifs = db.prepare('SELECT * FROM action_gifs WHERE action_name = ?').all('mordre');
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
