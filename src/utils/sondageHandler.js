const { ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { getSondage, saveSondageResponse, getSondageResponses, db } = require('../database/db');

function getStarRatingStr(score, ratingIcon = '⭐') {
  const num = parseInt(score);
  if (!isNaN(num) && num >= 1 && num <= 5) {
    const stars = ratingIcon.repeat(num);
    return stars || `${num}`;
  }
  return score;
}

/**
 * Gère l'ouverture des Modaux et la soumission des Évaluations / Sondages par section.
 */
async function handleSondageInteraction(interaction) {
  const customId = interaction.customId;
  if (!customId) return false;

  // 1. Clic sur "Participer à l'Évaluation" (Bouton)
  if (interaction.isButton() && customId.startsWith('sondage_vote:')) {
    const sondageId = customId.replace('sondage_vote:', '');
    const sondage = getSondage(sondageId);
    if (!sondage) {
      return interaction.reply({ content: '❌ Ce sondage n\'existe plus en base de données.', ephemeral: true });
    }

    let sections = [];
    try {
      sections = JSON.parse(sondage.sections || '[]');
    } catch (e) {}

    if (!sections || sections.length === 0) {
      sections = [{ id: 'sec1', label: sondage.title || 'Évaluation', type: 'rating_text' }];
    }

    const modal = new ModalBuilder()
      .setCustomId(`sondage_modal:${sondageId}`)
      .setTitle(`📊 ${sondage.title}`.substring(0, 45));

    const rows = [];
    const icon = sondage.rating_icon || '⭐';
    const maxCapacity = sondage.has_general_remark !== 0 ? 4 : 5;

    for (let idx = 0; idx < sections.length; idx++) {
      if (rows.length >= maxCapacity) break;
      const sec = sections[idx];
      const secType = sec.type || 'rating_text';

      if (secType === 'rating' || secType === 'rating_text') {
        const ratingInput = new TextInputBuilder()
          .setCustomId(`rating_sec_${idx}`)
          .setLabel(`Note (1 à 5 ${icon}) : ${sec.label}`.substring(0, 45))
          .setPlaceholder(`Entrez un chiffre de 1 à 5 (ex: 5) ou des ${icon}`)
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(20)
          .setRequired(true);

        rows.push(new ActionRowBuilder().addComponents(ratingInput));
      }

      if ((secType === 'text' || secType === 'rating_text') && rows.length < maxCapacity) {
        const obsInput = new TextInputBuilder()
          .setCustomId(`obs_sec_${idx}`)
          .setLabel(`Remarques : ${sec.label}`.substring(0, 45))
          .setPlaceholder('Vos observations sur ce point...')
          .setStyle(sondage.text_type === 'court' ? TextInputStyle.Short : TextInputStyle.Paragraph)
          .setRequired(false);
        rows.push(new ActionRowBuilder().addComponents(obsInput));
      }
    }

    // Remarques Générales tout en bas
    if (sondage.has_general_remark !== 0 && rows.length < 5) {
      const genInput = new TextInputBuilder()
        .setCustomId('obs_general')
        .setLabel('Remarques & Suggestions Générales'.substring(0, 45))
        .setPlaceholder('Remarques tout en bas pour conclure votre avis...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      rows.push(new ActionRowBuilder().addComponents(genInput));
    }

    modal.addComponents(rows);
    try {
      await interaction.showModal(modal);
    } catch (err) {
      console.error('Erreur affichage modal sondage:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: `❌ Impossible d'ouvrir le formulaire : ${err.message}`, ephemeral: true }).catch(() => null);
      }
    }
    return true;
  }

  // 2. Soumission du Formulaire d'Évaluation (Modal Submit)
  if (interaction.isModalSubmit() && customId.startsWith('sondage_modal:')) {
    await interaction.deferReply({ ephemeral: true }).catch(() => null);

    const sondageId = customId.replace('sondage_modal:', '');
    const sondage = getSondage(sondageId);
    if (!sondage) {
      return interaction.editReply({ content: '❌ Sondage introuvable.' });
    }

    let sections = [];
    try {
      sections = JSON.parse(sondage.sections || '[]');
    } catch (e) {}
    if (!sections || sections.length === 0) {
      sections = [{ id: 'sec1', label: sondage.title || 'Évaluation', type: 'rating_text' }];
    }

    const sectionScores = [];
    let totalScore = 0;
    let validScoresCount = 0;

    sections.forEach((sec, idx) => {
      let score = 5;
      let obsStr = '';

      try {
        let ratingStr = null;
        try {
          const selectVals = interaction.fields.getStringSelectMenuValues(`rating_sec_${idx}`);
          if (selectVals && selectVals.length > 0) ratingStr = selectVals[0];
        } catch (e) {
          ratingStr = interaction.fields.getTextInputValue(`rating_sec_${idx}`);
        }

        if (ratingStr) {
          const raw = String(ratingStr).trim();
          let parsed = parseInt(raw);
          if (isNaN(parsed)) {
            const icon = sondage.rating_icon || '⭐';
            const escapedIcon = icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const count = (raw.match(new RegExp(escapedIcon, 'g')) || []).length;
            if (count > 0) {
              parsed = count;
            } else {
              const digitMatch = raw.match(/\d/);
              if (digitMatch) {
                parsed = parseInt(digitMatch[0]);
              } else {
                parsed = [...raw].length;
              }
            }
          }
          if (isNaN(parsed) || parsed < 1) parsed = 1;
          if (parsed > 5) parsed = 5;
          score = parsed;
          totalScore += score;
          validScoresCount++;
        }
      } catch (e) {}

      try {
        obsStr = interaction.fields.getTextInputValue(`obs_sec_${idx}`) || '';
      } catch (e) {}

      sectionScores.push({
        label: sec.label,
        rating: score,
        type: sec.type || 'rating_text',
        observation: obsStr.trim()
      });
    });

    let generalRemark = '';
    try {
      generalRemark = interaction.fields.getTextInputValue('obs_general') || '';
    } catch (e) {}

    const overallRating = validScoresCount > 0 ? (totalScore / validScoresCount).toFixed(1) : '5.0';

    // Sauvegarder la réponse en BDD
    const responsePayload = {
      overallRating,
      sectionScores,
      generalRemark: generalRemark.trim()
    };

    saveSondageResponse(sondageId, interaction.user.id, Math.round(overallRating), JSON.stringify(responsePayload));

    // Mettre à jour les statistiques de l'embed principal
    const responses = getSondageResponses(sondageId);
    const totalVotes = responses.length;

    let globalAvg = 0;
    if (totalVotes > 0) {
      const sum = responses.reduce((acc, r) => acc + (r.rating || 5), 0);
      globalAvg = (sum / totalVotes).toFixed(1);
    }

    const icon = sondage.rating_icon || '⭐';

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${sondage.title}`)
      .setDescription(
        (sondage.description ? `${sondage.description}\n\n` : '') +
        `**📈 Statistiques d'Évaluation en Temps Réel :**\n` +
        `• **Note globale moyenne :** ${globalAvg}/5 ${icon}\n` +
        `• **Nombre de fiches d'évaluations :** ${totalVotes} membre(s)`
      )
      .setColor(sondage.color || '#F1C40F')
      .setFooter({ text: `ID Sondage : ${sondageId} • Bagbot Elite` })
      .setTimestamp();

    // Mettre à jour l'embed dans le salon d'origine
    if (interaction.message) {
      await interaction.message.edit({ embeds: [embed] }).catch(() => null);
    }

    // Transmettre la fiche d'évaluation détaillée dans le salon de résultats si configuré
    if (sondage.results_channel_id) {
      const resultsChannel = interaction.guild.channels.cache.get(sondage.results_channel_id);
      if (resultsChannel && resultsChannel.isTextBased()) {
        let mentionsArr = [];
        try {
          mentionsArr = typeof sondage.mentions === 'string' ? JSON.parse(sondage.mentions || '[]') : (sondage.mentions || []);
        } catch (e) {}

        const mentionsContent = Array.isArray(mentionsArr) && mentionsArr.length > 0 ? mentionsArr.join(' ') : null;

        const items = [];
        sectionScores.forEach(sec => {
          let scoreText = getStarRatingStr(sec.rating, icon);
          let val = sec.observation ? `${scoreText}\n*Remarques :* "${sec.observation}"` : scoreText;
          items.push({ name: sec.label, value: val });
        });

        if (generalRemark.trim()) {
          items.push({ name: '📌 Remarques & Suggestions Générales', value: `"${generalRemark.trim()}"` });
        }

        const embedContent = items.map(item => `**${item.name}**\n${item.value}`).join('\n\n');
        const shortDesc = sondage.short_description && sondage.short_description.trim() ? sondage.short_description.trim() : 'Voici les réponses reçues :';

        const ficheEmbed = new EmbedBuilder()
          .setTitle(sondage.title || 'Nouvelle réponse au formulaire')
          .setDescription(`${shortDesc}\n\n${embedContent}`)
          .setColor(sondage.color || '#78A8C6')
          .setTimestamp();

        if (sondage.avatar_image && sondage.avatar_image.trim()) {
          ficheEmbed.setThumbnail(sondage.avatar_image.trim());
        } else {
          ficheEmbed.setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 128 }));
        }

        if (sondage.banner_image && sondage.banner_image.trim()) {
          ficheEmbed.setImage(sondage.banner_image.trim());
        }

        ficheEmbed.setFooter({ text: `Réponse soumise par ${interaction.user.tag} • ID: ${interaction.user.id}` });

        await resultsChannel.send({
          content: mentionsContent,
          embeds: [ficheEmbed]
        }).catch(console.error);
      }
    }

    await interaction.editReply({ content: '✅ **Votre fiche d\'évaluation a été transmise avec succès ! Merci pour votre retour.**' }).catch(() => null);
    return true;
  }

  return false;
}

module.exports = { handleSondageInteraction };
