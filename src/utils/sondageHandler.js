const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getSondage, saveSondageResponse, getSondageResponses } = require('../database/db');

// Map de stockage temporaire des votes en cours : key = `${guildId}:${userId}:${sondageId}`
const userVoteSessions = new Map();

function getStarRatingStr(score, ratingIcon = '⭐') {
  const num = parseInt(score);
  if (!isNaN(num) && num >= 1 && num <= 5) {
    const stars = ratingIcon.repeat(num);
    return stars || `${num}`;
  }
  return score;
}

function buildInteractiveVotePayload(sondage, session) {
  let sections = [];
  try {
    sections = JSON.parse(sondage.sections || '[]');
  } catch (e) {}
  if (!sections || sections.length === 0) {
    sections = [{ id: 'sec1', label: sondage.title || 'Évaluation', type: 'rating_text' }];
  }

  const icon = sondage.rating_icon || '⭐';
  const rows = [];
  let descriptionStr = `Cliquez directement sur un bouton d'émoji **1 à 5 (${icon})** ci-dessous pour attribuer votre note à chaque critère :\n\n`;

  const maxSections = Math.min(sections.length, 4);
  sections.slice(0, maxSections).forEach((sec, secIdx) => {
    const secType = sec.type || 'rating_text';
    const currentVal = session.ratings ? (session.ratings[secIdx] || 0) : 0;
    
    descriptionStr += `• **${sec.label}** : ${currentVal > 0 ? `${icon.repeat(currentVal)} (${currentVal}/5)` : '*Cliquez sur un bouton ci-dessous*'}\n`;

    if (secType === 'rating' || secType === 'rating_text') {
      const btnRow = new ActionRowBuilder();
      for (let val = 1; val <= 5; val++) {
        const isSelected = currentVal === val;
        const btn = new ButtonBuilder()
          .setCustomId(`sondage_rate:${sondage.id}:${secIdx}:${val}`)
          .setLabel(`${val}`)
          .setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Secondary);
          
        if (icon && !icon.includes('<') && !icon.includes(':')) {
          try { btn.setEmoji(icon); } catch (e) {}
        }
        btnRow.addComponents(btn);
      }
      rows.push(btnRow);
    }
  });

  const actionRow = new ActionRowBuilder();
  actionRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`sondage_obs:${sondage.id}`)
      .setLabel('💬 Remarques (Optionnel)')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`sondage_submit:${sondage.id}`)
      .setLabel('✅ Valider mon Évaluation')
      .setStyle(ButtonStyle.Success)
  );
  rows.push(actionRow);

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${sondage.title}`)
    .setDescription(descriptionStr)
    .setColor(sondage.color || '#F1C40F')
    .setFooter({ text: 'Sélectionnez vos notes avec les boutons émojis puis cliquez sur "Valider mon Évaluation"' });

  return { embeds: [embed], components: rows };
}

async function finalizeSondageSubmission(interaction, sondage, session) {
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
    const score = session.ratings && session.ratings[idx] ? session.ratings[idx] : 5;
    const obsStr = session.observations && session.observations[idx] ? session.observations[idx] : '';

    totalScore += score;
    validScoresCount++;

    sectionScores.push({
      label: sec.label,
      rating: score,
      type: sec.type || 'rating_text',
      observation: obsStr.trim()
    });
  });

  const generalRemark = session.generalRemark || '';
  const overallRating = validScoresCount > 0 ? (totalScore / validScoresCount).toFixed(1) : '5.0';

  const responsePayload = {
    overallRating,
    sectionScores,
    generalRemark: generalRemark.trim()
  };

  saveSondageResponse(sondage.id, interaction.user.id, Math.round(overallRating), JSON.stringify(responsePayload));

  const responses = getSondageResponses(sondage.id);
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
    .setFooter({ text: `ID Sondage : ${sondage.id} • Bagbot Elite` })
    .setTimestamp();

  if (interaction.message && interaction.message.editable) {
    await interaction.message.edit({ embeds: [embed] }).catch(() => null);
  }

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

  const sessionKey = `${interaction.guildId}:${interaction.user.id}:${sondage.id}`;
  userVoteSessions.delete(sessionKey);

  await interaction.editReply({ content: '✅ **Votre fiche d\'évaluation et vos notes ont été enregistrées avec succès ! Merci pour votre retour.**' }).catch(() => null);
}

async function handleSondageInteraction(interaction) {
  const customId = interaction.customId;
  if (!customId || !customId.startsWith('sondage_')) return false;

  const parts = customId.split(':');
  const action = parts[0];
  const sondageId = parts[1];

  const sondage = getSondage(sondageId);
  if (!sondage) {
    if (interaction.isButton()) {
      return interaction.reply({ content: '❌ Ce sondage n\'existe plus en base de données.', ephemeral: true });
    }
    return false;
  }

  const sessionKey = `${interaction.guildId}:${interaction.user.id}:${sondageId}`;

  // 1. Clic sur "Participer au Sondage"
  if (action === 'sondage_vote') {
    let session = userVoteSessions.get(sessionKey);
    if (!session) {
      session = { ratings: {}, observations: {}, generalRemark: '' };
      userVoteSessions.set(sessionKey, session);
    }

    const payload = buildInteractiveVotePayload(sondage, session);
    await interaction.reply({ ...payload, ephemeral: true });
    return true;
  }

  // 2. Clic sur un bouton d'étoiles/émoji (1 à 5)
  if (action === 'sondage_rate') {
    const secIdx = parseInt(parts[2]);
    const val = parseInt(parts[3]);

    let session = userVoteSessions.get(sessionKey);
    if (!session) {
      session = { ratings: {}, observations: {}, generalRemark: '' };
      userVoteSessions.set(sessionKey, session);
    }

    session.ratings[secIdx] = val;

    const payload = buildInteractiveVotePayload(sondage, session);
    await interaction.update(payload);
    return true;
  }

  // 3. Clic sur "💬 Remarques (Optionnel)" -> Ouvre la modale de texte
  if (action === 'sondage_obs') {
    let sections = [];
    try {
      sections = JSON.parse(sondage.sections || '[]');
    } catch (e) {}
    if (!sections || sections.length === 0) {
      sections = [{ id: 'sec1', label: sondage.title || 'Évaluation', type: 'rating_text' }];
    }

    const modal = new ModalBuilder()
      .setCustomId(`sondage_obs_submit:${sondageId}`)
      .setTitle(`💬 Remarques : ${sondage.title}`.substring(0, 45));

    const rows = [];
    const maxSections = Math.min(sections.length, 4);

    sections.slice(0, maxSections).forEach((sec, idx) => {
      const secType = sec.type || 'rating_text';
      if ((secType === 'text' || secType === 'rating_text') && rows.length < 4) {
        const obsInput = new TextInputBuilder()
          .setCustomId(`obs_sec_${idx}`)
          .setLabel(`Remarques : ${sec.label}`.substring(0, 45))
          .setPlaceholder('Vos observations sur ce point...')
          .setStyle(sondage.text_type === 'court' ? TextInputStyle.Short : TextInputStyle.Paragraph)
          .setRequired(false);

        let session = userVoteSessions.get(sessionKey);
        if (session && session.observations && session.observations[idx]) {
          obsInput.setValue(session.observations[idx]);
        }

        rows.push(new ActionRowBuilder().addComponents(obsInput));
      }
    });

    if (sondage.has_general_remark !== 0 && rows.length < 5) {
      const genInput = new TextInputBuilder()
        .setCustomId('obs_general')
        .setLabel('Remarques Générales'.substring(0, 45))
        .setPlaceholder('Remarques tout en bas pour conclure votre avis...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      let session = userVoteSessions.get(sessionKey);
      if (session && session.generalRemark) {
        genInput.setValue(session.generalRemark);
      }

      rows.push(new ActionRowBuilder().addComponents(genInput));
    }

    modal.addComponents(rows);
    await interaction.showModal(modal);
    return true;
  }

  // 4. Soumission de la modale de remarques
  if (action === 'sondage_obs_submit') {
    await interaction.deferReply({ ephemeral: true }).catch(() => null);

    let session = userVoteSessions.get(sessionKey);
    if (!session) {
      session = { ratings: {}, observations: {}, generalRemark: '' };
      userVoteSessions.set(sessionKey, session);
    }

    let sections = [];
    try {
      sections = JSON.parse(sondage.sections || '[]');
    } catch (e) {}

    sections.forEach((sec, idx) => {
      try {
        const val = interaction.fields.getTextInputValue(`obs_sec_${idx}`);
        if (val) session.observations[idx] = val;
      } catch (e) {}
    });

    try {
      const genVal = interaction.fields.getTextInputValue('obs_general');
      if (genVal) session.generalRemark = genVal;
    } catch (e) {}

    await finalizeSondageSubmission(interaction, sondage, session);
    return true;
  }

  // 5. Clic sur "✅ Valider mon Évaluation"
  if (action === 'sondage_submit') {
    await interaction.deferReply({ ephemeral: true }).catch(() => null);

    let session = userVoteSessions.get(sessionKey);
    if (!session) {
      session = { ratings: {}, observations: {}, generalRemark: '' };
    }

    await finalizeSondageSubmission(interaction, sondage, session);
    return true;
  }

  return false;
}

module.exports = { handleSondageInteraction };
