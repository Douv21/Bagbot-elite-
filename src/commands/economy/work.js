const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionReward } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('travailler')
    .setDescription('Travailler pour gagner des pièces et du karma'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const economy = getEconomy(guildId, userId);
    const now = Math.floor(Date.now() / 1000);
    const cooldown = 3600; // 1 heure en secondes

    if (economy.last_work && (now - economy.last_work) < cooldown) {
      const remaining = cooldown - (now - economy.last_work);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      const cooldownEmbed = new EmbedBuilder()
        .setTitle('⏱️ Travail accompli')
        .setDescription(`Vous êtes fatigué. Vous pourrez retravailler dans **${mins}m et ${secs}s** !`)
        .setColor(0xe74c3c);

      return interaction.reply({ 
        embeds: [cooldownEmbed], 
        ephemeral: true 
      });
    }

    const rewardConfig = getActionReward(guildId, 'travailler');
    const minReward = rewardConfig.min_money;
    const maxReward = rewardConfig.max_money;
    const earnings = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
    const karmaGain = Math.floor(Math.random() * (rewardConfig.max_karma - rewardConfig.min_karma + 1)) + rewardConfig.min_karma;

    updateEconomy(guildId, userId, {
      wallet: economy.wallet + earnings,
      karma: economy.karma + karmaGain,
      last_work: now
    });

    const successEmbed = new EmbedBuilder()
      .setTitle('💼 Travail accompli !')
      .setDescription(`Vous avez travaillé dur pour le serveur !`)
      .addFields(
        { name: '💰 Pièces gagnées', value: `+${earnings} pièces`, inline: true }
      )
      .setColor(0x3498db)
      .setTimestamp();

    if (karmaGain > 0) {
      successEmbed.addFields({ name: '✨ Karma gagné', value: `+${karmaGain} karma`, inline: true });
    }

    await interaction.reply({
      embeds: [successEmbed]
    });
  }
};
