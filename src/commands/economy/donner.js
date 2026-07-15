const { SlashCommandBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');

module.exports = {
  name: 'donner',

  data: new SlashCommandBuilder()
    .setName('donner')
    .setDescription('Donner de l\'argent à un autre membre')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Membre à qui donner de l\'argent')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('montant')
        .setDescription('Montant à donner')
        .setRequired(true)
        .setMinValue(1))
    .setDMPermission(false),

  description: "Donner de l'argent à quelqu'un",
  
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const senderId = interaction.user.id;
    const targetUser = interaction.options.getUser('cible', true);
    const montant = interaction.options.getInteger('montant', true);

    if (targetUser.bot) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas donner d\'argent à un bot.', ephemeral: true });
    }

    if (targetUser.id === senderId) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas vous donner de l\'argent à vous-même.', ephemeral: true });
    }

    const senderEco = getEconomy(guildId, senderId);
    
    if (senderEco.wallet < montant) {
      return interaction.reply({ 
        content: `❌ Vous n'avez pas assez d'argent en poche. Vous tentez de donner **${montant}** pièces, mais vous n'avez que **${senderEco.wallet}** pièces.`, 
        ephemeral: true 
      });
    }

    const targetEco = getEconomy(guildId, targetUser.id);

    // Débit de l'expéditeur
    updateEconomy(guildId, senderId, {
      wallet: senderEco.wallet - montant
    });

    // Crédit du destinataire
    updateEconomy(guildId, targetUser.id, {
      wallet: targetEco.wallet + montant
    });

    return interaction.reply({
      content: `💸 **Transfert réussi !** <@${senderId}> a donné **💰 ${montant} pièces** à <@${targetUser.id}> !`
    });
  }
};
