const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionReward } = require('../../database/db');

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

    const successEmbed = new EmbedBuilder()
      .setTitle('🎁 Récompense Quotidienne Réclamée !')
      .setDescription(`Vous avez reçu votre récompense du jour !`)
      .addFields(
        { name: '💰 Pièces gagnées', value: `+${reward} pièces`, inline: true }
      )
      .setColor(0x2ecc71)
      .setTimestamp();

    if (karmaReward > 0) {
      successEmbed.addFields({ name: '✨ Karma gagné', value: `+${karmaReward} karma`, inline: true });
    }

    return interaction.reply({
      embeds: [successEmbed]
    });
  }
};
