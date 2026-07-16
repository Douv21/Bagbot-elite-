const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { setUserGender, getUserGender } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('genre')
    .setDescription('Configurer votre genre et vos pronoms pour la personnalisation des actions')
    .addStringOption(option =>
      option.setName('sexe')
        .setDescription('Votre sexe/genre principal')
        .setRequired(true)
        .addChoices(
          { name: '♂️ Homme', value: 'homme' },
          { name: '♀️ Femme', value: 'femme' },
          { name: '⚧️ Autre', value: 'autre' }
        )
    )
    .addStringOption(option =>
      option.setName('pronom')
        .setDescription('Votre pronom préféré (si Autre, par défaut "il" ou "elle")')
        .setRequired(false)
        .addChoices(
          { name: 'il', value: 'il' },
          { name: 'elle', value: 'elle' },
          { name: 'iel', value: 'iel' }
        )
    )
    .setDMPermission(true),

  async execute(interaction) {
    const userId = interaction.user.id;
    const gender = interaction.options.getString('sexe');
    let pronoun = interaction.options.getString('pronom');

    if (!pronoun) {
      pronoun = gender === 'femme' ? 'elle' : 'il';
    }

    setUserGender(userId, gender, pronoun);

    const embed = new EmbedBuilder()
      .setTitle('✨ Profil de Genre Mis à Jour !')
      .setDescription(`Vos préférences ont été enregistrées avec succès et seront utilisées pour adapter automatiquement les accords grammaticaux lors des actions.`)
      .addFields(
        { name: 'Genre / Sexe', value: gender === 'femme' ? '♀️ Femme' : (gender === 'homme' ? '♂️ Homme' : '⚧️ Autre'), inline: true },
        { name: 'Pronom', value: `\`${pronoun}\``, inline: true }
      )
      .setColor('#9b59b6')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
