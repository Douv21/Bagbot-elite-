const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionReward, getActionGifs, db } = require('../../database/db');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder().setContexts([0, 1, 2]).setIntegrationTypes([0, 1])
    .setName('patpat')
    .setDescription("Donner de petits tapotements mignons sur la tête de quelqu'un (SFW)")
    .addUserOption(option => option.setName('cible').setDescription('Personne ciblée').setRequired(false))
    .setDMPermission(true),

  async execute(interaction) {
    const { resolveTarget, getValidActionGifUrl, generateAiActionPhraseFast } = require('../../utils/actionRunner');
    await interaction.deferReply();
    const guildId = interaction.guild ? interaction.guild.id : null;
    const userId = interaction.user.id;
    const target = await resolveTarget(interaction);

    const author = interaction.user;
    
    const rewardConfig = guildId ? getActionReward(guildId, 'patpat') : { min_money: 5, max_money: 15, min_karma: 1, max_karma: 3 };
    const minReward = rewardConfig.min_money;
    const maxReward = rewardConfig.max_money;
    const karmaMin = rewardConfig.min_karma;
    const karmaMax = rewardConfig.max_karma;
    
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

    const { generateAiActionPhrase } = require('../../utils/aiActionHelper');
    const aiPhrase = await generateAiActionPhraseFast('patpat', 'Faire un doux tapotement mignon sur la tête de quelqu\'un', interaction.member, targetMember);
    if (aiPhrase) {
      actionMessage = aiPhrase;
    }

    if (!actionMessage) {
      actionMessage = target.id === userId 
        ? `${author} se tapote doucement la tête.`
        : `${author} tapote gentiment la tête de ${target} avec affection.`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🫳 Patpat (Tapotement)")
      .setDescription(actionMessage)
      .setColor(0x3498DB)
      .setAuthor({ name: author.username, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    const files = [];
    let gifs = guildId ? getActionGifs(guildId, 'patpat') : [];
    if (!gifs || gifs.length === 0) {
      try {
        gifs = getActionGifsAnyGuild('patpat');
      } catch (e) {}
    }

    const randomGif = getValidActionGifUrl(guildId, 'patpat');
    if (randomGif) {
      if (randomGif.startsWith('/uploads/')) {
        const absPath = path.join(__dirname, '../../../public', randomGif);
        if (fs.existsSync(absPath)) {
          const filename = path.basename(randomGif);
          files.push(new AttachmentBuilder(absPath, { name: filename }));
          embed.setImage(`attachment://${filename}`);
        }
      } else if (randomGif.startsWith('http://') || randomGif.startsWith('https://')) {
        embed.setImage(randomGif);
      }
    }

    if (guildId) {
      embed.setDescription(`${actionMessage}\n\n💰 **+${reward} pièces**  ·  ✨ **+${karmaReward} Karma**`);
      embed.setFooter({ text: `Solde: ${totalCoins} pièces · +${karmaReward} karma` });
    }
    const mention = target && target.id !== userId ? `<@${target.id}>` : null;

    try {
      await interaction.editReply({
        content: mention,
        embeds: [embed],
        files: files,
        allowedMentions: mention ? { users: [target.id] } : { parse: [] }
      });
    } catch (dmErr) {
      embed.setImage(null);
      await interaction.editReply({
        content: mention,
        embeds: [embed],
        allowedMentions: mention ? { users: [target.id] } : { parse: [] }
      }).catch(e2 => console.error('[DM Reply]', e2.message));
    }
  }
};
