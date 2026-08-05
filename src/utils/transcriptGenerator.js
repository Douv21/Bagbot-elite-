const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { sendLog } = require('./helpers');

const COLOR_PALETTE = [
  '#3498DB', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6',
  '#E67E22', '#1ABC9C', '#E84393', '#00CEC9', '#FD79A8',
  '#6C5CE7', '#00B894', '#FDCB6E', '#D63031', '#0984E3'
];

/**
 * Génère et envoie un transcript complet HTML & Embed lors de la fermeture d'un ticket.
 */
async function generateAndSendTicketTranscript(channel, closedByMember) {
  try {
    const guild = channel.guild;

    // 1. Récupérer tous les messages du salon par paquets de 100
    let allMessages = [];
    let lastId = null;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const fetched = await channel.messages.fetch(options).catch(() => null);
      if (!fetched || fetched.size === 0) break;

      allMessages.push(...fetched.values());
      lastId = fetched.last().id;
      if (fetched.size < 100) break;
    }

    // Classer par ordre chronologique (du plus ancien au plus récent)
    allMessages.reverse();

    // 2. Assigner une couleur unique par membre participant
    const userColorMap = new Map();
    let colorIdx = 0;

    allMessages.forEach(msg => {
      if (!userColorMap.has(msg.author.id)) {
        userColorMap.set(msg.author.id, COLOR_PALETTE[colorIdx % COLOR_PALETTE.length]);
        colorIdx++;
      }
    });

    // 3. Générer le fichier HTML Dark Mode avec aperçus d'images
    const guildIcon = guild.iconURL({ extension: 'png', size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const dateStr = new Date().toLocaleString('fr-FR');

    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Transcript Ticket - ${channel.name}</title>
<style>
  body { background-color: #1e1f22; color: #dbdee1; font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; }
  .header { background: #2b2d31; padding: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 6px solid #5865F2; display: flex; align-items: center; justify-content: space-between; }
  .header-info h1 { margin: 0 0 8px 0; font-size: 1.5rem; color: #fff; display: flex; align-items: center; gap: 10px; }
  .header-info p { margin: 3px 0; font-size: 0.88rem; color: #949ba4; }
  .header-icon { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
  .messages-container { display: flex; flex-direction: column; gap: 12px; }
  .msg-group { display: flex; gap: 14px; background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.04); }
  .avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .msg-body { flex: 1; min-width: 0; }
  .msg-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
  .username { font-weight: 700; font-size: 0.98rem; }
  .bot-badge { background: #5865F2; color: #fff; font-size: 0.65rem; font-weight: bold; padding: 1px 5px; border-radius: 4px; }
  .timestamp { color: #949ba4; font-size: 0.76rem; }
  .content { font-size: 0.94rem; line-height: 1.45; white-space: pre-wrap; word-break: break-word; color: #e1e3e5; }
  .attachment { margin-top: 10px; }
  .attachment-img { max-width: 450px; max-height: 350px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: block; margin-top: 6px; }
  .attachment-file { display: inline-flex; align-items: center; gap: 8px; background: #2b2d31; padding: 8px 14px; border-radius: 6px; color: #00a8fc; text-decoration: none; font-size: 0.88rem; font-weight: 500; border: 1px solid rgba(0,168,252,0.2); }
  .embed-box { border-left: 4px solid #5865F2; background: #2b2d31; padding: 12px; border-radius: 6px; margin-top: 8px; }
  .embed-title { font-weight: bold; color: #fff; margin-bottom: 4px; font-size: 0.95rem; }
  .embed-desc { font-size: 0.88rem; color: #dbdee1; white-space: pre-wrap; }
  .footer { margin-top: 40px; text-align: center; color: #949ba4; font-size: 0.82rem; border-top: 1px solid #2b2d31; padding-top: 20px; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-info">
      <h1>🎫 Transcript de Ticket : #${channel.name}</h1>
      <p><strong>Serveur :</strong> ${guild.name} (ID: <code>${guild.id}</code>)</p>
      <p><strong>Fermé par :</strong> ${closedByMember ? closedByMember.user.tag : 'Système'} (${closedByMember ? closedByMember.id : ''})</p>
      <p><strong>Messages :</strong> ${allMessages.length} | <strong>Participants distincts :</strong> ${userColorMap.size}</p>
      <p><strong>Généré le :</strong> ${dateStr}</p>
    </div>
    <img class="header-icon" src="${guildIcon}" alt="Logo">
  </div>
  <div class="messages-container">
`;

    allMessages.forEach(msg => {
      const userColor = userColorMap.get(msg.author.id) || '#5865F2';
      const avatarUrl = msg.author.displayAvatarURL({ extension: 'png', size: 64 });
      const timeStr = new Date(msg.createdAt).toLocaleString('fr-FR');

      let attachmentsHtml = '';
      msg.attachments.forEach(att => {
        const isImage = att.contentType && att.contentType.startsWith('image/');
        if (isImage) {
          attachmentsHtml += `<div class="attachment"><a href="${att.url}" target="_blank"><img class="attachment-img" src="${att.url}" alt="${att.name}" /></a></div>`;
        } else {
          attachmentsHtml += `<div class="attachment"><a href="${att.url}" target="_blank" class="attachment-file">📎 ${att.name} (${(att.size / 1024).toFixed(1)} KB)</a></div>`;
        }
      });

      let embedsHtml = '';
      if (msg.embeds && msg.embeds.length > 0) {
        msg.embeds.forEach(emb => {
          if (emb.title || emb.description) {
            const hexColor = emb.hexColor || '#5865F2';
            embedsHtml += `<div class="embed-box" style="border-left-color: ${hexColor};">`;
            if (emb.title) embedsHtml += `<div class="embed-title">${emb.title}</div>`;
            if (emb.description) embedsHtml += `<div class="embed-desc">${emb.description}</div>`;
            embedsHtml += `</div>`;
          }
        });
      }

      const cleanContent = msg.content ? msg.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

      html += `
    <div class="msg-group">
      <img class="avatar" src="${avatarUrl}" alt="Avatar">
      <div class="msg-body">
        <div class="msg-head">
          <span class="username" style="color: ${userColor};">${msg.author.tag}</span>
          ${msg.author.bot ? '<span class="bot-badge">BOT</span>' : ''}
          <span class="timestamp">${timeStr}</span>
        </div>
        ${cleanContent ? `<div class="content">${cleanContent}</div>` : ''}
        ${embedsHtml}
        ${attachmentsHtml}
      </div>
    </div>`;
    });

    html += `
  </div>
  <div class="footer">Transcript interactif généré automatiquement par Bagbot Elite</div>
</body>
</html>`;

    // 4. Créer la pièce jointe `.html`
    const buffer = Buffer.from(html, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.html` });

    // 5. Créer l'embed résumé pour les logs
    const participantsList = Array.from(userColorMap.entries())
      .map(([userId, color]) => `<@${userId}> (Couleur: \`${color}\`)`)
      .join('\n');

    const logEmbed = new EmbedBuilder()
      .setTitle(`📁 Transcript de Ticket Clôturé — #${channel.name}`)
      .setDescription(`Le ticket **#${channel.name}** a été fermé et archivé avec succès.`)
      .addFields(
        { name: '👤 Clôturé par', value: closedByMember ? `<@${closedByMember.id}> (${closedByMember.user.tag})` : 'Système', inline: true },
        { name: '💬 Total Messages', value: `${allMessages.length} messages`, inline: true },
        { name: '👥 Participants', value: participantsList || 'Aucun message', inline: false }
      )
      .setColor('#3498DB')
      .setFooter({ text: `Bagbot Elite • Archives de Tickets` })
      .setTimestamp();

    // 6. Transmettre aux logs via sendLog
    sendLog(guild, 'tickets', logEmbed, { files: [attachment] });

    return { success: true, fileAttachment: attachment, logEmbed };
  } catch (err) {
    console.error('Erreur génération transcript ticket:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { generateAndSendTicketTranscript };
