const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, getLeveling } = require('../../database/db');

const KARMA_RANKS = [
  { min: 10000, name: '👑 DIEU DU PLAISIR ABSOLU',  next: Infinity, nextName: 'MAX' },
  { min: 5000,  name: "💎 LÉGENDE DE L'ERP",   next: 10000,    nextName: '👑 DIEU DU PLAISIR ABSOLU' },
  { min: 2000,  name: '🔮 GOUROU DU KINK',   next: 5000,     nextName: "💎 LÉGENDE DE L'ERP" },
  { min: 1000,  name: '⭐ SÉDUCTEUR EXPÉRIMENTÉ',  next: 2000,     nextName: '🔮 GOUROU DU KINK' },
  { min: 500,   name: '🔥 FANTASMEUR',    next: 1000,     nextName: '⭐ SÉDUCTEUR EXPÉRIMENTÉ' },
  { min: 100,   name: '📈 INITIÉ COQUIN',  next: 500,      nextName: '🔥 FANTASMEUR' },
  { min: 0,     name: '🌱 VIERGE EFFAROUCHÉE', next: 100,      nextName: '📈 INITIÉ COQUIN' },
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
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild ? interaction.guild.id : 'DM';

    const economy = getEconomy(guildId, targetUser.id);
    const leveling = getLeveling(guildId, targetUser.id);
    const karma = economy.karma;

    const rank = getKarmaRank(karma);
    const remaining = rank.next === Infinity ? 0 : rank.next - karma;

    let benefits = '🎁 Multiplicateur XP : **Aucun**\n🛒 Réduction Boutique : **Aucune** *(débloquez à 20 points)*';
    if (karma >= 100) {
      benefits = '🎁 Multiplicateur XP : **x2.0** 🔥\n🛒 Réduction Boutique : **-20%** 🛍️';
    } else if (karma >= 50) {
      benefits = '🎁 Multiplicateur XP : **x1.5** ⭐\n🛒 Réduction Boutique : **-10%** 🛍️';
    } else if (karma >= 20) {
      benefits = '🎁 Multiplicateur XP : **x1.2**\n🛒 Réduction Boutique : **-5%** 🛍️';
    }

    const member = interaction.guild 
      ? (interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null))
      : null;
    const targetName = member ? member.displayName : targetUser.username;

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle(`⭐ Karma & Réputation — ${targetName}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '✨ Points de Karma', value: `**${karma.toLocaleString('fr-FR')}** points`, inline: true },
        { name: '🎖️ Rang de Karma', value: `**${rank.name}**`, inline: true },
        { name: '🔥 Interventions Coquines', value: `${leveling.nsfw_messages || 0} messages`, inline: true },
        { name: '🎁 Avantages de Karma', value: benefits, inline: false }
      )
      .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (rank.next !== Infinity) {
      embed.addFields({
        name: '📈 Prochain Rang',
        value: `Besoin de **${remaining.toLocaleString('fr-FR')} points** supplémentaires pour atteindre **${rank.nextName}**.`
      });
    }

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Karma local en MP)' });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
