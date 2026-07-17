const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("Ajouter l'émoji")
    .setType(ApplicationCommandType.Message)
    .setDMPermission(false),

  async execute(interaction) {
    const member = interaction.member;
    // Vérification interne des permissions pour Gérer les expressions ou Administrateur
    if (!member.permissions.has(PermissionFlagsBits.ManageGuildExpressions) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Vous devez avoir la permission "Gérer les expressions" (ou être Administrateur) pour exécuter cette action.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const message = interaction.targetMessage;
    const guild = interaction.guild;

    // Trouver tous les émojis personnalisés dans le texte du message
    const emojiRegex = /<?(a)?:([a-zA-Z0-9_]+):([0-9]+)>/g;
    const matches = [...message.content.matchAll(emojiRegex)];

    let addedEmojis = [];
    let errors = [];

    if (matches.length > 0) {
      for (const match of matches) {
        const isAnimated = !!match[1];
        const emojiName = match[2];
        const emojiId = match[3];
        const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;

        try {
          const res = await fetch(emojiUrl);
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          const buffer = Buffer.from(await res.arrayBuffer());

          const created = await guild.emojis.create({
            attachment: buffer,
            name: emojiName
          });
          addedEmojis.push(created);
        } catch (err) {
          console.error(`Erreur clonage émoji ${emojiName}:`, err);
          errors.push(emojiName);
        }
      }
    } 
    // Sinon, regarder s'il y a des pièces jointes (images/gifs)
    else if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      const urlLower = attachment.url.toLowerCase();
      const isImage = (attachment.contentType && attachment.contentType.startsWith('image/')) ||
                      urlLower.endsWith('.png') || urlLower.endsWith('.jpg') || 
                      urlLower.endsWith('.jpeg') || urlLower.endsWith('.gif') || 
                      urlLower.endsWith('.webp');

      if (isImage) {
        try {
          const res = await fetch(attachment.url);
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          const buffer = Buffer.from(await res.arrayBuffer());

          // Nettoyer le nom du fichier pour faire un nom d'émoji
          let cleanName = attachment.name.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '') || `emoji_${Date.now()}`;
          if (cleanName.length < 2) cleanName = `emoji_${Date.now()}`;
          if (cleanName.length > 32) cleanName = cleanName.slice(0, 32);

          const created = await guild.emojis.create({
            attachment: buffer,
            name: cleanName
          });
          addedEmojis.push(created);
        } catch (err) {
          console.error(`Erreur ajout attachment emoji:`, err);
          errors.push('Image jointe');
        }
      }
    }
    // Sinon, regarder s'il y a des images dans les embeds
    else if (message.embeds.length > 0) {
      const imageEmbed = message.embeds.find(e => e.image || e.thumbnail);
      if (imageEmbed) {
        const url = imageEmbed.image ? imageEmbed.image.url : imageEmbed.thumbnail.url;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          const buffer = Buffer.from(await res.arrayBuffer());

          const cleanName = `emoji_${Math.floor(Math.random() * 100000)}`;
          const created = await guild.emojis.create({
            attachment: buffer,
            name: cleanName
          });
          addedEmojis.push(created);
        } catch (err) {
          console.error(`Erreur ajout embed emoji:`, err);
          errors.push('Image embed');
        }
      }
    }

    if (addedEmojis.length === 0) {
      if (errors.length > 0) {
        return interaction.editReply({ content: `❌ Impossible d'ajouter l'émoji. Erreur détectée sur : ${errors.join(', ')}` });
      }
      return interaction.editReply({ content: '❌ Aucun émoji personnalisé ou image trouvé dans ce message.' });
    }

    const renderingList = addedEmojis.map(e => `${e} (:${e.name}:)`).join(', ');
    return interaction.editReply({
      content: `✅ **${addedEmojis.length}** émoji(s) ajouté(s) avec succès au serveur : ${renderingList}`
    });
  }
};
