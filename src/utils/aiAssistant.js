const { getAutomodConfig, updateAutomodConfig, db, getCustomActionMessage, updateCustomActionMessage } = require('../database/db');
const { EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');

/**
 * Dictionnaire complet de résolution des permissions Discord
 */
function parsePermissions(permsInput) {
  if (!permsInput) return [];
  const permsArray = Array.isArray(permsInput) ? permsInput : [permsInput];

  // Si "all", "tout", "toutes", ou "all_permissions" est présent -> Renvoyer TOUTES les permissions BigInt Discord
  if (permsArray.some(p => typeof p === 'string' && ['all', 'tout', 'toutes', 'all_permissions', 'full'].includes(p.toLowerCase().trim()))) {
    return Object.values(PermissionFlagsBits).filter(v => typeof v === 'bigint');
  }

  const resolved = [];

  const PERM_LOOKUP = {
    // Admin & Serveur
    'administrator': PermissionFlagsBits.Administrator,
    'admin': PermissionFlagsBits.Administrator,
    'manageguild': PermissionFlagsBits.ManageGuild,
    'manageserver': PermissionFlagsBits.ManageGuild,
    'gererserveur': PermissionFlagsBits.ManageGuild,
    'manageroles': PermissionFlagsBits.ManageRoles,
    'gererroles': PermissionFlagsBits.ManageRoles,
    'managechannels': PermissionFlagsBits.ManageChannels,
    'gerersalons': PermissionFlagsBits.ManageChannels,

    // Membres, Sanctions & Modération
    'kickmembers': PermissionFlagsBits.KickMembers,
    'expulser': PermissionFlagsBits.KickMembers,
    'banmembers': PermissionFlagsBits.BanMembers,
    'bannir': PermissionFlagsBits.BanMembers,
    'moderatemembers': PermissionFlagsBits.ModerateMembers,
    'timeoutmembers': PermissionFlagsBits.ModerateMembers,
    'timeout': PermissionFlagsBits.ModerateMembers,
    'exclure': PermissionFlagsBits.ModerateMembers,
    'excluretemporairement': PermissionFlagsBits.ModerateMembers,
    'exclusiontemporaire': PermissionFlagsBits.ModerateMembers,

    // Messages, Épinglage & Mode lent
    'sendmessages': PermissionFlagsBits.SendMessages,
    'envoyermessages': PermissionFlagsBits.SendMessages,
    'managemessages': PermissionFlagsBits.ManageMessages,
    'gerermessages': PermissionFlagsBits.ManageMessages,
    'epingler': PermissionFlagsBits.ManageMessages,
    'epinglermessages': PermissionFlagsBits.ManageMessages,
    'pinmessages': PermissionFlagsBits.ManageMessages,
    'ignorermodelent': PermissionFlagsBits.BypassSlowmode || PermissionFlagsBits.ManageMessages,
    'bypassslowmode': PermissionFlagsBits.BypassSlowmode || PermissionFlagsBits.ManageMessages,
    'readmessagehistory': PermissionFlagsBits.ReadMessageHistory,
    'voirhistorique': PermissionFlagsBits.ReadMessageHistory,
    'mentioneveryone': PermissionFlagsBits.MentionEveryone,
    'mentionnertoutlemonde': PermissionFlagsBits.MentionEveryone,

    // Fils de discussion (Threads)
    'managethreads': PermissionFlagsBits.ManageThreads,
    'gererfils': PermissionFlagsBits.ManageThreads,
    'gererlesfils': PermissionFlagsBits.ManageThreads,
    'createpublicthreads': PermissionFlagsBits.CreatePublicThreads,
    'createprivatethreads': PermissionFlagsBits.CreatePrivateThreads,
    'sendmessagesinthreads': PermissionFlagsBits.SendMessagesInThreads,

    // Expressions, Emojis & Stickers
    'createguildexpressions': PermissionFlagsBits.CreateGuildExpressions || PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
    'creerexpressions': PermissionFlagsBits.CreateGuildExpressions || PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
    'manageguildexpressions': PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
    'gererexpressions': PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
    'gererlesexpressions': PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
    'manageemojisandstickers': PermissionFlagsBits.ManageEmojisAndStickers,
    'gereremojis': PermissionFlagsBits.ManageEmojisAndStickers,
    'useexternalemojis': PermissionFlagsBits.UseExternalEmojis,
    'useexternalstickers': PermissionFlagsBits.UseExternalStickers,

    // Événements (Events)
    'createevents': PermissionFlagsBits.CreateEvents || PermissionFlagsBits.ManageEvents,
    'creerevenements': PermissionFlagsBits.CreateEvents || PermissionFlagsBits.ManageEvents,
    'manageevents': PermissionFlagsBits.ManageEvents,
    'gererevenements': PermissionFlagsBits.ManageEvents,
    'evenements': PermissionFlagsBits.ManageEvents,

    // Voix & Salon Vocal
    'connect': PermissionFlagsBits.Connect,
    'seconnecter': PermissionFlagsBits.Connect,
    'speak': PermissionFlagsBits.Speak,
    'parler': PermissionFlagsBits.Speak,
    'priorityspeaker': PermissionFlagsBits.PrioritySpeaker,
    'voixprioritaire': PermissionFlagsBits.PrioritySpeaker,
    'mutemembers': PermissionFlagsBits.MuteMembers,
    'muter': PermissionFlagsBits.MuteMembers,
    'deafenmembers': PermissionFlagsBits.DeafenMembers,
    'assourdir': PermissionFlagsBits.DeafenMembers,
    'movemembers': PermissionFlagsBits.MoveMembers,
    'deplacer': PermissionFlagsBits.MoveMembers,

    // Salons & Divers
    'viewchannel': PermissionFlagsBits.ViewChannel,
    'voirsalons': PermissionFlagsBits.ViewChannel,
    'embedlinks': PermissionFlagsBits.EmbedLinks,
    'integrerliens': PermissionFlagsBits.EmbedLinks,
    'attachfiles': PermissionFlagsBits.AttachFiles,
    'joindrefichiers': PermissionFlagsBits.AttachFiles,
    'useapplicationcommands': PermissionFlagsBits.UseApplicationCommands,
    'stream': PermissionFlagsBits.Stream,
    'video': PermissionFlagsBits.Stream
  };

  permsArray.forEach(perm => {
    if (typeof perm !== 'string') return;
    const cleanKey = perm.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (PERM_LOOKUP[cleanKey]) {
      resolved.push(PERM_LOOKUP[cleanKey]);
    } else if (PermissionFlagsBits[perm]) {
      resolved.push(PermissionFlagsBits[perm]);
    }
  });

  return resolved;
}

async function processAiCommand(guildId, userId, message, client) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return { reply: "❌ Erreur : Serveur introuvable." };
  }

  // Helpers de recherche d'entités par nom
  // Helpers asynchrones de recherche d'entités par nom (avec fetch API si cache vide)
  const findRole = async (name) => {
    if (!name) return null;
    const clean = name.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/^@/, '');
    let role = guild.roles.cache.find(r => r.name.toLowerCase() === clean || r.id === clean);
    if (!role) {
      const fetchedRoles = await guild.roles.fetch().catch(() => null);
      if (fetchedRoles) {
        role = fetchedRoles.find(r => r.name.toLowerCase() === clean || r.id === clean);
      }
    }
    return role;
  };

  const findChannel = async (name) => {
    if (!name) return null;
    const clean = name.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/^#/, '');
    let channel = guild.channels.cache.find(c => c.name.toLowerCase() === clean || c.id === clean);
    if (!channel) {
      const fetchedChannels = await guild.channels.fetch().catch(() => null);
      if (fetchedChannels) {
        channel = fetchedChannels.find(c => c.name.toLowerCase() === clean || c.id === clean);
      }
    }
    return channel;
  };

  const findMember = async (name) => {
    if (!name) return null;
    const clean = name.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/^@/, '');
    let member = guild.members.cache.find(m => 
      m.user.username.toLowerCase() === clean || 
      m.user.tag.toLowerCase() === clean || 
      (m.nickname && m.nickname.toLowerCase() === clean) || 
      m.id === clean
    );
    if (!member) {
      const searchRes = await guild.members.search({ query: clean, limit: 5 }).catch(() => null);
      if (searchRes && searchRes.size > 0) {
        member = searchRes.first();
      }
      if (!member && /^\d+$/.test(clean)) {
        member = await guild.members.fetch(clean).catch(() => null);
      }
    }
    return member;
  };

  // Récupérer et lister tous les rôles et salons du serveur de manière propre et très compacte
  const fetchedRoles = await guild.roles.fetch().catch(() => null);
  const fetchedChannels = await guild.channels.fetch().catch(() => null);

  const mainPermissionsList = [
    'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'KickMembers',
    'BanMembers', 'CreateInstantInvite', 'ManageNicknames', 'ChangeNickname', 'ManageWebhooks',
    'ViewChannel', 'SendMessages', 'SendTTSMessages', 'ManageMessages', 'EmbedLinks',
    'AttachFiles', 'ReadMessageHistory', 'MentionEveryone', 'UseExternalEmojis', 'AddReactions',
    'Connect', 'Speak', 'MuteMembers', 'DeafenMembers', 'MoveMembers', 'UseVAD'
  ].map(key => `"${key}"`).join(', ');

  const rolesList = Array.from((fetchedRoles || guild.roles.cache).values())
    .filter(r => r.name !== '@everyone')
    .filter(r => !r.name.includes('---') && !r.name.includes('──') && !r.name.includes('===') && !r.name.includes('___'))
    .sort((a, b) => b.position - a.position)
    .slice(0, 45)
    .map(r => `@${r.name} (ID: ${r.id})`)
    .join(', ');

  const channelsList = Array.from((fetchedChannels || guild.channels.cache).values())
    .slice(0, 50)
    .map(c => {
      let typeStr = 'Texte';
      if (c.type === 4) typeStr = 'Catégorie';
      else if (c.type === 2) typeStr = 'Vocal';
      else if (c.type === 5) typeStr = 'Annonces';
      else if (c.type === 15) typeStr = 'Forum';
      return `#${c.name} (ID: ${c.id}, ${typeStr})`;
    })
    .join(', ');

  const systemPrompt = `Tu es l'assistant d'administration intelligent du bot Discord B&G Elite.
Tu peux exécuter des actions d'administration sur le serveur Discord "${guild.name}" en renvoyant des instructions structurées en JSON à la fin de ta réponse.

Voici la liste ordonnée des RÔLES EXISTANTS sur ce serveur (du plus haut au plus bas) :
${rolesList || 'Aucun rôle personnalisé'}

Voici la liste de TOUS LES SALONS EXISTANTS sur ce serveur :
${channelsList || 'Aucun salon'}

Règles de décision CRITIQUES :
1. Avant de générer une action de type "create_role", vérifie attentivement si un rôle similaire ou de même nom n'existe pas déjà dans la liste des RÔLES EXISTANTS ci-dessus. Si le rôle existe déjà, n'utilise PAS "create_role". Utilise directement l'action d'attribution "add_member_role" ou modifie-le si besoin.
2. Lorsque tu fais référence à un salon, utilise son nom exact ou son ID figurant dans la liste des SALONS EXISTANTS ci-dessus.

Liste des permissions valides utilisables pour les actions :
"all" (pour attribuer toutes les permissions d'un coup), ${mainPermissionsList}

Actions d'administration possibles (tu devez les formuler sous forme d'un tableau JSON d'objets, exemple: [{"type": "create_role", "name": "VIP"}]):
1. {"type": "update_automod", "anti_link": 0/1, "anti_spam": 0/1, "anti_massmention": 0/1, "anti_badwords": 0/1, "spam_max_msgs": nombre, "massmention_limit": nombre, "badwords_list": "mot1,mot2"}
2. {"type": "create_role", "name": "Nom du rôle", "color": "code hex ou rouge/bleu/vert...", "permissions": ["BanMembers", "KickMembers", "Administrator"]}
3. {"type": "delete_role", "role_name": "Nom ou ID du rôle"}
4. {"type": "add_member_role", "member_name": "Nom/pseudo/tag du membre", "role_name": "Nom ou ID du rôle"}
5. {"type": "remove_member_role", "member_name": "Nom/pseudo/tag du membre", "role_name": "Nom ou ID du rôle"}
6. {"type": "timeout_member", "member_name": "Nom/pseudo/tag du membre", "duration": minutes}
7. {"type": "kick_member", "member_name": "Nom/pseudo/tag du membre"}
8. {"type": "ban_member", "member_name": "Nom/pseudo/tag du membre"}
9. {"type": "update_action_message", "action_name": "calin/caresser/sodo...", "self": true/false, "text": "Le message avec balises de genre"}
10. {"type": "update_role_permissions", "role_name": "Nom ou ID du rôle", "allow": ["KickMembers"], "deny": ["ManageChannels"]}
11. {"type": "update_channel_permissions", "channel_name": "Nom ou ID du salon, ou 'all' pour cibler tous les salons", "target_name": "Nom de rôle ou membre", "allow": ["ViewChannel"], "deny": ["SendMessages"]}
12. {"type": "set_role_position", "role_name": "Nom du rôle à déplacer", "target_role_name": "Nom du rôle repère", "direction": "above" ou "below"}
13. {"type": "create_channel", "name": "nom-du-salon", "channel_type": "text" ou "voice" ou "category", "category_name": "Nom de la catégorie (optionnel)"}
14. {"type": "delete_channel", "channel_name": "Nom ou ID du salon"}
15. {"type": "send_message", "channel_name": "Nom ou ID du salon", "text": "Texte (optionnel)", "embed": {"title": "Titre", "description": "Contenu", "color": "hex ou couleur"}, "pings": ["Nom de membre ou rôle (optionnel)"]}

Analyse la demande de l'utilisateur. Réponds-lui de manière courtoise, chaleureuse et naturelle en français.
Si la demande nécessite une ou plusieurs actions d'administration ci-dessus, inclus à la fin de ta réponse le tableau d'actions au format JSON.
Important : Si tu décides de générer des actions JSON, écris-les sous la forme exacte suivante :
[ACTIONS_START]
[
  ...
]
[ACTIONS_END]
Pour que le script puisse les parser automatiquement.`;

  let fullReply = "";
  let success = false;

  // 1. Tenter l'appel POST completions sur le modèle principal
  const { generateAiCompletion } = require('./aiManager');

  let lastErrorMsg = null;
  try {
    fullReply = await generateAiCompletion({
      guildId,
      category: 'server',
      systemPrompt,
      userPrompt: message,
      temperature: 0.2,
      maxTokens: 2000
    });
    if (fullReply) success = true;
  } catch (err) {
    console.error('Erreur communication AI Assistant:', err.message);
    lastErrorMsg = err.message;
  }

  if (!success || !fullReply) {
    return { reply: `❌ Erreur communication IA : ${lastErrorMsg || "Le service est temporairement indisponible."}` };
  }

  try {
    // Extraire les actions JSON s'il y en a
    let reply = fullReply;
    let actions = [];

    let jsonStr = null;
    const startIndex = fullReply.indexOf('[ACTIONS_START]');
    const endIndex = fullReply.indexOf('[ACTIONS_END]');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonStr = fullReply.substring(startIndex + '[ACTIONS_START]'.length, endIndex).trim();
      reply = fullReply.substring(0, startIndex).trim();
    } else {
      const matchCodeBlock = fullReply.match(/```(?:json)?\s*(\[\s*\{[\s\S]*?\}\s*\])\s*```/i);
      if (matchCodeBlock) {
        jsonStr = matchCodeBlock[1].trim();
        reply = fullReply.replace(matchCodeBlock[0], '').trim();
      } else {
        const matchRawArray = fullReply.match(/(\[\s*\{\s*"type"[\s\S]*?\}\s*\])/i);
        if (matchRawArray) {
          jsonStr = matchRawArray[1].trim();
          reply = fullReply.replace(matchRawArray[0], '').trim();
        }
      }
    }

    if (jsonStr) {
      try {
        actions = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Erreur parsing actions JSON:', e, jsonStr);
      }
    }

    // Exécuter les actions
    const executedActions = [];
    for (const action of actions) {
      try {
        if (action.type === 'update_automod') {
          const configUpdate = {};
          if (action.anti_link !== undefined) configUpdate.anti_link = action.anti_link;
          if (action.anti_spam !== undefined) configUpdate.anti_spam = action.anti_spam;
          if (action.anti_massmention !== undefined) configUpdate.anti_massmention = action.anti_massmention;
          if (action.anti_badwords !== undefined) configUpdate.anti_badwords = action.anti_badwords;
          if (action.spam_max_msgs !== undefined) configUpdate.spam_max_msgs = action.spam_max_msgs;
          if (action.massmention_limit !== undefined) configUpdate.massmention_limit = action.massmention_limit;
          if (action.badwords_list !== undefined) configUpdate.badwords_list = action.badwords_list;
          
          updateAutomodConfig(guildId, configUpdate);
          executedActions.push({ type: 'update_automod' });
        }

        else if (action.type === 'create_role') {
          let color = null;
          if (action.color) {
            const colors = { rouge: '#ff0000', bleu: '#3498db', vert: '#2ecc71', jaune: '#f1c40f', rose: '#e91e63', violet: '#9b59b6', orange: '#e67e22', noir: '#000000', gris: '#95a5a6' };
            color = colors[action.color.toLowerCase()] || (action.color.startsWith('#') ? action.color : null);
          }

          let permissions = [];
          if (action.permissions) {
            permissions = parsePermissions(action.permissions);
          }

          const newRole = await guild.roles.create({
            name: action.name,
            color: color || undefined,
            permissions: permissions.length > 0 ? permissions : undefined,
            reason: 'Créé via l\'Assistant IA Dashboard'
          });
          executedActions.push({ type: 'create_role', name: newRole.name, id: newRole.id });
        }

        else if (action.type === 'delete_role') {
          const role = await findRole(action.role_name);
          if (role) {
            await role.delete('Supprimé via l\'Assistant IA Dashboard');
            executedActions.push({ type: 'delete_role', name: role.name });
          } else {
            reply += `\n❓ Rôle "${action.role_name}" introuvable.`;
          }
        }

        else if (action.type === 'add_member_role') {
          const member = await findMember(action.member_name);
          const role = await findRole(action.role_name);
          if (member && role) {
            await member.roles.add(role);
            executedActions.push({ type: 'add_member_role', member: member.displayName, role: role.name });
          } else {
            if (!member) reply += `\n❓ Membre "${action.member_name}" introuvable.`;
            if (!role) reply += `\n❓ Rôle "${action.role_name}" introuvable.`;
          }
        }

        else if (action.type === 'remove_member_role') {
          const member = await findMember(action.member_name);
          const role = await findRole(action.role_name);
          if (member && role) {
            await member.roles.remove(role);
            executedActions.push({ type: 'remove_member_role', member: member.displayName, role: role.name });
          } else {
            if (!member) reply += `\n❓ Membre "${action.member_name}" introuvable.`;
            if (!role) reply += `\n❓ Rôle "${action.role_name}" introuvable.`;
          }
        }

        else if (action.type === 'timeout_member') {
          const member = await findMember(action.member_name);
          if (member) {
            await member.timeout(action.duration * 60 * 1000, 'Exclu temporairement via l\'Assistant IA');
            executedActions.push({ type: 'timeout_member', member: member.displayName });
          } else {
            reply += `\n❓ Membre "${action.member_name}" introuvable.`;
          }
        }

        else if (action.type === 'kick_member') {
          const member = await findMember(action.member_name);
          if (member) {
            await member.kick('Expulsé via l\'Assistant IA');
            executedActions.push({ type: 'kick_member', member: member.displayName });
          } else {
            reply += `\n❓ Membre "${action.member_name}" introuvable.`;
          }
        }

        else if (action.type === 'ban_member') {
          const member = await findMember(action.member_name);
          if (member) {
            await member.ban({ reason: 'Banni via l\'Assistant IA' });
            executedActions.push({ type: 'ban_member', member: member.displayName });
          } else {
            reply += `\n❓ Membre "${action.member_name}" introuvable.`;
          }
        }

        else if (action.type === 'send_embed') {
          const channel = await findChannel(action.channel_name);
          if (channel) {
            const embed = new EmbedBuilder()
              .setTitle(action.title || 'Message')
              .setColor('#9b59b6')
              .setTimestamp();
            if (action.description) {
              embed.setDescription(action.description);
            }
            await channel.send({ embeds: [embed] });
            executedActions.push({ type: 'send_embed', channel: channel.name });
          } else {
            reply += `\n❓ Salon "${action.channel_name}" introuvable.`;
          }
        }

        else if (action.type === 'send_message') {
          const channel = await findChannel(action.channel_name);
          if (channel) {
            let pingsStr = '';
            if (action.pings) {
              for (const pingName of action.pings) {
                const r = await findRole(pingName);
                if (r) {
                  pingsStr += `<@&${r.id}> `;
                } else {
                  const m = await findMember(pingName);
                  if (m) {
                    pingsStr += `<@${m.id}> `;
                  }
                }
              }
            }

            const sendPayload = {};
            if (action.text || pingsStr) {
              sendPayload.content = (pingsStr + ' ' + (action.text || '')).trim();
            }

            if (action.embed) {
              let color = '#9b59b6';
              if (action.embed.color) {
                const colors = { rouge: '#ff0000', bleu: '#3498db', vert: '#2ecc71', jaune: '#f1c40f', rose: '#e91e63', violet: '#9b59b6', orange: '#e67e22', noir: '#000000', gris: '#95a5a6' };
                color = colors[action.embed.color.toLowerCase()] || (action.embed.color.startsWith('#') ? action.embed.color : '#9b59b6');
              }

              const emb = new EmbedBuilder()
                .setTitle(action.embed.title || 'Message')
                .setColor(color)
                .setTimestamp();
              if (action.embed.description) {
                emb.setDescription(action.embed.description);
              }
              sendPayload.embeds = [emb];
            }

            await channel.send(sendPayload);
            executedActions.push({ type: 'send_message', channel: channel.name });
          } else {
            reply += `\n❓ Salon "${action.channel_name}" introuvable.`;
          }
        }

        else if (action.type === 'update_role_permissions') {
          const role = await findRole(action.role_name);
          if (role) {
            let currentPerms = new PermissionsBitField(role.permissions);
            if (action.allow) {
              const allowedBits = parsePermissions(action.allow);
              allowedBits.forEach(bit => {
                currentPerms = currentPerms.add(bit);
              });
            }
            if (action.deny) {
              const denyArray = Array.isArray(action.deny) ? action.deny : [action.deny];
              if (denyArray.some(p => typeof p === 'string' && ['all', 'tout', 'toutes'].includes(p.toLowerCase().trim()))) {
                currentPerms = new PermissionsBitField();
              } else {
                const deniedBits = parsePermissions(action.deny);
                deniedBits.forEach(bit => {
                  currentPerms = currentPerms.remove(bit);
                });
              }
            }
            await role.setPermissions(currentPerms);
            executedActions.push({ type: 'update_role_permissions', role: role.name });
          } else {
            reply += `\n❓ Rôle "${action.role_name}" introuvable.`;
          }
        }

        else if (action.type === 'update_channel_permissions') {
          const target = (await findRole(action.target_name)) || (await findMember(action.target_name));
          if (!target) {
            reply += `\n❓ Cible "${action.target_name}" (rôle ou membre) introuvable.`;
            continue;
          }

          const overrides = {};
          if (action.allow) {
            const allowBits = parsePermissions(action.allow);
            Object.keys(PermissionFlagsBits).forEach(key => {
              if (typeof PermissionFlagsBits[key] === 'bigint' && allowBits.includes(PermissionFlagsBits[key])) {
                overrides[key] = true;
              }
            });
          }
          if (action.deny) {
            const denyBits = parsePermissions(action.deny);
            Object.keys(PermissionFlagsBits).forEach(key => {
              if (typeof PermissionFlagsBits[key] === 'bigint' && denyBits.includes(PermissionFlagsBits[key])) {
                overrides[key] = false;
              }
            });
          }

          if (typeof action.channel_name === 'string' && ['all', 'tout', 'tous'].includes(action.channel_name.toLowerCase())) {
            const channels = guild.channels.cache;
            for (const [id, chan] of channels) {
              try {
                await chan.permissionOverwrites.edit(target.id, overrides);
              } catch (e) {
                // ignorer silencieusement pour les salons système / inaccessibles
              }
            }
            executedActions.push({ type: 'update_channel_permissions', channel: 'tous les salons', target: target.name || target.displayName });
          } else {
            const channel = await findChannel(action.channel_name);
            if (channel) {
              await channel.permissionOverwrites.edit(target.id, overrides);
              executedActions.push({ type: 'update_channel_permissions', channel: channel.name, target: target.name || target.displayName });
            } else {
              reply += `\n❓ Salon "${action.channel_name}" introuvable.`;
            }
          }
        }

        else if (action.type === 'set_role_position') {
          const role = await findRole(action.role_name);
          const targetRole = await findRole(action.target_role_name);
          if (role && targetRole) {
            let newPos = targetRole.position;
            if (action.direction === 'above') newPos += 1;
            else if (action.direction === 'below') newPos -= 1;
            newPos = Math.max(1, newPos);
            await role.setPosition(newPos);
            executedActions.push({ type: 'set_role_position', role: role.name, position: newPos });
          } else {
            if (!role) reply += `\n❓ Rôle "${action.role_name}" introuvable.`;
            if (!targetRole) reply += `\n❓ Rôle cible "${action.target_role_name}" introuvable.`;
          }
        }

        else if (action.type === 'create_channel') {
          const { ChannelType } = require('discord.js');
          let cType = ChannelType.GuildText;
          if (action.channel_type === 'voice') cType = ChannelType.GuildVoice;
          else if (action.channel_type === 'category') cType = ChannelType.GuildCategory;

          let parentCategory = null;
          if (action.category_name) {
            const cat = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === action.category_name.toLowerCase());
            if (cat) parentCategory = cat.id;
          }

          const newChan = await guild.channels.create({
            name: action.name,
            type: cType,
            parent: parentCategory || undefined
          });
          executedActions.push({ type: 'create_channel', name: newChan.name, id: newChan.id });
        }

        else if (action.type === 'delete_channel') {
          const channel = await findChannel(action.channel_name);
          if (channel) {
            await channel.delete('Supprimé via l\'Assistant IA Dashboard');
            executedActions.push({ type: 'delete_channel', name: channel.name });
          } else {
            reply += `\n❓ Salon "${action.channel_name}" introuvable.`;
          }
        }

        else if (action.type === 'update_action_message') {
          const customMsg = getCustomActionMessage(guildId, action.action_name) || { self_message: null, target_message: null };
          if (action.self) {
            customMsg.self_message = action.text;
          } else {
            customMsg.target_message = action.text;
          }
          updateCustomActionMessage(guildId, action.action_name, customMsg.self_message, customMsg.target_message);
          executedActions.push({ type: 'update_action_message', action: action.action_name });
        }
      } catch (err) {
        console.error('Erreur execution action IA:', action, err);
        reply += `\n⚠️ *Erreur lors de l'exécution de l'action ${action.type || ''} : ${err.message}*`;
      }
    }

    return { reply, actions: executedActions };
  } catch (error) {
    console.error('Erreur IA complète:', error);
    return { reply: `❌ Une erreur est survenue lors de la communication avec l'IA : ${error.message}` };
  }
}

module.exports = { processAiCommand };
