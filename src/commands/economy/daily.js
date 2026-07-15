const { SlashCommandBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');

module.exports = {
  name: 'daily',
  dmPermission: false,
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Réclamer votre récompense quotidienne (💰 500 à 1000 pièces)')
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
      return interaction.reply({ 
        content: `⏱️ Vous avez déjà réclamé votre daily. Revenez dans **${hours}h et ${mins}m**.`, 
        ephemeral: true 
      });
    }

    const reward = Math.floor(Math.random() * 501) + 500; // 500 à 1000 pièces

    updateEconomy(guildId, userId, {
      wallet: economy.wallet + reward,
      last_daily: now
    });

    return interaction.reply({
      content: `🎁 **Daily réclamé !** Vous avez reçu **💰 ${reward} pièces** !`
    });
  }
};
