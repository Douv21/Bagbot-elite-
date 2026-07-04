const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, getLeveling } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Afficher votre profil économique et de niveau')
    .addUserOption(option => option.setName('membre').setDescription('Le membre à afficher (optionnel)').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild ? interaction.guild.id : 'DM';

    const economy = getEconomy(guildId, target.id);
    const leveling = getLeveling(guildId, target.id);

    // Calcul du seuil d'XP requis (formule exponentielle de Bagbot-lite : 100 * 1.2^lvl)
    const xpNeeded = Math.max(1, Math.round(100 * Math.pow(1.2, Math.max(0, leveling.level))));
    const balance = economy.wallet + economy.bank;

    // Rangs de richesse de Bagbot-lite
    const WEALTH_RANKS = [
      { min: 200000, name: '💎 MILLIARDAIRE' },
      { min: 50000,  name: '🏆 FORTUNE' },
      { min: 10000,  name: '👑 RICHE' },
      { min: 2000,   name: '💰 AISÉ' },
      { min: 500,    name: '📈 ÉCONOME' },
      { min: 0,      name: '🌱 PAUVRE' },
    ];
    const wealthRank = WEALTH_RANKS.find(r => balance >= r.min)?.name || '🌱 PAUVRE';

    // Rangs de karma de Bagbot-lite
    const KARMA_RANKS = [
      { min: 10000, name: '👑 LÉGENDE' },
      { min: 5000,  name: '💎 MAÎTRE' },
      { min: 2000,  name: '🔮 EXPERT' },
      { min: 1000,  name: '⭐ VÉTÉRAN' },
      { min: 500,   name: '🔥 ACTIF' },
      { min: 100,   name: '📈 MONTANT' },
      { min: 0,     name: '🌱 DÉBUTANT' },
    ];
    const kVal = Math.max(0, economy.karma);
    const karmaRank = KARMA_RANKS.find(r => kVal >= r.min)?.name || '🌱 DÉBUTANT';

    const embed = new EmbedBuilder()
      .setTitle(`👤 Profil de ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setColor('#3498DB')
      .setTimestamp()
      .addFields(
        {
          name: '💰 Économie',
          value: `💵 **En poche :** ${economy.wallet} pièces\n🏦 **En banque :** ${economy.bank} pièces\nTotal : **${balance}** (${wealthRank})`,
          inline: true
        },
        {
          name: '📈 Niveaux',
          value: `⭐ **Niveau :** ${leveling.level}\n⚡ **XP :** ${leveling.xp} / ${xpNeeded} XP\n✨ **Karma :** ${economy.karma} (${karmaRank})`,
          inline: true
        }
      );

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Profil local en MP)' });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
