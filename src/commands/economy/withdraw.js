const { SlashCommandBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('retirer')
    .setDescription('Retirer des pièces de votre banque pour les avoir en poche')
    .addStringOption(option => option.setName('montant').setDescription('Le montant à retirer ou "all"').setRequired(true)),
  async execute(interaction) {
    const amountStr = interaction.options.getString('montant');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const economy = getEconomy(guildId, userId);

    if (economy.bank <= 0) {
      return interaction.reply({ content: '❌ Vous n\'avez pas d\'argent en banque.', ephemeral: true });
    }

    let toWithdraw = 0;
    if (amountStr.toLowerCase() === 'all') {
      toWithdraw = economy.bank;
    } else {
      toWithdraw = parseInt(amountStr);
      if (isNaN(toWithdraw) || toWithdraw <= 0) {
        return interaction.reply({ content: '❌ Veuillez entrer un montant numérique valide ou "all".', ephemeral: true });
      }
      if (toWithdraw > economy.bank) {
        return interaction.reply({ content: '❌ Vous n\'avez pas autant d\'argent en banque.', ephemeral: true });
      }
    }

    updateEconomy(guildId, userId, {
      wallet: economy.wallet + toWithdraw,
      bank: economy.bank - toWithdraw
    });

    await interaction.reply({ content: `🏧 Vous avez retiré **💰 ${toWithdraw} pièces** de votre compte en banque !` });
  }
};
