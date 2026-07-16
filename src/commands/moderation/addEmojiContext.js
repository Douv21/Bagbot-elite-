const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Ajouter en Émoji')
    .setType(ApplicationCommandType.Message)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .setDMPermission(false),

  async execute(interaction) {
    const message = interaction.targetMessage;
    let emojiUrl = null;

    // 1. Chercher un émoji personnalisé dans le texte
    const emojiRegex = /<?(a)?:[a-zA-Z0-9_]+:([0-9]+)>/;
    const match = message.content.match(emojiRegex);
    
    if (match) {
      const isAnimated = !!match[1];
      const emojiId = match[2];
      emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;
    } 
    // 2. Sinon, chercher une image/gif en pièce jointe
    else if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment.contentType && (attachment.contentType.startsWith('image/') || attachment.contentType.includes('gif'))) {
        emojiUrl = attachment.url;
      }
    }

    if (!emojiUrl) {
      return interaction.reply({ content: '❌ Aucun émoji personnalisé ou image/gif trouvé dans ce message.', ephemeral: true });
    }

    // Mettre l'URL en cache temporaire pour cet utilisateur
    if (!global.emojiCache) global.emojiCache = new Map();
    global.emojiCache.set(interaction.user.id, emojiUrl);

    // Ouvrir la modale pour demander le nom
    const modal = new ModalBuilder()
      .setCustomId('add_emoji_context_modal')
      .setTitle('Créer un Émoji');

    const nameInput = new TextInputBuilder()
      .setCustomId('emoji_name_input')
      .setLabel('Nom de l\'émoji (sans espaces)')
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(32)
      .setPlaceholder('ex: pepe_content')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
};
