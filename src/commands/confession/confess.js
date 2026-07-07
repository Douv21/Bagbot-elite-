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

    // Créer l'embed de la confession
    const embedTitle = configRow.confession_name || '💬 Confession Anonyme';
    const embed = new EmbedBuilder()
      .setTitle(embedTitle)
      .setDescription(messageContent)
      .setColor('#9B59B6')
      .setFooter({ text: 'Pour avouer quelque chose de secret, utilisez /confesser' })
      .setTimestamp();

    try {
      const confessionMessage = await channel.send({ embeds: [embed] });

      // Si l'ouverture de thread est activée
      if (configRow.use_thread === 1) {
        await confessionMessage.startThread({
          name: `Commentaires - ${embedTitle.replace(/[^\w\s-]/g, '').trim().slice(0, 15)} #${confessionMessage.id.slice(-4)}`,
          autoArchiveDuration: 1440
        }).catch(console.error);
      }

      // Envoyer le log de la confession (non anonyme pour le staff)
      const logEmbed = new EmbedBuilder()
        .setTitle('🤫 Nouvelle Confession Logguée')
        .setDescription(`**Auteur :** <@${interaction.user.id}> (${interaction.user.tag})\n**ID de l'auteur :** ${interaction.user.id}\n**Salon public :** <#${targetChannelId}>\n\n**Confession :**\n${messageContent}`)
        .setColor('#9B59B6')
        .setTimestamp();
      
      sendLog(interaction.guild, 'confession', logEmbed);

      await interaction.reply({ content: '🤫 Votre confession a été envoyée avec succès et de manière anonyme !', ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Impossible d\'envoyer le message dans le salon de confession. Vérifiez mes permissions d\'écriture et de création de fil (thread).', ephemeral: true });
    }
  }
};
