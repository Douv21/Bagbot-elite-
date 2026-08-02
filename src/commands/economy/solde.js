const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy } = require('../../database/db');

const WEALTH_RANKS = [
  { min: 200000, name: '💎 DIEU DE LA LUXURE', next: Infinity, nextName: 'MAX' },
  { min: 50000,  name: '🏆 STAR DU X',      next: 200000,   nextName: '💎 DIEU DE LA LUXURE' },
  { min: 10000,  name: '👑 SEXTOY ADDICT',         next: 50000,    nextName: '🏆 STAR DU X' },
  { min: 2000,   name: '💰 ESCORTE AMATEUR',          next: 10000,    nextName: '👑 SEXTOY ADDICT' },
  { min: 500,    name: '📈 CURIEUX COQUIN',       next: 2000,     nextName: '💰 ESCORTE AMATEUR' },
  { min: 0,      name: '🌱 ESCLAVE DU CUL',        next: 500,      nextName: '📈 CURIEUX COQUIN' },
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
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild ? interaction.guild.id : 'DM';

    const economy = getEconomy(guildId, targetUser.id);
    const balance = economy.wallet + economy.bank;

    const rank = getWealthRank(balance);
    const remaining = rank.next === Infinity ? 0 : rank.next - balance;

    const member = interaction.guild 
      ? (interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null))
      : null;
    const targetName = member ? member.displayName : targetUser.username;

    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle(`💰 Portefeuille & Solde — ${targetName}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '💵 En Poche', value: `**${economy.wallet.toLocaleString('fr-FR')}** pièces`, inline: true },
        { name: '🏦 En Banque', value: `**${economy.bank.toLocaleString('fr-FR')}** pièces`, inline: true },
        { name: '💰 Fortune Totale', value: `**${balance.toLocaleString('fr-FR')}** pièces`, inline: true },
        { name: '🏅 Rang de Richesse', value: `**${rank.name}**`, inline: false }
      )
      .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (rank.next !== Infinity) {
      embed.addFields({
        name: '📈 Prochaine Fortune',
        value: `Besoin de **${remaining.toLocaleString('fr-FR')} pièces** supplémentaires pour atteindre **${rank.nextName}**.`
      });
    }

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Solde local en MP)' });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
