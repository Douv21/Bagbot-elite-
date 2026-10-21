const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { getEventDropConfig } = require('../../database/db');
const { spawnEventDrop } = require('../../utils/eventDropManager');

module.exports = {
  name: 'dropevenement',

  data: new SlashCommandBuilder()
    .setName('dropevenement')
    .setDescription('Lancer un drop d\'événement (Halloween, Noël, Pâques, Custom...) dans le salon')
    .addStringOption(option =>
      option.setName('evenement')
        .setDescription('Type d\'événement à fêter')
        .setRequired(false)
        .addChoices(
          { name: '🍬 Bonbons (Halloween)', value: 'bonbon' },
          { name: '🎁 Cadeaux (Noël)', value: 'cadeau' },
          { name: '🍫 Chocolats (Pâques)', value: 'chocolat' },
          { name: '💖 Cœurs (St-Valentin)', value: 'coeur' },
          { name: '✨ Personnalisé (Config Dashboard ou Custom)', value: 'custom' }
        ))
    .addIntegerOption(option =>
      option.setName('quantite')
        .setDescription('Quantité d\'objets à faire gagner (Optionnel: aléatoire selon config si omis)')
        .setRequired(false)
        .setMinValue(1))
    .addChannelOption(option =>
      option.setName('salon')
        .setDescription('Salon où lancer le drop (Optionnel: salon actuel si omis)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption(option =>
      option.setName('nom_custom')
        .setDescription('Nom de l\'objet personnalisé (Si événement Personnalisé)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('emoji_custom')
        .setDescription('Émoji de l\'objet personnalisé (Si événement Personnalisé)')
        .setRequired(false))
    .setDMPermission(false),

  description: "Lancer un drop d'événement spécial (Admin/Modo)",

  async execute(interaction) {
    const perms = interaction.memberPermissions || interaction.member?.permissions;
    const hasPerm = Boolean(
      perms?.has(PermissionsBitField.Flags.Administrator) ||
      perms?.has(PermissionsBitField.Flags.ModerateMembers) ||
      perms?.has(PermissionsBitField.Flags.ManageMessages)
    );

    if (!hasPerm) {
      return interaction.reply({
        content: '❌ Vous devez avoir la permission de modération ou gestion des messages pour lancer un drop d\'événement.',
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;
    const eventInput = interaction.options.getString('evenement', false);
    const qtyInput = interaction.options.getInteger('quantite', false);
    const targetChannel = interaction.options.getChannel('salon', false) || interaction.channel;
    const customNameInput = interaction.options.getString('nom_custom', false);
    const customEmojiInput = interaction.options.getString('emoji_custom', false);

    const baseConfig = getEventDropConfig(guildId);

    const runtimeConfig = {
      ...baseConfig,
      event_type: eventInput || baseConfig.event_type || 'bonbon',
      custom_name: customNameInput || baseConfig.custom_name || 'Objet Spécial',
      custom_emoji: customEmojiInput || baseConfig.custom_emoji || '✨'
    };

    await interaction.deferReply({ ephemeral: true });

    const msg = await spawnEventDrop(targetChannel, runtimeConfig, qtyInput, interaction.member);

    if (msg) {
      return interaction.editReply({
        content: `✅ **Drop d'événement envoyé avec succès dans <#${targetChannel.id}> !**`
      });
    } else {
      return interaction.editReply({
        content: `❌ Impossible d'envoyer le drop d'événement dans <#${targetChannel.id}>. Vérifiez les permissions du bot.`
      });
    }
  }
};
