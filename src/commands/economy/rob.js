const { SlashCommandBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voler')
    .setDescription('Tenter de voler les pièces d\'un autre membre')
    .addUserOption(option => option.setName('cible').setDescription('Le membre à détrousser').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('cible');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (target.id === userId) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas vous voler vous-même !', ephemeral: true });
    }

    if (target.bot) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas voler un bot !', ephemeral: true });
    }

    const economy = getEconomy(guildId, userId);
    const targetEconomy = getEconomy(guildId, target.id);

    const now = Math.floor(Date.now() / 1000);
    const cooldown = 10800; // 3 heures

    if (economy.last_rob && (now - economy.last_rob) < cooldown) {
      const remaining = cooldown - (now - economy.last_rob);
      const hours = Math.floor(remaining / 3600);
      const mins = Math.floor((remaining % 3600) / 60);
      return interaction.reply({ content: `⏱️ Vous devez vous faire discret. Réessayez dans **${hours}h et ${mins}m**.`, ephemeral: true });
    }

    if (economy.wallet < 100) {
      return interaction.reply({ content: '❌ Vous devez avoir au moins **100 pièces** en poche pour tenter un vol.', ephemeral: true });
    }

    if (targetEconomy.wallet < 100) {
      return interaction.reply({ content: `❌ <@${target.id}> est trop pauvre ! Il a moins de **100 pièces** en poche.`, ephemeral: true });
    }

    const success = Math.random() < 0.45; // 45% de chance
    let reply = '';

    if (success) {
      // Voler entre 10% et 35% du portefeuille de la cible
      const percent = Math.floor(Math.random() * 26) + 10;
      const stolen = Math.floor((targetEconomy.wallet * percent) / 100);

      updateEconomy(guildId, userId, {
        wallet: economy.wallet + stolen,
        karma: economy.karma - 3,
        last_rob: now
      });

      updateEconomy(guildId, target.id, {
        wallet: targetEconomy.wallet - stolen
      });

      reply = `💸 **Vol réussi !** Vous avez détroussé <@${target.id}> et volé **💰 ${stolen} pièces** (soit ${percent}% de sa poche). Votre karma baisse : **✨ -3**.`;
    } else {
      // Payer une amende à la cible (entre 50 et 150 pièces)
      const fine = Math.floor(Math.random() * 101) + 50;
      const finalFine = Math.min(economy.wallet, fine);

      updateEconomy(guildId, userId, {
        wallet: economy.wallet - finalFine,
        karma: economy.karma - 1,
        last_rob: now
      });

      updateEconomy(guildId, target.id, {
        wallet: targetEconomy.wallet + finalFine
      });

      reply = `👮 **Pris la main dans le sac !** <@${target.id}> vous a plaqué au sol. Vous lui avez payé une amende de **💰 ${finalFine} pièces** (Karma : **✨ -1**).`;
    }

    await interaction.reply({ content: reply });
  }
};
