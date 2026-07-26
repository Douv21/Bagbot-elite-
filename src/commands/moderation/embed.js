const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Envoyer un message Embed personnalisé dans un salon (Administrateur)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(option => 
      option.setName('salon')
        .setDescription('Le salon de destination')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('titre')
        .setDescription('Le titre de l\'embed')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Le texte / contenu de l\'embed')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('couleur')
        .setDescription('La couleur Hex de la barre (ex: #5865F2, #E74C3C, #2ECC71)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Lien URL de l\'image d\'illustration')
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    const title = interaction.options.getString('titre');
    const description = interaction.options.getString('description');
    const color = interaction.options.getString('couleur') || '#5865F2';
    const image = interaction.options.getString('image');

    if (!channel || !channel.isTextBased()) {
      return interaction.reply({ content: '❌ Salon invalide ou non textuel.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description.replace(/\\n/g, '\n'))
      .setColor(color)
      .setTimestamp();

    if (image && (image.startsWith('http://') || image.startsWith('https://'))) {
      embed.setImage(image);
    }

    const guildIcon = interaction.guild.iconURL({ dynamic: true });
    if (guildIcon) {
      embed.setFooter({ text: interaction.guild.name, iconURL: guildIcon });
    }

    const sent = await channel.send({ embeds: [embed] }).catch(err => {
      console.error(err);
      return null;
    });

    if (!sent) {
      return interaction.reply({ content: '❌ Impossible d\'envoyer l\'embed dans ce salon. Vérifiez mes permissions.', ephemeral: true });
    }

    await interaction.reply({ content: `✅ Embed envoyé avec succès dans <#${channel.id}>.`, ephemeral: true });
  }
};
