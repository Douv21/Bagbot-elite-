const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lovecalc')
    .setDescription('Calculer la compatibilité amoureuse et sensuelle entre deux membres')
    .addUserOption(option => option.setName('cible').setDescription('La personne avec qui calculer la compatibilité').setRequired(true))
    .addUserOption(option => option.setName('partenaire').setDescription('Le deuxième partenaire (optionnel, sinon vous)').setRequired(false))
    .setDMPermission(true),

  async execute(interaction) {
    const user1 = interaction.options.getUser('partenaire') || interaction.user;
    const user2 = interaction.options.getUser('cible');

    if (user1.id === user2.id) {
      return interaction.reply({ content: '❌ C\'est très beau de s\'aimer soi-même, mais essayez avec un autre membre ! 😉', ephemeral: true });
    }

    // Générer un score déterministe pour le couple
    const sortedIds = [user1.id, user2.id].sort().join('');
    let hash = 0;
    for (let i = 0; i < sortedIds.length; i++) {
      hash = sortedIds.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const lovePercent = Math.abs(hash % 101);
    const passionPercent = Math.abs((hash * 3) % 101);
    const mentalPercent = Math.abs((hash * 7) % 101);
    const physicalPercent = Math.abs((hash * 13) % 101);

    // Barre de progression ❤️ / 🖤
    const barSize = 10;
    const filledHearts = Math.round((lovePercent / 100) * barSize);
    const emptyHearts = barSize - filledHearts;
    const progressText = '❤️'.repeat(filledHearts) + '🖤'.repeat(emptyHearts);

    // Sensual descriptions
    let description = '';
    let color = '#FF007F'; // Rose sensuel par défaut
    
    if (lovePercent <= 20) {
      description = "❄️ **Glacial.** Il y a plus d'électricité statique dans un pull en laine que de tension charnelle entre vous. Mieux vaut rester simples connaissances.";
      color = '#3498DB'; // Bleu froid
    } else if (lovePercent <= 40) {
      description = "🕯️ **Tiède.** Une petite étincelle pourrait naître avec beaucoup d'efforts, mais pour l'instant, c'est plutôt platonique.";
      color = '#F1C40F'; // Jaune tiède
    } else if (lovePercent <= 60) {
      description = "😏 **Sensuel.** Il y a un jeu de regard indéniable. L'atmosphère se réchauffe doucement, une tension physique commence à s'installer...";
      color = '#E67E22'; // Orange sensuel
    } else if (lovePercent <= 80) {
      description = "🔥 **Brûlant !** La tension est électrique, les corps s'attirent magnétiquement. Entre vous, la passion est prête à exploser à tout moment !";
      color = '#E74C3C'; // Rouge chaud
    } else {
      description = "🥵 **Fusionnel & Torride !** Une alchimie charnelle et spirituelle absolue. Vos corps et vos âmes s'accordent dans une harmonie parfaite et passionnée !";
      color = '#8E44AD'; // Violet intense/passion
    }

    const embed = new EmbedBuilder()
      .setTitle('❤️ Test de Compatibilité Sensuelle')
      .setDescription(`Découvrez l'alchimie mystique entre **${user1.username}** et **${user2.username}**...\n\n${description}`)
      .setColor(color)
      .addFields(
        { name: '📊 Score de Compatibilité Globale', value: `**${lovePercent}%**\n${progressText}`, inline: false },
        { name: '🔥 Désir & Passion', value: `\`${passionPercent}%\``, inline: true },
        { name: '🧠 Affinité Mentale', value: `\`${mentalPercent}%\``, inline: true },
        { name: '💦 Chimie Physique', value: `\`${physicalPercent}%\``, inline: true }
      )
      .setThumbnail('https://cdn.pixabay.com/photo/2016/02/07/14/45/heart-1184883_1280.png')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
