const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionGifs, getActionGifsAnyGuild, db } = require('../../database/db');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder().setContexts([0, 1, 2]).setIntegrationTypes([0, 1])
    .setName('69')
    .setDescription("Faire un 69 avec quelqu\'un")
    .addUserOption(option => option.setName('cible').setDescription('Personne ciblée (optionnel)').setRequired(false))
    .setNSFW(true)
    .setDMPermission(true),

  async execute(interaction) {
    const { resolveTarget, getValidActionGifUrl, generateAiActionPhraseFast } = require('../../utils/actionRunner');
    await interaction.deferReply();
    const guildId = interaction.guild ? interaction.guild.id : null;
    const userId = interaction.user.id;
    const target = await resolveTarget(interaction);

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

      if (target && target.id !== userId && !target.bot) {
        const targetEco = getEconomy(guildId, target.id);
        updateEconomy(guildId, target.id, {
          karma: targetEco.karma + karmaReward
        });
      }
    } else {
      totalCoins = reward;
    }

    const targetMember = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;
    let actionMessage = "";

    // Tenter de générer une phrase unique via l'IA en temps réel
    try {
      const { generateAiActionPhrase } = require('../../utils/aiActionHelper');
      const aiPhrase = await generateAiActionPhraseFast('69', 'Faire un 69 avec quelqu\'un', interaction.member, targetMember);
      if (aiPhrase) {
        actionMessage = aiPhrase;
      }
    } catch (e) {}

    // Fallback aux phrases configurées en base de données / par défaut
    if (!actionMessage) {
      actionMessage = target.id === userId 
        ? `${author} tente de faire un 69 tout seul... C\'est anatomiquement impossible !`
        : `${author} s\'entrelace sensuellement pour un 69 torride et humide avec ${target} ! || ${author} entraîne ${target} dans un 69 brûlant et passionné... || Dans un élan de désir, ${author} et ${target} s\'unissent dans un 69 extrêmement charnel ! || Corps contre corps, tête-bêche, ${author} et ${target} partagent un 69 incroyablement torride.`;

      if (guildId) {
        const { getCustomActionMessage } = require('../../database/db');
        const customMsg = getCustomActionMessage(guildId, '69');
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
      .setTitle("🍑 69")
      .setDescription(actionMessage)
      .setColor(0x8B0000)
      .setAuthor({ name: author.username, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    const files = [];
    const targetFiles = [];
    
    const gifUrl = getValidActionGifUrl(guildId, '69');

    const randomGif = getValidActionGifUrl(guildId, '69');
    if (randomGif) {
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

    if (mention && interaction.guild && interaction.channel) {
      await interaction.deleteReply().catch(() => null);
      await interaction.channel.send({
        content: mention,
        embeds: [embed],
        files: files,
        allowedMentions: { parse: ['users'] }
      });
    } else {
      try {
        await interaction.editReply({ embeds: [embed], files: files });
      } catch (dmErr) {
        // Discord bloque le contenu explicite en DM si non activ� ? retry sans image
        embed.setImage(null);
        await interaction.editReply({ embeds: [embed] }).catch(e2 => console.error('[DM Reply]', e2.message));
      }
    }
  }
};
