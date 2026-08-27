require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initDatabase } = require('./database/db');
const { sendLog } = require('./utils/helpers');

// Initialiser la base de données
initDatabase();

// Créer le client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildInvites
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

client.commands = new Collection();

// Charger les commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.existsSync(commandsPath) ? fs.readdirSync(commandsPath) : [];
const commandsJSON = [];

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      command.category = folder;
      client.commands.set(command.data.name, command);
      commandsJSON.push(command.data.toJSON());
    } else {
      console.log(`[AVERTISSEMENT] La commande à ${filePath} manque de propriétés "data" ou "execute" requises.`);
    }
  }
}

// Fonctions d'assistance globales pour les Tags et Membres
async function getOfficialGuildTag(g) {
  if (!g) return '';

  if (g.clan && g.clan.tag) return g.clan.tag.trim();
  if (g.rawClan && g.rawClan.tag) return g.rawClan.tag.trim();
  if (g.clanTag) return g.clanTag.trim();

  // Interroger l'API REST Discord officielle /guilds/{guild_id} pour récupérer la propriété "clan.tag"
  try {
    const rawGuild = await g.client.rest.get(Routes.guild(g.id)).catch(() => null);
    if (rawGuild) {
      if (rawGuild.clan && rawGuild.clan.tag) return rawGuild.clan.tag.trim();
      if (rawGuild.clan_tag) return rawGuild.clan_tag.trim();
    }
  } catch (e) {}

  if (g.name) {
    const matchBracket = g.name.match(/[\[\(\{\<]([^\(\)\[\]\{\}\>]+)[\]\)\}\>]/);
    if (matchBracket && matchBracket[1] && matchBracket[1].trim().length > 0) return matchBracket[1].trim();
    if (g.name.includes('|')) {
      const p = g.name.split('|')[0].trim();
      if (p.length > 0 && p.length < 15) return p;
    }
    if (g.name.includes('•')) {
      const p = g.name.split('•')[0].trim();
      if (p.length > 0 && p.length < 15) return p;
    }
    if (g.name.includes(' - ')) {
      const p = g.name.split(' - ')[0].trim();
      if (p.length > 0 && p.length < 15) return p;
    }
    if (g.vanityURLCode) return g.vanityURLCode.trim();
  }

  return '';
}

function getGuildTag(g) {
  if (!g) return '';
  if (g.clan && g.clan.tag) return g.clan.tag.trim();
  if (g.rawClan && g.rawClan.tag) return g.rawClan.tag.trim();
  if (g.clanTag) return g.clanTag.trim();
  if (g.name) {
    const matchBracket = g.name.match(/[\[\(\{\<]([^\(\)\[\]\{\}\>]+)[\]\)\}\>]/);
    if (matchBracket && matchBracket[1] && matchBracket[1].trim().length > 0) return matchBracket[1].trim();
    if (g.name.includes('|')) {
      const p = g.name.split('|')[0].trim();
      if (p.length > 0 && p.length < 15) return p;
    }
    if (g.name.includes('•')) {
      const p = g.name.split('•')[0].trim();
      if (p.length > 0 && p.length < 15) return p;
    }
    if (g.name.includes(' - ')) {
      const p = g.name.split(' - ')[0].trim();
      if (p.length > 0 && p.length < 15) return p;
    }
    if (g.vanityURLCode) return g.vanityURLCode.trim();
  }
  return '';
}

function normalizeStr(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function hasMemberTag(m, tagStr) {
  if (!m || !tagStr) return false;
  const cleanTag = (tagStr || '').trim().toLowerCase();
  if (!cleanTag) return false;

  const nick = (m.nickname || '').toLowerCase();
  const display = (m.displayName || '').toLowerCase();
  const uname = (m.user?.username || '').toLowerCase();
  const gname = (m.user?.globalName || '').toLowerCase();

  const userClanTag = (
    m.user?.clan?.tag ||
    m.clan?.tag ||
    m.user?.primary_guild?.tag ||
    m.user?.primaryGuild?.tag ||
    m.rawUser?.primary_guild?.tag ||
    m.rawUser?.clan?.tag ||
    ''
  ).toLowerCase();

  // 1. Détection directe (.includes exact)
  if (nick.includes(cleanTag) ||
      display.includes(cleanTag) ||
      uname.includes(cleanTag) ||
      gname.includes(cleanTag) ||
      userClanTag.includes(cleanTag) ||
      userClanTag === cleanTag) {
    return true;
  }

  // 2. Détection sans accents/majuscules
  const normTag = normalizeStr(cleanTag);
  if (normTag.length > 0) {
    if (normalizeStr(nick).includes(normTag) ||
        normalizeStr(display).includes(normTag) ||
        normalizeStr(uname).includes(normTag) ||
        normalizeStr(gname).includes(normTag) ||
        normalizeStr(userClanTag).includes(normTag)) {
      return true;
    }
  }

  // 3. Détection alphanumérique (sans symboles)
  const alphaTag = normTag.replace(/[^a-z0-9]/g, '');
  if (alphaTag.length > 0) {
    const cleanAlpha = (s) => normalizeStr(s).replace(/[^a-z0-9]/g, '');
    return cleanAlpha(nick).includes(alphaTag) ||
           cleanAlpha(display).includes(alphaTag) ||
           cleanAlpha(uname).includes(alphaTag) ||
           cleanAlpha(gname).includes(alphaTag) ||
           cleanAlpha(userClanTag).includes(alphaTag);
  }

  return false;
}

// Charger les événements
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.existsSync(eventsPath) ? fs.readdirSync(eventsPath).filter(file => file.endsWith('.js')) : [];

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Initialiser le cache des invitations et enregistrer les commandes Slash au démarrage
client.once('ready', async () => {
  console.log(`[BOT] Connecté en tant que ${client.user.tag} (ID: ${client.user.id})`);

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log(`[SLASH COMMANDS] Enregistrement de ${commandsJSON.length} commandes auprès de l'API Discord...`);
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandsJSON }
    );
    console.log(`[SLASH COMMANDS] ${commandsJSON.length} commandes enregistrées avec succès !`);
  } catch (err) {
    console.error('[SLASH COMMANDS] Erreur lors de l\'enregistrement des commandes:', err);
  }

  const { initInviteCache } = require('./utils/inviteTracker');
  initInviteCache(client).catch(console.error);

  // Synchronisation des profils du bot par serveur (restauration logo Portail Développeur sur serveurs non configurés)
  try {
    const { db } = require('./database/db');
    const { updateGuildBotProfileOnDiscord } = require('./utils/helpers');

    const configuredRows = db.prepare('SELECT guild_id, custom_logo_url, custom_name FROM server_bot_profile').all() || [];
    const configuredMap = new Map();
    configuredRows.forEach(row => {
      configuredMap.set(row.guild_id, row);
    });

    for (const [guildId, guild] of client.guilds.cache) {
      const config = configuredMap.get(guildId);
      if (config && (config.custom_logo_url || config.custom_name)) {
        await updateGuildBotProfileOnDiscord(client, guildId, config.custom_name, config.custom_logo_url).catch(() => null);
      } else {
        // Enlever l'avatar de membre spécifique pour remettre l'avatar par défaut du Portail Développeur Discord
        await updateGuildBotProfileOnDiscord(client, guildId, null, null).catch(() => null);
      }
    }
    console.log('[BOT PROFILE] Synchronisation des profils de bot par serveur effectuée avec succès !');
  } catch (syncErr) {
    console.error('[BOT PROFILE] Erreur synchro profils:', syncErr.message);
  }
});

client.on('inviteCreate', invite => {
  const { refreshGuildInvites } = require('./utils/inviteTracker');
  refreshGuildInvites(invite.guild).catch(console.error);
});

client.on('inviteDelete', invite => {
  const { refreshGuildInvites } = require('./utils/inviteTracker');
  refreshGuildInvites(invite.guild).catch(console.error);
});

// Helper pour l'attribution des rôles réaction selon le mode
const handleRoleModeAssignment = async (interaction, roleId, messageId) => {
  const { db } = require('./database/db');
  const member = interaction.member;
  const guild = interaction.guild;
  const botMember = guild.members.me;

  if (typeof roleId === 'string' && roleId.startsWith('opt_')) {
    const optIdx = parseInt(roleId.replace('opt_', ''), 10);
    const dbOpts = db.prepare('SELECT role_id FROM autorole_options WHERE message_id = ?').all(messageId);
    if (dbOpts && dbOpts[optIdx] && dbOpts[optIdx].role_id) {
      roleId = dbOpts[optIdx].role_id;
    }
  }

  const rawIds = Array.isArray(roleId) 
    ? roleId 
    : String(roleId || '').split(',').map(s => s.trim()).filter(Boolean);

  const cleanRoleIds = rawIds.map(id => {
    const m = id.match(/\d{17,20}/);
    return m ? m[0] : id;
  }).filter(Boolean).slice(0, 20);

  if (cleanRoleIds.length === 0) {
    return interaction.editReply({ content: '❌ Aucun rôle valide configuré pour cette option.' });
  }

  const validRoles = [];

  for (const rId of cleanRoleIds) {
    const role = guild.roles.cache.get(rId);
    if (!role) continue;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({ content: `❌ Je n'ai pas les permissions suffisantes pour gérer le rôle **${role.name}** (position trop élevée).` });
    }
    validRoles.push(role);
  }

  if (validRoles.length === 0) {
    return interaction.editReply({ content: '❌ Aucun des rôles configurés n\'existe plus sur ce serveur.' });
  }

  const embedRule = db.prepare('SELECT mode FROM autorole_embeds WHERE message_id = ?').get(messageId);
  const mode = embedRule ? embedRule.mode : 'normal';

  try {
    const validIds = validRoles.map(r => r.id);
    const validNames = validRoles.map(r => `**${r.name}**`).join(', ');

    if (mode === 'unique') {
      const allConfiguredRoleIds = new Set();
      
      const allOptions = db.prepare('SELECT role_id FROM autorole_options WHERE message_id = ?').all(messageId);
      allOptions.forEach(o => {
        String(o.role_id || '').split(',').forEach(id => {
          const m = id.trim().match(/\d{17,20}/);
          if (m) allConfiguredRoleIds.add(m[0]);
        });
      });

      const embedRecord = db.prepare('SELECT selectors_json FROM autorole_embeds WHERE message_id = ?').get(messageId);
      if (embedRecord && embedRecord.selectors_json) {
        try {
          const parsedSel = JSON.parse(embedRecord.selectors_json);
          if (Array.isArray(parsedSel)) {
            parsedSel.forEach(s => {
              if (s.options && Array.isArray(s.options)) {
                s.options.forEach(opt => {
                  String(opt.role_id || '').split(',').forEach(id => {
                    const m = id.trim().match(/\d{17,20}/);
                    if (m) allConfiguredRoleIds.add(m[0]);
                  });
                });
              }
            });
          }
        } catch (e) {}
      }

      const rolesToRemove = Array.from(allConfiguredRoleIds).filter(rId => !validIds.includes(rId) && member.roles.cache.has(rId));
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove).catch(() => null);
      }

      const rolesToAdd = validIds.filter(rId => !member.roles.cache.has(rId));
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd);
        return interaction.editReply({ content: `✅ Rôle(s) ${validNames} attribué(s) (les autres rôles de ce menu ont été retirés).` });
      } else {
        return interaction.editReply({ content: `Vous possédez déjà le(s) rôle(s) ${validNames}.` });
      }
    }

    if (mode === 'verify') { // définitif
      const rolesToAdd = validIds.filter(rId => !member.roles.cache.has(rId));
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd);
        return interaction.editReply({ content: `✅ Rôle(s) ${validNames} vous a/ont été attribué(s) définitivement.` });
      } else {
        return interaction.editReply({ content: `Vous possédez déjà le(s) rôle(s) ${validNames} (mode définitif).` });
      }
    }

    if (mode === 'add') { // Ajout uniquement
      const rolesToAdd = validIds.filter(rId => !member.roles.cache.has(rId));
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd);
        return interaction.editReply({ content: `✅ Rôle(s) ${validNames} vous a/ont été attribué(s).` });
      } else {
        return interaction.editReply({ content: `Vous possédez déjà le(s) rôle(s) ${validNames}.` });
      }
    }

    if (mode === 'reversed' || mode === 'remove') { // Retrait uniquement
      const rolesToRemove = validIds.filter(rId => member.roles.cache.has(rId));
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove);
        return interaction.editReply({ content: `✅ Rôle(s) ${validNames} vous a/ont été retiré(s).` });
      } else {
        return interaction.editReply({ content: `Vous ne possédez pas le(s) rôle(s) ${validNames}.` });
      }
    }

    // Mode normal (Classique / Bascule)
    const hasAll = validIds.every(rId => member.roles.cache.has(rId));
    if (hasAll) {
      await member.roles.remove(validIds);
      return interaction.editReply({ content: `✅ Le(s) rôle(s) ${validNames} vous a/ont été retiré(s).` });
    } else {
      await member.roles.add(validIds);
      return interaction.editReply({ content: `✅ Le(s) rôle(s) ${validNames} vous a/ont été attribué(s).` });
    }
  } catch (err) {
    console.error('Erreur attribution rôle:', err);
    return interaction.editReply({ content: '❌ Une erreur est survenue lors de la mise à jour de vos rôles.' });
  }
};

// Helper pour l'attribution des rôles multi-sélection
const handleMultiRoleSelect = async (interaction, selectedRoleIds, messageId) => {
  const { db } = require('./database/db');
  const member = interaction.member;
  const guild = interaction.guild;
  const botMember = guild.members.me;

  const dbOpts = db.prepare('SELECT role_id FROM autorole_options WHERE message_id = ?').all(messageId);
  const resolvedRoleIds = [];
  for (const rId of selectedRoleIds) {
    if (typeof rId === 'string' && rId.startsWith('opt_')) {
      const optIdx = parseInt(rId.replace('opt_', ''), 10);
      if (dbOpts && dbOpts[optIdx] && dbOpts[optIdx].role_id) {
        resolvedRoleIds.push(dbOpts[optIdx].role_id);
      }
    } else {
      resolvedRoleIds.push(rId);
    }
  }

  const possibleRoleIds = dbOpts.map(o => o.role_id);

  const added = [];
  const removed = [];
  const errors = [];

  for (const rId of possibleRoleIds) {
    const role = guild.roles.cache.get(rId);
    if (!role) continue;

    if (role.position >= botMember.roles.highest.position) {
      errors.push(role.name);
      continue;
    }

    const shouldHave = resolvedRoleIds.includes(rId);
    const hasRole = member.roles.cache.has(rId);

    if (shouldHave && !hasRole) {
      await member.roles.add(rId).catch(() => errors.push(role.name));
      added.push(role.name);
    } else if (!shouldHave && hasRole) {
      await member.roles.remove(rId).catch(() => errors.push(role.name));
      removed.push(role.name);
    }
  }

  let msg = '✅ **Vos rôles ont été mis à jour !**';
  if (added.length > 0) msg += `\n➕ **Ajoutés :** ${added.map(n => `\`${n}\``).join(', ')}`;
  if (removed.length > 0) msg += `\n➖ **Retirés :** ${removed.map(n => `\`${n}\``).join(', ')}`;
  if (added.length === 0 && removed.length === 0) msg += '\n*Aucun changement de rôle.*';
  if (errors.length > 0) msg += `\n⚠️ **Erreur (permissions insuffisantes) :** ${errors.map(n => `\`${n}\``).join(', ')}`;

  return interaction.editReply({ content: msg });
};

// Événement d'interaction (Slash Commands)
client.on('interactionCreate', async interaction => {
  // Prise en charge directe des boutons, sélecteurs et modaux du Tribunal
  if (interaction.customId && (interaction.customId.startsWith('tribunal:') || interaction.customId.startsWith('tribunal_case:'))) {
    const tribunalCmd = client.commands.get('tribunal');
    if (tribunalCmd && typeof tribunalCmd.handleInteraction === 'function') {
      try {
        const handled = await tribunalCmd.handleInteraction(interaction);
        if (handled) return;
      } catch (err) {
        console.error('Erreur interaction tribunal:', err);
      }
    }
  }

  // Prise en charge directe des boutons, sélecteurs et modaux du Jeu UNO
  if (interaction.customId && (interaction.customId.startsWith('uno:') || interaction.customId.startsWith('uno_'))) {
    const unoCmd = client.commands.get('uno');
    if (unoCmd && typeof unoCmd.handleInteraction === 'function') {
      try {
        const handled = await unoCmd.handleInteraction(interaction);
        if (handled) return;
      } catch (err) {
        console.error('Erreur interaction UNO:', err);
      }
    }
  }

  // Prise en charge directe des boutons et modaux de Sondage / Évaluations
  if (interaction.customId && interaction.customId.startsWith('sondage_')) {
    const { handleSondageInteraction } = require('./utils/sondageHandler');
    try {
      const handled = await handleSondageInteraction(interaction);
      if (handled) return;
    } catch (err) {
      console.error('Erreur interaction sondage:', err);
    }
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId.startsWith('boutique_buy_self:')) {
      const itemName = customId.replace('boutique_buy_self:', '');
      const boutiqueCmd = client.commands.get('boutique');
      if (boutiqueCmd && boutiqueCmd.processPurchase) {
        await boutiqueCmd.processPurchase(interaction, itemName, interaction.user.id);
      }
      return;
    } else if (customId.startsWith('boutique_gift_target:')) {
      const itemName = customId.replace('boutique_gift_target:', '');
      const { UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`boutique_gift_select:${itemName}`)
        .setPlaceholder('🎁 Sélectionnez le membre chanceux à qui offrir ce cadeau...')
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(userSelect);
      return interaction.reply({
        content: `🎁 **Offrir : ${itemName}**\nSélectionnez ci-dessous le membre du serveur qui recevra votre cadeau :`,
        components: [row],
        ephemeral: true
      });
    } else if (customId.startsWith('counting_')) {
      const parts = customId.split(':');
      const action = parts[0];
      const channelId = parts[1];
      const targetUserId = parts[2];

      if (interaction.user.id !== targetUserId) {
        return interaction.reply({ content: '❌ Seul le membre concerné par l\'erreur de comptage peut choisir d\'utiliser sa chance.', ephemeral: true });
      }

      const pending = global.pendingCountingErrors ? global.pendingCountingErrors.get(`${channelId}:${targetUserId}`) : null;
      if (pending) {
        clearTimeout(pending.timerId);
        global.pendingCountingErrors.delete(`${channelId}:${targetUserId}`);
      }

      const { db, getCountingStats, resetCountingStats } = require('./database/db');
      const { EmbedBuilder } = require('discord.js');

      if (action === 'counting_use_chance') {
        const userChance = db.prepare("SELECT quantity, item_name FROM inventory WHERE guild_id = ? AND user_id = ? AND (item_name LIKE '%chance%comptage%' OR item_name LIKE '%joker%comptage%') AND quantity > 0").get(interaction.guildId, targetUserId);

        if (!userChance || userChance.quantity <= 0) {
          return interaction.reply({ content: '❌ Vous n\'avez plus de Chance de Comptage dans votre inventaire !', ephemeral: true });
        }

        if (userChance.quantity > 1) {
          db.prepare("UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?").run(interaction.guildId, targetUserId, userChance.item_name);
        } else {
          db.prepare("DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?").run(interaction.guildId, targetUserId, userChance.item_name);
        }

        const countingChan = db.prepare('SELECT * FROM counting_channels WHERE channel_id = ?').get(channelId);
        const remaining = userChance.quantity - 1;
        const emojiChance = countingChan ? (countingChan.emoji_chance || '🍀') : '🍀';

        const chanceEmbed = new EmbedBuilder()
          .setTitle(`${emojiChance} CHANCE DE COMPTAGE UTILISÉE !`)
          .setDescription(`<@${targetUserId}> a choisi d'utiliser **1x ${emojiChance} Chance de Comptage** de son inventaire !\n\nLe compte est préservé à **${countingChan ? countingChan.current_number : 0}**. Vous pouvez continuer à compter à partir du nombre suivant !`)
          .setColor('#2ECC71')
          .setFooter({ text: `Chances restantes pour ${interaction.user.username} : ${remaining}` })
          .setTimestamp();

        if (pending && pending.promptMsg) {
          await pending.promptMsg.react(emojiChance).catch(() => {});
        }

        await interaction.update({ embeds: [chanceEmbed], components: [] }).catch(() => null);
        return;
      } else if (action === 'counting_decline_chance') {
        await interaction.update({ content: '❌ *Réinitialisation acceptée par le membre.*', embeds: [], components: [] }).catch(() => null);
        
        const countingChan = db.prepare('SELECT * FROM counting_channels WHERE channel_id = ?').get(channelId);
        if (countingChan) {
          const stats = getCountingStats(channelId);
          const medals = ['🥇', '🥈', '🥉'];
          let leaderboardText = '*(Aucun chiffre validé dans cette session)*';
          if (stats && stats.length > 0) {
            leaderboardText = stats.map((r, i) => {
              const prefix = medals[i] || `**#${i + 1}**`;
              return `${prefix} <@${r.user_id}> — **${r.count}** nombre${r.count > 1 ? 's' : ''} validé${r.count > 1 ? 's' : ''}`;
            }).join('\n');
          }

          resetCountingStats(channelId);
          db.prepare('UPDATE counting_channels SET current_number = start_number, last_user_id = NULL WHERE channel_id = ?').run(channelId);

          const emojiError = countingChan.emoji_error || '❌';
          const errorEmbed = new EmbedBuilder()
            .setTitle('💥 ERREUR DE COMPTAGE !')
            .setDescription(`Le compte a été réinitialisé à **${countingChan.start_number}** !`)
            .addFields({ name: '📊 Classement de la session (Top Participants)', value: leaderboardText })
            .setColor('#E74C3C')
            .setTimestamp();

          await interaction.channel.send({ embeds: [errorEmbed] }).catch(() => null);
        }
        return;
      }
    }

    if (customId.startsWith('autorole_')) {
      const roleId = customId.split('_')[1];
      if (!roleId) return;

      try {
        await interaction.deferReply({ ephemeral: true });
        await handleRoleModeAssignment(interaction, roleId, interaction.message.id);
      } catch (err) {
        console.error('Erreur bouton:', err);
      }
    } else if (customId === 'reply_confession_anon') {
      try {
        const modal = new ModalBuilder()
          .setCustomId('reply_confession_modal')
          .setTitle('Répondre anonymement');

        const textInput = new TextInputBuilder()
          .setCustomId('reply_content')
          .setLabel('Votre réponse anonyme')
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(1)
          .setMaxLength(1000)
          .setPlaceholder('Écrivez votre message ici...')
          .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
      } catch (err) {
        console.error('Erreur showModal confession:', err);
      }
      return;
    } else if (customId.startsWith('suite_revoke_access_')) {
      const targetId = customId.replace('suite_revoke_access_', '');
      try {
        await interaction.deferUpdate().catch(() => null);
        await interaction.channel.permissionOverwrites.delete(targetId).catch(async () => {
          await interaction.channel.permissionOverwrites.create(targetId, { ViewChannel: false }).catch(() => null);
        });

        const targetRole = interaction.guild.roles.cache.get(targetId);
        const targetMember = interaction.guild.members.cache.get(targetId);
        const targetName = targetRole ? `<@&${targetRole.id}>` : (targetMember ? `<@${targetMember.id}>` : 'la cible');

        const successEmbed = new EmbedBuilder()
          .setTitle('🔒 Accès Retiré — Confidentialité Restaurée')
          .setDescription(`✅ L'accès de ${targetName} à ce salon a été retiré avec succès par <@${interaction.user.id}>. Le problème est classé comme résolu !`)
          .setColor('#2ECC71')
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed], components: [] }).catch(console.error);
      } catch (err) {
        console.error('Erreur lors du retrait d\'accès:', err);
      }
      return;
    } else if (customId === 'suite_invite_btn' || customId === 'suite_exclude_btn') {
      const { getPrivateSuiteByChannel } = require('./database/db');
      const suite = getPrivateSuiteByChannel(interaction.channelId);
      
      if (!suite) {
        return interaction.reply({ content: '❌ Ce salon n\'est pas associé à une suite privée active.', ephemeral: true });
      }

      if (interaction.user.id !== suite.user_id) {
        return interaction.reply({ content: `❌ Seul le propriétaire de la suite (<@${suite.user_id}>) peut gérer cette suite.`, ephemeral: true });
      }

      const { UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
      const isInvite = customId === 'suite_invite_btn';
      
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId(isInvite ? 'suite_invite_select' : 'suite_exclude_select')
        .setPlaceholder(isInvite ? 'Sélectionnez le membre à inviter...' : 'Sélectionnez le membre à exclure...');

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle(isInvite ? '➕ Inviter un membre' : '➖ Exclure un membre')
        .setDescription(isInvite 
          ? 'Choisissez le membre du serveur que vous souhaitez inviter dans votre suite privée.'
          : 'Choisissez le membre que vous souhaitez retirer de votre suite privée.')
        .setColor(isInvite ? '#43B581' : '#F04747');

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } else if (customId.startsWith('suite_revoke_role_')) {
      const roleId = customId.replace('suite_revoke_role_', '');
      const { getPrivateSuiteByChannel, getActiveTicket } = require('./database/db');
      const suite = getPrivateSuiteByChannel(interaction.channelId);
      const ticket = getActiveTicket(interaction.channelId);

      const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
                      interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
                      (suite && interaction.user.id === suite.user_id) ||
                      (ticket && interaction.user.id === ticket.user_id);

      if (!isStaff) {
        return interaction.reply({ content: '❌ Seul le propriétaire du salon ou un administrateur peut retirer l\'accès.', ephemeral: true });
      }

      try {
        await interaction.channel.permissionOverwrites.delete(roleId).catch(async () => {
          await interaction.channel.permissionOverwrites.create(roleId, { ViewChannel: false });
        });

        const embed = new EmbedBuilder()
          .setTitle('🔒 Accès Révoqué')
          .setDescription(`L'accès au salon pour le rôle <@&${roleId}> a été révoqué avec succès.\nLe problème a été marqué comme résolu.`)
          .setColor('#E74C3C')
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error('Erreur révocation rôle:', err);
        return interaction.reply({ content: '❌ Impossible de retirer les permissions de ce rôle.', ephemeral: true });
      }
    } else if (customId.startsWith('av_')) {
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
      const { getActionVeriteConfig, getRandomActionVeriteItem } = require('./database/db');
      const guildId = interaction.guild ? interaction.guild.id : 'DM';

      // En MP uniquement : Bouton Sélection du mode
      if (customId === 'av_select_mode' && !interaction.guild) {
        const rowMode = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('av_mode_sfw').setLabel('🟢 Mode SFW (Tout Public)').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('av_mode_nsfw').setLabel('🔞 Mode NSFW (Adulte +18)').setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
          .setTitle('🎲 Action ou Vérité — Choix du Mode')
          .setDescription(`<@${interaction.user.id}> souhaite choisir le mode de jeu !\n\nChoisissez ci-dessous :`)
          .setColor('#7289DA')
          .setTimestamp();

        return interaction.reply({ embeds: [embed], components: [rowMode], ephemeral: false });
      }

      // En MP uniquement : Clic sur Mode SFW / NSFW
      if (customId === 'av_mode_sfw' && !interaction.guild) {
        const rowSfw = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('av_action_sfw').setLabel('Action 🎬').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('av_verite_sfw').setLabel('Vérité 💬').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('av_select_mode').setLabel('Changer de mode 🔄').setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setTitle('🎲 Action ou Vérité — Mode SFW 🟢')
          .setDescription(`<@${interaction.user.id}> a sélectionné le **Mode SFW 🟢** !\n\nCliquez ci-dessous pour tirer un défi :`)
          .setColor('#2ECC71')
          .setFooter({ text: 'Mode : SFW 🟢 (Tout public)' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], components: [rowSfw], ephemeral: false });
      }

      if (customId === 'av_mode_nsfw' && !interaction.guild) {
        const rowNsfw = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('av_action_nsfw').setLabel('Action 🔥').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('av_verite_nsfw').setLabel('Vérité 💋').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('av_select_mode').setLabel('Changer de mode 🔄').setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setTitle('🎲 Action ou Vérité — Mode NSFW 🔞')
          .setDescription(`<@${interaction.user.id}> a sélectionné le **Mode NSFW 🔞** !\n\nCliquez ci-dessous pour tirer un défi :`)
          .setColor('#E74C3C')
          .setFooter({ text: 'Mode : NSFW 🔞 (Adulte +18)' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], components: [rowNsfw], ephemeral: false });
      }

      // Boutons spécifiques de défi : av_action_sfw, av_verite_sfw, av_action_nsfw, av_verite_nsfw
      const parts = customId.split('_');
      const choix = parts[1] || 'action';
      let mode = parts[2] || 'sfw';

      // Sur le serveur : Mode déterminé 100% par le salon configuré dans le Dashboard
      if (interaction.guild) {
        const config = getActionVeriteConfig(guildId);
        if (config.sfw_channel_id || config.nsfw_channel_id) {
          const isSfwAllowed = config.sfw_channel_id && interaction.channel.id === config.sfw_channel_id;
          const isNsfwAllowed = config.nsfw_channel_id && interaction.channel.id === config.nsfw_channel_id;

          if (!isSfwAllowed && !isNsfwAllowed) {
            let msg = '❌ Ce jeu ne peut être joué que dans les salons configurés :';
            if (config.sfw_channel_id) msg += `\n- SFW : <#${config.sfw_channel_id}>`;
            if (config.nsfw_channel_id) msg += `\n- NSFW : <#${config.nsfw_channel_id}>`;
            return interaction.reply({ content: msg, ephemeral: true });
          }

          if (isNsfwAllowed) mode = 'nsfw';
          else if (isSfwAllowed) mode = 'sfw';
        } else {
          mode = interaction.channel?.nsfw ? 'nsfw' : 'sfw';
        }
      }

      const question = getRandomActionVeriteItem(guildId, choix, mode);

      const embed = new EmbedBuilder()
        .setTitle(`🎲 Action ou Vérité — ${choix === 'action' ? 'Action 🎬' : 'Vérité 💬'}`)
        .setDescription(`<@${interaction.user.id}>, voici ton défi :\n\n>>> **${question}**`)
        .setColor(mode === 'nsfw' ? '#E74C3C' : (choix === 'action' ? '#2ECC71' : '#3498DB'))
        .setFooter({ text: interaction.guild ? `Salon : ${mode.toUpperCase()}` : `MP : ${mode.toUpperCase()}` })
        .setTimestamp();

      const components = [
        new ButtonBuilder().setCustomId(`av_action_${mode}`).setLabel(mode === 'nsfw' ? 'Action 🔥' : 'Action 🎬').setStyle(mode === 'nsfw' ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`av_verite_${mode}`).setLabel(mode === 'nsfw' ? 'Vérité 💋' : 'Vérité 💬').setStyle(ButtonStyle.Primary)
      ];

      // Bouton "Changer de mode" uniquement en MP
      if (!interaction.guild) {
        components.push(new ButtonBuilder().setCustomId('av_select_mode').setLabel('Changer de mode 🔄').setStyle(ButtonStyle.Secondary));
      }

      const row = new ActionRowBuilder().addComponents(components);

      try {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
      } catch (err) {
        console.error(err);
      }
      return;

    } else if (customId.startsWith('ticket_')) {
      const { handleTicketInteraction } = require('./utils/ticketHandler');
      return handleTicketInteraction(interaction, client);
    } else if (customId.startsWith('conf_approve_')) {
      const pendingId = parseInt(customId.replace('conf_approve_', ''));
      const { handleConfessionApproval } = require('./utils/confessionHandler');
      return handleConfessionApproval(interaction, pendingId);
    } else if (customId.startsWith('conf_reject_')) {
      const pendingId = parseInt(customId.replace('conf_reject_', ''));
      const { handleConfessionRejection } = require('./utils/confessionHandler');
      return handleConfessionRejection(interaction, pendingId);
    } else if (customId.startsWith('boutique_cat:')) {
      const cat = customId.replace('boutique_cat:', '');
      const boutiqueCmd = client.commands.get('boutique');
      if (boutiqueCmd && boutiqueCmd.renderBoutiqueCatalog) {
        return boutiqueCmd.renderBoutiqueCatalog(interaction, cat, true);
      }
      return;
    } else if (customId.startsWith('inv_btn_use:')) {
      const itemName = customId.replace('inv_btn_use:', '');
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId(`inv_use_target:${itemName}`)
        .setPlaceholder(`Choisissez le membre avec qui utiliser ${itemName}...`);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      return interaction.reply({ content: `🧪 **Avec quel membre souhaitez-vous utiliser "${itemName}" ?**`, components: [row], ephemeral: true });
    } else if (customId.startsWith('inv_btn_gift:')) {
      const itemName = customId.replace('inv_btn_gift:', '');
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId(`inv_gift_target:${itemName}`)
        .setPlaceholder(`Choisissez le membre à qui offrir ${itemName}...`);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      return interaction.reply({ content: `🎁 **À quel membre souhaitez-vous offrir "${itemName}" ?**`, components: [row], ephemeral: true });
    } else if (customId.startsWith('inv_btn_drop:')) {
      const itemName = customId.replace('inv_btn_drop:', '');
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const { db } = require('./database/db');

      const item = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, itemName);
      if (!item || item.quantity <= 0) {
        return interaction.reply({ content: '❌ Vous ne possédez pas cet objet.', ephemeral: true });
      }

      if (item.quantity > 1) {
        db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      } else {
        db.prepare('DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      }

      return interaction.reply({ content: `🗑️ Vous avez jeté 1x **${itemName}** de votre inventaire.`, ephemeral: true });
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'inv_select_item') {
      const itemName = interaction.values[0];
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const { db } = require('./database/db');

      const item = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, itemName);
      if (!item || item.quantity <= 0) {
        return interaction.reply({ content: '❌ Vous ne possédez plus cet objet dans votre inventaire.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎒 Objet : ${item.item_name}`)
        .setDescription(`💎 **Quantité possédée :** \`x${item.quantity}\`\n\n👇 *Choisissez une action à effectuer ci-dessous :*`)
        .setColor('#9B59B6')
        .setFooter({ text: '🎒 Inventaire VIP • B&G Elite' })
        .setTimestamp();

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_btn_use:${item.item_name}`).setLabel('Utiliser avec un membre').setStyle(ButtonStyle.Primary).setEmoji('🧪'),
        new ButtonBuilder().setCustomId(`inv_btn_gift:${item.item_name}`).setLabel('Offrir à un membre').setStyle(ButtonStyle.Success).setEmoji('🎁'),
        new ButtonBuilder().setCustomId(`inv_btn_drop:${item.item_name}`).setLabel('Jeter 1x').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
      );

      return interaction.reply({ embeds: [embed], components: [actionRow], ephemeral: true });
    } else if (interaction.customId === 'boutique_acheter') {
      const itemName = interaction.values[0];
      const command = client.commands.get('boutique');
      if (command) {
        try {
          await command.execute(interaction, itemName);
        } catch (error) {
          console.error('Erreur lors de l\'achat boutique via select menu:', error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ Une erreur est survenue lors de l\'achat.', ephemeral: true });
          } else {
            await interaction.reply({ content: '❌ Une erreur est survenue lors de l\'achat.', ephemeral: true });
          }
        }
      }
      return;
    } else if (interaction.customId.startsWith('ticket_')) {
      const { handleTicketInteraction } = require('./utils/ticketHandler');
      return handleTicketInteraction(interaction, client);
    } else if (interaction.customId === 'autorole_select_menu' || interaction.customId === 'autorole_multi_select_menu' || interaction.customId.startsWith('autorole_select_') || interaction.customId.startsWith('autorole_multi_select_')) {
      try {
        await interaction.deferReply({ ephemeral: true });
        if (interaction.customId === 'autorole_multi_select_menu' || interaction.customId.startsWith('autorole_multi_select_')) {
          await handleMultiRoleSelect(interaction, interaction.values || [], interaction.message.id);
        } else {
          const roleId = interaction.values[0];
          if (roleId) {
            await handleRoleModeAssignment(interaction, roleId, interaction.message.id);
          } else {
            await interaction.editReply({ content: '❌ Aucun rôle sélectionné.' });
          }
        }
      } catch (err) {
        console.error('Erreur select menu autorole:', err);
      }
      return;
    } else if (interaction.customId === 'couleur_preset_select') {
      const hex = interaction.values[0];
      await applyColorRole(interaction, hex);
      return;
    }
  }

  if (interaction.isUserSelectMenu()) {
    const customId = interaction.customId;

    if (customId.startsWith('ticket_')) {
      const { handleTicketInteraction } = require('./utils/ticketHandler');
      return handleTicketInteraction(interaction, client);
    }

    if (customId.startsWith('inv_use_target:')) {
      const itemName = customId.replace('inv_use_target:', '');
      const targetUserId = interaction.values[0];
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const { db } = require('./database/db');

      const item = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, itemName);
      if (!item || item.quantity <= 0) {
        return interaction.reply({ content: '❌ Vous ne possédez plus cet objet dans votre inventaire.', ephemeral: true });
      }

      if (item.quantity > 1) {
        db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      } else {
        db.prepare('DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      }

      await interaction.deferReply({ ephemeral: true });

      const buyerMember = await interaction.guild.members.fetch(userId).catch(() => null);
      const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);

      const { generateSensualText } = require('./utils/aiActionHelper');
      const instruction = `${buyerMember ? buyerMember.displayName : 'L\'auteur'} utilise l'objet sensuel "${itemName}" avec ${targetMember ? targetMember.displayName : 'la cible'}.`;
      const aiText = await generateSensualText(instruction, 250, guildId, targetMember);

      const useEmbed = new EmbedBuilder()
        .setTitle('🧪 💋 UTILISATION D\'UN OBJET DE SÉDUCTION ! 💋 🧪')
        .setDescription(
          `🔥 **Attention les yeux... Un moment de partage passionné a lieu !** 💋\n\n` +
          `✨ **<@${userId}>** utilise **${itemName}** avec **<@${targetUserId}>** ! 🥂👠\n\n` +
          `>>> *"${aiText || `${interaction.user.username} partage un moment d'une complicité intense et envoûtante avec ${targetMember ? targetMember.displayName : 'son partenaire'}.`}"*`
        )
        .setColor('#9B59B6')
        .setFooter({ text: '💋 Moment Sensuel & Expérience VIP • B&G Elite' })
        .setTimestamp();

      await interaction.channel.send({ content: `💋 **Hey <@${targetUserId}> ! <@${userId}> vient d'utiliser l'objet ${itemName} avec toi !** 🔥✨`, embeds: [useEmbed] }).catch(() => {});

      return interaction.editReply({ content: `✅ **Succès !** Vous avez utilisé 1x **${itemName}** avec <@${targetUserId}> !` });
    }

    if (customId.startsWith('inv_gift_target:')) {
      const itemName = customId.replace('inv_gift_target:', '');
      const targetUserId = interaction.values[0];
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const { db } = require('./database/db');

      if (targetUserId === userId) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas vous offrir un cadeau à vous-même.', ephemeral: true });
      }

      const item = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, itemName);
      if (!item || item.quantity <= 0) {
        return interaction.reply({ content: '❌ Vous ne possédez plus cet objet dans votre inventaire.', ephemeral: true });
      }

      if (item.quantity > 1) {
        db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      } else {
        db.prepare('DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      }

      const targetItem = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, targetUserId, itemName);
      if (targetItem) {
        db.prepare('UPDATE inventory SET quantity = quantity + 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, targetUserId, itemName);
      } else {
        db.prepare('INSERT INTO inventory (guild_id, user_id, item_name, quantity) VALUES (?, ?, ?, 1)').run(guildId, targetUserId, itemName);
      }

      await interaction.deferReply({ ephemeral: true });

      const buyerMember = await interaction.guild.members.fetch(userId).catch(() => null);
      const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);

      const { generateAiGiftPhrase } = require('./utils/aiActionHelper');
      const aiGiftText = await generateAiGiftPhrase(buyerMember, targetMember, itemName, guildId);

      const sexyQuotes = [
        "Un frisson de désir traverse le salon... L'amour et le fantasme n'attendent pas. 💋",
        "Un geste brûlant d'élégance et de séduction pur jus... 🥂🔥",
        "Une délicieuse surprise envoûtante transmise directement depuis le boudoir... 💄💋"
      ];
      const quote = aiGiftText || sexyQuotes[Math.floor(Math.random() * sexyQuotes.length)];

      const giftEmbed = new EmbedBuilder()
        .setTitle('🔥 🎁 💋 CADEAU TRANSMIS AVEC PASSION ! 💋 🎁 🔥')
        .setDescription(
          `🔥 **Attention les yeux... Un désir secret vient d'être offert !** 💋\n\n` +
          `✨ **<@${userId}>** fait fondre **<@${targetUserId}>** en lui transmettant **${itemName}** ! 👠🥂\n\n` +
          `>>> *"${quote}"*`
        )
        .setColor('#E74C3C')
        .setFooter({ text: '💋 Boudoir VIP & Transferts d\'Inventaire • B&G Elite' })
        .setTimestamp();

      await interaction.channel.send({ content: `💋 **Hey <@${targetUserId}> ! Reçois ce cadeau torride transmis depuis l'inventaire de <@${userId}> !** 🔥✨`, embeds: [giftEmbed] }).catch(() => {});

      return interaction.editReply({ content: `✅ **Succès !** Vous avez offert 1x **${itemName}** à <@${targetUserId}> !` });
    }

    if (customId.startsWith('boutique_gift_select:')) {
      const itemName = customId.replace('boutique_gift_select:', '');
      const targetUserId = interaction.values[0];
      const boutiqueCmd = client.commands.get('boutique');

      if (targetUserId === interaction.user.id) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas vous offrir un cadeau à vous-même via ce menu. Choisissez un autre membre ou achetez directement pour vous.', ephemeral: true });
      }

      if (boutiqueCmd && boutiqueCmd.processPurchase) {
        await boutiqueCmd.processPurchase(interaction, itemName, targetUserId);
      }
      return;
    }

    if (customId === 'suite_invite_select' || customId === 'suite_exclude_select') {
      const { getPrivateSuiteByChannel } = require('./database/db');
      const suite = getPrivateSuiteByChannel(interaction.channelId);

      if (!suite) {
        return interaction.reply({ content: '❌ Cette suite n\'existe plus.', ephemeral: true });
      }

      if (interaction.user.id !== suite.user_id) {
        return interaction.reply({ content: '❌ Vous n\'êtes pas le propriétaire de cette suite.', ephemeral: true });
      }

      const targetId = interaction.values[0];
      const channel = interaction.channel;
      const isInvite = customId === 'suite_invite_select';

      if (targetId === interaction.user.id) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas vous cibler vous-même.', ephemeral: true });
      }

      try {
        if (isInvite) {
          await channel.permissionOverwrites.create(targetId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            EmbedLinks: true,
            AttachFiles: true
          });

          const embed = new EmbedBuilder()
            .setTitle('✅ Membre Invité')
            .setDescription(`Le membre <@${targetId}> a été ajouté à votre suite privée. Il peut désormais voir et écrire dans ce salon.`)
            .setColor('#43B581')
            .setTimestamp();

          return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          await channel.permissionOverwrites.delete(targetId);

          const embed = new EmbedBuilder()
            .setTitle('❌ Membre Exclu')
            .setDescription(`Le membre <@${targetId}> a été retiré de votre suite privée. Il ne peut plus voir ce salon.`)
            .setColor('#F04747')
            .setTimestamp();

          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (err) {
        console.error('Erreur gestion permissions suite:', err);
        return interaction.reply({ content: '❌ Impossible de modifier les permissions pour cet utilisateur. Vérifiez mes permissions.', ephemeral: true });
      }
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'reply_confession_modal') {
      const content = interaction.fields.getTextInputValue('reply_content');
      const channel = interaction.channel; // Le thread dans lequel l'interaction a eu lieu
      
      try {
        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
          .setDescription(`💬 **Réponse anonyme :**\n${content}`)
          .setColor('#9B59B6')
          .setTimestamp();
        
        await channel.send({ embeds: [embed] });

        const logEmbed = new EmbedBuilder()
          .setTitle('🤫 Réponse Anonyme Logguée')
          .setDescription(`**Auteur :** <@${interaction.user.id}> (${interaction.user.tag})\n**ID de l'auteur :** ${interaction.user.id}\n**Salon :** <#${channel.id}> (Fil/Thread)\n\n**Réponse :**\n${content}`)
          .setColor('#9B59B6')
          .setTimestamp();
        
        const { sendLog } = require('./utils/helpers');
        sendLog(interaction.guild, 'confession', logEmbed);

        await interaction.editReply({ content: '✅ Votre réponse anonyme a été postée avec succès !' });
      } catch (err) {
        console.error('Erreur réponse confession modal:', err);
        await interaction.editReply({ content: '❌ Impossible d\'envoyer votre réponse anonyme.' });
      }
      return;
    }
  }

  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`Erreur autocomplétion pour ${interaction.commandName}:`, error);
    }
    return;
  }

  if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
    return;
  }

  const guildId = interaction.guildId;
  if (guildId) {
    const { getCommandPermission, getQuarantineConfig } = require('./database/db');

    // Bloquer TOUTES les commandes pour le rôle Quarantaine (si configuré)
    try {
      const qConfig = getQuarantineConfig(guildId);
      if (qConfig && qConfig.role_id) {
        const userRoleIds = interaction.member?.roles?.cache ? Array.from(interaction.member.roles.cache.keys()) : [];
        if (userRoleIds.includes(qConfig.role_id)) {
          return interaction.reply({
            content: '❌ Vous êtes actuellement en **quarantaine** et ne pouvez utiliser aucune commande sur ce serveur.',
            ephemeral: true
          });
        }
      }
    } catch (e) {
      console.error('Erreur lors du contrôle du rôle quarantaine:', e);
    }

    // Vérification de sécurité NSFW pour les 23 commandes d'action restreintes et commandes adultes (+18)
    const NSFW_ACTIONS_LIST = [
      '69', 'attrape', 'batailleoreiller', 'branler', 'collier', 'deshabiller', 'doigter',
      'fuck', 'lecher', 'mordre', 'mouiller', 'ordonner', 'orgasme', 'orgie', 'punir',
      'sodo', 'sucer', 'tirercheveux', 'touche', 'tromper', 'biffle', 'spank', 'vin'
    ];
    const isCmdNsfw = command.data?.nsfw || (command.category === 'actions' && NSFW_ACTIONS_LIST.includes(interaction.commandName.toLowerCase()));

    if (isCmdNsfw && interaction.guild && !interaction.channel?.nsfw) {
      return interaction.reply({
        content: `🔞 **Salon réservé aux adultes (NSFW) requis** : La commande \`/${interaction.commandName}\` contient du contenu pour adultes et ne peut être utilisée que dans un salon configuré comme soumis à la limite d'âge (salon NSFW).`,
        ephemeral: true
      });
    }

    const member = interaction.member;
    const { PermissionsBitField } = require('discord.js');
    let userPerms = member?.permissions;
    if (!userPerms || typeof userPerms.has !== 'function') {
      userPerms = interaction.memberPermissions;
    }
    if (!userPerms || typeof userPerms.has !== 'function') {
      userPerms = new PermissionsBitField();
    }

    const customPerm = getCommandPermission(guildId, interaction.commandName);
    if (customPerm) {
      if (customPerm.enabled === 0) {
        return interaction.reply({ content: `❌ La commande \`/${interaction.commandName}\` a été désactivée par les administrateurs sur ce serveur.`, ephemeral: true });
      }

      const hasNativePerm = 
        userPerms.has(PermissionsBitField.Flags.Administrator) ||
        userPerms.has(PermissionsBitField.Flags.ManageGuild) ||
        (['ban', 'unban', 'massban'].includes(interaction.commandName) && userPerms.has(PermissionsBitField.Flags.BanMembers)) ||
        (['kick', 'masskick'].includes(interaction.commandName) && (userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers))) ||
        (['clear'].includes(interaction.commandName) && (userPerms.has(PermissionsBitField.Flags.ManageMessages) || userPerms.has(PermissionsBitField.Flags.ModerateMembers))) ||
        (['warn', 'unwarn', 'mute', 'unmute', 'timeout', 'untimeout', 'quarantaine', 'dropargent', 'drop-argent', 'dropkarma', 'drop-karma', 'dropxp', 'drop-xp'].includes(interaction.commandName) && (userPerms.has(PermissionsBitField.Flags.ModerateMembers) || userPerms.has(PermissionsBitField.Flags.ManageMessages) || userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers)));

      if (!hasNativePerm) {
        let allowedRoles = [];
        let deniedRoles = [];
        try { allowedRoles = JSON.parse(customPerm.allowed_roles || '[]'); } catch (e) {}
        try { deniedRoles = JSON.parse(customPerm.denied_roles || '[]'); } catch (e) {}

        const userRoleIds = member?.roles?.cache ? Array.from(member.roles.cache.keys()) : (Array.isArray(member?.roles) ? member.roles : []);

        if (deniedRoles.length > 0 && deniedRoles.some(rId => userRoleIds.includes(rId))) {
          return interaction.reply({ content: `❌ Votre rôle vous interdit d'utiliser la commande \`/${interaction.commandName}\`.`, ephemeral: true });
        }

        if (allowedRoles.length > 0 && !allowedRoles.some(rId => userRoleIds.includes(rId))) {
          return interaction.reply({ content: `❌ Vous n'avez pas le rôle requis pour utiliser la commande \`/${interaction.commandName}\`.`, ephemeral: true });
        }
      }
    }

    const { getPermissionsConfig } = require('./database/db');
    const permConfig = getPermissionsConfig(guildId);
    
    const adminRoleId = permConfig.admin_role_id;
    const modoRoleId = permConfig.modo_role_id;
    
    let subcommand = null;
    try {
      subcommand = interaction.options.getSubcommand(false);
    } catch (e) {}

    const isAllowedForEveryone = 
      (command.category === 'actions' || 
       command.category === 'game' ||
       (command.category === 'economy' && !['dropargent', 'drop-argent', 'dropkarma', 'drop-karma', 'dropxp', 'drop-xp'].includes(interaction.commandName)) ||
       ['casino', 'combat-coq', 'coq', 'travailler', 'daily', 'work', 'crime', 'rob', 'voler', 'pecher', 'action-verite', 'niveau', 'solde', 'karma', 'mapville', 'proche', 'boutique', 'leaderboard', 'confess', 'confesser', 'deposit', 'deposer', 'withdraw', 'retirer', 'donner', 'pay', 'lovecalc', 'mot-cache', 'tribunal', 'uno', 'star', 'gifle', 'patpat', 'quetes'].includes(interaction.commandName)) &&
      !['dashboard'].includes(interaction.commandName);
      
    if (!isAllowedForEveryone) {
      const isUserAdmin = Boolean(userPerms.has(PermissionsBitField.Flags.Administrator));
      const userRoleIds = member?.roles?.cache ? Array.from(member.roles.cache.keys()) : (Array.isArray(member?.roles) ? member.roles : []);

      let dashRoles = [];
      let adminCmdsRoles = [];
      let modoCmdsRoles = [];
      try { dashRoles = typeof permConfig.dashboard_roles === 'string' ? JSON.parse(permConfig.dashboard_roles || '[]') : (permConfig.dashboard_roles || []); } catch (_) {}
      try { adminCmdsRoles = typeof permConfig.admin_cmds_roles === 'string' ? JSON.parse(permConfig.admin_cmds_roles || '[]') : (permConfig.admin_cmds_roles || []); } catch (_) {}
      try { modoCmdsRoles = typeof permConfig.modo_cmds_roles === 'string' ? JSON.parse(permConfig.modo_cmds_roles || '[]') : (permConfig.modo_cmds_roles || []); } catch (_) {}

      const hasDashDerogation = interaction.commandName === 'dashboard' && dashRoles.some(rId => userRoleIds.includes(rId));
      const hasAdminCmdsDerogation = adminCmdsRoles.some(rId => userRoleIds.includes(rId));
      
      const isModoCmd = ['ban', 'kick', 'unban', 'clear', 'warn', 'unwarn', 'mute', 'unmute', 'timeout', 'untimeout', 'quarantaine', 'massban', 'masskick', 'dropargent', 'drop-argent', 'dropkarma', 'drop-karma', 'dropxp', 'drop-xp', 'dashboard'].includes(interaction.commandName);
      const hasModoCmdsDerogation = isModoCmd && modoCmdsRoles.some(rId => userRoleIds.includes(rId));

      // Vérification des permissions Discord natives selon la commande
      let hasDiscordNativePerm = false;
      const cmdName = interaction.commandName;

      try {
        if (isUserAdmin) {
          hasDiscordNativePerm = true;
        } else if (['ban', 'unban', 'massban'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.BanMembers) || userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.ModerateMembers);
        } else if (['kick', 'masskick', 'dashboard'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers) || hasDashDerogation;
        } else if (['clear'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.ManageMessages) || userPerms.has(PermissionsBitField.Flags.ModerateMembers) || userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers);
        } else if (['warn', 'unwarn', 'mute', 'unmute', 'timeout', 'untimeout', 'quarantaine', 'dropargent', 'drop-argent', 'dropkarma', 'drop-karma', 'dropxp', 'drop-xp'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.ModerateMembers) || userPerms.has(PermissionsBitField.Flags.ManageMessages) || userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers);
        } else if (['ajouter', 'syncautoroles', 'addEmojiContext'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.ManageGuild) || userPerms.has(PermissionsBitField.Flags.ManageRoles);
        } else {
          // Commandes Admin / Config
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.ManageGuild) || userPerms.has(PermissionsBitField.Flags.Administrator);
        }

        // Si la commande définit par défaut des permissions requises dans son builder
        if (!hasDiscordNativePerm && command.data && command.data.default_member_permissions) {
          hasDiscordNativePerm = userPerms.has(BigInt(command.data.default_member_permissions));
        }
      } catch (permErr) {
        console.error('Erreur lors du calcul des permissions natives Discord:', permErr);
      }

      const hasAllowedRole = 
        isUserAdmin ||
        hasDiscordNativePerm ||
        (adminRoleId && userRoleIds.includes(adminRoleId)) || 
        (modoRoleId && userRoleIds.includes(modoRoleId)) ||
        hasDashDerogation ||
        hasAdminCmdsDerogation ||
        hasModoCmdsDerogation;
        
      if (!hasAllowedRole) {
        return interaction.reply({
          content: "❌ Vous n'avez pas les permissions Discord ou le rôle requis pour utiliser cette commande.",
          ephemeral: true
        });
      }
    }
  }

  // Vérification de l'activation du module correspondant
  if (guildId) {
    const { isModuleEnabled } = require('./database/db');
    const cmdName = interaction.commandName;

    const commandModuleMap = {
      'casino': 'casino', 'combat-coq': 'casino', 'coq': 'casino',
      'niveau': 'leveling', 'rank': 'leveling', 'leaderboard': 'leveling', 'xp': 'leveling',
      'solde': 'shop', 'boutique': 'shop', 'buy': 'shop', 'acheter': 'shop', 'inventaire': 'shop', 'suite': 'shop',
      'quetes': 'quests', 'daily': 'quests',
      'karma': 'karma',
      'ticket': 'tickets',
      'confess': 'confessions', 'confesser': 'confessions',
      'action-verite': 'action_verite',
      'mot-cache': 'game_word',
      'tribunal': 'tribunal',
      'star': 'star'
    };

    let targetModule = commandModuleMap[cmdName];
    if (!targetModule && command.category === 'actions') {
      targetModule = 'gifs';
    }

    if (targetModule && !isModuleEnabled(guildId, targetModule)) {
      return interaction.reply({
        content: `❌ Le module correspondant à cette commande (\`${cmdName}\`) est actuellement désactivé sur ce serveur par les administrateurs.`,
        ephemeral: true
      });
    }
  }

  const userId = interaction.user.id;
  const oldKarma = guildId ? (require('./database/db').getEconomy(guildId, userId)?.karma || 0) : 0;

  try {
    await command.execute(interaction);

    if (guildId) {
      const newEco = require('./database/db').getEconomy(guildId, userId);
      const newKarma = newEco ? newEco.karma : 0;
      if (newKarma !== oldKarma) {
        await checkAndAnnounceKarmaReward(interaction, oldKarma, newKarma);
      }
    }

    // Log de l'exécution de la commande dans la catégorie 'bots'
    if (interaction.guild) {
      try {
        let subcommand = null;
        try { subcommand = interaction.options?.getSubcommand(false); } catch (_) {}
        let cmdDetails = `\`/${interaction.commandName}\``;
        if (subcommand) cmdDetails += ` \`${subcommand}\``;

        const logEmbed = new EmbedBuilder()
          .setTitle('🤖 Exécution de Commande Slash')
          .setDescription(
            `**Exécuteur :** ${interaction.user.tag} (<@${interaction.user.id}>) ${interaction.user.bot ? '[BOT]' : ''}\n` +
            `**Bot Cible / Application :** ${client.user.tag} (<@${client.user.id}>)\n` +
            `**Commande :** ${cmdDetails}\n` +
            `**Salon :** <#${interaction.channelId}>`
          )
          .setColor('#9B59B6')
          .setTimestamp();

        sendLog(interaction.guild, 'bots', logEmbed, { isBot: true });
      } catch (e) {
        console.error('Erreur log commande bots:', e);
      }
    }
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true });
    }
  }
});

async function checkAndAnnounceKarmaReward(interaction, oldKarma, newKarma) {
  const guildId = interaction.guild ? interaction.guild.id : null;
  if (!guildId) return;

  const { getKarmaConfig } = require('./database/db');
  const config = getKarmaConfig(guildId);

  // Si le système de karma ou les annonces sont désactivés
  if (!config.is_active || !config.announce_rewards) return;

  const userId = interaction.user.id;
  const channel = interaction.channel;
  if (!channel) return;

  // Seuil 1
  if (oldKarma < config.threshold_1 && newKarma >= config.threshold_1) {
    const text = `🎉 **Félicitations <@${userId}> !** Tu as atteint le rang de Karma **${config.threshold_1}** et débloqué les avantages :\n⚡ Multiplicateur d'XP : **x${config.xp_mult_1}**\n🛒 Réduction boutique : **-${config.discount_1}%** !`;
    await channel.send({ content: text }).catch(() => null);
  }
  // Seuil 2
  else if (oldKarma < config.threshold_2 && newKarma >= config.threshold_2) {
    const text = `🎉 **Félicitations <@${userId}> !** Tu as atteint le rang de Karma **${config.threshold_2}** et débloqué les avantages :\n⚡ Multiplicateur d'XP : **x${config.xp_mult_2}**\n🛒 Réduction boutique : **-${config.discount_2}%** !`;
    await channel.send({ content: text }).catch(() => null);
  }
  // Seuil 3
  else if (oldKarma < config.threshold_3 && newKarma >= config.threshold_3) {
    const text = `🎉 **Félicitations <@${userId}> !** Tu as atteint le rang de Karma **${config.threshold_3}** et débloqué les avantages :\n⚡ Multiplicateur d'XP : **x${config.xp_mult_3}**\n🛒 Réduction boutique : **-${config.discount_3}%** !`;
    await channel.send({ content: text }).catch(() => null);
  }
}

// Enregistrer les commandes slash auprès de Discord lors de la connexion
client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(`Début du rafraîchissement des ${commandsJSON.length} commandes d'application (/)`);
    
    // Déploiement global unique des commandes (évite l'affichage en double)
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandsJSON }
    );

    // Supprimer les résidus de commandes de guilde pour éviter les doublons sur Discord
    for (const [guildId, guild] of client.guilds.cache) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: [] }
      ).catch(() => {});
    }

    console.log('Commandes d\'application (/) enregistrées sans doublon.');

    client.on('guildUpdate', (oldGuild, newGuild) => {
      console.log(`[GuildUpdate] Le serveur ${newGuild.id} a été mis à jour sur Discord. Nouveau nom: "${newGuild.name}".`);
    });
    
    // Nettoyage et resynchronisation automatique des suites privées et salons tribunal
    setInterval(() => checkExpiredSuites(client), 60000);
    checkExpiredSuites(client);
    syncExistingChannels(client);

    // Nettoyage automatique des rôles temporaires toutes les 60 secondes
    setInterval(() => checkExpiredTemporaryRoles(client), 60000);
    checkExpiredTemporaryRoles(client);

    // Vérification des rappels de Bumps toutes les 30 secondes
    setInterval(() => checkBumpReminders(client), 30000);
    checkBumpReminders(client);

    // Vérification automatique des élections Star de la Semaine (toutes les 60s)
    const { checkStarElections } = require('./utils/starManager');
    setInterval(() => checkStarElections(client), 60000);
    checkStarElections(client);

    // Mettre en cache tous les membres de tous les serveurs au démarrage
    client.guilds.cache.forEach(guild => {
      guild.members.fetch()
        .then(() => console.log(`[Cache] Membres de ${guild.name} mis en cache.`))
        .catch(err => console.error(`[Cache] Impossible de mettre en cache les membres de ${guild.name}:`, err));
    });

    // Scan et réouverture des forums illimités au démarrage
    const { scanAndReopenAllUnlimitedForums } = require('./utils/forums');
    scanAndReopenAllUnlimitedForums(client).catch(console.error);

    client.syncExistingChannels = () => syncExistingChannels(client);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des commandes slash :', error);
  }
});

// API server pour exposer les guilds du bot
const express = require('express');
const apiApp = express();
const API_PORT = process.env.BOT_API_PORT || 49605;

apiApp.use(express.json());

apiApp.post('/bot/send-autorole', async (req, res) => {
  try {
    const { guildId, channelId, title, description, color, thumbnail, imageUrl, options = [], selectors = [], type = 'buttons', mode = 'normal', existingMessageId } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    let message = null;
    let isSameChannelEdit = false;

    if (existingMessageId) {
      // 1. Chercher dans le salon cible
      message = await channel.messages.fetch(existingMessageId).catch(() => null);
      if (message) {
        if (message.author.id === client.user.id) {
          isSameChannelEdit = true;
        }
      } else {
        // 2. Si le salon cible est différent (copie dans un autre salon), chercher en parallèle dans tous les salons
        const textChannels = Array.from(guild.channels.cache.values()).filter(ch => ch.isTextBased() && ch.id !== channelId);
        const results = await Promise.all(textChannels.map(ch => ch.messages.fetch(existingMessageId).then(m => ({ msg: m, ch })).catch(() => null)));
        const found = results.find(r => r && r.msg);
        if (found) {
          message = found.msg;
        }
      }
    }

    const { StringSelectMenuBuilder } = require('discord.js');
    let actionRows = [];

    if (selectors && Array.isArray(selectors) && selectors.length > 0) {
      selectors.slice(0, 5).forEach((sel, sIdx) => {
        if (!sel.options || sel.options.length === 0) return;
        const selType = sel.type || 'select';
        const isDropdown = (type === 'select' || type === 'multi_select') || (selType !== 'buttons');
        if (!isDropdown) {
          for (let i = 0; i < sel.options.length && actionRows.length < 5; i += 5) {
            const chunk = sel.options.slice(i, i + 5);
            const btnRow = new ActionRowBuilder();
            chunk.forEach((opt, optIdx) => {
              let styleCode = ButtonStyle.Primary;
              if (opt.style === 'SECONDARY') styleCode = ButtonStyle.Secondary;
              else if (opt.style === 'SUCCESS') styleCode = ButtonStyle.Success;
              else if (opt.style === 'DANGER') styleCode = ButtonStyle.Danger;

              let btnVal = opt.role_id || '';
              if (!btnVal || btnVal.length > 80) {
                btnVal = `opt_${i + optIdx}`;
              }

              const btn = new ButtonBuilder()
                .setCustomId(`autorole_${btnVal}`)
                .setLabel(opt.label || 'Rôle')
                .setStyle(styleCode);
              if (opt.emoji) btn.setEmoji(opt.emoji);
              btnRow.addComponents(btn);
            });
            actionRows.push(btnRow);
          }
        } else {
          if (actionRows.length < 5) {
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId(`autorole_select_${sIdx}`)
              .setPlaceholder(sel.placeholder || sel.title || 'Sélectionnez un rôle...');

            if (selType === 'multi_select') {
              selectMenu.setMinValues(0);
              selectMenu.setMaxValues(sel.options.length);
            } else {
              selectMenu.setMinValues(1);
              selectMenu.setMaxValues(1);
            }

            const selectOptions = sel.options.map((opt, optIdx) => {
              let optVal = opt.role_id || '';
              if (!optVal || optVal.length > 80) {
                optVal = `opt_${optIdx}`;
              }
              const optionObj = {
                label: opt.label || 'Rôle',
                value: optVal
              };
              if (opt.emoji) optionObj.emoji = opt.emoji;
              return optionObj;
            });
            selectMenu.addOptions(selectOptions);
            actionRows.push(new ActionRowBuilder().addComponents(selectMenu));
          }
        }
      });
    } else {
      if (type === 'buttons') {
        if (options && options.length > 0) {
          for (let i = 0; i < options.length && actionRows.length < 5; i += 5) {
            const chunk = options.slice(i, i + 5);
            const btnRow = new ActionRowBuilder();
            chunk.forEach((opt, optIdx) => {
              let styleCode = ButtonStyle.Primary;
              if (opt.style === 'SECONDARY') styleCode = ButtonStyle.Secondary;
              else if (opt.style === 'SUCCESS') styleCode = ButtonStyle.Success;
              else if (opt.style === 'DANGER') styleCode = ButtonStyle.Danger;

              let btnVal = opt.role_id || '';
              if (!btnVal || btnVal.length > 80) {
                btnVal = `opt_${i + optIdx}`;
              }

              const btn = new ButtonBuilder()
                .setCustomId(`autorole_${btnVal}`)
                .setLabel(opt.label || 'Rôle')
                .setStyle(styleCode);
              if (opt.emoji) btn.setEmoji(opt.emoji);
              btnRow.addComponents(btn);
            });
            actionRows.push(btnRow);
          }
        }
      } else if (type === 'select' || type === 'multi_select') {
        if (options && options.length > 0) {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(type === 'multi_select' ? 'autorole_multi_select_menu' : 'autorole_select_menu')
            .setPlaceholder(type === 'multi_select' ? 'Sélectionnez un ou plusieurs rôles...' : 'Sélectionnez un rôle...');

          if (type === 'multi_select') {
            selectMenu.setMinValues(0);
            selectMenu.setMaxValues(options.length);
          }

          const selectOptions = options.map((opt, optIdx) => {
            let optVal = opt.role_id || '';
            if (!optVal || optVal.length > 80) {
              optVal = `opt_${optIdx}`;
            }
            const optionObj = {
              label: opt.label || 'Rôle',
              value: optVal
            };
            if (opt.emoji) optionObj.emoji = opt.emoji;
            return optionObj;
          });
          selectMenu.addOptions(selectOptions);
          actionRows.push(new ActionRowBuilder().addComponents(selectMenu));
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor(color || '#5865F2')
      .setTimestamp();
    
    if (title && title.trim()) {
      embed.setTitle(title.trim());
    }
    if (description && description.trim()) {
      embed.setDescription(description.trim());
    }

    if (!title && !description) {
      if (existingMessageId && message) {
        if (message.embeds && message.embeds.length > 0) {
          const origEmb = message.embeds[0];
          if (origEmb.title) embed.setTitle(origEmb.title);
          if (origEmb.description) embed.setDescription(origEmb.description);
          if (origEmb.color) embed.setColor(origEmb.color);
        } else if (message.content) {
          embed.setDescription(message.content);
        }
      } else {
        embed.setDescription('Cliquez sur les options ci-dessous pour obtenir ou retirer des rôles.');
      }
    }
    
    if (thumbnail) {
      embed.setThumbnail(guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
    }
    
    const files = [];
    if (imageUrl) {
      if (imageUrl.startsWith('/uploads/')) {
        const absPath = path.join(__dirname, '../public', imageUrl);
        if (fs.existsSync(absPath)) {
          const name = path.basename(imageUrl);
          files.push(new AttachmentBuilder(absPath, { name }));
          embed.setImage(`attachment://${name}`);
        }
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        embed.setImage(imageUrl);
      }
    } else if (existingMessageId && message) {
      if (message.embeds && message.embeds[0] && message.embeds[0].image && message.embeds[0].image.url) {
        embed.setImage(message.embeds[0].image.url);
      } else if (message.attachments && message.attachments.size > 0) {
        const firstAtt = message.attachments.first();
        if (firstAtt && firstAtt.url) {
          embed.setImage(firstAtt.url);
        }
      }
    }

    let finalMessageId = null;

    if (isSameChannelEdit && message) {
      const editPayload = { embeds: [embed] };
      if (files.length > 0) editPayload.files = files;
      editPayload.components = actionRows;
      await message.edit(editPayload);
      finalMessageId = message.id;

      if (type === 'reactions' && options && options.length > 0) {
        for (const opt of options) {
          if (opt.emoji) {
            await message.react(opt.emoji).catch(console.error);
          }
        }
      }
    } else if (existingMessageId && message && message.author.id !== client.user.id && type === 'reactions') {
      // Message d'un membre/autre bot où l'on ajoute des réactions
      for (const opt of options) {
        if (opt.emoji) {
          await message.react(opt.emoji).catch(console.error);
        }
      }
      finalMessageId = message.id;
    } else {
      // Envoi d'un nouveau message embed ou copie dans un autre salon
      const payload = { embeds: [embed] };
      if (files.length > 0) payload.files = files;
      if (actionRows.length > 0) payload.components = actionRows;

      const newMessage = await channel.send(payload);
      finalMessageId = newMessage.id;

      if (type === 'reactions' && options && options.length > 0) {
        for (const opt of options) {
          if (opt.emoji) {
            await newMessage.react(opt.emoji).catch(console.error);
          }
        }
      }
    }

    return res.json({ success: true, messageId: finalMessageId });
  } catch (error) {
    console.error('Error sending/editing autorole:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/send-sondage', async (req, res) => {
  try {
    const { guildId, channelId, resultsChannelId, title, description, ratingIcon = '⭐', textType = 'long', color = '#F1C40F', existingSondageId, sections = [], hasGeneralRemark = true, avatarImage = '', bannerImage = '', shortDescription = '', mentions = [], googleFormUrl = '' } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Salon introuvable' });

    const sondageId = existingSondageId || `sndg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const { createSondage, db } = require('./database/db');
    if (existingSondageId) {
      try {
        db.prepare(`UPDATE sondages SET channel_id = ?, results_channel_id = ?, title = ?, description = ?, rating_icon = ?, text_type = ?, color = ?, sections = ?, has_general_remark = ?, avatar_image = ?, banner_image = ?, short_description = ?, mentions = ?, google_form_url = ? WHERE id = ? AND guild_id = ?`).run(
          channelId, resultsChannelId || null, title, description, ratingIcon, textType, color,
          JSON.stringify(sections), hasGeneralRemark ? 1 : 0, avatarImage, bannerImage, shortDescription,
          JSON.stringify(mentions), googleFormUrl || '', existingSondageId, guildId
        );
      } catch (e) {
        console.error('Erreur update sondage db:', e);
      }
    } else {
      createSondage({
        id: sondageId,
        guild_id: guildId,
        channel_id: channelId,
        results_channel_id: resultsChannelId || null,
        title,
        description,
        rating_icon: ratingIcon,
        text_type: textType,
        color,
        created_by: 'Dashboard',
        sections,
        has_general_remark: hasGeneralRemark ? 1 : 0,
        avatar_image: avatarImage,
        banner_image: bannerImage,
        short_description: shortDescription,
        mentions,
        google_form_url: googleFormUrl || ''
      });
    }

    let sectionsListStr = '';
    if (Array.isArray(sections) && sections.length > 0) {
      sectionsListStr = '\n\n**Sections d\'évaluation :**\n' + sections.map(s => `• ${s.label}`).join('\n');
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${title}`)
      .setDescription(
        (description ? `${description}\n` : '') +
        sectionsListStr +
        `\n\n*Cliquez sur le bouton ci-dessous pour remplir l'évaluation !*`
      )
      .addFields({
        name: '📈 Statistiques en temps réel',
        value: 'Aucune évaluation enregistrée pour le moment.'
      })
      .setColor(color)
      .setFooter({ text: `ID Sondage : ${sondageId} • Bagbot Elite` })
      .setTimestamp();

    const hostIp = process.env.PUBLIC_IP || '82.65.75.176';
    const dashPort = process.env.PORT || process.env.DASHBOARD_PORT || 49601;
    const formUrl = (googleFormUrl && googleFormUrl.trim()) ? googleFormUrl.trim() : (process.env.PUBLIC_URL || process.env.DASHBOARD_PUBLIC_URL || `http://${hostIp}:${dashPort}/form.html?id=${sondageId}`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('📋 Remplir le Formulaire')
        .setStyle(ButtonStyle.Link)
        .setURL(formUrl),
      new ButtonBuilder()
        .setCustomId(`sondage_vote:${sondageId}`)
        .setLabel('⚡ Vote Rapide Discord')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📝')
    );

    let sentMessage = null;
    if (existingSondageId) {
      const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      if (messages) {
        sentMessage = messages.find(m => m.embeds.length > 0 && m.embeds[0].footer && m.embeds[0].footer.text && m.embeds[0].footer.text.includes(existingSondageId));
        if (sentMessage && sentMessage.editable) {
          await sentMessage.edit({ embeds: [embed], components: [row] }).catch(() => null);
        }
      }
    }

    if (!sentMessage) {
      sentMessage = await channel.send({ embeds: [embed], components: [row] });
    }

    return res.json({ success: true, sondageId, messageId: sentMessage ? sentMessage.id : null });
  } catch (err) {
    console.error('Erreur API send-sondage:', err);
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/bot/submit-web-form', async (req, res) => {
  try {
    const { sondageId, userTag, sectionScores = [], generalRemark = '' } = req.body;
    const { getSondage, saveSondageResponse, getSondageResponses } = require('./database/db');
    const { getStarRatingStr } = require('./utils/sondageHandler');

    const sondage = getSondage(sondageId);
    if (!sondage) return res.status(404).json({ error: 'Sondage introuvable en base de données' });

    let totalScore = 0;
    let validScoresCount = 0;

    sectionScores.forEach(sec => {
      let score = parseInt(sec.rating) || 5;
      if (score < 1) score = 1;
      if (score > 5) score = 5;
      totalScore += score;
      validScoresCount++;
    });

    const overallRating = validScoresCount > 0 ? (totalScore / validScoresCount).toFixed(1) : '5.0';

    const responsePayload = {
      overallRating,
      sectionScores,
      generalRemark: (generalRemark || '').trim()
    };

    const userId = `web_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    saveSondageResponse(sondageId, userId, Math.round(overallRating), JSON.stringify(responsePayload));

    const guild = client.guilds.cache.get(sondage.guild_id);
    if (guild) {
      const channel = guild.channels.cache.get(sondage.channel_id);
      if (channel && channel.isTextBased()) {
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

        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (messages) {
          const origMsg = messages.find(m => m.embeds.length > 0 && m.embeds[0].footer && m.embeds[0].footer.text && m.embeds[0].footer.text.includes(sondageId));
          if (origMsg && origMsg.editable) {
            await origMsg.edit({ embeds: [embed] }).catch(() => null);
          }
        }
      }

      if (sondage.results_channel_id) {
        const resultsChannel = guild.channels.cache.get(sondage.results_channel_id);
        if (resultsChannel && resultsChannel.isTextBased()) {
          let mentionsArr = [];
          try {
            mentionsArr = typeof sondage.mentions === 'string' ? JSON.parse(sondage.mentions || '[]') : (sondage.mentions || []);
          } catch (e) {}

          const mentionsContent = Array.isArray(mentionsArr) && mentionsArr.length > 0 ? mentionsArr.join(' ') : null;

          const items = [];
          sectionScores.forEach(sec => {
            let scoreText = getStarRatingStr(sec.rating, sondage.rating_icon || '⭐');
            let val = sec.observation ? `${scoreText}\n*Remarques :* "${sec.observation}"` : scoreText;
            items.push({ name: sec.label, value: val });
          });

          if (generalRemark && generalRemark.trim()) {
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
          }

          if (sondage.banner_image && sondage.banner_image.trim()) {
            ficheEmbed.setImage(sondage.banner_image.trim());
          }

          const authorText = userTag ? `Réponse soumise via Web par ${userTag}` : `Réponse soumise via le Formulaire Web`;
          ficheEmbed.setFooter({ text: authorText });

          await resultsChannel.send({
            content: mentionsContent,
            embeds: [ficheEmbed]
          }).catch(console.error);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erreur submit-web-form:', err);
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/bot/submit-google-form', async (req, res) => {
  try {
    const { sondageId, userEmail, answers = [] } = req.body;
    const { getSondage, saveSondageResponse, getSondageResponses } = require('./database/db');

    const sondage = getSondage(sondageId);
    if (!sondage) return res.status(404).json({ error: 'Sondage introuvable en base de données' });

    let totalScore = 0;
    let validScoresCount = 0;

    const items = [];
    const sectionScores = [];

    answers.forEach(item => {
      const qTitle = item.question || 'Question';
      const ansVal = item.answer || '';
      const rawAns = Array.isArray(ansVal) ? ansVal.join(', ') : String(ansVal);

      let score = 5;
      const icon = sondage.rating_icon || '⭐';
      const escapedIcon = icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const starMatches = (rawAns.match(new RegExp(escapedIcon, 'g')) || []).length;
      
      if (starMatches > 0 && starMatches <= 5) {
        score = starMatches;
      } else {
        const digitMatch = rawAns.match(/\b([1-5])\b/);
        if (digitMatch) score = parseInt(digitMatch[1]);
      }

      totalScore += score;
      validScoresCount++;

      items.push({ name: qTitle, value: rawAns ? `*Réponse :* "${rawAns}"` : '*Pas de réponse*' });
      sectionScores.push({ label: qTitle, rating: score, observation: rawAns });
    });

    const overallRating = validScoresCount > 0 ? (totalScore / validScoresCount).toFixed(1) : '5.0';

    const responsePayload = {
      overallRating,
      sectionScores,
      googleFormEmail: userEmail || ''
    };

    const userId = `gform_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    saveSondageResponse(sondageId, userId, Math.round(overallRating), JSON.stringify(responsePayload));

    const guild = client.guilds.cache.get(sondage.guild_id);
    if (guild) {
      const channel = guild.channels.cache.get(sondage.channel_id);
      if (channel && channel.isTextBased()) {
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
            `**📈 Statistiques Google Forms en Temps Réel :**\n` +
            `• **Note globale moyenne :** ${globalAvg}/5 ${icon}\n` +
            `• **Nombre de fiches d'évaluations :** ${totalVotes} réponse(s)`
          )
          .setColor(sondage.color || '#F1C40F')
          .setFooter({ text: `ID Sondage : ${sondageId} • Bagbot Elite` })
          .setTimestamp();

        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (messages) {
          const origMsg = messages.find(m => m.embeds.length > 0 && m.embeds[0].footer && m.embeds[0].footer.text && m.embeds[0].footer.text.includes(sondageId));
          if (origMsg && origMsg.editable) {
            await origMsg.edit({ embeds: [embed] }).catch(() => null);
          }
        }
      }

      if (sondage.results_channel_id) {
        const resultsChannel = guild.channels.cache.get(sondage.results_channel_id);
        if (resultsChannel && resultsChannel.isTextBased()) {
          let mentionsArr = [];
          try {
            mentionsArr = typeof sondage.mentions === 'string' ? JSON.parse(sondage.mentions || '[]') : (sondage.mentions || []);
          } catch (e) {}

          const mentionsContent = Array.isArray(mentionsArr) && mentionsArr.length > 0 ? mentionsArr.join(' ') : null;

          const embedContent = items.map(item => `**${item.name}**\n${item.value}`).join('\n\n');
          const shortDesc = sondage.short_description && sondage.short_description.trim() ? sondage.short_description.trim() : 'Voici la réponse reçue depuis Google Forms :';

          const ficheEmbed = new EmbedBuilder()
            .setTitle(sondage.title || 'Nouvelle réponse Google Forms')
            .setDescription(`${shortDesc}\n\n${embedContent}`)
            .setColor(sondage.color || '#78A8C6')
            .setTimestamp();

          if (sondage.avatar_image && sondage.avatar_image.trim()) {
            ficheEmbed.setThumbnail(sondage.avatar_image.trim());
          }

          if (sondage.banner_image && sondage.banner_image.trim()) {
            ficheEmbed.setImage(sondage.banner_image.trim());
          }

          const authorText = userEmail ? `Réponse Google Forms soumise par ${userEmail}` : `Réponse soumise via Google Forms`;
          ficheEmbed.setFooter({ text: authorText });

          await resultsChannel.send({
            content: mentionsContent,
            embeds: [ficheEmbed]
          }).catch(console.error);
        }
      }
    }

    res.json({ success: true, message: 'Google Forms webhook processed successfully' });
  } catch (err) {
    console.error('Erreur submit-google-form:', err);
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/bot/delete-message', async (req, res) => {
  try {
    const { guildId, channelId, messageId } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (message) {
      await message.delete();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/age-verification-completed', async (req, res) => {
  try {
    const { guildId, userId, channelId, method, estimatedAge, roleIdToAssign, logChannelId } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    
    const ticketChannel = guild.channels.cache.get(channelId);
    const logChannel = logChannelId ? (guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null)) : null;

    const targetChannel = logChannel || ticketChannel;
    if (!targetChannel) return res.status(404).json({ error: 'Target channel not found' });

    const methodLabel = method === 'facial' ? '📸 Reconnaissance Faciale' : '📄 Carte d\'Identité / Document';
    const embed = new EmbedBuilder()
      .setTitle('🛡️ VÉRIFICATION D\'ÂGE VALIDÉE')
      .setDescription(
        `La majorité de <@${userId}> a été vérifiée avec succès !\n\n` +
        `• **Membre** : <@${userId}>\n` +
        `• **Statut** : ✅ **Majeur (Âge validé : ${estimatedAge} ans)**\n` +
        `• **Méthode utilisée** : ${methodLabel}\n` +
        `• **Salon Ticket** : <#${channelId}>\n` +
        `• **Horodatage** : <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setColor('#2ECC71')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/7542/7542245.png')
      .setFooter({ text: 'Bagbot Elite • Sécurité & Majorité' })
      .setTimestamp();

    await targetChannel.send({ content: `✅ Vérification d'âge validée pour <@${userId}> !`, embeds: [embed] }).catch(console.error);

    if (logChannel && ticketChannel && logChannel.id !== ticketChannel.id) {
      await ticketChannel.send({ content: `✅ <@${userId}>, votre vérification d'âge a été validée avec succès !` }).catch(console.error);
    }

    if (roleIdToAssign) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.roles.add(roleIdToAssign).catch(err => console.error('Erreur ajout rôle âge:', err));
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur age-verification-completed:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.get('/server-tags', async (req, res) => {
  try {
    const tagsMap = [];
    if (client && client.guilds && client.guilds.cache) {
      for (const [, g] of client.guilds.cache) {
        const tag = (await getOfficialGuildTag(g)) || getGuildTag(g) || g.name;
        tagsMap.push({
          guildId: g.id,
          guildName: g.name,
          tag: tag
        });
      }
    }
    res.json({ success: true, tags: tagsMap });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, tags: [] });
  }
});

apiApp.get('/bot/server-tags', async (req, res) => {
  try {
    const tagsMap = [];
    if (client && client.guilds && client.guilds.cache) {
      for (const [, g] of client.guilds.cache) {
        const tag = (await getOfficialGuildTag(g)) || getGuildTag(g) || g.name;
        tagsMap.push({
          guildId: g.id,
          guildName: g.name,
          tag: tag
        });
      }
    }
    res.json({ success: true, tags: tagsMap });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, tags: [] });
  }
});

apiApp.get('/debug-guild-clan', async (req, res) => {
  try {
    const list = [];
    if (client && client.guilds && client.guilds.cache) {
      for (const [id, g] of client.guilds.cache) {
        const raw = await client.rest.get(`/guilds/${id}?with_counts=true`).catch(() => null);
        list.push({
          id,
          name: g.name,
          g_clan: g.clan || null,
          g_rawClan: g.rawClan || null,
          raw_keys: raw ? Object.keys(raw) : [],
          raw_clan: raw ? raw.clan : null,
          raw_profile: raw ? raw.profile : null,
          raw_identity: raw ? raw.identity : null
        });
      }
    }
    res.json({ success: true, list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.get('/debug-clan-endpoint', async (req, res) => {
  try {
    const results = {};
    for (const [id, g] of client.guilds.cache) {
      const endpoints = [
        `/guilds/${id}/clan`,
        `/guilds/${id}/identity`,
        `/guilds/${id}/profile`,
        `/clans/${id}`
      ];
      results[g.name] = {};
      for (const ep of endpoints) {
        try {
          const data = await client.rest.get(ep);
          results[g.name][ep] = data;
        } catch (e) {
          results[g.name][ep] = e.status || e.message;
        }
      }
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.get('/guilds', async (req, res) => {
  try {
    const guilds = await Promise.all(client.guilds.cache.map(async guild => {
      const freshGuild = await guild.fetch().catch(() => guild);
      return {
        id: freshGuild.id,
        name: freshGuild.name,
        icon: freshGuild.icon,
        iconURL: freshGuild.iconURL({ dynamic: true, size: 256 }) || (freshGuild.icon ? `https://cdn.discordapp.com/icons/${freshGuild.id}/${freshGuild.icon}.png?size=256` : 'https://cdn.discordapp.com/embed/avatars/0.png')
      };
    }));
    res.json(guilds);
  } catch (e) {
    const guilds = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      iconURL: guild.iconURL({ dynamic: true, size: 256 }) || (guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256` : 'https://cdn.discordapp.com/embed/avatars/0.png')
    }));
    res.json(guilds);
  }
});

apiApp.get('/guilds/:guildId/channels', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    await guild.channels.fetch();
    const sortedChannels = [...guild.channels.cache.values()]
      .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
    const channels = sortedChannels.map(channel => ({
      id: channel.id,
      name: channel.name || 'Unknown',
      type: channel.type
    }));
    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Error fetching channels' });
  }
});

apiApp.get('/guilds/:guildId/roles', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    await guild.roles.fetch();
    const sortedRoles = [...guild.roles.cache.values()]
      .sort((a, b) => b.position - a.position);
    const roles = sortedRoles.map(role => ({
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position
    }));
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Error fetching roles' });
  }
});

apiApp.get('/guilds/:guildId/emojis', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    await guild.emojis.fetch().catch(() => null);
    const emojis = guild.emojis.cache.map(e => ({
      id: e.id,
      name: e.name,
      animated: e.animated,
      url: e.imageURL(),
      identifier: e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`
    }));
    res.json(emojis);
  } catch (error) {
    console.error('Error fetching emojis:', error);
    res.status(500).json({ error: 'Error fetching emojis' });
  }
});
apiApp.get('/guilds/:guildId/members', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    const sortedMembers = [...members.values()]
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    const result = sortedMembers.map(m => ({
      id: m.id,
      name: m.user.tag,
      displayName: m.displayName
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Error fetching members' });
  }
});
// --- Pont API pour Dashboard 2 (processus standalone sans accès au client Discord réel) ---

apiApp.get('/guilds/:guildId', (req, res) => {
  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  res.json({
    id: guild.id,
    name: guild.name,
    ownerId: guild.ownerId,
    icon: guild.icon,
    iconURL: guild.iconURL({ dynamic: true })
  });
});

apiApp.get('/guilds/:guildId/emojis', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    let emojisMap;
    try {
      emojisMap = await guild.emojis.fetch();
    } catch (e) {
      emojisMap = guild.emojis.cache;
    }
    const emojis = emojisMap.map(e => ({
      id: e.id,
      name: e.name,
      animated: e.animated,
      url: e.imageURL({ size: 64 }) || `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}`,
      identifier: `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`
    }));
    res.json(emojis);
  } catch (error) {
    console.error('Error fetching emojis:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/guilds/:guildId/members/fetch', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const { userIds } = req.body || {};
    if (!Array.isArray(userIds) || userIds.length === 0) return res.json([]);
    const fetched = await guild.members.fetch({ user: userIds }).catch(() => null);
    const members = fetched ? [...fetched.values()] : [];
    res.json(members.map(m => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName || m.user.username,
      avatarURL: m.user.displayAvatarURL({ dynamic: true })
    })));
  } catch (error) {
    console.error('Error fetching members batch:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.get('/guilds/:guildId/member-permissions/:userId', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const member = guild.members.cache.get(req.params.userId) || await guild.members.fetch(req.params.userId).catch(() => null);
    const guildOwnerId = guild.ownerId;
    if (!member) {
      return res.json({ found: false, guildOwnerId, isOwner: req.params.userId === guildOwnerId, hasAdministrator: false, hasManageGuild: false });
    }
    res.json({
      found: true,
      guildOwnerId,
      isOwner: member.id === guildOwnerId,
      hasAdministrator: member.permissions.has(PermissionFlagsBits.Administrator),
      hasManageGuild: member.permissions.has(PermissionFlagsBits.ManageGuild)
    });
  } catch (error) {
    console.error('Error fetching member permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupère jusqu'à 50 messages récents d'un salon, pré-analysés pour l'éditeur d'embeds (boutons/select/réactions)
apiApp.get('/guilds/:guildId/channels/:channelId/embed-messages', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });
    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel || !channel.isTextBased()) return res.status(404).json({ error: 'Salon textuel introuvable' });

    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (!messages) return res.json([]);

    const resultEmbeds = [];
    messages.forEach(msg => {
      const emb = msg.embeds.length > 0 ? msg.embeds[0] : null;
      const options = [];

      if (msg.components && msg.components.length > 0) {
        msg.components.forEach(row => {
          if (row.components) {
            row.components.forEach(comp => {
              if (comp.type === 2) {
                const roleId = comp.customId ? comp.customId.replace('autorole_', '') : '';
                let styleStr = 'PRIMARY';
                if (comp.style === 2) styleStr = 'SECONDARY';
                else if (comp.style === 3) styleStr = 'SUCCESS';
                else if (comp.style === 4) styleStr = 'DANGER';
                let emojiStr = '';
                if (comp.emoji) {
                  emojiStr = comp.emoji.id ? (comp.emoji.animated ? `<a:${comp.emoji.name}:${comp.emoji.id}>` : `<:${comp.emoji.name}:${comp.emoji.id}>`) : (comp.emoji.name || '');
                }
                options.push({ role_id: roleId, label: comp.label || '', emoji: emojiStr, style: styleStr });
              } else if (comp.type === 3) {
                if (comp.options) {
                  comp.options.forEach(opt => {
                    let emojiStr = '';
                    if (opt.emoji) {
                      emojiStr = opt.emoji.id ? (opt.emoji.animated ? `<a:${opt.emoji.name}:${opt.emoji.id}>` : `<:${opt.emoji.name}:${opt.emoji.id}>`) : (opt.emoji.name || '');
                    }
                    options.push({ role_id: opt.value, label: opt.label || '', emoji: emojiStr, style: 'PRIMARY' });
                  });
                }
              }
            });
          }
        });
      }

      if (options.length === 0 && msg.reactions && msg.reactions.cache.size > 0) {
        msg.reactions.cache.forEach(reaction => {
          let emojiStr = reaction.emoji.id ? (reaction.emoji.animated ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>` : `<:${reaction.emoji.name}:${reaction.emoji.id}>`) : (reaction.emoji.name || '');
          options.push({ role_id: '', label: '', emoji: emojiStr, style: 'PRIMARY' });
        });
      }

      let imageUrl = '';
      if (emb && emb.image && emb.image.url) {
        imageUrl = emb.image.url;
      } else if (msg.attachments && msg.attachments.size > 0) {
        const firstAtt = msg.attachments.first();
        if (firstAtt && firstAtt.url) imageUrl = firstAtt.url;
      }

      if (emb || options.length > 0 || msg.content || imageUrl) {
        resultEmbeds.push({
          id: msg.id,
          channel_id: channel.id,
          author: msg.author ? msg.author.tag : 'Inconnu',
          is_bot_owner: msg.author && msg.author.id === client.user.id,
          title: emb ? (emb.title || '') : '',
          description: emb ? (emb.description || (msg.content || '')) : (msg.content || ''),
          color: emb ? (emb.hexColor || '#5865F2') : '#5865F2',
          thumbnail: (emb && emb.thumbnail) ? 1 : 0,
          image_url: imageUrl,
          options: options,
          type: (msg.components && msg.components[0] && msg.components[0].components[0] && msg.components[0].components[0].type === 3) ? 'select' : (options.length > 0 && options[0].role_id === '' ? 'reactions' : 'buttons')
        });
      }
    });

    res.json(resultEmbeds);
  } catch (error) {
    console.error('Erreur embed-messages bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupère un message précis (cherche dans tous les salons si channelId absent), pré-analysé comme ci-dessus
apiApp.get('/guilds/:guildId/messages/:messageId', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });
    const messageId = req.params.messageId;
    let channelId = req.query.channelId;

    let message = null;
    let channel = channelId ? guild.channels.cache.get(channelId) : null;
    if (channel && channel.isTextBased()) {
      message = await channel.messages.fetch(messageId).catch(() => null);
    }

    if (!message) {
      const textChannels = Array.from(guild.channels.cache.values()).filter(ch => ch.isTextBased() && ch.viewable);
      for (const ch of textChannels) {
        try {
          const m = await ch.messages.fetch(messageId).catch(() => null);
          if (m) {
            message = m;
            channel = ch;
            break;
          }
        } catch (e) {}
      }
    }

    if (!message) return res.status(404).json({ error: 'Message introuvable sur le serveur' });

    const emb = message.embeds.length > 0 ? message.embeds[0] : null;
    const options = [];
    const selectors = [];

    // Extraction Titre, Description, Champs et Images/GIFs de TOUS les embeds
    let title = '';
    let descriptionParts = [];
    let hexColor = '#5865F2';
    let imageUrl = '';
    let thumbnail = 0;

    if (message.embeds && message.embeds.length > 0) {
      message.embeds.forEach((eItem, idx) => {
        if (!title && eItem.title) title = eItem.title;
        if (eItem.description) descriptionParts.push(eItem.description);
        if (eItem.fields && eItem.fields.length > 0) {
          eItem.fields.forEach(f => {
            if (f.name || f.value) {
              descriptionParts.push(`**${f.name}**\n${f.value}`);
            }
          });
        }
        if (hexColor === '#5865F2') {
          if (eItem.hexColor && eItem.hexColor !== '#000000') hexColor = eItem.hexColor;
          else if (eItem.color) hexColor = `#${eItem.color.toString(16).padStart(6, '0')}`;
        }
        if (!imageUrl) {
          if (eItem.image && eItem.image.url) imageUrl = eItem.image.url;
          else if (eItem.data?.image?.url) imageUrl = eItem.data.image.url;
          else if (eItem.thumbnail && eItem.thumbnail.url) imageUrl = eItem.thumbnail.url;
          else if (eItem.url && (eItem.url.includes('.gif') || eItem.url.includes('.png') || eItem.url.includes('.jpg') || eItem.url.includes('.webp'))) imageUrl = eItem.url;
        }
        if (eItem.thumbnail && eItem.thumbnail.url) thumbnail = 1;
      });
    }

    if (!title && descriptionParts.length === 0 && message.content) {
      descriptionParts.push(message.content);
    }

    if (!imageUrl && message.attachments && message.attachments.size > 0) {
      const imgAtt = Array.from(message.attachments.values()).find(att => att.contentType?.includes('image') || att.url.match(/\.(png|jpg|jpeg|gif|webp)$/i) || att.url);
      if (imgAtt && imgAtt.url) imageUrl = imgAtt.url;
    }

    if (!imageUrl && (message.content || '')) {
      const match = message.content.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?/i);
      if (match) imageUrl = match[0];
    }

    const fullDescription = descriptionParts.join('\n\n');

    // Extraction des Composants (Boutons, StringSelect, RoleSelect...)
    if (message.components && message.components.length > 0) {
      message.components.forEach((row, rIdx) => {
        const rowComponents = row.components || row.data?.components || [];
        if (rowComponents.length > 0) {
          const rowOptions = [];
          let rowType = 'buttons';
          let rowPlaceholder = `Sélecteur ${rIdx + 1}`;

          rowComponents.forEach(comp => {
            const rawData = comp.data || comp;
            const compTypeNum = typeof rawData.type === 'number' ? rawData.type : (rawData.type === 'BUTTON' ? 2 : (rawData.type === 'STRING_SELECT' || rawData.type === 'SELECT_MENU' ? 3 : 2));

            const rawCustomId = rawData.custom_id || rawData.customId || '';
            const rawPlaceholder = rawData.placeholder || '';
            if (rawPlaceholder) rowPlaceholder = rawPlaceholder;

            if (compTypeNum === 2 || rawData.type === 'BUTTON' || rawData.style !== undefined) {
              const roleMatch = rawCustomId.match(/\d{17,20}/);
              let roleId = roleMatch ? roleMatch[0] : rawCustomId;

              if (!roleId && rawData.label) {
                const foundRole = guild.roles.cache.find(r => r.name.toLowerCase() === rawData.label.toLowerCase());
                if (foundRole) roleId = foundRole.id;
              }

              let styleStr = 'PRIMARY';
              if (rawData.style === 2 || rawData.style === 'SECONDARY') styleStr = 'SECONDARY';
              else if (rawData.style === 3 || rawData.style === 'SUCCESS') styleStr = 'SUCCESS';
              else if (rawData.style === 4 || rawData.style === 'DANGER') styleStr = 'DANGER';

              const emojiObj = rawData.emoji;
              let emojiStr = emojiObj ? (emojiObj.id ? (emojiObj.animated ? `<a:${emojiObj.name}:${emojiObj.id}>` : `<:${emojiObj.name}:${emojiObj.id}>`) : emojiObj.name) : '';
              
              const optObj = { role_id: roleId || '', label: rawData.label || 'Bouton', emoji: emojiStr, style: styleStr };
              options.push(optObj);
              rowOptions.push(optObj);
            } else if (compTypeNum === 3 || compTypeNum === 5 || compTypeNum === 6 || compTypeNum === 7 || compTypeNum === 8 || rawData.options || rawData.type === 'STRING_SELECT' || rawData.type === 'ROLE_SELECT') {
              rowType = (rawData.max_values > 1 || rawData.maxValues > 1) ? 'multi_select' : 'select';

              const rawOptions = rawData.options || [];
              if (rawOptions.length > 0) {
                rawOptions.forEach(opt => {
                  const optData = opt.data || opt;
                  const rawVal = optData.value || '';
                  const roleMatch = rawVal.match(/\d{17,20}/);
                  let roleId = roleMatch ? roleMatch[0] : rawVal;

                  if (!roleId && optData.label) {
                    const foundRole = guild.roles.cache.find(r => r.name.toLowerCase() === optData.label.toLowerCase());
                    if (foundRole) roleId = foundRole.id;
                  }

                  const emojiObj = optData.emoji;
                  let emojiStr = emojiObj ? (emojiObj.id ? (emojiObj.animated ? `<a:${emojiObj.name}:${emojiObj.id}>` : `<:${emojiObj.name}:${emojiObj.id}>`) : emojiObj.name) : '';
                  const optObj = { role_id: roleId || '', label: optData.label || 'Option', emoji: emojiStr, style: 'PRIMARY' };
                  options.push(optObj);
                  rowOptions.push(optObj);
                });
              } else {
                const optObj = { role_id: '', label: rowPlaceholder || 'Sélecteur de Rôles', emoji: '📌', style: 'PRIMARY' };
                options.push(optObj);
                rowOptions.push(optObj);
              }
            }
          });

          if (rowOptions.length > 0) {
            selectors.push({
              placeholder: rowPlaceholder,
              type: rowType,
              mode: 'normal',
              options: rowOptions
            });
          }
        }
      });
    }

    // Extraction des mentions de rôles dans le texte si aucun composant bouton n'a été trouvé
    if (options.length === 0) {
      const textToScan = `${title} ${fullDescription}`;
      const roleMatches = Array.from(textToScan.matchAll(/<@&(\d{17,20})>/g)).map(m => m[1]);
      const uniqueRoles = Array.from(new Set(roleMatches));

      if (uniqueRoles.length > 0) {
        uniqueRoles.forEach((rId, idx) => {
          const optObj = {
            role_id: rId,
            label: `Rôle ${idx + 1}`,
            emoji: '📌',
            style: 'PRIMARY'
          };
          options.push(optObj);
        });
        selectors.push({
          placeholder: 'Rôles Détectés',
          type: 'select',
          mode: 'normal',
          options: [...options]
        });
      }
    }

    // Extraction des réactions si pas de composants
    if (options.length === 0 && message.reactions && message.reactions.cache.size > 0) {
      message.reactions.cache.forEach(reaction => {
        let emojiStr = reaction.emoji.id ? (reaction.emoji.animated ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>` : `<:${reaction.emoji.name}:${reaction.emoji.id}>`) : reaction.emoji.name;
        options.push({ role_id: '', label: '', emoji: emojiStr, style: 'PRIMARY' });
      });
    }

    const detectedType = (selectors.length > 0 && selectors[0].type) ? selectors[0].type : (options.length > 0 && options[0].role_id === '' ? 'reactions' : 'buttons');

    res.json({
      id: message.id,
      channel_id: channel.id,
      author: message.author ? message.author.tag : 'Inconnu',
      is_bot_owner: message.author && message.author.id === client.user.id,
      title: title,
      description: fullDescription,
      color: hexColor,
      thumbnail: thumbnail,
      image_url: imageUrl,
      options: options,
      selectors: selectors,
      type: detectedType
    });
  } catch (error) {
    console.error('Erreur message-details bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Envoi/édition générique d'un embed simple dans un salon (URLs déjà résolues côté appelant)
apiApp.post('/bot/channel/send-embed', async (req, res) => {
  try {
    const { guildId, channelId, title, description, color, thumbnailMode, thumbnailUrl, imageUrl, authorName, authorIcon, footerText, footerIcon, content, existingMessageId } = req.body || {};
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Salon introuvable ou inaccessible' });

    const embed = new EmbedBuilder();
    if (title && title.trim()) embed.setTitle(title.trim());
    if (description && description.trim()) embed.setDescription(description.trim());
    if (!title && !description) embed.setDescription('\u200b');
    embed.setColor(color || '#5865F2');

    const files = [];

    let finalThumb = thumbnailUrl || null;
    if (thumbnailMode === 'server') finalThumb = guild.iconURL({ dynamic: true }) || null;
    else if (thumbnailMode === 'bot') finalThumb = client.user.displayAvatarURL({ dynamic: true });

    if (finalThumb && typeof finalThumb === 'string') {
      const cleanThumb = finalThumb.trim();
      if (cleanThumb.startsWith('/uploads/')) {
        const absPath = path.join(__dirname, '../public', cleanThumb);
        if (fs.existsSync(absPath)) {
          const name = 'thumb_' + path.basename(cleanThumb);
          files.push(new AttachmentBuilder(absPath, { name }));
          embed.setThumbnail(`attachment://${name}`);
        } else {
          const hostIp = process.env.PUBLIC_IP || '82.65.75.176';
          const dashPort = process.env.PORT || process.env.DASHBOARD_PORT || 49601;
          const publicBase = process.env.PUBLIC_URL || `http://${hostIp}:${dashPort}`;
          embed.setThumbnail(`${publicBase}${cleanThumb}`);
        }
      } else if (cleanThumb.startsWith('http://') || cleanThumb.startsWith('https://')) {
        embed.setThumbnail(cleanThumb);
      }
    }

    if (imageUrl && typeof imageUrl === 'string') {
      const cleanImg = imageUrl.trim();
      if (cleanImg.startsWith('/uploads/')) {
        const absPath = path.join(__dirname, '../public', cleanImg);
        if (fs.existsSync(absPath)) {
          const name = 'banner_' + path.basename(cleanImg);
          files.push(new AttachmentBuilder(absPath, { name }));
          embed.setImage(`attachment://${name}`);
        } else {
          const hostIp = process.env.PUBLIC_IP || '82.65.75.176';
          const dashPort = process.env.PORT || process.env.DASHBOARD_PORT || 49601;
          const publicBase = process.env.PUBLIC_URL || `http://${hostIp}:${dashPort}`;
          embed.setImage(`${publicBase}${cleanImg}`);
        }
      } else if (cleanImg.startsWith('http://') || cleanImg.startsWith('https://')) {
        embed.setImage(cleanImg);
      }
    }

    if (authorName && authorName.trim()) {
      const authorObj = { name: authorName.trim() };
      if (authorIcon) authorObj.iconURL = authorIcon;
      embed.setAuthor(authorObj);
    }

    if (footerText && footerText.trim()) {
      const footerObj = { text: footerText.trim() };
      if (footerIcon) footerObj.iconURL = footerIcon;
      embed.setFooter(footerObj);
    }

    embed.setTimestamp();

    const payload = { content: content || undefined, embeds: [embed] };
    if (files.length > 0) payload.files = files;

    let msgIdSaved = null;
    if (existingMessageId && String(existingMessageId).trim()) {
      const targetMsg = await channel.messages.fetch(String(existingMessageId).trim()).catch(() => null);
      if (!targetMsg) return res.status(404).json({ error: 'Message existant introuvable dans ce salon' });
      await targetMsg.edit(payload);
      msgIdSaved = targetMsg.id;
    } else {
      const sentMsg = await channel.send(payload);
      msgIdSaved = sentMsg.id;
    }

    res.json({ success: true, messageId: msgIdSaved });
  } catch (error) {
    console.error('Erreur send-embed bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/announce/features', async (req, res) => {
  try {
    const { guildId, channelId } = req.body || {};
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Salon introuvable' });

    const embed = new EmbedBuilder()
      .setTitle(`✨ 👑 ${guild.name.toUpperCase()} — PRÉSENTATION DES FONCTIONNALITÉS EXCLUSIVES 👑 ✨`)
      .setDescription(
        `Bienvenue sur le serveur **${guild.name}** ! Voici un guide complet des fonctionnalités et systèmes exclusifs mis à votre disposition par notre bot :\n\n` +
        `🍷 **1. Économie, Banque & Karma Séducteur**\n` +
        `• Gagnez des pièces et du Karma en écrivant dans les salons et avec \`/work\`, \`/crime\`, \`/daily\`.\n` +
        `• Économisez à la \`/banque\` et débloquez jusqu'à **-20% de réduction** automatique en boutique grâce à votre Karma.\n\n` +
        `👑 **2. Suites Privées VIP Temporaires**\n` +
        `• Louez votre propre havre de paix personnalisé pendant 24h, 7 jours ou 1 mois via \`/boutique\`.\n` +
        `• Un salon textuel et un salon vocal privés sont créés automatiquement avec un panneau de contrôle pour inviter ou exclure des membres.\n\n` +
        `💋 **3. Boutique & Cadeaux d'Intimité (IA)**\n` +
        `• Catalogue d'objets sensuels, BDSM, sexy et réconfortants dans \`/boutique\`.\n` +
        `• Offrez des cadeaux à d'autres membres : l'IA génère un **message d'offrande torride et unique** dans le salon !\n` +
        `• Gerez et utilisez vos objets depuis votre \`/inventaire\` privé.\n\n` +
        `🎲 **4. Action ou Vérité Adultes (NSFW)**\n` +
        `• Lancez \`/action-verite\` (Niveaux Soft, Hard, Extrême, Couple) avec des questions et défis osés inédits.\n` +
        `• Utilisez des commandes d'action (\`/calin\`, \`/embrasser\`, \`/fesser\`, \`/caresser\`, etc.) générées par l'IA et accompagnées de GIFs.\n\n` +
        `⚖️ **5. Tribunal & Système de Jugement**\n` +
        `• Ouvrez des procès avec \`/tribunal create\` : rôles attribués (Juge, Avocat, Accusé) et salon fermé après délibération.\n\n` +
        `🔢 **6. Salons de Comptage & Jokers de Sauvegarde**\n` +
        `• Participez aux salons de comptage (modes Normal, Inversé, Mathématique) et utilisez la \`🍀 Chance de Comptage\` pour sauver les erreurs !\n\n` +
        `📜 **7. Système de Quêtes & Missions**\n` +
        `• Accomplissez des missions hebdomadaires et montez en niveau pour débloquer des rôles et bonus d'XP.`
      )
      .setColor('#E74C3C');

    const iconUrl = guild.iconURL({ dynamic: true });
    if (iconUrl) {
      embed.setThumbnail(iconUrl);
      embed.setFooter({ text: '💋 B&G Elite • Système d\'Animation & Privilèges VIP', iconURL: iconUrl });
    } else {
      embed.setFooter({ text: '💋 B&G Elite • Système d\'Animation & Privilèges VIP' });
    }
    embed.setTimestamp();

    await channel.send({ embeds: [embed] });
    res.json({ success: true, message: 'Embed de présentation des fonctionnalités envoyé avec succès !' });
  } catch (error) {
    console.error('Erreur announce-features bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/announce/commands', async (req, res) => {
  try {
    const { guildId, channelId } = req.body || {};
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Salon introuvable' });

    const iconUrl = guild.iconURL({ dynamic: true });

    const embedPublic = new EmbedBuilder()
      .setTitle(`📜 🤖 CATALOGUE DES COMMANDES — ACCESSIBLES À TOUS 🤖 📜`)
      .setDescription(`Retrouvez ci-dessous l'ensemble des commandes et actions interactives disponibles pour tous les membres sur **${guild.name}** :`)
      .addFields(
        {
          name: '💰 Économie, Banque, Boutique & Inventaire',
          value: '`/solde` — Solde portefeuille & compte bancaire\n`/deposer` — Déposer des pièces à la banque\n`/retirer` — Retirer des pièces de la banque\n`/travailler` — Travailler pour gagner des pièces & karma\n`/daily` — Prime quotidienne gratuite\n`/pecher` — Attraper des poissons et des pièces\n`/crime` — Tenter un crime osé pour gagner gros\n`/voler` — Tenter de voler des pièces à un autre membre\n`/donner` — Transférer des pièces à un membre\n`/karma` — Consulter son Karma & réductions boutique\n`/quetes` — Missions & quêtes du serveur\n`/boutique` — Catalogue VIP & Louer des Suites Privées\n`/inventaire` — Sac à dos (Utiliser, Offrir, Jeter)',
          inline: false
        },
        {
          name: '🤝 Actions SFW & Amicales',
          value: '`/gifle` • `/patpat` • `/batailleoreiller` • `/chatouiller` • `/cuisiner` • `/danser` • `/reconforter` • `/reveiller` • `/rose` • `/vin` • `/attrape` • `/dormir` • `/douche` • `/reanimer` • `/oups`',
          inline: false
        },
        {
          name: '🍷 Actions RP Adulte, Torrides & Sensuelles (NSFW)',
          value: '`/calin` • `/embrasser` • `/caresser` • `/flirter` • `/seduire` • `/lit` • `/branler` • `/doigter` • `/fuck` • `/sodo` • `/sucer` • `/orgasme` • `/orgie` • `/deshabiller` • `/lecher` • `/masser` • `/mordre` • `/mouiller` • `/touche` • `/69` • `/collier` • `/laisse` • `/ordonner` • `/punir` • `/tirercheveux` • `/tromper` • `/agenouiller`',
          inline: false
        },
        {
          name: '🎮 Mini-Jeux, Fun & Confessions',
          value: '`/action-verite` — Partie Action ou Vérité (Soft, Hard, Extrême, Couple)\n`/confesser` — Envoyer une confession anonyme\n`/mot-cache` — Jeu du mot ou de la phrase mystère\n`/uno` — Jouer au UNO interactif avec cartes animées\n`/star` — Voir la star élue de la semaine et le classement\n`/lovecalc` — Calculer la compatibilité amoureuse\n`/proche` — Trouver le membre géographiquement le plus proche\n`/mapville` — Définir votre ville/localisation sur la carte des membres',
          inline: false
        },
        {
          name: '⚙️ Profil, Niveaux & Accès',
          value: '`/niveau` (ou `/level`) — Carte XP, Niveau & Rang actuel\n`/classement` — Classement général XP du serveur\n`/dashboard` — Lien d\'accès au panneau Web',
          inline: false
        }
      )
      .setColor('#5865F2');

    if (iconUrl) {
      embedPublic.setThumbnail(iconUrl);
      embedPublic.setFooter({ text: '🌐 Commandes Publiques • B&G Elite', iconURL: iconUrl });
    } else {
      embedPublic.setFooter({ text: '🌐 Commandes Publiques • B&G Elite' });
    }
    embedPublic.setTimestamp();

    const embedStaff = new EmbedBuilder()
      .setTitle(`🛡️ ⚖️ COMMANDES D'ADMINISTRATION & MODÉRATION STAFF ⚖️ 🛡️`)
      .setDescription(`Guide réservé à l'équipe de modération et d'administration du serveur **${guild.name}** :`)
      .addFields(
        {
          name: '⚖️ Tribunal Discord & Procès',
          value: '`/tribunal create` — Ouvrir un procès (Salon dédié, Rôles Juge, Avocat, Accusé)\n`/tribunal verdict` — Rendre le jugement final et appliquer la sentence\n`/tribunal close` — Clore et archiver la session de procès',
          inline: false
        },
        {
          name: '🛡️ Sécurité, Sanctions & Quarantaine',
          value: '`/quarantaine` — Placer / Retirer un membre de quarantaine anti-raid\n`/clear` — Purge rapide de messages dans un salon\n`/warn` — Ajouter / Retirer / Voir les avertissements d\'un membre\n`/timeout` — Mettre en sourdine / Rendre la parole\n`/kick` — Expulser un membre du serveur\n`/ban` — Bannir / Débannir un membre\n`/massban` — Bannissement groupé d\'utilisateurs\n`/masskick` — Expulsion groupée d\'utilisateurs',
          inline: false
        },
        {
          name: '🛠️ Outils & Gestion du Bot',
          value: '`/ajoute` — Ajouter des pièces, du karma ou de l\'XP (Admin)\n`/sync-autoroles` — Synchroniser les rôles réaction rétroactivement\n`/drop-argent` — Largage de pièces dans le salon\n`/drop-karma` — Largage de karma dans le salon\n`/drop-xp` — Largage d\'XP dans le salon\n`Clic droit > Ajouter Émoji` — Ajouter un émoji sur le serveur depuis un message',
          inline: false
        }
      )
      .setColor('#E74C3C');

    if (iconUrl) {
      embedStaff.setThumbnail(iconUrl);
      embedStaff.setFooter({ text: '🛡️ Commandes Modération & Staff • B&G Elite', iconURL: iconUrl });
    } else {
      embedStaff.setFooter({ text: '🛡️ Commandes Modération & Staff • B&G Elite' });
    }
    embedStaff.setTimestamp();

    await channel.send({ embeds: [embedPublic, embedStaff] });
    res.json({ success: true, message: 'Embeds des commandes publiques et modération envoyés avec succès !' });
  } catch (error) {
    console.error('Erreur announce-commands bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/autoroles-on-role/sync', async (req, res) => {
  try {
    const { guildId } = req.body || {};
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { db } = require('./database/db');
    const triggerRoles = db.prepare('SELECT trigger_role_id, target_role_id FROM autoroles_on_role WHERE guild_id = ?').all(guildId);
    if (triggerRoles.length === 0) {
      return res.json({ success: true, syncCount: 0, errorCount: 0, message: "Aucune liaison configurée" });
    }

    const members = await guild.members.fetch();
    const botMember = guild.members.me;
    let syncCount = 0;
    let errorCount = 0;

    for (const member of members.values()) {
      if (member.user.bot) continue;
      for (const rule of triggerRoles) {
        if (member.roles.cache.has(rule.trigger_role_id)) {
          if (!member.roles.cache.has(rule.target_role_id)) {
            const targetRole = guild.roles.cache.get(rule.target_role_id);
            if (targetRole && botMember && targetRole.position < botMember.roles.highest.position) {
              try {
                await member.roles.add(rule.target_role_id);
                syncCount++;
              } catch (e) {
                errorCount++;
              }
            }
          }
        }
      }
    }

    res.json({ success: true, syncCount, errorCount });
  } catch (error) {
    console.error('Erreur autoroles-on-role sync bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/tickets/panel/send', async (req, res) => {
  try {
    const { panelId, force } = req.body || {};
    const { sendOrUpdateTicketPanel } = require('./utils/tickets');
    const result = await sendOrUpdateTicketPanel(panelId, client, !!force);
    res.json(result);
  } catch (error) {
    console.error('Erreur tickets panel send bridge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

apiApp.post('/bot/tickets/panel/delete-message', async (req, res) => {
  try {
    const { guildId, channelId, messageId } = req.body || {};
    const guild = client.guilds.cache.get(guildId);
    if (guild && channelId && messageId) {
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (msg) await msg.delete().catch(() => null);
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur tickets panel delete-message bridge:', error);
    res.json({ success: true });
  }
});

apiApp.post('/bot/forums/scan-reopen', (req, res) => {
  const { scanAndReopenAllUnlimitedForums } = require('./utils/forums');
  scanAndReopenAllUnlimitedForums(client).catch(console.error);
  res.json({ success: true });
});

apiApp.get('/bot/commands', (req, res) => {
  const commandList = [];
  if (client && client.commands) {
    client.commands.forEach((cmd, name) => {
      commandList.push({
        name: cmd.data ? cmd.data.name : name,
        description: cmd.data ? cmd.data.description : (cmd.description || ''),
        category: cmd.category || 'Général'
      });
    });
  }
  res.json(commandList);
});

apiApp.post('/bot/sync-channels-hook', (req, res) => {
  if (client.syncExistingChannels) client.syncExistingChannels();
  res.json({ success: true });
});

apiApp.post('/bot/ai/process-command', async (req, res) => {
  try {
    const { guildId, userId, message, history } = req.body || {};
    const { processAiCommand } = require('./utils/aiAssistant');
    const result = await processAiCommand(guildId, userId, message, client, history || null);
    res.json(result);
  } catch (error) {
    console.error('Erreur ai process-command bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/star/force-election', async (req, res) => {
  try {
    const { guildId } = req.body || {};
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const { runStarElection } = require('./utils/starManager');
    const result = await runStarElection(guild, true);
    if (!result) return res.status(400).json({ error: 'Aucun membre n\'a encore accumulé de points cette semaine.' });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Erreur star force-election bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Commandes Personnalisées API
apiApp.get('/bot/custom-commands/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { getCustomCommands, getCustomCommandSettings } = require('./database/db');
  res.json({
    commands: getCustomCommands(guildId),
    settings: getCustomCommandSettings(guildId)
  });
});

apiApp.post('/bot/custom-commands/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { command_name, description, actions_json, conditions_json } = req.body || {};
  if (!command_name) return res.status(400).json({ error: 'Command name required' });
  const { saveCustomCommand } = require('./database/db');
  const actJson = typeof actions_json === 'string' ? actions_json : JSON.stringify(actions_json || []);
  const condJson = typeof conditions_json === 'string' ? conditions_json : JSON.stringify(conditions_json || []);
  saveCustomCommand(guildId, command_name, description || '', actJson, condJson);
  res.json({ success: true });
});

apiApp.delete('/bot/custom-commands/:guildId/:commandName', (req, res) => {
  const { guildId, commandName } = req.params;
  const { deleteCustomCommand } = require('./database/db');
  deleteCustomCommand(guildId, commandName);
  res.json({ success: true });
});

apiApp.post('/bot/custom-commands/settings/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { prefix, delete_trigger } = req.body;
  const { saveCustomCommandSettings } = require('./database/db');
  saveCustomCommandSettings(guildId, prefix || '/', delete_trigger);
  res.json({ success: true });
});

// Word Reactions API
apiApp.get('/bot/word-reactions/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { getWordReactions, getWordReactionSettings } = require('./database/db');
  res.json({
    reactions: getWordReactions(guildId),
    settings: getWordReactionSettings(guildId)
  });
});

apiApp.post('/bot/word-reactions/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { trigger_word, emojis_json, allowed_roles_json, forbidden_roles_json, allowed_channels_json, forbidden_channels_json } = req.body;
  if (!trigger_word || !emojis_json) return res.status(400).json({ error: 'Trigger word and emojis required' });
  const { addWordReaction } = require('./database/db');
  addWordReaction(
    guildId,
    trigger_word,
    typeof emojis_json === 'string' ? emojis_json : JSON.stringify(emojis_json),
    typeof allowed_roles_json === 'string' ? allowed_roles_json : JSON.stringify(allowed_roles_json || []),
    typeof forbidden_roles_json === 'string' ? forbidden_roles_json : JSON.stringify(forbidden_roles_json || []),
    typeof allowed_channels_json === 'string' ? allowed_channels_json : JSON.stringify(allowed_channels_json || []),
    typeof forbidden_channels_json === 'string' ? forbidden_channels_json : JSON.stringify(forbidden_channels_json || [])
  );
  res.json({ success: true });
});

apiApp.delete('/bot/word-reactions/:guildId/:id', (req, res) => {
  const { guildId, id } = req.params;
  const { deleteWordReaction } = require('./database/db');
  deleteWordReaction(guildId, id);
  res.json({ success: true });
});

apiApp.post('/bot/word-reactions/settings/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { is_enabled } = req.body;
  const { saveWordReactionSettings } = require('./database/db');
  saveWordReactionSettings(guildId, is_enabled);
  res.json({ success: true });
});

// Server Bot Profile API (Custom Logo)
apiApp.get('/bot/server-bot-profile/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { getServerBotProfile } = require('./database/db');
  res.json(getServerBotProfile(guildId));
});

apiApp.post('/bot/server-bot-profile/:guildId', async (req, res) => {
  const { guildId } = req.params;
  const { custom_logo_url, custom_name } = req.body || {};
  const { saveServerBotProfile } = require('./database/db');
  saveServerBotProfile(guildId, custom_logo_url || null, custom_name || null);

  try {
    const { updateGuildBotProfileOnDiscord } = require('./utils/helpers');
    await updateGuildBotProfileOnDiscord(client, guildId, custom_name, custom_logo_url);
  } catch (e) {
    console.error('Erreur mise à jour profil bot:', e);
  }

  res.json({ success: true, custom_logo_url: custom_logo_url || null, custom_name: custom_name || null });
});

// ── GESTIONNAIRE DES MESSAGES (COMMANDES PERSONNALISÉES & RÉACTIONS DE MOTS) ──
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;

  // 1. RÉACTIONS DE MOTS (WORD REACTIONS)
  try {
    const { getWordReactionSettings, getWordReactions } = require('./database/db');
    const wordSettings = getWordReactionSettings(guildId);

    if (wordSettings && wordSettings.is_enabled) {
      const reactions = getWordReactions(guildId);
      if (reactions && reactions.length > 0) {
        const messageContent = message.content.toLowerCase();
        const memberRoles = message.member ? Array.from(message.member.roles.cache.keys()) : [];

        for (const rule of reactions) {
          if (!rule.trigger_word) continue;

          let allowedChannels = [];
          let forbiddenChannels = [];
          try { allowedChannels = JSON.parse(rule.allowed_channels_json || '[]'); } catch (e) {}
          try { forbiddenChannels = JSON.parse(rule.forbidden_channels_json || '[]'); } catch (e) {}

          if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel.id)) continue;
          if (forbiddenChannels.length > 0 && forbiddenChannels.includes(message.channel.id)) continue;

          let allowedRoles = [];
          let forbiddenRoles = [];
          try { allowedRoles = JSON.parse(rule.allowed_roles_json || '[]'); } catch (e) {}
          try { forbiddenRoles = JSON.parse(rule.forbidden_roles_json || '[]'); } catch (e) {}

          if (allowedRoles.length > 0 && !memberRoles.some(r => allowedRoles.includes(r))) continue;
          if (forbiddenRoles.length > 0 && memberRoles.some(r => forbiddenRoles.includes(r))) continue;

          const trigger = rule.trigger_word.toLowerCase();
          if (messageContent.startsWith(trigger) || messageContent.includes(trigger)) {
            let emojis = [];
            try {
              emojis = JSON.parse(rule.emojis_json || '[]');
            } catch (e) {
              if (rule.emojis_json) emojis = [rule.emojis_json];
            }

            for (const emoji of emojis) {
              if (emoji && emoji.trim().length > 0) {
                const cleanEmoji = emoji.trim();
                const matchCustom = cleanEmoji.match(/<?a?:?:?\w*:?(\d{17,20})>?/);
                if (matchCustom && matchCustom[1]) {
                  const emojiId = matchCustom[1];
                  const foundEmoji = message.guild.emojis.cache.get(emojiId) || emojiId;
                  await message.react(foundEmoji).catch(err => console.error('Erreur réaction émoji personnalisé:', err));
                } else {
                  await message.react(cleanEmoji).catch(() => null);
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Erreur traitement réactions de mots:', err);
  }

  // 2. COMMANDES PERSONNALISÉES (CUSTOM COMMANDS)
  try {
    const { getCustomCommandSettings, getCustomCommands, addTemporaryRole, updateEconomy, getEconomy, db } = require('./database/db');
    
    // Récupérer les commandes personnalisées du serveur
    const customCmds = getCustomCommands(guildId);
    if (!customCmds || !Array.isArray(customCmds) || customCmds.length === 0) {
      return;
    }

    const cmdSettings = getCustomCommandSettings(guildId);

    // Vérifier si le message commence par une commande personnalisée
    const messageContent = message.content.trim();
    const prefix = cmdSettings.prefix || '/';
    
    if (!messageContent.startsWith(prefix)) {
      return;
    }

    const cleanContent = messageContent.slice(prefix.length).trim();
    const args = cleanContent.split(/\s+/);
    const cmdName = args.shift()?.toLowerCase();

    if (!cmdName) return;

    const matchedCmd = customCmds.find(c => c.command_name.toLowerCase() === cmdName);
    if (!matchedCmd) return;

    let actions = [];
    let conditions = [];
    try { actions = JSON.parse(matchedCmd.actions_json || '[]'); } catch (e) {}
    try { conditions = JSON.parse(matchedCmd.conditions_json || '[]'); } catch (e) {}

    const member = message.member;
    const author = message.author;
    const guild = message.guild;

    // 1. ÉVALUATION DES CONDITIONS
    let passedConditions = true;
    let refusalMessage = null;

    if (Array.isArray(conditions)) {
      for (const cond of conditions) {
        if (!cond || !cond.type) continue;

        if (cond.type === 'has_server_tag') {
          const autoServerTag = (cond.tag && cond.tag.trim().length > 0) ? cond.tag.trim() : getGuildTag(guild);
          const isOwnerOrAdmin = member && (guild?.ownerId === author?.id || member?.permissions.has('Administrator'));

          let hasTag = true;
          if (autoServerTag.length > 0 && !isOwnerOrAdmin) {
            hasTag = hasMemberTag(member, autoServerTag);
          }

          if (!hasTag) {
            passedConditions = false;
            refusalMessage = cond.refusalMessage || `❌ Vous devez posséder le tag du serveur (**${autoServerTag}**) dans votre pseudo pour utiliser cette commande.`;
            break;
          } else if (cond.autoRoleId && guild) {
            // Attribuer ou retirer le rôle à TOUTES LES PERSONNES DU SERVEUR SELON LE TAG
            (async () => {
              try {
                let membersList = guild.members.cache;
                if (!membersList || membersList.size < 5) {
                  membersList = await guild.members.fetch().catch(() => guild.members.cache);
                }

                if (membersList && membersList.size > 0 && autoServerTag.length > 0) {
                  const matching = membersList.filter(m => !m.user.bot && hasMemberTag(m, autoServerTag));
                  const notMatching = membersList.filter(m => !m.user.bot && !matching.has(m.id));

                  console.log(`[TAG AUTO-ROLE] Tag officiel du serveur "${autoServerTag}". ${membersList.size} membres analysés sur "${guild.name}". ${matching.size} avec tag (+ rôle), ${notMatching.size} sans tag (- rôle).`);

                  // 1. Ajouter le rôle à tous ceux qui ONT le tag dans leur pseudo
                  for (const [, targetM] of matching) {
                    if (!targetM.roles.cache.has(cond.autoRoleId)) {
                      await targetM.roles.add(cond.autoRoleId).catch(err => {
                        console.error(`[TAG AUTO-ROLE] Erreur ajout rôle à ${targetM.user.tag}:`, err.message);
                      });
                    }
                  }

                  // 2. Retirer le rôle à tous ceux qui N'ONT PAS / PLUS le tag dans leur pseudo
                  for (const [, targetM] of notMatching) {
                    if (targetM.roles.cache.has(cond.autoRoleId)) {
                      await targetM.roles.remove(cond.autoRoleId).catch(err => {
                        console.error(`[TAG AUTO-ROLE] Erreur retrait rôle à ${targetM.user.tag}:`, err.message);
                      });
                    }
                  }
                }
              } catch (err) {
                console.error('[TAG ALL MEMBERS] Erreur globale:', err.message);
              }
            })();
          }
        } else if (cond.type === 'is_booster') {
          if (!member?.premiumSince) {
            passedConditions = false;
            refusalMessage = cond.refusalMessage || `❌ Cette commande est réservée aux **Boosters** du serveur ! 🚀`;
            break;
          }
        } else if (cond.type === 'has_role' && cond.roleId) {
          if (!member?.roles.cache.has(cond.roleId)) {
            passedConditions = false;
            refusalMessage = cond.refusalMessage || `❌ Vous ne possédez pas le rôle requis pour utiliser cette commande.`;
            break;
          }
        } else if (cond.type === 'lacks_role' && cond.roleId) {
          if (member?.roles.cache.has(cond.roleId)) {
            passedConditions = false;
            refusalMessage = cond.refusalMessage || `❌ Vous possédez un rôle qui vous interdit d'utiliser cette commande.`;
            break;
          }
        }
      }
    }

    if (!passedConditions) {
      if (refusalMessage) {
        await message.channel.send(refusalMessage).catch(() => null);
      }
      return;
    }

    // Détecter si un membre/utilisateur est mentionné dans le message
    const mentionedMember = message.mentions.members?.first() || null;
    const mentionedUser = message.mentions.users?.first() || (mentionedMember ? mentionedMember.user : null);

    // Cible automatique : le membre mentionné s'il existe, sinon l'auteur de la commande
    const targetMem = mentionedMember || member || null;
    const targetUserObj = mentionedUser || author || message.author;

    // Formatage des variables avec support automatique de la mention
    const formatVars = (str) => {
      if (!str || typeof str !== 'string') return str;
      const tgtUser = targetUserObj || author || message.author;
      const targetMentionStr = tgtUser ? `<@${tgtUser.id}>` : `<@${author.id}>`;
      const authorMentionStr = `<@${author.id}>`;

      return str
        .replace(/\{user\}/gi, targetMentionStr)
        .replace(/\{user_mention\}/gi, targetMentionStr)
        .replace(/\{author\}/gi, authorMentionStr)
        .replace(/\{username\}/gi, tgtUser ? tgtUser.username : author.username)
        .replace(/\{author_username\}/gi, author.username)
        .replace(/\{user_id\}/gi, tgtUser ? tgtUser.id : author.id)
        .replace(/\{target\}/gi, targetMentionStr)
        .replace(/\{mentioned_user\}/gi, targetMentionStr)
        .replace(/\{target_username\}/gi, tgtUser ? tgtUser.username : author.username)
        .replace(/\{server\}/gi, guild ? guild.name : 'Serveur')
        .replace(/\{guild_name\}/gi, guild ? guild.name : 'Serveur')
        .replace(/\{membercount\}/gi, guild ? (guild.memberCount || 0).toString() : '0')
        .replace(/\{channel\}/gi, `<#${message.channel.id}>`);
    };

    // Supprimer le message si configuré globalement OU s'il existe une action delete_trigger
    let shouldDelete = Number(cmdSettings.delete_trigger) === 1;
    if (actions.some(a => a.type === 'delete_trigger')) {
      shouldDelete = true;
    }

    if (shouldDelete && message.deletable) {
      await message.delete().catch(() => null);
    }

    // 2. EXÉCUTION DES ACTIONS EN CHAÎNE
    for (const action of actions) {
      const tgtUserId = targetUserObj ? targetUserObj.id : author.id;

      if ((action.type === 'reply' || action.type === 'text') && (action.text || action.content)) {
        let content = formatVars(action.text || action.content);
        if (mentionedUser && !content.includes(`<@${mentionedUser.id}>`)) {
          content = `<@${mentionedUser.id}> ${content}`;
        }
        if (content && content.trim().length > 0) {
          await message.channel.send({ content, allowedMentions: { users: [tgtUserId] } }).catch(() => null);
        }
      } else if (action.type === 'embed') {
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setColor(action.color || '#5865F2')
          .setTimestamp();
        if (action.title) embed.setTitle(formatVars(action.title));
        if (action.description) embed.setDescription(formatVars(action.description));
        if (action.imageUrl) embed.setImage(action.imageUrl);
        if (action.thumbnailUrl) embed.setThumbnail(action.thumbnailUrl);
        if (action.footer) embed.setFooter({ text: formatVars(action.footer) });
        await message.channel.send({ embeds: [embed] }).catch(() => null);
      } else if ((action.type === 'add_role' || action.type === 'add_roles') && (action.roleId || action.roleIds)) {
        const roleIds = action.roleIds || [action.roleId];
        if (targetMem && targetMem.roles) {
          for (const rId of roleIds) {
            if (rId) await targetMem.roles.add(rId).catch(err => console.error('[ADD ROLE ERR]', err.message));
          }
        }
      } else if (action.type === 'add_temp_role' && action.roleId && action.durationMs) {
        if (targetMem && targetMem.roles && action.roleId) {
          await targetMem.roles.add(action.roleId).catch(err => console.error('[TEMP ROLE ERR]', err.message));
          if (addTemporaryRole) {
            addTemporaryRole(guildId, tgtUserId, action.roleId, Date.now() + Number(action.durationMs));
          }
        }
      } else if ((action.type === 'remove_role' || action.type === 'remove_roles') && (action.roleId || action.roleIds)) {
        const roleIds = action.roleIds || [action.roleId];
        if (targetMem && targetMem.roles) {
          for (const rId of roleIds) {
            if (rId) await targetMem.roles.remove(rId).catch(err => console.error('[REMOVE ROLE ERR]', err.message));
          }
        }
      } else if ((action.type === 'give_item' || action.type === 'shop_item') && action.itemName) {
        const qty = Number(action.quantity) || 1;
        const existing = db.prepare('SELECT quantity FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?')
          .get(guildId, tgtUserId, action.itemName);
        if (existing) {
          db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE guild_id = ? AND user_id = ? AND item_name = ?')
            .run(qty, guildId, tgtUserId, action.itemName);
        } else {
          db.prepare('INSERT INTO inventory (guild_id, user_id, item_name, quantity) VALUES (?, ?, ?, ?)')
            .run(guildId, tgtUserId, action.itemName, qty);
        }
      } else if (action.type === 'add_money' && action.amount) {
        const amt = Number(action.amount) || 0;
        if (amt !== 0 && getEconomy && updateEconomy) {
          const eco = getEconomy(guildId, tgtUserId);
          updateEconomy(guildId, tgtUserId, { bank: (eco?.bank || 0) + amt });
        }
      }
    }
  } catch (err) {
    console.error('Erreur traitement commande personnalisée:', err);
  }
});

// Synchronisation en temps réel du rôle de tag lorsqu'un membre modifie son pseudo Discord
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (!newMember || !newMember.guild || newMember.user.bot) return;
  const guildId = newMember.guild.id;
  try {
    const { getCustomCommands } = require('./database/db');
    const customCmds = getCustomCommands(guildId);
    if (!customCmds || !Array.isArray(customCmds)) return;

    for (const cmd of customCmds) {
      let conditions = [];
      try { conditions = JSON.parse(cmd.conditions_json || '[]'); } catch (e) {}
      for (const cond of conditions) {
        if (cond && cond.type === 'has_server_tag' && cond.autoRoleId) {
          const autoServerTag = (cond.tag && cond.tag.trim().length > 0) ? cond.tag.trim() : ((await getOfficialGuildTag(newMember.guild)) || getGuildTag(newMember.guild));
          if (autoServerTag.length > 0) {
            const hasTagNow = hasMemberTag(newMember, autoServerTag);

            if (hasTagNow) {
              if (!newMember.roles.cache.has(cond.autoRoleId)) {
                await newMember.roles.add(cond.autoRoleId).catch(() => null);
              }
            } else {
              if (newMember.roles.cache.has(cond.autoRoleId)) {
                await newMember.roles.remove(cond.autoRoleId).catch(() => null);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Erreur guildMemberUpdate tag role sync:', err);
  }
});

apiApp.listen(API_PORT, '127.0.0.1', () => {
  console.log(`✓ Bot Local API running on port ${API_PORT}`);
});

async function checkExpiredSuites(client) {
  try {
    const now = Date.now();
    const { getAllPrivateSuites, deletePrivateSuite } = require('./database/db');
    const suites = getAllPrivateSuites();
    
    for (const suite of suites) {
      const guild = client.guilds.cache.get(suite.guild_id) || await client.guilds.fetch(suite.guild_id).catch(() => null);
      if (!guild) continue;

      let txtChan = suite.text_channel_id ? (guild.channels.cache.get(suite.text_channel_id) || await guild.channels.fetch(suite.text_channel_id).catch(() => null)) : null;
      let vcChan = suite.voice_channel_id ? (guild.channels.cache.get(suite.voice_channel_id) || await guild.channels.fetch(suite.voice_channel_id).catch(() => null)) : null;

      if (suite.expires_at <= now) {
        if (txtChan) {
          await txtChan.send('⏳ **Cette suite privée a expiré et va être supprimée...**').catch(() => {});
          setTimeout(async () => {
            await txtChan.delete().catch(() => {});
          }, 5000);
        }
        if (vcChan) {
          await vcChan.delete().catch(() => {});
        }

        const user = await client.users.fetch(suite.user_id).catch(() => null);
        if (user) {
          await user.send(`⏳ Votre suite privée sur le serveur **${guild.name}** a expiré et ses salons ont été supprimés.`).catch(() => {});
        }

        deletePrivateSuite(suite.guild_id, suite.user_id);
      }
    }
  } catch (err) {
    console.error('Erreur nettoyage suites privées:', err);
  }
}

async function syncExistingChannels(client) {
  try {
    const { getAllPrivateSuites, getShopConfig, db } = require('./database/db');
    const { getAllTribunalCases, getTribunalConfig } = require('./utils/tribunal_db');
    const { sendOrUpdateTicketPanel } = require('./utils/tickets');

    // 1. Resynchronisation des Suites Privées actives en base de données (ex: Jormungand)
    const suites = getAllPrivateSuites();
    const processedChannelIds = new Set();

    for (const suite of suites) {
      const guild = client.guilds.cache.get(suite.guild_id) || await client.guilds.fetch(suite.guild_id).catch(() => null);
      if (!guild) continue;

      const shopCfg = getShopConfig(suite.guild_id);
      const prefix = shopCfg.suiteChannelPrefix || '👑・suite-privée-';
      
      const member = await guild.members.fetch(suite.user_id).catch(() => null);
      const rawName = member ? (member.user.username || member.displayName) : suite.user_id;
      const cleanName = rawName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'suite';

      // Salon Textuel
      if (suite.text_channel_id) {
        processedChannelIds.add(suite.text_channel_id);
        const txtChan = guild.channels.cache.get(suite.text_channel_id) || await guild.channels.fetch(suite.text_channel_id).catch(() => null);
        if (txtChan) {
          const targetName = `${prefix}${cleanName}`.slice(0, 90);
          if (txtChan.name !== targetName) {
            await txtChan.setName(targetName).catch(err => console.error(`Erreur renommer text channel ${txtChan.id}:`, err.message));
          }
        }
      }

      // Salon Vocal (si présent)
      if (suite.voice_channel_id) {
        processedChannelIds.add(suite.voice_channel_id);
        const vcChan = guild.channels.cache.get(suite.voice_channel_id) || await guild.channels.fetch(suite.voice_channel_id).catch(() => null);
        if (vcChan) {
          const targetVcName = `👑 🔊 │ Suite de ${rawName.slice(0, 30)}`;
          if (vcChan.name !== targetVcName) {
            await vcChan.setName(targetVcName).catch(err => console.error(`Erreur renommer voice channel ${vcChan.id}:`, err.message));
          }
        }
      }
    }

    // 2. Restauration des anciens salons normaux (Secret Nest, Maxou, Miss/Mister) s'ils ont été renommés par erreur
    for (const [guildId, guild] of client.guilds.cache) {
      const channels = await guild.channels.fetch().catch(() => null);
      if (!channels) continue;

      for (const [chanId, chan] of channels.entries()) {
        if (!chan || !chan.name) continue;
        const nameLower = chan.name.toLowerCase();

        if (nameLower.includes('secret-nest') && (chan.name.startsWith('👑') || chan.name.startsWith('🛋️'))) {
          await chan.setName('suite-the-secret-nest').catch(() => {});
        } else if (nameLower.includes('maxou') && (chan.name.startsWith('👑') || chan.name.startsWith('🛋️'))) {
          await chan.setName('suite-de-maxou').catch(() => {});
        } else if ((nameLower.includes('miss') || nameLower.includes('mister')) && (chan.name.startsWith('👑') || chan.name.startsWith('🛋️'))) {
          await chan.setName('suite-miss-et-mister').catch(() => {});
        }
      }
    }

    // 3. Mettre à jour les panels d'embeds principaux (Tickets / Support) sans les renvoyer à neuf
    try {
      const panels = db.prepare('SELECT id FROM ticket_panels').all();
      for (const p of panels) {
        await sendOrUpdateTicketPanel(p.id, client, false).catch(() => {});
      }
    } catch (e) {}

    // 4. Resynchronisation des Procès du Tribunal existants
    const cases = getAllTribunalCases();
    for (const c of cases) {
      if (c.status === 'closed' || !c.channelId) continue;

      const guild = client.guilds.cache.get(c.guildId) || await client.guilds.fetch(c.guildId).catch(() => null);
      if (!guild) continue;

      const tribCfg = getTribunalConfig(c.guildId);
      const prefix = (tribCfg && tribCfg.channelPrefix) ? tribCfg.channelPrefix : '⚖️・procès-';

      const ch = guild.channels.cache.get(c.channelId) || await guild.channels.fetch(c.channelId).catch(() => null);
      if (ch) {
        const accusedMember = await guild.members.fetch(c.accusedId).catch(() => null);
        const accusedName = accusedMember?.displayName || accusedMember?.user?.username || 'accuse';
        const cleanName = accusedName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const targetName = `${prefix}${cleanName}`.slice(0, 90);

        if (ch.name !== targetName) {
          await ch.setName(targetName).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('Erreur resynchronisation des salons:', err);
  }
}

async function checkExpiredTemporaryRoles(client) {
  try {
    const now = Date.now();
    const { getTemporaryRoles, deleteTemporaryRole } = require('./database/db');
    const tempRoles = getTemporaryRoles();

    for (const entry of tempRoles) {
      if (entry.expires_at <= now) {
        const guild = client.guilds.cache.get(entry.guild_id);
        if (guild) {
          const member = await guild.members.fetch(entry.user_id).catch(() => null);
          if (member) {
            const role = guild.roles.cache.get(entry.role_id);
            if (role) {
              await member.roles.remove(role).catch(console.error);
              await member.send(`⏳ Votre rôle temporaire **${role.name}** sur le serveur **${guild.name}** a expiré et vous a été retiré.`).catch(() => {});
            }
          }
        }
        deleteTemporaryRole(entry.guild_id, entry.user_id, entry.role_id);
      }
    }
  } catch (err) {
    console.error('Erreur nettoyage rôles temporaires:', err);
  }
}

async function checkBumpReminders(client) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const { getBumpConfig, db } = require('./database/db');
    const expiredReminders = db.prepare('SELECT * FROM bump_reminders WHERE next_bump_at <= ?').all(now);

    for (const reminder of expiredReminders) {
      try {
        const guild = client.guilds.cache.get(reminder.guild_id);
        if (guild) {
          const bumpConfig = getBumpConfig(reminder.guild_id);
          const channelId = bumpConfig.reminder_channel || reminder.channel_id;
          const channel = guild.channels.cache.get(channelId);

          if (channel) {
            const roleMention = bumpConfig.reminder_role ? `<@&${bumpConfig.reminder_role}>` : '';
            const { generateAiBumpPhrase } = require('./utils/aiActionHelper');
            const aiMessage = await generateAiBumpPhrase(reminder.bot_name, reminder.guild_id);
            const desc = aiMessage || `✨ Il est temps de bump le serveur avec le bot **${reminder.bot_name.toUpperCase()}** !`;

            const embed = new EmbedBuilder()
              .setTitle('🔔 Rappel de Bump !')
              .setDescription(desc)
              .setColor('#5865F2')
              .setTimestamp();

            await channel.send({
              content: roleMention || undefined,
              embeds: [embed]
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error(`Erreur d'envoi du rappel de bump pour le serveur ${reminder.guild_id}:`, err);
      } finally {
        db.prepare('DELETE FROM bump_reminders WHERE guild_id = ? AND bot_name = ?').run(reminder.guild_id, reminder.bot_name);
      }
    }
  } catch (err) {
    console.error('Erreur vérification rappels bumps:', err);
  }
}

async function applyColorRole(interaction, hexColor) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const { db } = require('./database/db');

  let hex = hexColor.trim().replace('#', '').toUpperCase();
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ Code couleur HEX invalide. Format attendu : `#FF5733` ou `FF5733`.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Code couleur HEX invalide. Format attendu : `#FF5733` ou `FF5733`.', ephemeral: true });
      }
    } catch (_) {}
    return;
  }

  if (hex === '000000') hex = '000001';

  const invItem = db.prepare("SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name LIKE '%rôle couleur%'").get(guildId, userId);
  if (!invItem || invItem.quantity <= 0) {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ Vous ne possédez plus l\'article **🌈 Rôle couleur** dans votre inventaire.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Vous ne possédez plus l\'article **🌈 Rôle couleur** dans votre inventaire.', ephemeral: true });
      }
    } catch (_) {}
    return;
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true }).catch(() => null);
  }

  const member = interaction.member;
  const guild = interaction.guild;
  const botMember = guild.members.me;

  const roleName = `Couleur #${hex}`;
  let role = guild.roles.cache.find(r => r.name === roleName);
  
  if (!role) {
    try {
      role = await guild.roles.create({
        name: roleName,
        color: `#${hex}`,
        reason: `Couleur de pseudo pour ${member.user.username}`
      });
      
      if (botMember.roles.highest.position > 1) {
        await role.setPosition(botMember.roles.highest.position - 1).catch(() => null);
      }
    } catch (err) {
      console.error('Failed to create role:', err);
      return interaction.editReply({ content: '❌ Impossible de créer le rôle de couleur. Vérifiez les permissions de mon rôle le plus élevé.' }).catch(() => null);
    }
  }

  const colorRoles = member.roles.cache.filter(r => r.name.startsWith('Couleur #'));
  for (const [rId, r] of colorRoles) {
    if (rId !== role.id) {
      await member.roles.remove(r).catch(console.error);
    }
  }

  try {
    await member.roles.add(role);
  } catch (err) {
    console.error('Failed to assign role:', err);
    return interaction.editReply({ content: '❌ Je n\'ai pas pu vous attribuer le rôle. Assurez-vous que le rôle créé n\'est pas au-dessus de mon rôle le plus élevé.' }).catch(() => null);
  }

  if (invItem.quantity > 1) {
    db.prepare("UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?")
      .run(guildId, userId, invItem.item_name);
  } else {
    db.prepare("DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?")
      .run(guildId, userId, invItem.item_name);
  }

  setTimeout(async () => {
    try {
      guild.roles.cache.filter(r => r.name.startsWith('Couleur #') && r.members.size === 0).forEach(async r => {
        await r.delete().catch(() => null);
      });
    } catch (_) {}
  }, 10000);

  return interaction.editReply({ content: `🎨 **Couleur appliquée avec succès !** Votre pseudo s'affiche désormais en **#${hex}**.` }).catch(() => null);
}

// Connexion du bot
if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch(console.error);
} else {
  console.log('⚠️ Aucun DISCORD_TOKEN configuré dans .env - Le Dashboard fonctionne en mode web.');
}

// Traitement automatique des messages embeds récurrents programmés (Heure de France Europe/Paris)
function getFranceDateAndTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  let year = '', month = '', day = '', hour = '', minute = '';
  for (const p of parts) {
    if (p.type === 'year') year = p.value;
    if (p.type === 'month') month = p.value;
    if (p.type === 'day') day = p.value;
    if (p.type === 'hour') hour = p.value;
    if (p.type === 'minute') minute = p.value;
  }
  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hour}:${minute}`,
    timestamp: Math.floor(now.getTime() / 1000)
  };
}

async function checkRecurringEmbeds() {
  try {
    if (!client || !client.isReady()) return;
    const { db } = require('./database/db');
    const recurringList = db.prepare('SELECT * FROM recurring_embeds WHERE is_active = 1').all();
    if (!recurringList || recurringList.length === 0) return;

    const { dateStr: currentFranceDate, timeStr: currentHHMM, timestamp: currentTimestamp } = getFranceDateAndTime();

    const hostIp = process.env.PUBLIC_IP || '82.65.75.176';
    const dashPort = process.env.PORT || process.env.DASHBOARD_PORT || 49601;
    const publicBase = process.env.PUBLIC_URL || `http://${hostIp}:${dashPort}`;

    for (const item of recurringList) {
      let shouldSend = false;
      const lastSentTs = item.last_sent || 0;
      const timeSinceLast = currentTimestamp - lastSentTs;

      if (item.frequency === 'daily') {
        const targetTime = item.send_time || '12:00';
        let lastSentDateStr = '';
        if (lastSentTs > 0) {
          const lastSentDateObj = new Date(lastSentTs * 1000);
          const fParts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(lastSentDateObj);
          let y = '', m = '', d = '';
          for (const p of fParts) {
            if (p.type === 'year') y = p.value;
            if (p.type === 'month') m = p.value;
            if (p.type === 'day') d = p.value;
          }
          lastSentDateStr = `${y}-${m}-${d}`;
        }

        if (lastSentDateStr !== currentFranceDate && currentHHMM >= targetTime) {
          shouldSend = true;
        }
      } else if (item.frequency === 'weekly') {
        const targetTime = item.send_time || '12:00';
        if (timeSinceLast >= 604800 - 300 && currentHHMM >= targetTime) {
          shouldSend = true;
        }
      } else {
        let intervalSec = 3600;
        if (item.frequency === '6h') intervalSec = 21600;
        else if (item.frequency === '12h') intervalSec = 43200;

        if (timeSinceLast >= intervalSec - 30) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        const guild = client.guilds.cache.get(item.guild_id);
        if (guild) {
          const channel = guild.channels.cache.get(item.channel_id);
          if (channel && channel.isTextBased()) {
            const embed = new EmbedBuilder();
            if (item.title && item.title.trim()) embed.setTitle(item.title.trim());
            if (item.description && item.description.trim()) embed.setDescription(item.description.trim());
            if (!item.title && !item.description) embed.setDescription('\u200b');
            embed.setColor(item.color || '#5865F2');

            const files = [];

            if (item.image_url && typeof item.image_url === 'string') {
              const cleanImg = item.image_url.trim();
              if (cleanImg.startsWith('/uploads/')) {
                const absPath = path.join(__dirname, '../public', cleanImg);
                if (fs.existsSync(absPath)) {
                  const name = 'img_' + path.basename(cleanImg);
                  files.push(new AttachmentBuilder(absPath, { name }));
                  embed.setImage(`attachment://${name}`);
                } else {
                  embed.setImage(`${publicBase}${cleanImg}`);
                }
              } else if (cleanImg.startsWith('http://') || cleanImg.startsWith('https://')) {
                embed.setImage(cleanImg);
              }
            }

            if (item.author_name && item.author_name.trim()) {
              const authorObj = { name: item.author_name.trim() };
              if (item.author_icon && item.author_icon.trim()) {
                const cleanAuthIcon = item.author_icon.trim();
                if (cleanAuthIcon.startsWith('/uploads/')) authorObj.iconURL = `${publicBase}${cleanAuthIcon}`;
                else if (cleanAuthIcon.startsWith('http')) authorObj.iconURL = cleanAuthIcon;
              }
              embed.setAuthor(authorObj);
            }

            if (item.footer_text && item.footer_text.trim()) {
              embed.setFooter({ text: item.footer_text.trim() });
            }

            embed.setTimestamp();

            let contentPayload = undefined;
            if (item.ping_type === 'everyone') contentPayload = '@everyone';
            else if (item.ping_type === 'here') contentPayload = '@here';

            const payload = { content: contentPayload, embeds: [embed] };
            if (files.length > 0) payload.files = files;

            await channel.send(payload).catch(console.error);

            db.prepare('UPDATE recurring_embeds SET last_sent = ? WHERE id = ?').run(currentTimestamp, item.id);
            console.log(`[RECURRING EMBED] Message récurrent #${item.id} envoyé avec succès dans le salon #${channel.name} (${guild.name}) !`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Erreur vérification embeds récurrents:', err);
  }
}

setInterval(checkRecurringEmbeds, 60000);

module.exports = { client };

// Lancement du Dashboard Premium (v1 & v2)
require('./dashboard');
try {
  require('./dashboard2');
} catch (e) {
  console.error('Erreur chargement dashboard2:', e);
}
