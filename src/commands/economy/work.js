const { SlashCommandBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');

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
      return interaction.reply({ content: `⏱️ Vous êtes fatigué. Vous pourrez retravailler dans **${mins}m et ${secs}s**.`, ephemeral: true });
    }

    const earnings = Math.floor(Math.random() * 201) + 100; // 100 à 300 pièces
    const karmaGain = 1;

    updateEconomy(guildId, userId, {
      wallet: economy.wallet + earnings,
      karma: economy.karma + karmaGain,
      last_work: now
    });

    await interaction.reply({
      content: `💼 **Travail accompli !** Vous avez travaillé dur et gagné **💰 ${earnings} pièces** et **✨ +${karmaGain} Karma** !`
    });
  }
};
