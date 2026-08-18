const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionGifs, getActionGifsAnyGuild } = require('../database/db');
const { generateAiActionPhrase } = require('./aiActionHelper');
const { formatGenderMessage, getMemberGender } = require('./genderHelper');
const fs = require('fs');
const path = require('path');

// Default fallback online GIF URLs for actions (used if DB has no GIF or local upload is missing)
const DEFAULT_ACTION_GIFS = {
  'fuck': [
    'https://media.giphy.com/media/l0HlTLQTL34XA93P2/giphy.gif',
    'https://media.giphy.com/media/3o7TKrEzvLbsVAud8I/giphy.gif'
  ],
  '69': [
    'https://cdn.porngifs.com/img/38853',
    'https://media.giphy.com/media/3o7TKT062Z6F6F6K3e/giphy.gif'
  ],
  'calin': [
    'https://media.giphy.com/media/lrr975iy382SiM356h/giphy.gif',
    'https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif'
  ],
  'embrasser': [
    'https://media.giphy.com/media/G3va39rn8E4A8/giphy.gif',
    'https://media.giphy.com/media/FqZTgUKZRxvK8/giphy.gif'
  ],
  'gifle': [
    'https://media0.giphy.com/media/v1.Y2lkPTZjMDliOTUybjdxMWFxMG9xYWVhOGNzc2h0eWo4MzJxM2tyeDkzMjFlejluMjhrbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/srD8JByP9u3zW/giphy.gif',
    'https://media2.giphy.com/media/v1.Y2lkPTZjMDliUyhkc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2Zhc2F2ZWJ1bS8xMDAvOTM2Nzk4MzQzMDA0NzIwOTEw.gif'
  ],
  'caresser': [
    'https://media.giphy.com/media/PHiwq00v25V5EV5E1m/giphy.gif',
    'https://media.giphy.com/media/10816j5p0Vf6yQ/giphy.gif'
  ],
  'sucer': [
    'https://media.giphy.com/media/10916j5p0Vf6yQ/giphy.gif',
    'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif'
  ],
  'sodo': [
    'https://cdn.discordapp.com/attachments/1440419937314144476/1470538928045031654/image0.gif'
  ],
  'branler': [
    'https://media.giphy.com/media/3o7TKT062Z6F6F6K3e/giphy.gif'
  ],
  'doigter': [
    'https://media.giphy.com/media/3o7TKW5I2iM0W1S6lG/giphy.gif'
  ],
  'deshabiller': [
    'https://media.giphy.com/media/l0HlU0N33d8G3v6g0/giphy.gif'
  ],
  'mordre': [
    'https://media.giphy.com/media/qA9BwP0wU0jQ4/giphy.gif'
  ],
  'masser': [
    'https://media.giphy.com/media/3o7TKU8RvQuomFfUUU/giphy.gif'
  ],
  'danser': [
    'https://media.giphy.com/media/10hO3rDNqqg2Xe/giphy.gif'
  ],
  'dormir': [
    'https://media.giphy.com/media/v2YxCO2fP8b84/giphy.gif'
  ],
  'douche': [
    'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif'
  ]
};

const GENERIC_FALLBACK_GIFS = [
  'https://media.giphy.com/media/lrr975iy382SiM356h/giphy.gif',
  'https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif'
];

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
            const other = fullChannel.recipients.find(r => r.id !== userId);
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
 * Gets a valid GIF URL for the specified action (checks DB first, verifies local disk existence, then defaults)
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

  // Filter valid URLs
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

  // Fallback to default online GIFs
  const defaults = DEFAULT_ACTION_GIFS[actionName] || GENERIC_FALLBACK_GIFS;
  return defaults[Math.floor(Math.random() * defaults.length)];
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
