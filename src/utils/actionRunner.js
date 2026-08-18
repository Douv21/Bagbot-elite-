const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionGifs, getActionGifsAnyGuild } = require('../database/db');
const { generateAiActionPhrase } = require('./aiActionHelper');
const { formatGenderMessage, getMemberGender } = require('./genderHelper');
const fs = require('fs');
const path = require('path');

/**
 * Resolves target user for DM and Guild contexts.
 * In DM, if NO target is selected, automatically targets the OTHER member in the DM channel!
 */
async function resolveTarget(interaction) {
  let target = interaction.options.getUser('cible');
  if (target) return target;

  const userId = interaction.user.id;

  // In DM context: find the other person in the DM channel automatically
  if (!interaction.guild && interaction.channel) {
    try {
      const channel = interaction.channel;
      // 1. Direct recipient on channel
      if (channel.recipient && channel.recipient.id !== userId) {
        return channel.recipient;
      }
      // 2. Recipients collection (Group DM or DM)
      if (channel.recipients && channel.recipients.size > 0) {
        const other = channel.recipients.find(r => r.id !== userId);
        if (other) return other;
      }
      // 3. Recipient ID property
      if (channel.recipientId && channel.recipientId !== userId) {
        const fetchedUser = await interaction.client.users.fetch(channel.recipientId).catch(() => null);
        if (fetchedUser) return fetchedUser;
      }
      // 4. Partial channel fetch
      if (channel.partial || !channel.recipient) {
        const fullChannel = await channel.fetch().catch(() => null);
        if (fullChannel) {
          if (fullChannel.recipient && fullChannel.recipient.id !== userId) {
            return fullChannel.recipient;
          }
          if (fullChannel.recipients) {
            const other = fullChannel.recipients.find(u => u.id !== userId);
            if (other) return other;
          }
        }
      }
    } catch (e) {
      console.warn('[ActionRunner] Target DM resolution error:', e.message);
    }
  }

  return interaction.user;
}

/**
 * Gets a valid custom GIF URL for the specified action.
 * ONLY returns GIFs configured in the database for the guild (or any guild in MP).
 * If NO custom GIF is configured, returns null (NO GIF will be displayed).
 */
function getValidActionGifUrl(guildId, actionName) {
  let gifs = [];
  try {
    if (guildId) {
      gifs = getActionGifs(guildId, actionName);
    } else {
      gifs = getActionGifsAnyGuild(actionName);
    }
  } catch (e) {}

  // Filter valid URLs (HTTP/HTTPS or existing local upload)
  const valid = [];
  if (gifs && gifs.length > 0) {
    for (const g of gifs) {
      if (!g || !g.gif_url) continue;
      const url = g.gif_url.trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        valid.push(url);
      } else if (url.startsWith('/uploads/')) {
        const absPath1 = path.join(__dirname, '../public', url);
        const absPath2 = path.join(__dirname, '../../public', url);
        if (fs.existsSync(absPath1) || fs.existsSync(absPath2)) {
          valid.push(url);
        }
      }
    }
  }

  if (valid.length > 0) {
    return valid[Math.floor(Math.random() * valid.length)];
  }

  // If no custom GIF is configured on the server (or DB in MP), return null (no GIF displayed)
  return null;
}

/**
 * Executes AI generation with a strict 1.2s timeout to ensure maximum speed.
 */
async function generateAiActionPhraseFast(actionName, actionDescription, authorMember, targetMember, isSfwOverride = null) {
  try {
    const aiPromise = generateAiActionPhrase(actionName, actionDescription, authorMember, targetMember, isSfwOverride);
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1200));
    return await Promise.race([aiPromise, timeoutPromise]);
  } catch (e) {
    return null;
  }
}

module.exports = {
  resolveTarget,
  getValidActionGifUrl,
  generateAiActionPhraseFast
};
