const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addemoji')
    .setDescription('Ajouter un emoji personnalisé au serveur')
    .addStringOption(option => option.setName('nom').setDescription('Nom de l\'emoji (sans espaces)').setRequired(true))
    .addStringOption(option => option.setName('source').setDescription('Emoji existant, URL de l\'image, ou emoji animé').setRequired(false))
    .addAttachmentOption(option => option.setName('image').setDescription('Fichier image/gif à utiliser').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    const name = interaction.options.getString('nom').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const source = interaction.options.getString('source');
    const attachment = interaction.options.getAttachment('image');

    let emojiUrl = null;

    if (attachment) {
      emojiUrl = attachment.url;
    } else if (source) {
      // Vérifier s'il s'agit d'un emoji Discord personnalisé (ex: <:nom:id> ou <a:nom:id>)
      const emojiRegex = /<?(a)?:[a-zA-Z0-9_]+:([0-9]+)>/;
      const match = source.match(emojiRegex);
      if (match) {
        const isAnimated = !!match[1];
        const emojiId = match[2];
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;
      } else if (source.startsWith('http://') || source.startsWith('https://')) {
        emojiUrl = source;
      }
    }

    if (!emojiUrl) {
      return interaction.editReply({ content: '❌ Veuillez fournir une image jointe, un emoji personnalisé valide ou un lien d\'image.' });
    }

    try {
      // Télécharger l'image de l'émoji dans un Buffer
      const response = await fetch(emojiUrl);
      if (!response.ok) throw new Error(`Impossible de télécharger l'image (Status: ${response.status})`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const createdEmoji = await interaction.guild.emojis.create({
        attachment: buffer,
        name: name
      });

      const embed = new EmbedBuilder()
        .setTitle('✅ Émoji Ajouté !')
        .setDescription(`L'émoji personnalisé **:${createdEmoji.name}:** a été ajouté avec succès au serveur !`)
        .addFields(
          { name: 'Nom', value: `\`${createdEmoji.name}\``, inline: true },
          { name: 'Rendu', value: `${createdEmoji}`, inline: true }
        )
        .setThumbnail(emojiUrl)
        .setColor('#2ecc71')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur addemoji:', err);
      await interaction.editReply({ content: `❌ Impossible d'ajouter l'émoji. Raison : ${err.message}` });
    }
  }
};
