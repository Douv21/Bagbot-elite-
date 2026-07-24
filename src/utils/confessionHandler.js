const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { db, createPendingConfession, getPendingConfession, updatePendingConfessionMessageId, updatePendingConfessionStatus } = require('../database/db');
const { sendLog } = require('./helpers');

/**
 * Gère la soumission d'une confession (Validation Staff ou Auto-Publication)
 */
async function handleConfessionSubmission({ guild, channel, user, text, confessionConfig, interaction = null }) {
  const guildId = guild.id;
  const targetChannelId = confessionConfig.channel_id;
  const targetChan = guild.channels.cache.get(targetChannelId);

  if (!targetChan) {
    const msg = '❌ Le salon de confession cible est introuvable.';
    if (interaction) return interaction.reply({ content: msg, ephemeral: true });
    return;
  }

  // --- SI VALIDATION STAFF REQUISE ---
  if (confessionConfig.require_validation === 1) {
    const valChanId = confessionConfig.validation_channel_id || targetChannelId;
    const valChan = guild.channels.cache.get(valChanId) || targetChan;

    // Enregistrer en base
    const pendingId = createPendingConfession({
      guild_id: guildId,
      target_channel_id: targetChannelId,
      user_id: user.id,
      user_tag: user.tag || user.username,
      confession_text: text,
      confession_name: confessionConfig.confession_name || '💬 Confession Anonyme',
      use_thread: confessionConfig.use_thread || 0,
      validation_channel_id: valChanId,
      status: 'pending',
      created_at: Date.now()
    });

    // Créer le panneau de validation pour le staff
    const valEmbed = new EmbedBuilder()
      .setTitle(`🕵️ Confession à Valider (#${pendingId})`)
      .setDescription(`**Salon de publication :** <#${targetChannelId}>\n**Auteur (Confidentiel Staff) :** <@${user.id}> (${user.tag || user.username})\n\n**Message de la confession :**\n>>> ${text}`)
      .setColor('#F39C12')
      .setFooter({ text: `Confession #${pendingId} • Modération B&G Elite` })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`conf_approve_${pendingId}`)
        .setLabel('Approuver & Publier')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(`conf_reject_${pendingId}`)
        .setLabel('Rejeter')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    );

    const pingContent = confessionConfig.ping_role_id ? `<@&${confessionConfig.ping_role_id}> 💬 **Nouvelle confession à valider !**` : null;

    const valMsg = await valChan.send({
      content: pingContent,
      embeds: [valEmbed],
      components: [buttons]
    }).catch(console.error);

    if (valMsg) {
      updatePendingConfessionMessageId(pendingId, valMsg.id);
    }

    const replyText = `🤫 *Chuuut... Votre aveu le plus sulfureux a bien été murmuré dans l'ombre...* 💋\n\n**Rassurez-vous, votre identité reste 100% anonyme et secrète.** 🔒\nVotre confession sera révélée dès que l'équipe l'aura savourée et validée ! ✨`;
    if (interaction) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: replyText, ephemeral: true });
      } else {
        await interaction.reply({ content: replyText, ephemeral: true });
      }
    } else if (targetChan) {
      const notify = await targetChan.send(`<@${user.id}> ${replyText}`).catch(() => null);
      if (notify) {
        setTimeout(() => notify.delete().catch(() => {}), 6000);
      }
    }
    return;
  }

  // --- SI PAS DE VALIDATION (AUTO-PUBLICATION DIRECTE) ---
  const embedTitle = confessionConfig.confession_name || '💬 Confession Anonyme';
  const embed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setDescription(text)
    .setColor('#9B59B6')
    .setFooter({ text: 'Pour avouer quelque chose de secret, utilisez /confesser' })
    .setTimestamp();

  const confessionMessage = await targetChan.send({ embeds: [embed] });

  // Si création de fil activée
  if (confessionConfig.use_thread === 1) {
    const thread = await confessionMessage.startThread({
      name: `Commentaires - ${embedTitle.replace(/[^\w\s-]/g, '').trim().slice(0, 15)} #${confessionMessage.id.slice(-4)}`,
      autoArchiveDuration: 1440
    }).catch(() => null);

    if (thread) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('reply_confession_anon')
          .setLabel('Répondre anonymement')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🤫')
      );

      await thread.send({
        content: '💡 Vous pouvez réagir à cette confession publiquement en écrivant un message, ou de manière anonyme en utilisant le bouton ci-dessous :',
        components: [row]
      }).catch(console.error);
    }
  }

  // Log de la confession
  const logEmbed = new EmbedBuilder()
    .setTitle('🤫 Nouvelle Confession Logguée')
    .setDescription(`**Auteur :** <@${user.id}> (${user.tag || user.username})\n**Salon public :** <#${targetChannelId}>\n\n**Confession :**\n${text}`)
    .setColor('#9B59B6')
    .setTimestamp();
  
  sendLog(guild, 'confession', logEmbed);

  const replyText = `💋 *Votre doux secret a été dévoilé dans la nuit...* 🤫\n\n**Votre confession est désormais publiée en restant 100% anonyme et intouchable !** ✨`;
  if (interaction) {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: replyText, ephemeral: true });
    } else {
      await interaction.reply({ content: replyText, ephemeral: true });
    }
  } else if (targetChan) {
    const notify = await targetChan.send(`<@${user.id}> ${replyText}`).catch(() => null);
    if (notify) {
      setTimeout(() => notify.delete().catch(() => {}), 6000);
    }
  }
}

/**
 * Gère l'approbation d'une confession par le staff
 */
async function handleConfessionApproval(interaction, pendingId) {
  const pending = getPendingConfession(pendingId);
  if (!pending) {
    return interaction.reply({ content: '❌ Demande de confession introuvable.', ephemeral: true });
  }

  if (pending.status !== 'pending') {
    return interaction.reply({ content: `❌ Cette confession a déjà été **${pending.status === 'approved' ? 'approuvée' : 'rejetée'}**.`, ephemeral: true });
  }

  // Vérifier permissions staff
  const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
                  interaction.member.permissions.has(PermissionFlagsBits.Administrator);
  if (!isStaff) {
    return interaction.reply({ content: '❌ Vous devez avoir les permissions de gestion des messages pour valider une confession.', ephemeral: true });
  }

  const targetChan = interaction.guild.channels.cache.get(pending.target_channel_id);
  if (!targetChan) {
    return interaction.reply({ content: '❌ Salon de publication cible introuvable.', ephemeral: true });
  }

  // Marquer comme approuvée
  updatePendingConfessionStatus(pendingId, 'approved');

  // Publier la confession
  const embedTitle = pending.confession_name || '💬 Confession Anonyme';
  const embed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setDescription(pending.confession_text)
    .setColor('#9B59B6')
    .setFooter({ text: 'Pour avouer quelque chose de secret, utilisez /confesser' })
    .setTimestamp();

  const confessionMsg = await targetChan.send({ embeds: [embed] });

  // Si thread
  if (pending.use_thread === 1) {
    const thread = await confessionMsg.startThread({
      name: `Commentaires - ${embedTitle.replace(/[^\w\s-]/g, '').trim().slice(0, 15)} #${confessionMsg.id.slice(-4)}`,
      autoArchiveDuration: 1440
    }).catch(() => null);

    if (thread) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('reply_confession_anon')
          .setLabel('Répondre anonymement')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🤫')
      );

      await thread.send({
        content: '💡 Vous pouvez réagir à cette confession publiquement en écrivant un message, ou de manière anonyme en utilisant le bouton ci-dessous :',
        components: [row]
      }).catch(console.error);
    }
  }

  // Mettre à jour l'embed de validation staff
  const valEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setTitle(`✅ Confession #${pendingId} Approuvée & Publiée`)
    .setColor('#2ECC71')
    .setDescription(`${interaction.message.embeds[0].description}\n\n✅ **Statut :** Approuvée par <@${interaction.user.id}> et publiée dans <#${pending.target_channel_id}>.`);

  await interaction.update({
    embeds: [valEmbed],
    components: [] // Supprimer les boutons après action
  }).catch(console.error);

  // Enoyer log
  const logEmbed = new EmbedBuilder()
    .setTitle('✅ Confession Approuvée & Publiée')
    .setDescription(`**Modérateur :** <@${interaction.user.id}>\n**Auteur (Secret) :** <@${pending.user_id}>\n**Salon :** <#${pending.target_channel_id}>\n\n**Confession :**\n${pending.confession_text}`)
    .setColor('#2ECC71')
    .setTimestamp();
  
  sendLog(interaction.guild, 'confession', logEmbed);
}

/**
 * Gère le rejet d'une confession par le staff
 */
async function handleConfessionRejection(interaction, pendingId) {
  const pending = getPendingConfession(pendingId);
  if (!pending) {
    return interaction.reply({ content: '❌ Demande de confession introuvable.', ephemeral: true });
  }

  if (pending.status !== 'pending') {
    return interaction.reply({ content: `❌ Cette confession a déjà été **${pending.status === 'approved' ? 'approuvée' : 'rejetée'}**.`, ephemeral: true });
  }

  // Vérifier permissions staff
  const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
                  interaction.member.permissions.has(PermissionFlagsBits.Administrator);
  if (!isStaff) {
    return interaction.reply({ content: '❌ Vous devez avoir les permissions de gestion des messages pour rejeter une confession.', ephemeral: true });
  }

  // Marquer comme rejetée
  updatePendingConfessionStatus(pendingId, 'rejected');

  // Mettre à jour l'embed staff
  const valEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setTitle(`❌ Confession #${pendingId} Rejetée`)
    .setColor('#E74C3C')
    .setDescription(`${interaction.message.embeds[0].description}\n\n❌ **Statut :** Rejetée par <@${interaction.user.id}>.`);

  await interaction.update({
    embeds: [valEmbed],
    components: [] // Supprimer les boutons
  }).catch(console.error);

  // Log
  const logEmbed = new EmbedBuilder()
    .setTitle('❌ Confession Rejetée')
    .setDescription(`**Modérateur :** <@${interaction.user.id}>\n**Auteur (Secret) :** <@${pending.user_id}>\n\n**Confession refusée :**\n${pending.confession_text}`)
    .setColor('#E74C3C')
    .setTimestamp();
  
  sendLog(interaction.guild, 'confession', logEmbed);
}

module.exports = {
  handleConfessionSubmission,
  handleConfessionApproval,
  handleConfessionRejection
};
