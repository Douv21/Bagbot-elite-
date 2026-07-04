const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy } = require('../../database/db');

const WEALTH_RANKS = [
  { min: 200000, name: '💎 MILLIARDAIRE', next: Infinity, nextName: 'MAX' },
  { min: 50000,  name: '🏆 FORTUNE',      next: 200000,   nextName: '💎 MILLIARDAIRE' },
  { min: 10000,  name: '👑 RICHE',         next: 50000,    nextName: '🏆 FORTUNE' },
  { min: 2000,   name: '💰 AISÉ',          next: 10000,    nextName: '👑 RICHE' },
  { min: 500,    name: '📈 ÉCONOME',       next: 2000,     nextName: '💰 AISÉ' },
  { min: 0,      name: '🌱 PAUVRE',        next: 500,      nextName: '📈 ÉCONOME' },
];

function getWealthRank(balance) {
  return WEALTH_RANKS.find(r => balance >= r.min) || WEALTH_RANKS[WEALTH_RANKS.length - 1];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('solde')
    .setDescription("Afficher votre solde de pièces ou celui d'un autre membre")
    .addUserOption(option => option.setName('membre').setDescription('Le membre à consulter (optionnel)').setRequired(false)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild ? interaction.guild.id : 'DM';

    const economy = getEconomy(guildId, targetUser.id);
    const balance = economy.wallet + economy.bank;

    const rank = getWealthRank(balance);
    const nextThreshold = rank.next === Infinity ? balance : rank.next;
    const remaining = rank.next === Infinity ? 0 : rank.next - balance;

    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle(`💰 Solde de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '💵 En poche', value: `${economy.wallet.toLocaleString('fr-FR')} pièces`, inline: true },
        { name: '🏦 En banque', value: `${economy.bank.toLocaleString('fr-FR')} pièces`, inline: true },
        { name: '💰 Total', value: `${balance.toLocaleString('fr-FR')} pièces`, inline: true },
        { name: '🏅 Rang de Richesse', value: `**${rank.name}**`, inline: true }
      )
      .setTimestamp();

    if (rank.next !== Infinity) {
      embed.addFields({
        name: '📈 Prochaine Fortune',
        value: `Besoin de **${remaining.toLocaleString('fr-FR')} pièces** de plus pour atteindre le rang **${rank.nextName}**.`
      });
    } else {
      embed.addFields({
        name: '📈 Prochaine Fortune',
        value: 'Vous avez atteint le rang maximum de richesse ! 🎉'
      });
    }

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Solde local en MP)' });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
