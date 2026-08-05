const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { getSondage, saveSondageResponse, getSondageResponses, db } = require('../database/db');

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
      sections = [{ id: 'sec1', label: sondage.title || 'Évaluation' }];
    }

    const modal = new ModalBuilder()
      .setCustomId(`sondage_modal:${sondageId}`)
      .setTitle(`📊 ${sondage.title}`.substring(0, 45));

    const rows = [];

    // Limite de 5 champs max par modal Discord
    sections.slice(0, 2).forEach((sec, idx) => {
      const ratingInput = new TextInputBuilder()
        .setCustomId(`rating_sec_${idx}`)
        .setLabel(`Note 1 à 5 : ${sec.label}`.substring(0, 45))
        .setPlaceholder('Entrez un chiffre de 1 à 5 (ex: 5)')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(1)
        .setRequired(true);

      const obsInput = new TextInputBuilder()
        .setCustomId(`obs_sec_${idx}`)
        .setLabel(`Remarques : ${sec.label}`.substring(0, 45))
        .setPlaceholder('Vos observations sur cette partie...')
        .setStyle(sondage.text_type === 'court' ? TextInputStyle.Short : TextInputStyle.Paragraph)
        .setRequired(false);

      rows.push(new ActionRowBuilder().addComponents(ratingInput));
      rows.push(new ActionRowBuilder().addComponents(obsInput));
    });

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
    await interaction.showModal(modal);
    return true;
  }

  // 2. Soumission du Formulaire d'Évaluation (Modal Submit)
  if (interaction.isModalSubmit() && customId.startsWith('sondage_modal:')) {
    const sondageId = customId.replace('sondage_modal:', '');
    const sondage = getSondage(sondageId);
    if (!sondage) {
      return interaction.reply({ content: '❌ Sondage introuvable.', ephemeral: true });
    }

    let sections = [];
    try {
      sections = JSON.parse(sondage.sections || '[]');
    } catch (e) {}
    if (!sections || sections.length === 0) {
      sections = [{ id: 'sec1', label: sondage.title || 'Évaluation' }];
    }

    const sectionScores = [];
    let totalScore = 0;
    let validScoresCount = 0;

    sections.slice(0, 2).forEach((sec, idx) => {
      const ratingStr = interaction.fields.getTextInputValue(`rating_sec_${idx}`) || '5';
      const obsStr = interaction.fields.getTextInputValue(`obs_sec_${idx}`) || '';

      let score = parseInt(ratingStr.trim());
      if (isNaN(score) || score < 1) score = 1;
      if (score > 5) score = 5;

      sectionScores.push({
        label: sec.label,
        rating: score,
        observation: obsStr.trim()
      });

      totalScore += score;
      validScoresCount++;
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
        const ficheEmbed = new EmbedBuilder()
          .setTitle(`📝 Nouvelle Fiche d'Évaluation — ${sondage.title}`)
          .setDescription(`Évaluation soumise par <@${interaction.user.id}> (${interaction.user.tag})`)
          .setColor(sondage.color || '#F1C40F')
          .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 64 }))
          .setTimestamp();

        sectionScores.forEach(sec => {
          ficheEmbed.addFields({
            name: `🔹 ${sec.label} — ${sec.rating}/5 ${icon}`,
            value: sec.observation ? `*Remarques/Observations :*\n"${sec.observation}"` : '*Aucune observation spécifique.*',
            inline: false
          });
        });

        if (generalRemark.trim()) {
          ficheEmbed.addFields({
            name: `📌 Remarques & Suggestions Générales (Tout en bas)`,
            value: `"${generalRemark.trim()}"`,
            inline: false
          });
        }

        await resultsChannel.send({ embeds: [ficheEmbed] }).catch(console.error);
      }
    }

    await interaction.reply({ content: '✅ **Votre fiche d\'évaluation a été transmise avec succès ! Merci pour votre retour.**', ephemeral: true });
    return true;
  }

  return false;
}

module.exports = { handleSondageInteraction };
