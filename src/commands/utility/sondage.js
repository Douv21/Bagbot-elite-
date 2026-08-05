const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createSondage, getSondage, saveSondageResponse, getSondageResponses, hasUserVotedSondage } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sondage')
    .setDescription('Créer un sondage / évaluation par formulaire modal (1 à 5 étoiles + explications)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(option =>
      option.setName('titre')
        .setDescription('Titre ou sujet du sondage')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description / consignes du sondage (optionnel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon')
        .setDescription('Salon où poster le sondage (par défaut: salon actuel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon_resultats')
        .setDescription('Salon d\'envoi des avis / résultats nominatifs (optionnel)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('icone_vote')
        .setDescription('Icône utilisée pour la notation de 1 à 5 (par défaut: ⭐ Étoile)')
        .setRequired(false)
        .addChoices(
          { name: '⭐ Étoiles', value: '⭐' },
          { name: '❤️ Cœurs', value: '❤️' },
          { name: '👍 Pouces', value: '👍' },
          { name: '🔥 Flammes', value: '🔥' },
          { name: '🎯 Cibles', value: '🎯' },
          { name: '💎 Diamants', value: '💎' }
        )
    )
    .addStringOption(option =>
      option.setName('type_texte')
        .setDescription('Format du champ explications (par défaut: Paragraphe long)')
        .setRequired(false)
        .addChoices(
          { name: 'Explication longue (Paragraphe)', value: 'long' },
          { name: 'Explication courte (Une ligne)', value: 'court' }
        )
    )
    .addStringOption(option =>
      option.setName('couleur')
        .setDescription('Couleur de l\'embed en Hexadécimal (ex: #F1C40F)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({ content: '❌ Cette commande doit être exécutée dans un serveur.', ephemeral: true });
    }

    const title = interaction.options.getString('titre');
    const description = interaction.options.getString('description') || '';
    const targetChannel = interaction.options.getChannel('salon') || interaction.channel;
    const resultsChannel = interaction.options.getChannel('salon_resultats');
    const ratingIcon = interaction.options.getString('icone_vote') || '⭐';
    const textType = interaction.options.getString('type_texte') || 'long';
    const color = interaction.options.getString('couleur') || '#F1C40F';

    if (!targetChannel.isTextBased()) {
      return interaction.reply({ content: '❌ Le salon sélectionné doit être un salon textuel.', ephemeral: true });
    }

    const sondageId = `sndg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      // 1. Sauvegarder en BDD
      createSondage({
        id: sondageId,
        guild_id: guild.id,
        channel_id: targetChannel.id,
        results_channel_id: resultsChannel ? resultsChannel.id : null,
        title,
        description,
        rating_icon: ratingIcon,
        text_type: textType,
        color,
        created_by: interaction.user.id
      });

      // 2. Créer l'embed du sondage
      const embed = new EmbedBuilder()
        .setTitle(`📊 ${title}`)
        .setDescription(
          (description ? `${description}\n\n` : '') +
          `*Cliquez sur le bouton ci-dessous pour ouvrir le formulaire d'évaluation (${ratingIcon} 1 à 5) et laisser vos remarques !*`
        )
        .addFields({
          name: '📈 Statistiques en temps réel',
          value: 'Aucun vote enregistré pour le moment.'
        })
        .setColor(color)
        .setFooter({ text: `ID Sondage : ${sondageId} • Bagbot Elite` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sondage_vote:${sondageId}`)
          .setLabel('📝 Participer au Sondage')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝')
      );

      const pollMessage = await targetChannel.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        content: `✅ **Sondage créé et publié avec succès dans <#${targetChannel.id}> !**${resultsChannel ? `\n📩 Les réponses nominatives seront transmises dans <#${resultsChannel.id}>.` : ''}`,
        ephemeral: true
      });
    } catch (err) {
      console.error('Erreur création sondage:', err);
      return interaction.reply({ content: `❌ Impossible de créer le sondage : ${err.message}`, ephemeral: true });
    }
  },

  // Gestionnaire des clics sur boutons et soumission des modaux de sondage
  async handleInteraction(interaction) {
    const customId = interaction.customId;
    if (!customId) return false;

    // 1. Clic sur le bouton "Participer au Sondage"
    if (interaction.isButton() && customId.startsWith('sondage_vote:')) {
      const sondageId = customId.replace('sondage_vote:', '');
      const sondage = getSondage(sondageId);

      if (!sondage) {
        return interaction.reply({ content: '❌ Ce sondage est introuvable ou a été supprimé.', ephemeral: true });
      }

      const icon = sondage.rating_icon || '⭐';

      const modal = new ModalBuilder()
        .setCustomId(`sondage_modal:${sondageId}`)
        .setTitle(sondage.title.substring(0, 45));

      const ratingInput = new TextInputBuilder()
        .setCustomId('rating_input')
        .setLabel(`Votre Note de 1 à 5 (${icon})`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Entrez un chiffre de 1 à 5 (ex: 5 pour 5 ${icon})`)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1);

      const commentInput = new TextInputBuilder()
        .setCustomId('comment_input')
        .setLabel('Explication / Vos remarques')
        .setStyle(sondage.text_type === 'court' ? TextInputStyle.Short : TextInputStyle.Paragraph)
        .setPlaceholder('Rédigez ici vos explications ou remarques...')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ratingInput),
        new ActionRowBuilder().addComponents(commentInput)
      );

      await interaction.showModal(modal);
      return true;
    }

    // 2. Soumission du formulaire Modal
    if (interaction.isModalSubmit() && customId.startsWith('sondage_modal:')) {
      const sondageId = customId.replace('sondage_modal:', '');
      const sondage = getSondage(sondageId);

      if (!sondage) {
        return interaction.reply({ content: '❌ Ce sondage n\'existe plus.', ephemeral: true });
      }

      const rawRating = interaction.fields.getTextInputValue('rating_input');
      const comment = interaction.fields.getTextInputValue('comment_input') || '';
      const ratingNum = parseInt(rawRating);

      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return interaction.reply({ content: `❌ Veuillez saisir un chiffre valide compris entre **1 et 5** pour votre note.`, ephemeral: true });
      }

      // Enregistrer en BDD
      saveSondageResponse(sondageId, interaction.user.id, ratingNum, comment);

      const icon = sondage.rating_icon || '⭐';
      const ratingStars = icon.repeat(ratingNum);

      // Répondre au membre
      await interaction.reply({
        content: `✅ **Merci pour votre participation !**\nVotre vote **${ratingStars} (${ratingNum}/5)** a bien été enregistré.`,
        ephemeral: true
      });

      // 3. Envoyer la réponse nominative dans le salon de résultats si configuré
      if (sondage.results_channel_id) {
        try {
          const resultsChan = await interaction.guild.channels.fetch(sondage.results_channel_id).catch(() => null);
          if (resultsChan && resultsChan.isTextBased()) {
            const resEmbed = new EmbedBuilder()
              .setTitle(`📩 Avis Reçu : ${sondage.title}`)
              .setDescription(
                `**Membre :** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n` +
                `**Note :** ${ratingStars} (${ratingNum}/5)\n\n` +
                `**Avis / Remarques :**\n${comment.trim() ? comment.trim() : '*Aucune remarque écrite.*'}`
              )
              .setColor(sondage.color || '#F1C40F')
              .setFooter({ text: `Sondage ID : ${sondageId}` })
              .setTimestamp();

            await resultsChan.send({ embeds: [resEmbed] }).catch(() => null);
          }
        } catch (e) {
          console.error('Erreur transmission résultat sondage:', e);
        }
      }

      // 4. Mettre à jour l'embed d'origine du sondage avec les statistiques
      try {
        const pollChan = await interaction.guild.channels.fetch(sondage.channel_id).catch(() => null);
        if (pollChan && pollChan.isTextBased()) {
          const responses = getSondageResponses(sondageId);
          const totalVotes = responses.length;

          if (totalVotes > 0) {
            const sumRating = responses.reduce((acc, curr) => acc + curr.rating, 0);
            const avgRating = (sumRating / totalVotes).toFixed(1);

            // Répartition des notes 1 à 5
            const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            responses.forEach(r => { if (counts[r.rating] !== undefined) counts[r.rating]++; });

            const createBar = (count) => {
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 10) : 0;
              return '█'.repeat(pct) + '░'.repeat(10 - pct);
            };

            const statsText = 
              `**Note moyenne :** ${avgRating}/5 ${icon}\n` +
              `**Nombre de participants :** ${totalVotes}\n\n` +
              `5 ${icon} : ${createBar(counts[5])} ${counts[5]} (${Math.round((counts[5]/totalVotes)*100)}%)\n` +
              `4 ${icon} : ${createBar(counts[4])} ${counts[4]} (${Math.round((counts[4]/totalVotes)*100)}%)\n` +
              `3 ${icon} : ${createBar(counts[3])} ${counts[3]} (${Math.round((counts[3]/totalVotes)*100)}%)\n` +
              `2 ${icon} : ${createBar(counts[2])} ${counts[2]} (${Math.round((counts[2]/totalVotes)*100)}%)\n` +
              `1 ${icon} : ${createBar(counts[1])} ${counts[1]} (${Math.round((counts[1]/totalVotes)*100)}%)`;

            // Récupérer le message d'origine s'il est trouvable
            const messages = await pollChan.messages.fetch({ limit: 50 }).catch(() => null);
            if (messages) {
              const pollMsg = messages.find(m => m.embeds && m.embeds.length > 0 && m.embeds[0].footer && m.embeds[0].footer.text && m.embeds[0].footer.text.includes(sondageId));
              if (pollMsg) {
                const oldEmbed = pollMsg.embeds[0];
                const updatedEmbed = EmbedBuilder.from(oldEmbed).setFields({
                  name: '📈 Statistiques en temps réel',
                  value: statsText
                });
                await pollMsg.edit({ embeds: [updatedEmbed] }).catch(() => null);
              }
            }
          }
        }
      } catch (e) {
        console.error('Erreur mise à jour statistiques sondage:', e);
      }

      return true;
    }

    return false;
  }
};
