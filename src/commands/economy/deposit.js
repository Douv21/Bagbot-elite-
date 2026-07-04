const { SlashCommandBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposer')
    .setDescription('Déposer vos pièces en poche à la banque pour les protéger du vol')
    .addStringOption(option => option.setName('montant').setDescription('Le montant à déposer ou "all"').setRequired(true)),
  async execute(interaction) {
    const amountStr = interaction.options.getString('montant');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const economy = getEconomy(guildId, userId);

    if (economy.wallet <= 0) {
      return interaction.reply({ content: '❌ Vous n\'avez pas d\'argent en poche à déposer.', ephemeral: true });
    }

    let toDeposit = 0;
    if (amountStr.toLowerCase() === 'all') {
      toDeposit = economy.wallet;
    } else {
      toDeposit = parseInt(amountStr);
      if (isNaN(toDeposit) || toDeposit <= 0) {
        return interaction.reply({ content: '❌ Veuillez entrer un montant numérique valide ou "all".', ephemeral: true });
      }
      if (toDeposit > economy.wallet) {
        return interaction.reply({ content: '❌ Vous n\'avez pas autant d\'argent en poche.', ephemeral: true });
      }
    }

    updateEconomy(guildId, userId, {
      wallet: economy.wallet - toDeposit,
      bank: economy.bank + toDeposit
    });

    await interaction.reply({ content: `🏦 Vous avez déposé **💰 ${toDeposit} pièces** à la banque avec succès !` });
  }
};
