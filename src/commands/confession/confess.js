const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { sendLog } = require('../../utils/helpers');

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
    const rows = db.prepare('SELECT * FROM confessions WHERE guild_id = ?').all(guildId);

    if (rows.length === 0) {
      return interaction.reply({ content: '❌ Le système de confession n\'est pas encore configuré sur ce serveur par les administrateurs.', ephemeral: true });
    }

    let targetChannelId;
    let configRow;

    if (targetChannelOption) {
      // Vérifier si le salon choisi fait partie des salons de confession autorisés
      configRow = rows.find(r => r.channel_id === targetChannelOption.id);
      if (!configRow) {
        return interaction.reply({ content: '❌ Ce salon n\'est pas configuré comme un salon de confession autorisé.', ephemeral: true });
      }
      targetChannelId = targetChannelOption.id;
    } else {
      // Choisir le premier salon par défaut
      configRow = rows[0];
      targetChannelId = configRow.channel_id;
    }

    const channel = interaction.guild.channels.cache.get(targetChannelId);
    if (!channel) {
      return interaction.reply({ content: '❌ Le salon de confession cible n\'a pas pu être trouvé sur le serveur.', ephemeral: true });
    }

    const { handleConfessionSubmission } = require('../../utils/confessionHandler');
    await handleConfessionSubmission({
      guild: interaction.guild,
      channel,
      user: interaction.user,
      text: messageContent,
      confessionConfig: configRow,
      interaction
    });
  }
};
