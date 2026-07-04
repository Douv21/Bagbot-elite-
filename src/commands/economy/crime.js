const { SlashCommandBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');

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

    const success = Math.random() < 0.5; // 50% de réussite
    let reply = '';
    
    if (success) {
      const earnings = Math.floor(Math.random() * 351) + 250; // 250 à 600 pièces
      const karmaLoss = 2;
      
      updateEconomy(guildId, userId, {
        wallet: economy.wallet + earnings,
        karma: economy.karma - karmaLoss,
        last_crime: now
      });
      reply = `🕵️ **Crime réussi !** Vous avez cambriolé une supérette et récupéré **💰 ${earnings} pièces** (Karma : **✨ -${karmaLoss}**).`;
    } else {
      const loss = Math.floor(Math.random() * 151) + 150; // 150 à 300 pièces
      const newWallet = Math.max(0, economy.wallet - loss);
      const karmaLoss = 1;

      updateEconomy(guildId, userId, {
        wallet: newWallet,
        karma: economy.karma - karmaLoss,
        last_crime: now
      });
      reply = `👮 **Échec !** La police vous a repéré. Vous avez dû payer une amende de **💰 ${loss} pièces** pour vous échapper (Karma : **✨ -${karmaLoss}**).`;
    }

    await interaction.reply({ content: reply });
  }
};
