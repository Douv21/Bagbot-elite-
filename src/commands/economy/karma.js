const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, getLeveling } = require('../../database/db');
const genCard = require('../../carte/holographique');

const KARMA_RANKS = [
  { min: 10000, name: '👑 LÉGENDE',  next: Infinity, nextName: 'MAX' },
  { min: 5000,  name: '💎 MAÎTRE',   next: 10000,    nextName: '👑 LÉGENDE' },
  { min: 2000,  name: '🔮 EXPERT',   next: 5000,     nextName: '💎 MAÎTRE' },
  { min: 1000,  name: '⭐ VÉTÉRAN',  next: 2000,     nextName: '🔮 EXPERT' },
  { min: 500,   name: '🔥 ACTIF',    next: 1000,     nextName: '⭐ VÉTÉRAN' },
  { min: 100,   name: '📈 MONTANT',  next: 500,      nextName: '🔥 ACTIF' },
  { min: 0,     name: '🌱 DÉBUTANT', next: 100,      nextName: '📈 MONTANT' },
];

function getKarmaRank(karma) {
  const k = Math.max(0, karma);
  return KARMA_RANKS.find(r => k >= r.min) || KARMA_RANKS[KARMA_RANKS.length - 1];
}

function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000)   return `${Math.floor(n / 1000)}K`;
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('fr-FR');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('karma')
    .setDescription("Afficher votre karma ou celui d'un autre membre")
    .addUserOption(option => option.setName('membre').setDescription('Le membre à consulter (optionnel)').setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild ? interaction.guild.id : 'DM';

    const economy = getEconomy(guildId, targetUser.id);
    const leveling = getLeveling(guildId, targetUser.id);
    const karma = economy.karma;

    const rank = getKarmaRank(karma);
    const nextThreshold = rank.next === Infinity ? karma : rank.next;
    const progress = karma - rank.min;
    const rangeSize = nextThreshold - rank.min;

    const cardData = {
      panelTitle:      'KARMA',
      displayNumStr:   fmt(karma),
      level:           0,
      xp:              Math.max(0, progress),
      required:        Math.max(1, rangeSize),
      messages:        leveling.total_messages || 0,
      voiceMinutes:    leveling.voice_minutes || 0, // Mappé sur VOC
      streak:          leveling.nsfw_messages || 0, // Mappé sur FEU dans card-worker.js
      karma,
      roleName:        'KARMA CARD',
      expBarLabel:     rank.next === Infinity
        ? `${karma.toLocaleString('fr-FR')} KARMA — LÉGENDE MAX`
        : `${karma.toLocaleString('fr-FR')} / ${nextThreshold.toLocaleString('fr-FR')} KARMA`,
      statsItems: [
        { icon: '⭐',  label: 'KARMA',    value: fmt(karma) },
        { icon: '🔥',  label: 'FEU',      value: String(leveling.nsfw_messages || 0) },
        { icon: 'MSG', label: 'MESSAGES', value: String(leveling.total_messages || 0) },
      ],
      rankDisplay:     rank.name,
      nextPanelTitle:  'PROCHAIN RANG',
      nextPanelBig:    rank.nextName,
      nextPanelSub:    rank.next === Infinity ? 'MAX' : `${(rank.next - karma).toLocaleString('fr-FR')} pts`,
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
    const remaining = rank.next === Infinity ? 0 : rank.next - karma;
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle(`⭐ Karma de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '✨ Karma', value: `${karma.toLocaleString('fr-FR')} points`, inline: true },
        { name: '🎖️ Rang de Karma', value: `**${rank.name}**`, inline: true }
      )
      .setTimestamp();

    if (rank.next !== Infinity) {
      embed.addFields({
        name: '📈 Prochain Rang',
        value: `Besoin de **${remaining.toLocaleString('fr-FR')} points** de karma supplémentaires pour atteindre le rang **${rank.nextName}**.`
      });
    }

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Karma local en MP)' });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
