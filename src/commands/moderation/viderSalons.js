const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vider-salons')
    .setDescription('Réinitialiser un ou plusieurs salons à neuf (conserve permissions, catégorie, etc.)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option =>
      option.setName('salon1')
        .setDescription('Premier salon à réinitialiser')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('salon2')
        .setDescription('Deuxième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon3')
        .setDescription('Troisième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon4')
        .setDescription('Quatrième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon5')
        .setDescription('Cinquième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon6')
        .setDescription('Sixième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('confirmation')
        .setDescription('Mode de confirmation')
        .setRequired(false)
        .addChoices(
          { name: 'Demander confirmation par bouton (Par défaut)', value: 'demander' },
          { name: 'Exécuter directement sans confirmation', value: 'immediat' }
        )
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({ content: '❌ Cette commande doit être exécutée dans un serveur.', ephemeral: true });
    }

    // Récupérer les salons sélectionnés
    const targetChannels = [];
    for (let i = 1; i <= 6; i++) {
      const ch = interaction.options.getChannel(`salon${i}`);
      if (ch && !targetChannels.some(existing => existing.id === ch.id)) {
        targetChannels.push(ch);
      }
    }

    if (targetChannels.length === 0) {
      return interaction.reply({ content: '❌ Veuillez spécifier au moins un salon valide.', ephemeral: true });
    }

    // Filtrer les types de salons autorisés (Text, Voice, News, Stage, Forum, etc.)
    const validChannels = targetChannels.filter(c => c.isTextBased() || c.isVoiceBased() || c.type === 0 || c.type === 2 || c.type === 5 || c.type === 15);
    if (validChannels.length === 0) {
      return interaction.reply({ content: '❌ Aucun salon valide sélectionné pour la réinitialisation.', ephemeral: true });
    }

    const confirmMode = interaction.options.getString('confirmation') || 'demander';

    // Fonction de traitement de la réinitialisation des salons
    const processNuke = async () => {
      const results = [];
      const logsList = [];

      for (const channel of validChannels) {
        try {
          const oldName = channel.name;
          const oldPosition = channel.position;
          const oldParent = channel.parent;
          const oldTopic = channel.topic;
          const oldNsfw = channel.nsfw;
          const oldRateLimitPerUser = channel.rateLimitPerUser;

          // 1. Cloner le salon avec toutes ses propriétés
          const clonedChannel = await channel.clone({
            name: oldName,
            topic: oldTopic,
            nsfw: oldNsfw,
            rateLimitPerUser: oldRateLimitPerUser,
            reason: `Réinitialisation du salon (/vider-salons) par ${interaction.user.tag}`
          });

          // Restaurer position et catégorie
          if (oldParent) {
            await clonedChannel.setParent(oldParent, { lockPermissions: false }).catch(() => null);
          }
          await clonedChannel.setPosition(oldPosition).catch(() => null);

          // 2. Animer le nouveau salon avec l'embed de réinitialisation
          if (clonedChannel.isTextBased() && typeof clonedChannel.send === 'function') {
            const nukeEmbed = new EmbedBuilder()
              .setTitle('💥 Salon Réinitialisé !')
              .setDescription(`✨ Ce salon a été réinitialisé à neuf par <@${interaction.user.id}>.\n\n*Toutes les permissions, catégories, rôles et configurations ont été conservés.*`)
              .setColor('#2ECC71')
              .setImage('https://media.giphy.com/media/XUFPbUsBF7R1z7k3zT/giphy.gif')
              .setFooter({ text: `Bagbot Elite • Réinitialisation par ${interaction.user.username}` })
              .setTimestamp();

            await clonedChannel.send({ embeds: [nukeEmbed] }).catch(() => null);
          }

          results.push(`✅ **${oldName}** ➔ <#${clonedChannel.id}>`);
          logsList.push(`- **${oldName}** (Ancien ID: \`${channel.id}\` ➔ Nouveau ID: \`${clonedChannel.id}\`)`);

          // 3. Supprimer l'ancien salon (avec force delete)
          await channel.delete(`Réinitialisation (/vider-salons) par ${interaction.user.tag}`).catch(err => {
            console.error(`Erreur suppression ancien salon ${oldName}:`, err);
          });
        } catch (err) {
          console.error(`Erreur réinitialisation salon ${channel.name}:`, err);
          results.push(`❌ **${channel.name}** : Échec (${err.message})`);
        }
      }

      // Envoi du rapport dans les logs de modération
      const logEmbed = new EmbedBuilder()
        .setTitle('💥 Réinitialisation de Salon(s) (/vider-salons)')
        .setDescription(`**Modérateur :** <@${interaction.user.id}> (${interaction.user.tag})\n**Nombre de salons :** ${validChannels.length}\n\n**Détails :**\n${logsList.join('\n')}`)
        .setColor('#E74C3C')
        .setTimestamp();

      sendLog(guild, 'moderation', logEmbed);

      return results;
    };

    if (confirmMode === 'immediat') {
      await interaction.deferReply({ ephemeral: true });
      const results = await processNuke();
      return interaction.editReply({
        content: `💥 **Réinitialisation effectuée !**\n\n${results.join('\n')}`
      });
    }

    // Mode confirmation par bouton
    const channelMentions = validChannels.map(c => `• <#${c.id}> (\`${c.name}\`)`).join('\n');
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirmation de Réinitialisation (/vider-salons)')
      .setDescription(`Vous êtes sur le point de réinitialiser **${validChannels.length} salon(s)** :\n\n${channelMentions}\n\n🚨 **Attention :** Tous les messages actuels de ces salons seront définitivement effacés.\nLes permissions, rôles, sujets et catégories seront totalement préservés.`)
      .setColor('#F1C40F')
      .setFooter({ text: 'Cliquez sur le bouton ci-dessous pour confirmer.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_nuke')
        .setLabel(`Confirmer et Réinitialiser (${validChannels.length})`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji('💥'),
      new ButtonBuilder()
        .setCustomId('cancel_nuke')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
    );

    const replyMsg = await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true,
      fetchReply: true
    });

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    });

    collector.on('collect', async btnInteraction => {
      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({ content: '❌ Seul l\'auteur de la commande peut confirmer.', ephemeral: true });
      }

      if (btnInteraction.customId === 'confirm_nuke') {
        await btnInteraction.update({ content: '⏳ Réinitialisation des salons en cours...', embeds: [], components: [] });
        const results = await processNuke();
        await interaction.editReply({
          content: `💥 **Réinitialisation effectuée avec succès !**\n\n${results.join('\n')}`,
          embeds: [],
          components: []
        });
      } else if (btnInteraction.customId === 'cancel_nuke') {
        await btnInteraction.update({ content: '❌ Réinitialisation annulée.', embeds: [], components: [] });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: '⏰ Temps écoulé (30s). Réinitialisation annulée.', embeds: [], components: [] }).catch(() => null);
      }
    });
  }
};
