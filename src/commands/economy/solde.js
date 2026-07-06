const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, getLeveling } = require('../../database/db');
const genCard = require('../../carte/holographique');

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

function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000)   return `${Math.floor(n / 1000)}K`;
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('fr-FR');
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
    const leveling = getLeveling(guildId, targetUser.id);
    const balance = economy.wallet + economy.bank;
    const karma = economy.karma;

    const rank = getWealthRank(balance);
    const nextThreshold = rank.next === Infinity ? balance : rank.next;
    const progress = balance - rank.min;
    const rangeSize = nextThreshold - rank.min;

    const cardData = {
      panelTitle:    'SOLDE PIÈCES',
      displayNumStr: fmt(balance),
      level:         0,
      xp:            Math.max(0, progress),
      required:      Math.max(1, rangeSize),
      messages:      leveling.total_messages || 0,
      voiceMinutes:  leveling.voice_minutes || 0, // Mappé sur VOC
      streak:        leveling.nsfw_messages || 0, // Mappé sur FEU dans card-worker.js
      karma,
      roleName:      'SOLDE CARD',
      expBarLabel:   rank.next === Infinity
        ? `${balance.toLocaleString('fr-FR')} pièces — RICHESSE MAX`
        : `${balance.toLocaleString('fr-FR')} / ${nextThreshold.toLocaleString('fr-FR')} pièces`,
      statsItems: [
        { icon: '💰', label: 'TOTAL',  value: fmt(balance) },
        { icon: '💵', label: 'POCHE',  value: fmt(economy.wallet) },
        { icon: '🏦', label: 'BANQUE', value: fmt(economy.bank) },
      ],
      rankDisplay:     rank.name,
      nextPanelTitle:  'PROCHAIN RANG',
      nextPanelBig:    rank.nextName,
      nextPanelSub:    rank.next === Infinity ? 'MAX' : `${(rank.next - balance).toLocaleString('fr-FR')} pts`,
      nextPanelSubSub: 'RESTANTS',
    };

    const member = interaction.guild 
      ? (interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null))
      : { user: targetUser };

    const ALL_THEMES = ['holographique','gaming','love','sensuel','cosmos','nature','dark','gold','argent','bleu','rose'];
    const theme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];

    if (member) {
      const card = await genCard(member, cardData, theme);
      if (card) {
        const mention = targetUser.id !== interaction.user.id ? `<@${targetUser.id}>` : null;
        return interaction.editReply({
          content: mention,
          files: [card],
          allowedMentions: mention ? { users: [targetUser.id] } : { parse: [] }
        });
      }
    }

    // Fallback embed si la génération de la carte échoue
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
    }

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Solde local en MP)' });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
