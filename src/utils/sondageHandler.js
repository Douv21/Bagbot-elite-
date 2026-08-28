const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { getSondage, saveSondageResponse, getSondageResponses } = require('../database/db');

function getStarRatingStr(score, ratingIcon = '⭐') {
  const num = parseInt(score);
  if (!isNaN(num) && num >= 1 && num <= 5) {
    const stars = ratingIcon.repeat(num);
    return stars || `${num}`;
  }
  return score;
}

function parseSectionInput(rawInput, defaultIcon = '⭐') {
  if (!rawInput) return { rating: 5, observation: '' };
  const raw = String(rawInput).trim();
  let parsedScore = NaN;

  const escapedIcon = defaultIcon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const iconMatches = (raw.match(new RegExp(escapedIcon, 'g')) || []).length;
  if (iconMatches > 0 && iconMatches <= 5) {
    parsedScore = iconMatches;
  }

  if (isNaN(parsedScore)) {
    const digitMatch = raw.match(/\b([1-5])\b/);
    if (digitMatch) {
      parsedScore = parseInt(digitMatch[1]);
    }
  }

  if (isNaN(parsedScore)) parsedScore = 5;
  const score = Math.max(1, Math.min(5, parsedScore));

  let cleanObs = raw;
  if (iconMatches > 0) {
    cleanObs = cleanObs.replace(new RegExp(escapedIcon, 'g'), '');
  }
  cleanObs = cleanObs.replace(/\b[1-5]\s*\/\s*5\b/g, '').replace(/\b[1-5]\b/g, '');
  cleanObs = cleanObs.replace(/^[\s\-:/]+/, '').trim();

  return { rating: score, observation: cleanObs };
}

async function handleSondageInteraction(interaction) {
  const customId = interaction.customId;
  if (!customId || !customId.startsWith('sondage_')) return false;

  // Clic sur "Voir les Résultats" -> Affiche le bilan du sondage en message EPHEMERE
  if (interaction.isButton() && customId.startsWith('sondage_results:')) {
    const sondageId = customId.replace('sondage_results:', '');
    const sondage = getSondage(sondageId);
    if (!sondage) {
      return interaction.reply({ content: '❌ Ce sondage n\'existe plus en base de données.', ephemeral: true });
    }

    const responses = getSondageResponses(sondageId);
    const icon = sondage.rating_icon || '⭐';
    const totalVotes = responses ? responses.length : 0;

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalSum = 0;

    if (responses && responses.length > 0) {
      responses.forEach(r => {
        let score = Math.round(r.rating || 5);
        if (score < 1) score = 1;
        if (score > 5) score = 5;
        ratingCounts[score]++;
        totalSum += score;
      });
    }

    const globalAvg = totalVotes > 0 ? (totalSum / totalVotes).toFixed(1) : '5.0';

    const makeBar = (pct, len = 8) => {
      const filled = Math.round((pct / 100) * len);
      return '█'.repeat(filled) + '░'.repeat(len - filled);
    };

    const statLines = [5, 4, 3, 2, 1].map(star => {
      const count = ratingCounts[star];
      const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0.0';
      const bar = makeBar(parseFloat(pct));
      return `${star} ${icon} : \`${bar}\` **${count}** (${pct}%)`;
    }).join('\n');

    const resultsEmbed = new EmbedBuilder()
      .setTitle(`📈 Résultats du Sondage : ${sondage.title}`)
      .setDescription(
        `• **Note globale moyenne :** ${globalAvg} / 5 ${icon}\n` +
        `• **Nombre total d'évaluations :** ${totalVotes} membre(s)\n\n` +
        `**📊 Répartition des votes par pourcentage :**\n${statLines}`
      )
      .setColor(sondage.color || '#5865F2')
      .setFooter({ text: `Résultats en direct • Visible uniquement par vous` })
      .setTimestamp();

    return interaction.reply({ embeds: [resultsEmbed], ephemeral: true });
  }

  // 1. Clic sur "Participer au Sondage" -> Ouvre le Formulaire Modal Discord
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

    // Maximum 5 ActionRows autorisées par Discord
    const useTwoRowsPerSection = sections.length <= 2 && sections.every(s => (s.type || 'rating_text') === 'rating_text');

    if (useTwoRowsPerSection) {
      sections.forEach((sec, idx) => {
        const ratingInput = new TextInputBuilder()
          .setCustomId(`rating_sec_${idx}`)
          .setLabel(`Note (1 à 5 ${icon}) : ${sec.label}`.substring(0, 45))
          .setPlaceholder(`Entrez un chiffre de 1 à 5 (ex: 5) ou des ${icon}`)
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(20)
          .setRequired(true);

        rows.push(new ActionRowBuilder().addComponents(ratingInput));

        const obsInput = new TextInputBuilder()
          .setCustomId(`obs_sec_${idx}`)
          .setLabel(`Remarques : ${sec.label}`.substring(0, 45))
          .setPlaceholder('Vos observations sur ce point...')
          .setStyle(sondage.text_type === 'court' ? TextInputStyle.Short : TextInputStyle.Paragraph)
          .setRequired(false);

        rows.push(new ActionRowBuilder().addComponents(obsInput));
      });

      if (sondage.has_general_remark !== 0 && rows.length < 5) {
        const genInput = new TextInputBuilder()
          .setCustomId('obs_general')
          .setLabel('Remarques Générales'.substring(0, 45))
          .setPlaceholder('Remarques tout en bas pour conclure votre avis...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false);

        rows.push(new ActionRowBuilder().addComponents(genInput));
      }
    } else {
      // 1 champ combiné Note + Remarques par section (jusqu'à 4 ou 5 sections)
      const maxSections = sondage.has_general_remark !== 0 ? 4 : 5;
      sections.slice(0, maxSections).forEach((sec, idx) => {
        const secType = sec.type || 'rating_text';
        let labelStr = `${idx + 1}. ${sec.label}`.substring(0, 45);
        let placeholderStr = `Note 1-5 (${icon}) et vos remarques...`;

        if (secType === 'rating') {
          labelStr = `Note (1 à 5 ${icon}) : ${sec.label}`.substring(0, 45);
          placeholderStr = `Ex: 5 ou ${icon.repeat(5)}`;
        } else if (secType === 'text') {
          labelStr = `Remarque : ${sec.label}`.substring(0, 45);
          placeholderStr = `Vos remarques...`;
        }

        const input = new TextInputBuilder()
          .setCustomId(`combo_sec_${idx}`)
          .setLabel(labelStr)
          .setPlaceholder(placeholderStr)
          .setStyle(sondage.text_type === 'court' ? TextInputStyle.Short : TextInputStyle.Paragraph)
          .setRequired(secType !== 'text');

        rows.push(new ActionRowBuilder().addComponents(input));
      });

      if (sondage.has_general_remark !== 0 && rows.length < 5) {
        const genInput = new TextInputBuilder()
          .setCustomId('obs_general')
          .setLabel('Remarques Générales'.substring(0, 45))
          .setPlaceholder('Remarques tout en bas pour conclure votre avis...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false);

        rows.push(new ActionRowBuilder().addComponents(genInput));
      }
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

  // 2. Soumission de la modale Discord
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

    const icon = sondage.rating_icon || '⭐';
    const sectionScores = [];
    let totalScore = 0;
    let validScoresCount = 0;

    sections.forEach((sec, idx) => {
      let score = 5;
      let obsStr = '';

      try {
        const comboVal = interaction.fields.getTextInputValue(`combo_sec_${idx}`);
        if (comboVal !== undefined && comboVal !== null) {
          const parsed = parseSectionInput(comboVal, icon);
          score = parsed.rating;
          obsStr = parsed.observation;
        }
      } catch (e) {
        try {
          const ratingVal = interaction.fields.getTextInputValue(`rating_sec_${idx}`);
          if (ratingVal) {
            const parsed = parseSectionInput(ratingVal, icon);
            score = parsed.rating;
          }
        } catch (err) {}

        try {
          obsStr = interaction.fields.getTextInputValue(`obs_sec_${idx}`) || '';
        } catch (err) {}
      }

      totalScore += score;
      validScoresCount++;

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

    const responsePayload = {
      overallRating,
      sectionScores,
      generalRemark: generalRemark.trim()
    };

    saveSondageResponse(sondageId, interaction.user.id, Math.round(overallRating), JSON.stringify(responsePayload));

    const responses = getSondageResponses(sondageId);
    const { mainEmbed, ficheEmbed } = buildSondageEmbeds(sondage, responses, responsePayload, interaction.user.tag);

    if (interaction.message && interaction.message.editable) {
      await interaction.message.edit({ embeds: [mainEmbed] }).catch(() => null);
    }

    if (sondage.results_channel_id) {
      const resultsChannel = interaction.guild.channels.cache.get(sondage.results_channel_id);
      if (resultsChannel && resultsChannel.isTextBased()) {
        let mentionsArr = [];
        try {
          mentionsArr = typeof sondage.mentions === 'string' ? JSON.parse(sondage.mentions || '[]') : (sondage.mentions || []);
        } catch (e) {}

        const mentionsContent = Array.isArray(mentionsArr) && mentionsArr.length > 0 ? mentionsArr.join(' ') : null;

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

function buildSondageEmbeds(sondage, responses, responsePayload, userTag = '') {
  const icon = sondage.rating_icon || '⭐';
  const totalVotes = responses ? responses.length : 0;

  // 1. Calcul des frequences de notes (5 a 1) et pourcentage
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalSum = 0;

  if (responses && responses.length > 0) {
    responses.forEach(r => {
      let score = Math.round(r.rating || 5);
      if (score < 1) score = 1;
      if (score > 5) score = 5;
      ratingCounts[score]++;
      totalSum += score;
    });
  }

  const globalAvg = totalVotes > 0 ? (totalSum / totalVotes).toFixed(1) : '5.0';

  const makeBar = (pct, len = 8) => {
    const filled = Math.round((pct / 100) * len);
    return '█'.repeat(filled) + '░'.repeat(len - filled);
  };

  const statLines = [5, 4, 3, 2, 1].map(star => {
    const count = ratingCounts[star];
    const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0.0';
    const bar = makeBar(parseFloat(pct));
    return `${star} ${icon} : \`${bar}\` **${count}** (${pct}%)`;
  }).join('\n');

  const statsSectionText = 
    `**📈 Statistiques d'Évaluation en Temps Réel :**\n` +
    `• **Note globale moyenne :** ${globalAvg} / 5 ${icon}\n` +
    `• **Nombre de fiches reçues :** ${totalVotes} membre(s)\n\n` +
    `**📊 Répartition des votes par pourcentage :**\n${statLines}`;

  // 2. Embed principal (Salon du sondage)
  const mainEmbed = new EmbedBuilder()
    .setTitle(`📊 ${sondage.title}`)
    .setDescription(
      (sondage.description ? `${sondage.description}\n\n` : '') +
      `💡 *Cliquez sur le bouton "**📈 Voir les Résultats**" ci-dessous pour consulter les statistiques et pourcentages en direct (message éphémère).*`
    )
    .setColor(sondage.color || '#F1C40F')
    .setFooter({ text: `ID Sondage : ${sondage.id} • Bagbot Elite` })
    .setTimestamp();

  // 3. Fiche complete transmise (Salon de transmission)
  const items = [];
  const sectionScores = (responsePayload && responsePayload.sectionScores) ? responsePayload.sectionScores : [];

  sectionScores.forEach((sec, idx) => {
    const qLabel = sec.label || `Question ${idx + 1}`;
    const qType = sec.type || 'rating_text';
    const score = parseInt(sec.rating) || 5;

    let ansDisplay = '';
    if (qType === 'rating_text' || qType === 'rating') {
      const starsStr = icon.repeat(Math.max(1, Math.min(5, score)));
      ansDisplay = `**Note :** ${score}/5 ${starsStr}`;
      if (sec.observation) {
        ansDisplay += `\n💬 *Observation :* "${sec.observation}"`;
      }
    } else if (qType === 'scale') {
      const starsStr = icon.repeat(Math.max(1, Math.min(5, score)));
      ansDisplay = `**Note :** ${sec.observation || `${score}/10`} (${starsStr})`;
    } else if (qType === 'radio' || qType === 'checkbox') {
      ansDisplay = `**Choix sélectionné(s) :** ${sec.observation || 'Aucun'}`;
    } else {
      ansDisplay = `**Réponse :** "${sec.observation || 'Aucune'}"`;
    }

    items.push(`📋 **${idx + 1}. ${qLabel}**\n${ansDisplay}`);
  });

  if (responsePayload && responsePayload.generalRemark && responsePayload.generalRemark.trim()) {
    items.push(`📌 **Remarques & Observations Générales :**\n"${responsePayload.generalRemark.trim()}"`);
  }

  const shortDesc = sondage.short_description && sondage.short_description.trim()
    ? sondage.short_description.trim()
    : 'Voici la fiche de réponse complète reçue :';

  const fullFormText = items.join('\n\n');
  const userHeader = userTag ? `👤 **Avis transmis par :** ${userTag}\n\n` : '';

  const ficheEmbed = new EmbedBuilder()
    .setTitle(`📝 Formulaire Reçu : ${sondage.title}`)
    .setDescription(
      `${userHeader}*${shortDesc}*\n\n` +
      `───────────────────────────\n` +
      `${fullFormText}\n` +
      `───────────────────────────\n\n` +
      statsSectionText
    )
    .setColor(sondage.color || '#78A8C6')
    .setTimestamp();

  if (sondage.avatar_image && sondage.avatar_image.trim()) {
    ficheEmbed.setThumbnail(sondage.avatar_image.trim());
  }

  if (sondage.banner_image && sondage.banner_image.trim()) {
    ficheEmbed.setImage(sondage.banner_image.trim());
  }

  const authorText = userTag ? `Formulaire soumis par ${userTag}` : `Formulaire soumis en ligne`;
  ficheEmbed.setFooter({ text: authorText });

  return { mainEmbed, ficheEmbed };
}

module.exports = { handleSondageInteraction, getStarRatingStr, buildSondageEmbeds };
