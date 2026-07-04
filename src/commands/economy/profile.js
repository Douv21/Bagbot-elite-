const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, getLeveling } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Afficher votre profil économique et de niveau')
    .addUserOption(option => option.setName('membre').setDescription('Le membre à afficher (optionnel)').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild.id;

    const economy = getEconomy(guildId, target.id);
    const leveling = getLeveling(guildId, target.id);

    // Calcul du seuil d'XP requis
    const xpNeeded = 5 * (leveling.level * leveling.level) + 50 * leveling.level + 100;
    
    // Déterminer un badge/badge de karma
    let karmaStatus = 'Neutral (Neutre) ✨';
    if (economy.karma > 50) karmaStatus = 'Saint (Saint) 😇';
    else if (economy.karma > 15) karmaStatus = 'Good (Bon) 😊';
    else if (economy.karma < -30) karmaStatus = 'Demon (Démon) 😈';
    else if (economy.karma < -10) karmaStatus = 'Bad (Mauvais) 😠';

    const embed = new EmbedBuilder()
      .setTitle(`👤 Profil de ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setColor('#3498DB')
      .setTimestamp()
      .addFields(
        {
          name: '💰 Économie',
          value: `💵 **En poche :** ${economy.wallet} pièces\n🏦 **En banque :** ${economy.bank} pièces\n✨ **Karma :** ${economy.karma} (${karmaStatus})`,
          inline: true
        },
        {
          name: '📈 Niveaux',
          value: `⭐ **Niveau :** ${leveling.level}\n⚡ **XP :** ${leveling.xp} / ${xpNeeded} XP`,
          inline: true
        }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
