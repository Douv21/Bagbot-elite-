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

/**
 * Générateur d'Embeds Discord Ultra-Riches avec Logo du serveur, Footer, Auteur, Champs et Couleurs
 */
function buildRichEmbed(embedData, guild, client) {
  if (!embedData) return null;

  const embed = new EmbedBuilder();

  // 1. Titre & URL
  if (embedData.title) embed.setTitle(embedData.title);
  if (embedData.url) embed.setURL(embedData.url);

  // 2. Description
  if (embedData.description) embed.setDescription(embedData.description);

  // 3. Couleur (Hex ou nom de couleur en français)
  let color = '#9b59b6';
  if (embedData.color) {
    const colors = {
      rouge: '#ff0000', bleu: '#3498db', vert: '#2ecc71', jaune: '#f1c40f',
      rose: '#e91e63', violet: '#9b59b6', orange: '#e67e22', noir: '#000000',
      gris: '#95a5a6', or: '#f39c12', turquoise: '#1abc9c', cyan: '#00e5ff'
    };
    const cLower = String(embedData.color).toLowerCase().trim();
    color = colors[cLower] || (cLower.startsWith('#') ? cLower : '#9b59b6');
  }
  embed.setColor(color);

  // 4. Thumbnail / Logo du serveur
  const guildIcon = guild ? guild.iconURL({ dynamic: true, size: 512 }) : null;
  const botAvatar = client?.user?.displayAvatarURL({ dynamic: true, size: 512 });

  if (embedData.thumbnail === true || embedData.thumbnail === 'guild' || embedData.thumbnail === 'server' || embedData.thumbnail === undefined) {
    if (guildIcon) embed.setThumbnail(guildIcon);
    else if (botAvatar) embed.setThumbnail(botAvatar);
  } else if (typeof embedData.thumbnail === 'string' && embedData.thumbnail.startsWith('http')) {
    embed.setThumbnail(embedData.thumbnail);
  }

  // 5. Image de bannière / GIF
  if (embedData.image && typeof embedData.image === 'string' && embedData.image.startsWith('http')) {
    embed.setImage(embedData.image);
  }

  // 6. Auteur (Author) avec Nom & Logo
  if (embedData.author) {
    if (typeof embedData.author === 'string') {
      embed.setAuthor({ name: embedData.author, iconURL: guildIcon || botAvatar || undefined });
    } else if (typeof embedData.author === 'object') {
      embed.setAuthor({
        name: embedData.author.name || (guild ? guild.name : 'Bot B&G Elite'),
        iconURL: embedData.author.iconURL || guildIcon || botAvatar || undefined,
        url: embedData.author.url || undefined
      });
    }
  } else if (guild) {
    embed.setAuthor({ name: guild.name, iconURL: guildIcon || botAvatar || undefined });
  }

  // 7. Footer & Logo
  const footerText = embedData.footer
    ? (typeof embedData.footer === 'string' ? embedData.footer : embedData.footer.text)
    : `${guild ? guild.name : 'Bot'} • Assistant IA B&G Elite`;

  const footerIcon = (embedData.footer && typeof embedData.footer === 'object' && embedData.footer.iconURL)
    || guildIcon
    || botAvatar
    || undefined;

  embed.setFooter({ text: footerText, iconURL: footerIcon });

  // 8. Champs (Fields)
  if (Array.isArray(embedData.fields)) {
    embedData.fields.forEach(f => {
      if (f && f.name && f.value) {
        embed.addFields({ name: String(f.name), value: String(f.value), inline: !!f.inline });
      }
    });
  }

  // 9. Horodatage (Timestamp)
  if (embedData.timestamp !== false) {
    embed.setTimestamp();
  }

  return embed;
}

async function processAiCommand(guildId, userId, message, client, messagesHistory = null) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return { reply: "❌ Erreur : Serveur introuvable." };
  }

  // Helper pour identifier les rôles séparateurs / décoratifs (ex: "------", "── RÔLES ──", "===")
  const isSeparatorRole = (name) => {
    if (!name) return false;
    const s = name.trim();
    if (s === '@everyone') return true;
    if (s.includes('---') || s.includes('──') || s.includes('===') || s.includes('___') || s.includes('───')) return true;
    if (/^[─\-=_~|*•\s\u{2500}-\u{257F}]+$/u.test(s)) return true;
    return false;
  };

  // Helper puissant de nettoyage des caractères décoratifs et émojis
  const cleanEntityName = (str) => {
    if (!str) return '';
    return str
      .replace(/[\u{1F600}-\u{1FAFF}\u{2600}-\u{27BF}│─━═─~•°|`'*_~#@]/gu, '')
      .replace(/[^\w\sàáâäãåçèéêëìíîïñòóôöõøùúûüýÿ-]/gi, '')
      .trim()
      .toLowerCase();
  };

  // Helper de recherche d'un RÔLE (exclut les séparateurs)
  const findRole = async (name) => {
    if (!name) return null;
    const rawClean = name.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/^@/, '');

    const fetched = await guild.roles.fetch().catch(() => null);
    const rawRoles = Array.from((fetched || guild.roles.cache).values());

    // 1. Si c'est un ID direct, on cherche parmi TOUS les rôles
    if (/^\d+$/.test(rawClean)) {
      const byId = rawRoles.find(r => r.id === rawClean);
      if (byId) return byId;
    }

    // Sinon, on exclut les rôles séparateurs pour éviter toute confusion
    const assignableRoles = rawRoles.filter(r => r.name !== '@everyone' && !isSeparatorRole(r.name));

    // 2. Recherche exacte par nom brut (case-insensitive)
    let role = assignableRoles.find(r => r.name.toLowerCase() === rawClean);
    if (role) return role;

    // 3. Recherche par nom nettoyé (sans émojis ni symboles)
    const normSearch = cleanEntityName(rawClean);
    if (normSearch.length > 0) {
      role = assignableRoles.find(r => cleanEntityName(r.name) === normSearch);
      if (role) return role;
    }

    // 4. Recherche par inclusion de sous-chaîne (ex: "VIP" matche "👑 VIP 👑")
    role = assignableRoles.find(r => {
      const rNameLower = r.name.toLowerCase();
      return rNameLower.includes(rawClean) || rawClean.includes(rNameLower);
    });
    if (role) return role;

    // 5. Recherche par inclusion sur version nettoyée
    if (normSearch.length > 0) {
      role = assignableRoles.find(r => {
        const rNorm = cleanEntityName(r.name);
        return rNorm.length > 0 && (rNorm.includes(normSearch) || normSearch.includes(rNorm));
      });
      if (role) return role;
    }

    return null;
  };

  // Helper de recherche d'un SALON
  const findChannel = async (name) => {
    if (!name) return null;
    const rawClean = name.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/^#/, '');

    let allChannels = Array.from((await guild.channels.fetch().catch(() => null) || guild.channels.cache).values());

    // 1. Recherche par ID ou nom exact
    let channel = allChannels.find(c => c.id === rawClean || c.name.toLowerCase() === rawClean);
    if (channel) return channel;

    // 2. Recherche par nom nettoyé
    const normSearch = cleanEntityName(rawClean);
    if (normSearch.length > 0) {
      channel = allChannels.find(c => cleanEntityName(c.name) === normSearch);
      if (channel) return channel;
    }

    // 3. Recherche par inclusion
    channel = allChannels.find(c => c.name.toLowerCase().includes(rawClean) || rawClean.includes(c.name.toLowerCase()));
    if (channel) return channel;

    return null;
  };

  // Helper de recherche d'un MEMBRE
  const findMember = async (name) => {
    if (!name) return null;
    const rawClean = name.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/^@/, '');

    // 1. Recherche dans le cache direct
    let member = guild.members.cache.find(m => 
      m.id === rawClean ||
      m.user.username.toLowerCase() === rawClean || 
      m.user.tag.toLowerCase() === rawClean || 
      (m.nickname && m.nickname.toLowerCase() === rawClean)
    );
    if (member) return member;

    // 2. Recherche nettoyée
    const normSearch = cleanEntityName(rawClean);
    if (normSearch.length > 0) {
      member = guild.members.cache.find(m => 
        cleanEntityName(m.user.username) === normSearch || 
        (m.nickname && cleanEntityName(m.nickname) === normSearch)
      );
      if (member) return member;
    }

    // 3. Recherche via Discord API search
    const searchRes = await guild.members.search({ query: rawClean, limit: 5 }).catch(() => null);
    if (searchRes && searchRes.size > 0) {
      return searchRes.first();
    }

    // 4. Fetch direct si ID numérique
    if (/^\d+$/.test(rawClean)) {
      member = await guild.members.fetch(rawClean).catch(() => null);
    }
    return member;
  };

  // Récupérer et lister TOUS les rôles et salons sans en filtrer inutilement aucun
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
    .filter(r => r.name !== '@everyone' && !isSeparatorRole(r.name))
    .sort((a, b) => b.position - a.position)
    .slice(0, 100)
    .map(r => `- "${r.name}" (ID: ${r.id})`)
    .join('\n');

  const channelsList = Array.from((fetchedChannels || guild.channels.cache).values())
    .slice(0, 100)
    .map(c => {
      let typeStr = 'Texte';
      if (c.type === 4) typeStr = 'Catégorie';
      else if (c.type === 2) typeStr = 'Vocal';
      else if (c.type === 5) typeStr = 'Annonces';
      else if (c.type === 15) typeStr = 'Forum';
      return `- #${c.name} (ID: ${c.id}, ${typeStr})`;
    })
    .join('\n');

  const systemPrompt = `Tu es l'Assistant Administrateur SUPRÊME et OMNIPOTENT du bot Discord B&G Elite.
Tu possèdes l'ACCÈS TOTAL et ABSOLU à l'ensemble des permissions d'administrateur et à TOUTES les fonctionnalités du serveur Discord "${guild.name}".

--- KNOWLEDGE BASE : PANORAMA DE TOUTES LES FONCTIONNALITÉS DU BOT B&G ELITE ---
1. 🛡️ **MODÉRATION ET AUTOMODÉRATION** : Anti-liens, anti-spam, anti-insultes/mots bannis, anti-massmentions, exclusions temporaires (timeout), kicks, bans, avertissements (warns) et système de quarantaine.
2. 👑 **BOUTIQUE & SUITES PRIVÉES VIP** : Achat et création automatique de salons de suites privées VIP (avec durée d'expiration configurable, invitation/exclusion de membres, et attribution d'accès temporaire par mention de rôle avec bouton de révocation).
3. ⚖️ **TRIBUNAL DISCORD & COUR DE JUSTICE** : Système judiciaire complet pour ouvrir des procès, désigner ou récuser un avocat/juge, attribuer automatiquement les rôles Juge, Avocat et Accusé pendant l'audience, et les retirer automatiquement lors de la clôture du dossier.
4. 💰 **ÉCONOMIE ET KARMA** : Portefeuille, banque, karma évolutif avec bonus d'XP et réductions en boutique, mini-jeux d'économie (/work, /crime, /rob, /pecher, /daily, /deposit, /withdraw).
5. 📈 **NIVEAUX & XP** : Niveaux d'expérience texte et vocal, cartes de rang graphiques (Canvas), récompenses de rôles par palier d'XP, bonus XP dans les salons NSFW.
6. ⭐ **STAR DE LA SEMAINE** : Élections hebdomadaires automatiques du membre Star avec gains de points sur selfies, photos nudes ou messages texte, et attribution du rôle Star exclusif.
7. 💬 **CONFESSIONS ANONYMES** : Envoi de confessions anonymes sécurisées, logs staff confidentiels, système de threads de commentaires anonymisés.
8. 🧮 **SALONS DE COMPTAGE (COUNTING)** : Compteurs de salon en mode Normal, Inversé ou Équations Mathématiques avec classements et détection des erreurs.
9. 🎲 **DIVERTISSEMENT & JEUX** : Jeu du Mot Caché avec autodestruction des lettres, cartes Action ou Vérité (SFW/NSFW), Jeu de cartes UNO multijoueur interactif, GIFs d'actions animées (câlin, caresser, embrasser, sodo, etc.).
10. 🎫 **SUPPORT & TICKETS** : Panneaux de création de tickets personnalisables avec boutons ou sélecteurs déroulants et salons privés temporaires.
11. 🗺️ **CARTE DES MEMBRES & LOCALISATION** : Commandes /mapville et /proche pour géolocaliser les membres du serveur sur une carte interactive.
12. 🔔 **RAPPELS DE BUMP MULTI-BOTS** : Détection automatique des bumps (Disboard et autres) et rappels programmés.
13. 📜 **LOGS D'ACTIVITÉ DÉTAILLÉS** : Traces complètes pour messages supprimés/modifiés, arrivées/départs de membres, vocal, sanctions modération, structure du serveur, bots et confessions.
14. 🤖 **ASSISTANT IA ADMINISTRATEUR** : Contrôle absolu via chat sur la gestion des salons, rôles, permissions, automatisations et configurations du bot.

Si l'utilisateur te demande quelles sont les fonctionnalités du bot ou comment l'utiliser, donne-lui ce panorama complet, clair, dynamique et parfaitement structuré avec des émojis !

Tu as les PERMISSIONS ADMINISTRATEUR SUPRÊMES pour :
- Pinger et mentionner n'importe quel rôle ou utilisateur.
- Accorder ou révoquer dynamiquement des accès aux salons (y compris l'accès à un rôle lors d'un ping dans une Suite Privée ou un Ticket).
- Attribuer, créer, modifier ou supprimer des rôles et des salons.
- Ne prétexte JAMAIS un manque de permission. Tu as l'accès Administrateur absolu.

Voici la liste exacte de TOUS LES RÔLES EXISTANTS sur ce serveur (du plus haut au plus bas) :
${rolesList || 'Aucun rôle personnalisé'}

Voici la liste de TOUS LES SALONS EXISTANTS sur ce serveur :
${channelsList || 'Aucun salon'}

Règles pour les actions JSON :
1. Pour TOUTES les actions sur les rôles (ex: "add_member_role", "remove_member_role", "delete_role", "update_role_permissions", "set_role_position", "grant_channel_access"), UTILISE TOUJOURS L'ID EXACT DU RÔLE si le rôle figure ci-dessus !
2. Pour les salons, préfère également l'ID ou le nom exact du salon.

Liste des permissions valides utilisables : "all", ${mainPermissionsList}

Actions d'administration possibles (à formuler sous forme d'un tableau JSON d'objets) :
1. {"type": "update_automod", "anti_link": 0/1, "anti_spam": 0/1, "anti_massmention": 0/1, "anti_badwords": 0/1, "spam_max_msgs": nombre, "massmention_limit": nombre, "badwords_list": "mot1,mot2"}
2. {"type": "create_role", "name": "Nom du rôle", "color": "code hex ou rouge/bleu/vert...", "permissions": ["BanMembers", "KickMembers", "Administrator"]}
3. {"type": "delete_role", "role_name": "ID ou Nom du rôle"}
4. {"type": "add_member_role", "member_name": "Nom/pseudo/tag ou ID du membre", "role_name": "ID ou Nom du rôle"}
5. {"type": "remove_member_role", "member_name": "Nom/pseudo/tag ou ID du membre", "role_name": "ID ou Nom du rôle"}
6. {"type": "grant_role_to_all", "role_name": "ID ou Nom du rôle"}
7. {"type": "timeout_member", "member_name": "Nom/pseudo/tag ou ID du membre", "duration": minutes}
8. {"type": "kick_member", "member_name": "Nom/pseudo/tag ou ID du membre"}
9. {"type": "ban_member", "member_name": "Nom/pseudo/tag ou ID du membre"}
10. {"type": "update_action_message", "action_name": "calin/caresser/sodo...", "self": true/false, "text": "Le message avec balises de genre"}
11. {"type": "update_role_permissions", "role_name": "ID ou Nom du rôle", "allow": ["KickMembers"], "deny": ["ManageChannels"]}
12. {"type": "grant_channel_access", "channel_name": "Nom ou ID du salon", "target_name": "ID ou Nom de rôle/membre"}
13. {"type": "revoke_channel_access", "channel_name": "Nom ou ID du salon", "target_name": "ID ou Nom de rôle/membre"}
14. {"type": "update_channel_permissions", "channel_name": "Nom ou ID du salon ou 'all'", "target_name": "ID/Nom rôle ou membre", "allow": ["ViewChannel"], "deny": ["SendMessages"]}
15. {"type": "set_role_position", "role_name": "ID ou Nom du rôle à déplacer", "target_role_name": "ID ou Nom du rôle repère", "direction": "above" ou "below"}
16. {"type": "create_channel", "name": "nom-du-salon", "channel_type": "text" ou "voice" ou "category", "category_name": "Nom de la catégorie (optionnel)"}
17. {"type": "delete_channel", "channel_name": "Nom ou ID du salon"}
18. {"type": "clear_messages", "channel_name": "Nom ou ID du salon", "amount": 10}
19. {"type": "send_message", "channel_name": "Nom ou ID du salon", "text": "Texte avec pings (optionnel)", "embed": {"title": "Titre", "description": "Description", "color": "rouge/bleu/rose/#ff0000", "fields": [{"name": "Nom du champ", "value": "Valeur", "inline": true}], "footer": "Texte de bas de page", "image": "URL de la bannière/GIF"}, "pings": ["ID ou Nom de rôle ou membre"]}

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
      messagesHistory,
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
            const embed = buildRichEmbed(action, guild, client);
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

            let textContent = action.text || '';
            if (textContent) {
              for (const r of guild.roles.cache.values()) {
                if (r.name !== '@everyone') {
                  const reg = new RegExp(`@${r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
                  textContent = textContent.replace(reg, `<@&${r.id}>`);
                }
              }
              for (const m of guild.members.cache.values()) {
                const regName = new RegExp(`@${m.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
                textContent = textContent.replace(regName, `<@${m.id}>`);
              }
            }

            const sendPayload = {};
            if (textContent || pingsStr) {
              sendPayload.content = (pingsStr + ' ' + textContent).trim();
            }

            if (action.embed) {
              const emb = buildRichEmbed(action.embed, guild, client);
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

        else if (action.type === 'grant_channel_access') {
          const target = (await findRole(action.target_name)) || (await findMember(action.target_name));
          const channel = await findChannel(action.channel_name);
          if (target && channel) {
            await channel.permissionOverwrites.create(target.id, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
              EmbedLinks: true,
              AttachFiles: true
            });
            executedActions.push({ type: 'grant_channel_access', channel: channel.name, target: target.name || target.displayName });
          } else {
            if (!target) reply += `\n❓ Cible "${action.target_name}" introuvable.`;
            if (!channel) reply += `\n❓ Salon "${action.channel_name}" introuvable.`;
          }
        }

        else if (action.type === 'revoke_channel_access') {
          const target = (await findRole(action.target_name)) || (await findMember(action.target_name));
          const channel = await findChannel(action.channel_name);
          if (target && channel) {
            await channel.permissionOverwrites.delete(target.id).catch(async () => {
              await channel.permissionOverwrites.create(target.id, { ViewChannel: false });
            });
            executedActions.push({ type: 'revoke_channel_access', channel: channel.name, target: target.name || target.displayName });
          } else {
            if (!target) reply += `\n❓ Cible "${action.target_name}" introuvable.`;
            if (!channel) reply += `\n❓ Salon "${action.channel_name}" introuvable.`;
          }
        }

        else if (action.type === 'grant_role_to_all') {
          const role = await findRole(action.role_name);
          if (role) {
            const members = await guild.members.fetch();
            let count = 0;
            for (const [id, m] of members) {
              if (!m.user.bot && !m.roles.cache.has(role.id)) {
                await m.roles.add(role).catch(() => {});
                count++;
              }
            }
            executedActions.push({ type: 'grant_role_to_all', role: role.name, count });
          } else {
            reply += `\n❓ Rôle "${action.role_name}" introuvable.`;
          }
        }

        else if (action.type === 'clear_messages') {
          const channel = await findChannel(action.channel_name);
          if (channel && channel.isTextBased()) {
            const amount = Math.min(Math.max(parseInt(action.amount) || 10, 1), 100);
            const deleted = await channel.bulkDelete(amount, true).catch(() => null);
            executedActions.push({ type: 'clear_messages', channel: channel.name, amount: deleted ? deleted.size : amount });
          } else {
            reply += `\n❓ Salon textuel "${action.channel_name}" introuvable.`;
          }
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
