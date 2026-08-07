const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getSondage, saveSondageResponse, getSondageResponses } = require('../database/db');

// Map de stockage temporaire des sessions de formulaire : key = `${guildId}:${userId}:${sondageId}`
const userVoteSessions = new Map();

function getStarRatingStr(score, ratingIcon = '⭐') {
  const num = parseInt(score);
  if (!isNaN(num) && num >= 1 && num <= 5) {
    const stars = ratingIcon.repeat(num);
    return stars || `${num}`;
  }
  return score;
}

function getSections(sondage) {
  let sections = [];
  try {
    sections = JSON.parse(sondage.sections || '[]');
  } catch (e) {}
  if (!sections || sections.length === 0) {
    sections = [{ id: 'sec1', label: sondage.title || 'Évaluation', type: 'rating_text' }];
  }
  return sections;
}

function buildWizardStepPayload(sondage, session, stepIdx) {
  const sections = getSections(sondage);
  const currentSec = sections[stepIdx];
  const icon = sondage.rating_icon || '⭐';
  const totalSteps = sections.length;

  const ratingVal = session.ratings[stepIdx] || 0;
  const obsVal = session.observations[stepIdx] || '';

  const secType = currentSec.type || 'rating_text';

  let descStr = `**📌 Question ${stepIdx + 1} / ${totalSteps}**\n\n`;
  descStr += `### 🔹 ${currentSec.label}\n\n`;

  if (secType === 'rating' || secType === 'rating_text') {
    descStr += `**Vote par émoji :** ${ratingVal > 0 ? `${icon.repeat(ratingVal)} (**${ratingVal} / 5**)` : `*Veuillez cliquer sur un émoji ci-dessous*`}\n\n`;
  }
  if (secType === 'text' || secType === 'rating_text') {
    descStr += `**Observation ci-dessous :** ${obsVal ? `\n> *"Messsage: ${obsVal}"*` : '\n*Aucune observation ajoutée (Optionnel)*'}\n`;
  }

  const rows = [];

  // ActionRow 1: Boutons d'émojis 1 à 5
  if (secType === 'rating' || secType === 'rating_text') {
    const emojiRow = new ActionRowBuilder();
    for (let val = 1; val <= 5; val++) {
      const isSelected = ratingVal === val;
      const btn = new ButtonBuilder()
        .setCustomId(`sondage_step_rate:${sondage.id}:${stepIdx}:${val}`)
        .setLabel(`${val}`)
        .setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Secondary);

      if (icon && !icon.includes('<') && !icon.includes(':')) {
        try { btn.setEmoji(icon); } catch (e) {}
      }
      emojiRow.addComponents(btn);
    }
    rows.push(emojiRow);
  }

  // ActionRow 2: Navigation & Observation
  const navRow = new ActionRowBuilder();

  if (secType === 'text' || secType === 'rating_text') {
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`sondage_step_obs:${sondage.id}:${stepIdx}`)
        .setLabel(obsVal ? '✏️ Éditer l\'observation' : '💬 Ajouter une observation')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (stepIdx > 0) {
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`sondage_step_nav:${sondage.id}:${stepIdx - 1}`)
        .setLabel('⬅️ Précédent')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (stepIdx < totalSteps - 1) {
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`sondage_step_nav:${sondage.id}:${stepIdx + 1}`)
        .setLabel('Question Suivante ➡️')
        .setStyle(ButtonStyle.Success)
    );
  } else {
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`sondage_step_nav:${sondage.id}:summary`)
        .setLabel('Récapitulatif & Validation 📋')
        .setStyle(ButtonStyle.Success)
    );
  }

  rows.push(navRow);

  const embed = new EmbedBuilder()
    .setTitle(`📋 ${sondage.title}`)
    .setDescription(descStr)
    .setColor(sondage.color || '#F1C40F')
    .setFooter({ text: `Bagbot Elite • Étape ${stepIdx + 1} sur ${totalSteps}` });

  return { embeds: [embed], components: rows };
}

function buildWizardSummaryPayload(sondage, session) {
  const sections = getSections(sondage);
  const icon = sondage.rating_icon || '⭐';

  let descStr = `**📋 Récapitulatif de votre Évaluation :**\n\n`;

  sections.forEach((sec, idx) => {
    const score = session.ratings[idx] || 5;
    const obs = session.observations[idx] || '';
    descStr += `**${idx + 1}. ${sec.label}**\n`;
    if (sec.type !== 'text') {
      descStr += `• Note : ${icon.repeat(score)} (${score}/5)\n`;
    }
    if (obs) {
      descStr += `• Observation : *"${obs}"*\n`;
    }
    descStr += `\n`;
  });

  if (sondage.has_general_remark !== 0) {
    const gen = session.generalRemark || '';
    descStr += `**📌 Remarques Générales :** ${gen ? `*"${gen}"*` : '*Aucune (Optionnel)*'}\n\n`;
  }

  descStr += `*Si tout vous convient, cliquez sur **"✅ Transmettre mon Évaluation"** ci-dessous !*`;

  const rows = [];

  const navRow = new ActionRowBuilder();
  navRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`sondage_step_nav:${sondage.id}:${sections.length - 1}`)
      .setLabel('⬅️ Modifier des notes')
      .setStyle(ButtonStyle.Secondary)
  );

  if (sondage.has_general_remark !== 0) {
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`sondage_gen_modal:${sondage.id}`)
        .setLabel(session.generalRemark ? '✏️ Remarques Générales' : '💬 Remarques Générales')
        .setStyle(ButtonStyle.Primary)
    );
  }

  navRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`sondage_submit_final:${sondage.id}`)
      .setLabel('✅ Transmettre mon Évaluation')
      .setStyle(ButtonStyle.Success)
  );

  rows.push(navRow);

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${sondage.title} — Validation`)
    .setDescription(descStr)
    .setColor(sondage.color || '#2ECC71')
    .setFooter({ text: 'Vérifiez vos réponses et validez votre envoi' });

  return { embeds: [embed], components: rows };
}

async function finalizeSondageSubmission(interaction, sondage, session) {
  const sections = getSections(sondage);
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
    let session = { currentStep: 0, ratings: {}, observations: {}, generalRemark: '' };
    userVoteSessions.set(sessionKey, session);

    const payload = buildWizardStepPayload(sondage, session, 0);
    await interaction.reply({ ...payload, ephemeral: true });
    return true;
  }

  // 2. Clic sur un bouton d'étoiles (1 à 5)
  if (action === 'sondage_step_rate') {
    const stepIdx = parseInt(parts[2]);
    const val = parseInt(parts[3]);

    let session = userVoteSessions.get(sessionKey);
    if (!session) {
      session = { currentStep: stepIdx, ratings: {}, observations: {}, generalRemark: '' };
      userVoteSessions.set(sessionKey, session);
    }

    session.ratings[stepIdx] = val;
    const payload = buildWizardStepPayload(sondage, session, stepIdx);
    await interaction.update(payload);
    return true;
  }

  // 3. Navigation entre questions (Suivant, Précédent, Summary)
  if (action === 'sondage_step_nav') {
    const target = parts[2];
    let session = userVoteSessions.get(sessionKey);
    if (!session) {
      session = { currentStep: 0, ratings: {}, observations: {}, generalRemark: '' };
      userVoteSessions.set(sessionKey, session);
    }

    if (target === 'summary') {
      const payload = buildWizardSummaryPayload(sondage, session);
      await interaction.update(payload);
    } else {
      const stepIdx = parseInt(target);
      session.currentStep = stepIdx;
      const payload = buildWizardStepPayload(sondage, session, stepIdx);
      await interaction.update(payload);
    }
    return true;
  }

  // 4. Clic sur "💬 Ajouter/Éditer Remarque" -> Ouvre la modale pour cette question
  if (action === 'sondage_step_obs') {
    const stepIdx = parseInt(parts[2]);
    const sections = getSections(sondage);
    const sec = sections[stepIdx];

    const modal = new ModalBuilder()
      .setCustomId(`sondage_step_obs_submit:${sondageId}:${stepIdx}`)
      .setTitle(`💬 Remarque : ${sec.label}`.substring(0, 45));

    const obsInput = new TextInputBuilder()
      .setCustomId('step_obs_val')
      .setLabel(`Vos observations (${sec.label})`.substring(0, 45))
      .setPlaceholder('Rédigez vos remarques sur ce point...')
      .setStyle(sondage.text_type === 'court' ? TextInputStyle.Short : TextInputStyle.Paragraph)
      .setRequired(false);

    let session = userVoteSessions.get(sessionKey);
    if (session && session.observations && session.observations[stepIdx]) {
      obsInput.setValue(session.observations[stepIdx]);
    }

    modal.addComponents(new ActionRowBuilder().addComponents(obsInput));
    await interaction.showModal(modal);
    return true;
  }

  // 5. Soumission de la modale de remarque d'une étape
  if (action === 'sondage_step_obs_submit') {
    let session = userVoteSessions.get(sessionKey);
    const stepIdx = parseInt(parts[2]);
    if (!session) {
      session = { currentStep: stepIdx, ratings: {}, observations: {}, generalRemark: '' };
      userVoteSessions.set(sessionKey, session);
    }

    let obsVal = '';
    try {
      obsVal = interaction.fields.getTextInputValue('step_obs_val') || '';
    } catch (e) {}

    session.observations[stepIdx] = obsVal.trim();

    const payload = buildWizardStepPayload(sondage, session, stepIdx);
    await interaction.reply({ ...payload, ephemeral: true }).catch(() => {
      return interaction.followUp({ ...payload, ephemeral: true });
    });
    return true;
  }

  // 6. Clic sur "Remarques Générales" sur le récapitulatif
  if (action === 'sondage_gen_modal') {
    const modal = new ModalBuilder()
      .setCustomId(`sondage_gen_submit:${sondageId}`)
      .setTitle(`📌 Remarques Générales`.substring(0, 45));

    const genInput = new TextInputBuilder()
      .setCustomId('gen_obs_val')
      .setLabel('Remarques & Suggestions Générales'.substring(0, 45))
      .setPlaceholder('Remarques tout en bas pour conclure votre avis...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    let session = userVoteSessions.get(sessionKey);
    if (session && session.generalRemark) {
      genInput.setValue(session.generalRemark);
    }

    modal.addComponents(new ActionRowBuilder().addComponents(genInput));
    await interaction.showModal(modal);
    return true;
  }

  // 7. Soumission des Remarques Générales
  if (action === 'sondage_gen_submit') {
    let session = userVoteSessions.get(sessionKey);
    if (!session) {
      session = { currentStep: 0, ratings: {}, observations: {}, generalRemark: '' };
      userVoteSessions.set(sessionKey, session);
    }

    let genVal = '';
    try {
      genVal = interaction.fields.getTextInputValue('gen_obs_val') || '';
    } catch (e) {}

    session.generalRemark = genVal.trim();

    const payload = buildWizardSummaryPayload(sondage, session);
    await interaction.reply({ ...payload, ephemeral: true }).catch(() => {
      return interaction.followUp({ ...payload, ephemeral: true });
    });
    return true;
  }

  // 8. Validation finale du formulaire
  if (action === 'sondage_submit_final') {
    await interaction.deferReply({ ephemeral: true }).catch(() => null);

    let session = userVoteSessions.get(sessionKey);
    if (!session) {
      session = { currentStep: 0, ratings: {}, observations: {}, generalRemark: '' };
    }

    await finalizeSondageSubmission(interaction, sondage, session);
    return true;
  }

  return false;
}

module.exports = { handleSondageInteraction };
