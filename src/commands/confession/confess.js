const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confesser')
    .setDescription('Envoyer une confession de manière totalement anonyme')
    .addStringOption(option => option.setName('message').setDescription('Votre confession secrete').setRequired(true))
    .addChannelOption(option => option.setName('salon').setDescription('Le salon de confession dans lequel publier (optionnel)').setRequired(false)),
  async execute(interaction) {
    const messageContent = interaction.options.getString('message');
    const targetChannelOption = interaction.options.getChannel('salon');
    const guildId = interaction.guild.id;

    // Récupérer les salons de confession configurés
    const rows = db.prepare('SELECT channel_id FROM confessions WHERE guild_id = ?').all(guildId);

    if (rows.length === 0) {
      return interaction.reply({ content: '❌ Le système de confession n\'est pas encore configuré sur ce serveur par les administrateurs.', ephemeral: true });
    }

    let targetChannelId;

    if (targetChannelOption) {
      // Vérifier si le salon choisi fait partie des salons de confession autorisés
      const exists = rows.some(r => r.channel_id === targetChannelOption.id);
      if (!exists) {
        return interaction.reply({ content: '❌ Ce salon n\'est pas configuré comme un salon de confession autorisé.', ephemeral: true });
      }
      targetChannelId = targetChannelOption.id;
    } else {
      // Choisir le premier salon par défaut
      targetChannelId = rows[0].channel_id;
    }

    const channel = interaction.guild.channels.cache.get(targetChannelId);
    if (!channel) {
      return interaction.reply({ content: '❌ Le salon de confession cible n\'a pas pu être trouvé sur le serveur.', ephemeral: true });
    }

    // Créer l'embed de la confession
    const embed = new EmbedBuilder()
      .setTitle('💬 Confession Anonyme')
      .setDescription(messageContent)
      .setColor('#9B59B6')
      .setFooter({ text: 'Pour avouer quelque chose de secret, utilisez /confesser' })
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: '🤫 Votre confession a été envoyée avec succès et de manière anonyme !', ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Impossible d\'envoyer le message dans le salon de confession. Vérifiez mes permissions d\'écriture.', ephemeral: true });
    }
  }
};
