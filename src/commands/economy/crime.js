const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionReward, getActionGifs } = require('../../database/db');
const { generateAiEconomyPhrase } = require('../../utils/aiActionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crime')
    .setDescription('Tenter de commettre un crime pour obtenir un gros butin (risqué)'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const economy = getEconomy(guildId, userId);
    const now = Math.floor(Date.now() / 1000);
    const cooldown = 7200; // 2 heures en secondes

    if (economy.last_crime && (now - economy.last_crime) < cooldown) {
      const remaining = cooldown - (now - economy.last_crime);
      const hours = Math.floor(remaining / 3600);
      const mins = Math.floor((remaining % 3600) / 60);
      return interaction.reply({ content: `⏱️ La police patrouille encore. Retentez votre chance dans **${hours}h et ${mins}m**.`, ephemeral: true });
    }

    await interaction.deferReply();

    const rewardConfig = getActionReward(guildId, 'crime');
    const minEarnings = rewardConfig ? rewardConfig.min_money : 200;
    const maxEarnings = rewardConfig ? rewardConfig.max_money : 500;
    const minKarma = rewardConfig ? rewardConfig.min_karma : -2;
    const maxKarma = rewardConfig ? rewardConfig.max_karma : -1;

    const success = Math.random() < 0.5; // 50% de réussite
    let earnings = 0;
    let karmaLoss = 0;
    let title = '';
    let color = 0x000000;

    if (success) {
      earnings = Math.floor(Math.random() * (maxEarnings - minEarnings + 1)) + minEarnings;
      karmaLoss = Math.abs(Math.floor(Math.random() * (maxKarma - minKarma + 1)) + minKarma);
      title = '🕵️ Crime Réussi !';
      color = 0x2ecc71;
      
      updateEconomy(guildId, userId, {
        wallet: economy.wallet + earnings,
        karma: economy.karma - karmaLoss,
        last_crime: now
      });
    } else {
      const loss = Math.floor(Math.random() * (maxEarnings - minEarnings + 1)) + minEarnings;
      earnings = -Math.min(economy.wallet, loss);
      karmaLoss = Math.abs(Math.floor(Math.random() * (maxKarma - minKarma + 1)) + minKarma);
      title = '👮 Pris par la Police !';
      color = 0xe74c3c;

      const newWallet = Math.max(0, economy.wallet + earnings);
      updateEconomy(guildId, userId, {
        wallet: newWallet,
        karma: economy.karma - karmaLoss,
        last_crime: now
      });
    }

    const aiPhrase = await generateAiEconomyPhrase('crime', interaction.member, earnings, -karmaLoss, success, guildId);
    const gifs = getActionGifs(guildId, 'crime');
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

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(aiPhrase || (success ? `🕵️ Vous avez réussi votre méfait !` : `👮 Vous avez été arrêté par les autorités !`))
      .setColor(color)
      .setTimestamp();

    if (success) {
      embed.addFields(
        { name: '💰 Butin volé', value: `+${earnings} pièces`, inline: true },
        { name: '✨ Karma', value: `-${karmaLoss} karma`, inline: true }
      );
    } else {
      embed.addFields(
        { name: '💰 Amende payée', value: `${earnings} pièces`, inline: true },
        { name: '✨ Karma', value: `-${karmaLoss} karma`, inline: true }
      );
    }

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
