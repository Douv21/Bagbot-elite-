const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionReward, getActionGifs, db } = require('../../database/db');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder().setContexts([0, 1, 2]).setIntegrationTypes([0, 1])
    .setName('gifle')
    .setDescription("Donner une gifle à quelqu'un (SFW)")
    .addUserOption(option => option.setName('cible').setDescription('Personne ciblée').setRequired(false))
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
    
    const rewardConfig = guildId ? getActionReward(guildId, 'gifle') : { min_money: 5, max_money: 15, min_karma: 1, max_karma: 3 };
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

    try {
      const { generateAiActionPhrase } = require('../../utils/aiActionHelper');
      const aiPhrase = await generateAiActionPhrase('gifle', 'Donner une gifle théâtrale ou joueuse à quelqu\'un', interaction.member, targetMember);
      if (aiPhrase) {
        actionMessage = aiPhrase;
      }
    } catch (e) {
      console.warn('[Action GIFLE AI]', e.message);
    }

    if (!actionMessage) {
      actionMessage = target.id === userId 
        ? `${author} se donne une petite gifle pour se réveiller.`
        : `${author} donne une gifle retentissante à ${target} !`;
    }

    const embed = new EmbedBuilder()
      .setTitle("👋 Gifle")
      .setDescription(actionMessage)
      .setColor(0xE74C3C)
      .setAuthor({ name: author.username, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    let gifs = guildId ? getActionGifs(guildId, 'gifle') : [];
    if (!gifs || gifs.length === 0) {
      try {
        gifs = db.prepare('SELECT * FROM action_gifs WHERE action_name = ?').all('gifle');
      } catch (e) {}
    }

    if (gifs && gifs.length > 0) {
      const rawUrl = gifs[Math.floor(Math.random() * gifs.length)].gif_url;
      if (rawUrl && rawUrl.startsWith('/')) {
        const baseUrl = process.env.DASHBOARD_PUBLIC_URL || `http://${process.env.PUBLIC_IP || '82.65.75.176'}:49601`;
        embed.setImage(`${baseUrl}${rawUrl}`);
      } else if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
        embed.setImage(rawUrl);
      }
    }

    if (guildId) {
      embed.setDescription(`${actionMessage}\n\n💰 **+${reward} pièces**  ·  ✨ **+${karmaReward} Karma**`);
      embed.setFooter({ text: `Solde: ${totalCoins} pièces · +${karmaReward} karma` });
    }

    const mention = target && target.id !== userId ? `<@${target.id}>` : null;
    await interaction.editReply({
      content: mention,
      embeds: [embed],
      allowedMentions: { parse: ['users'] }
    });
  }
};
