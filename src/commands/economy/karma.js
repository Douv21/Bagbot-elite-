const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy } = require('../../database/db');

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('karma')
    .setDescription("Afficher votre karma ou celui d'un autre membre")
    .addUserOption(option => option.setName('membre').setDescription('Le membre à consulter (optionnel)').setRequired(false)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild ? interaction.guild.id : 'DM';

    const economy = getEconomy(guildId, targetUser.id);
    const karma = economy.karma;

    const rank = getKarmaRank(karma);
    const nextThreshold = rank.next === Infinity ? karma : rank.next;
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
    } else {
      embed.addFields({
        name: '📈 Prochain Rang',
        value: 'Vous avez atteint le rang maximum de karma ! 👑'
      });
    }

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Karma local en MP)' });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
