const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionReward, getActionGifs } = require('../../database/db');
const { generateAiEconomyPhrase } = require('../../utils/aiActionHelper');

module.exports = {
  name: 'daily',
  dmPermission: false,
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Réclamer votre récompense quotidienne')
    .setDMPermission(false),
  
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const economy = getEconomy(guildId, userId);
    const now = Math.floor(Date.now() / 1000);
    const cooldown = 86400; // 24 heures en secondes

    if (economy.last_daily && (now - economy.last_daily) < cooldown) {
      const remaining = cooldown - (now - economy.last_daily);
      const hours = Math.floor(remaining / 3600);
      const mins = Math.floor((remaining % 3600) / 60);

      const cooldownEmbed = new EmbedBuilder()
        .setTitle('⏱️ Récompense Quotidienne')
        .setDescription(`Vous avez déjà réclamé votre récompense.\nRevenez dans **${hours}h et ${mins}m** !`)
        .setColor(0xe74c3c);

      return interaction.reply({ 
        embeds: [cooldownEmbed], 
        ephemeral: true 
      });
    }

    await interaction.deferReply();

    const rewardConfig = getActionReward(guildId, 'daily');
    const minReward = rewardConfig.min_money;
    const maxReward = rewardConfig.max_money;
    const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
    const karmaReward = Math.floor(Math.random() * (rewardConfig.max_karma - rewardConfig.min_karma + 1)) + rewardConfig.min_karma;

    updateEconomy(guildId, userId, {
      wallet: economy.wallet + reward,
      karma: economy.karma + karmaReward,
      last_daily: now
    });

    const aiPhrase = await generateAiEconomyPhrase('daily', interaction.member, reward, karmaReward, true, guildId);
    const defaultDesc = `🎁 **${interaction.member.displayName}** a réclamé sa récompense quotidienne avec succès !`;

    const gifs = getActionGifs(guildId, 'daily');
    let gifUrl = null;
    if (gifs && gifs.length > 0) {
      const rawUrl = gifs[Math.floor(Math.random() * gifs.length)].gif_url;
      if (rawUrl && rawUrl.startsWith('/')) {
        const baseUrl = process.env.DASHBOARD_PUBLIC_URL || `http://${process.env.PUBLIC_IP || '82.65.75.176'}:49601`;
        gifUrl = `${baseUrl}${rawUrl}`;
      } else if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
        gifUrl = rawUrl;
      }
    }

    const successEmbed = new EmbedBuilder()
      .setTitle('🎁 Récompense Quotidienne Réclamée !')
      .setDescription(aiPhrase || defaultDesc)
      .addFields(
        { name: '💰 Pièces gagnées', value: `+${reward} pièces`, inline: true }
      )
      .setColor(0x2ecc71)
      .setTimestamp();

    if (karmaReward > 0) {
      successEmbed.addFields({ name: '✨ Karma gagné', value: `+${karmaReward} karma`, inline: true });
    }

    if (gifUrl) {
      successEmbed.setImage(gifUrl);
    }

    return interaction.editReply({
      embeds: [successEmbed]
    });
  }
};
