// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
  user: null,
  selectedGuild: null,
  guilds: [],
  config: {},
  channels: [],
  roles: [],
  currentCat: 'general',
  currentPanel: null,
  botInfo: {},
};

// ─── CATEGORY DEFINITIONS ─────────────────────────────────────────────────────
const CATEGORIES = {
  general: {
    label: 'GESTION DU SERVEUR',
    icon: 'fa-sliders',
    desc: 'Arrivées, Départs, Boost, Annonces, Embeds, Auto-Rôles & Logs',
    items: [
      { id: 'welcome-leave', label: 'Arrivées & Départs', icon: 'fa-door-open' },
      { id: 'announce-role', label: 'Annonce sur Rôle', icon: 'fa-bullhorn', badge: 'NEW' },
      { id: 'boost', label: 'Remerciements Boost', icon: 'fa-rocket', badge: 'VIP' },
      { id: 'announcements', label: 'Annonces & Guides', icon: 'fa-bullhorn', badge: 'VIP' },
      { id: 'embed-sender', label: "Envoyeur d'Embeds", icon: 'fa-file-code', badge: 'NOUVEAU' },
      { id: 'autoroles-join', label: "Auto-Rôles à l'Arrivée", icon: 'fa-user-plus' },
      { id: 'autoroles-role', label: 'Rôles Réaction', icon: 'fa-rectangle-list' },
      { id: 'autothread', label: 'Auto-Thread', icon: 'fa-hashtag' },
      { id: 'logs', label: "Logs d'Activité", icon: 'fa-scroll' },
    ]
  },
  moderation: {
    label: 'SÉCURITÉ & MODÉRATION',
    icon: 'fa-shield-halved',
    desc: 'Quarantaine, AutoMod, Rappels de Bump, Forums & Permissions',
    items: [
      { id: 'quarantine', label: 'Quarantaine Anti-Raid', icon: 'fa-shield-cat' },
      { id: 'automod', label: 'Auto-Modération', icon: 'fa-user-shield' },
      { id: 'bump', label: 'Rappels de Bump', icon: 'fa-bell', badge: 'AUTO' },
      { id: 'forums', label: 'Forums Illimités', icon: 'fa-comments' },
      { id: 'permissions', label: 'Commandes & Permissions', icon: 'fa-terminal', badge: 'NOUVEAU' },
    ]
  },
  economie: {
    label: 'NIVEAUX & ÉCONOMIE',
    icon: 'fa-chart-line',
    desc: 'Niveaux & XP, Quêtes, Karma, Boutique & Suites',
    items: [
      { id: 'leveling', label: 'Niveaux & XP', icon: 'fa-arrow-trend-up' },
      { id: 'quests', label: 'Système de Quêtes', icon: 'fa-scroll', badge: 'NEW' },
      { id: 'karma', label: 'Configuration Karma', icon: 'fa-star' },
      { id: 'shop', label: 'Boutique & Suites', icon: 'fa-shop' },
    ]
  },
  divertissement: {
    label: 'DIVERTISSEMENT & JEUX',
    icon: 'fa-gamepad',
    desc: 'Tribunal, Star de la Semaine, Confessions, Mot Caché, UNO, Action-Vérité, GIFs',
    items: [
      { id: 'tribunal', label: 'Tribunal Discord', icon: 'fa-gavel', badge: 'JEU' },
      { id: 'star', label: 'Star de la Semaine', icon: 'fa-star', badge: 'TOP' },
      { id: 'uno', label: 'Jeu UNO Canvas', icon: 'fa-layer-group', badge: 'JEU' },
      { id: 'confessions', label: 'Confessions Anonymes', icon: 'fa-mask' },
      { id: 'counting', label: 'Salons de Comptage', icon: 'fa-calculator' },
      { id: 'game', label: 'Jeu Mot Caché', icon: 'fa-gamepad' },
      { id: 'action-verite', label: 'Action ou Vérité', icon: 'fa-dice', badge: '18+' },
      { id: 'gifs', label: "GIFs d'action", icon: 'fa-file-video', badge: 'NSFW' },
    ]
  },
  support: {
    label: 'SUPPORT & TICKETS',
    icon: 'fa-headset',
    desc: 'Support, Tickets & Carte des Membres',
    items: [
      { id: 'tickets', label: 'Support & Tickets', icon: 'fa-ticket' },
      { id: 'map', label: 'Carte des Membres', icon: 'fa-map-location-dot' },
    ]
  },
  assistant: {
    label: 'ASSISTANT IA',
    icon: 'fa-robot',
    desc: 'Assistant IA Admin VIP',
    items: [
      { id: 'assistant', label: 'Assistant IA Admin', icon: 'fa-robot', badge: 'IA VIP' },
    ]
  },
  ai: {
    label: 'CLÉS & PARAMÈTRES IA',
    icon: 'fa-brain',
    desc: 'Clés & Modèles IA',
    items: [
      { id: 'ai', label: 'Clés & Modèles IA', icon: 'fa-brain' },
    ]
  }
};

const CATEGORY_CARDS = [
  { id: 'general', title: 'GESTION DU SERVEUR', icon: 'fa-sliders', desc: 'Arrivées, Départs, Boost, Annonces, Embeds, Auto-Rôles & Logs' },
  { id: 'moderation', title: 'SÉCURITÉ & MODÉRATION', icon: 'fa-shield-halved', desc: 'Quarantaine, AutoMod, Rappels de Bump, Forums & Permissions' },
  { id: 'economie', title: 'NIVEAUX & ÉCONOMIE', icon: 'fa-chart-line', desc: 'Niveaux & XP, Quêtes, Karma & Boutique' },
  { id: 'divertissement', title: 'DIVERTISSEMENT & JEUX', icon: 'fa-gamepad', desc: 'Tribunal, Star de la Semaine, Confessions, Mot Caché, Action-Vérité (18+)' },
  { id: 'support', title: 'SUPPORT & TICKETS', icon: 'fa-headset', desc: 'Support, Panneaux de Tickets & Carte des Membres' },
  { id: 'assistant', title: 'ASSISTANT IA', icon: 'fa-robot', desc: 'Assistant IA Admin VIP' },
  { id: 'ai', title: 'CLÉS & PARAMÈTRES IA', icon: 'fa-brain', desc: 'Clés & Modèles IA' },
];

// ─── UTILS & API ──────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  if (el) el.classList.add('active');
}

function toast(msg, type = 'success', duration = 3500) {
  const cont = document.getElementById('toastContainer');
  if (!cont) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  t.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-circle-info'}"></i><span>${msg}</span>`;
  cont.appendChild(t);
  setTimeout(() => {
    t.classList.add('removing');
    setTimeout(() => t.remove(), 320);
  }, duration);
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// ─── INIT & AUTH ──────────────────────────────────────────────────────────────
async function init() {
  try {
    const bi = await api('/api/bot/info');
    state.botInfo = bi;
    if (bi.username) document.getElementById('loginBotName').textContent = bi.username;
    if (bi.avatarURL) {
      const icon = document.getElementById('loginBotIcon');
      if (icon) icon.innerHTML = `<img src="${bi.avatarURL}" alt="Bot">`;
    }
  } catch(e) {}

  try {
    const data = await api('/api/user');
    if (!data.authenticated) { showPage('login'); return; }
    state.user = data.user;
    state.selectedGuild = data.selectedGuild;
    if (state.selectedGuild) {
      await loadDashboard();
    } else {
      await showGuilds();
    }
  } catch(e) {
    showPage('login');
  }
}

// ─── GUILD SELECTION ──────────────────────────────────────────────────────────
async function showGuilds() {
  showPage('guilds');
  if (state.user) {
    document.getElementById('guildsUserAvatar').src = state.user.avatar_url;
    document.getElementById('guildsUserName').textContent = state.user.global_name || state.user.username;
    document.getElementById('guildsUserInfo').style.display = 'flex';
  }

  const grid = document.getElementById('guildsGrid');
  grid.innerHTML = '<div class="loading-wrap"><div class="loading-spinner"></div><p>Chargement des serveurs...</p></div>';

  try {
    const guilds = await api('/api/guilds');
    state.guilds = guilds;
    if (guilds.length === 0) {
      grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-server"></i><p>Aucun serveur commun avec le bot</p></div>';
      return;
    }
    grid.innerHTML = '';
    for (const g of guilds) {
      const card = document.createElement('div');
      card.className = 'guild-card';
      card.onclick = () => selectGuild(g);
      let iconHtml = g.icon
        ? `<div class="guild-icon-wrap"><img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" alt="${g.name}"></div>`
        : `<div class="guild-icon-wrap"><span class="guild-avatar-letter">${g.name.charAt(0).toUpperCase()}</span></div>`;
      card.innerHTML = iconHtml + `<h3>${g.name}</h3>`;
      grid.appendChild(card);
    }
  } catch(e) {
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Erreur lors du chargement</p></div>';
  }
}

async function selectGuild(guild) {
  try {
    await api('/api/select-guild', { method: 'POST', body: JSON.stringify({ guildId: guild.id }) });
    state.selectedGuild = guild.id;
    await loadDashboard(guild);
  } catch(e) {
    toast('Erreur lors de la sélection du serveur', 'error');
  }
}

function changeGuild() {
  state.selectedGuild = null;
  showGuilds();
}

// ─── DASHBOARD LOAD ───────────────────────────────────────────────────────────
async function loadDashboard(guild = null) {
  showPage('dashboard');

  if (state.botInfo.username) document.getElementById('headerBotName').textContent = state.botInfo.username;
  if (state.botInfo.avatarURL) document.getElementById('headerBotAvatar').src = state.botInfo.avatarURL;

  if (state.user) {
    document.getElementById('headerUserAvatar').src = state.user.avatar_url;
    document.getElementById('headerUserName').textContent = state.user.global_name || state.user.username;
  }

  const guildId = state.selectedGuild;
  const g = guild || state.guilds.find(x => x.id === guildId) || { name: 'Serveur', id: guildId };
  document.getElementById('headerGuildName').textContent = g.name;
  const iconEl = document.getElementById('headerGuildIcon');
  if (g.icon) {
    iconEl.innerHTML = `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" alt="">`;
  } else {
    iconEl.textContent = g.name ? g.name.charAt(0).toUpperCase() : 'S';
  }

  try {
    const [channels, roles, config] = await Promise.all([
      api('/api/channels?guildId=' + guildId),
      api('/api/roles?guildId=' + guildId),
      api('/api/config?guildId=' + guildId),
    ]);
    state.channels = channels;
    state.roles = roles;
    state.config = config;
  } catch(e) {
    state.channels = [];
    state.roles = [];
    state.config = {};
  }

  populateAllDropdowns();
  hydrateForms();
  renderCategoryHub();
  showCategoryHub();
}

// ─── DROPDOWNS & HYDRATION ────────────────────────────────────────────────────
function populateAllDropdowns() {
  // Populate select elements with data-type="channel"
  document.querySelectorAll('select[data-type="channel"]').forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">— Aucun salon —</option>';
    state.channels.filter(c => c.type === 0 || c.type === 5).sort((a,b) => a.name.localeCompare(b.name)).forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = '#' + ch.name;
      if (ch.id === current) opt.selected = true;
      select.appendChild(opt);
    });
  });

  // Populate select elements with data-type="role"
  document.querySelectorAll('select[data-type="role"]').forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">— Aucun rôle —</option>';
    [...state.roles].sort((a,b) => b.position - a.position).forEach(r => {
      if (r.name !== '@everyone') {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        if (r.id === current) opt.selected = true;
        select.appendChild(opt);
      }
    });
  });

  // Populate select elements with data-type="category"
  document.querySelectorAll('select[data-type="category"]').forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">— Aucune catégorie —</option>';
    state.channels.filter(c => c.type === 4).sort((a,b) => a.name.localeCompare(b.name)).forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = '📁 ' + ch.name;
      if (ch.id === current) opt.selected = true;
      select.appendChild(opt);
    });
  });
}


// ─── DASHBOARD 2 EMBED PREVIEW ────────────────────────────────────────────────
let wlMode = 'welcome';

function switchWelcomeLeaveMode(mode) {
  wlMode = mode;
  const isWelcome = mode === 'welcome';
  const wGroup = document.getElementById('wl-welcome-chan-group');
  const lGroup = document.getElementById('wl-leave-chan-group');
  const rGroup = document.getElementById('wl-role-filter-group');
  if (wGroup) wGroup.style.display = isWelcome ? 'block' : 'none';
  if (lGroup) lGroup.style.display = isWelcome ? 'none' : 'block';
  if (rGroup) rGroup.style.display = isWelcome ? 'block' : 'none';
  updateEmbedPreview();
}

function getElVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function updateEmbedPreview() {
  const isWelcome = wlMode === 'welcome';

  // Read from hidden inputs (which were populated from DB via hydrateForms)
  const title       = isWelcome ? getElVal('wl-welcome_title')       : getElVal('wl-leave_title');
  const desc        = isWelcome ? getElVal('wl-welcome_desc')        : getElVal('wl-leave_desc');
  const color       = isWelcome ? getElVal('wl-welcome_color')       : getElVal('wl-leave_color');
  const authorName  = isWelcome ? getElVal('wl-welcome_author_name') : getElVal('wl-leave_author_name');
  const authorIcon  = isWelcome ? getElVal('wl-welcome_author_icon') : getElVal('wl-leave_author_icon');
  const thumb       = isWelcome ? getElVal('wl-welcome_thumbnail')   : getElVal('wl-leave_thumbnail');
  const image       = isWelcome ? getElVal('wl-welcome_image')       : getElVal('wl-leave_image');
  const footer      = isWelcome ? getElVal('wl-welcome_footer')      : getElVal('wl-leave_footer');

  // Bot avatar
  const botAvatarImg = document.getElementById('wl-bot-avatar-img');
  if (botAvatarImg && state.botInfo && state.botInfo.avatarURL) botAvatarImg.src = state.botInfo.avatarURL;

  // Color bar
  const bar = document.getElementById('wl-embed-color-bar');
  if (bar) bar.style.background = color || (isWelcome ? '#00FF00' : '#FF0000');

  // Author
  const pAuthorName = document.getElementById('wl-preview-author-name');
  const pAuthorIcon = document.getElementById('wl-preview-author-icon');
  if (pAuthorName) pAuthorName.textContent = authorName || 'Cliquez pour ajouter un Auteur...';
  if (pAuthorIcon) {
    if (authorIcon) { pAuthorIcon.src = authorIcon; pAuthorIcon.style.display = 'block'; }
    else { pAuthorIcon.style.display = 'none'; }
  }

  // Title
  const pTitle = document.getElementById('wl-preview-title');
  if (pTitle) pTitle.textContent = title || (isWelcome ? '👋 Bienvenue sur le serveur !' : '👋 Au revoir');

  // Description
  const pDesc = document.getElementById('wl-preview-desc');
  if (pDesc) pDesc.textContent = desc || (isWelcome ? 'Bienvenue {user} sur {server} !' : 'Au revoir {user} !');

  // Thumbnail
  const pThumbImg = document.getElementById('wl-preview-thumb-img');
  if (pThumbImg) {
    if (thumb) { pThumbImg.src = thumb; pThumbImg.style.display = 'block'; }
    else { pThumbImg.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }
  }

  // Banner
  const pBannerPlaceholder = document.getElementById('wl-banner-placeholder');
  const pBannerImg = document.getElementById('wl-preview-banner-img');
  if (image) {
    if (pBannerImg) { pBannerImg.src = image; pBannerImg.style.display = 'block'; }
    if (pBannerPlaceholder) pBannerPlaceholder.style.display = 'none';
  } else {
    if (pBannerImg) pBannerImg.style.display = 'none';
    if (pBannerPlaceholder) pBannerPlaceholder.style.display = 'flex';
  }

  // Footer
  const pFooterText = document.getElementById('wl-preview-footer-text');
  if (pFooterText) pFooterText.textContent = footer || 'Cliquez pour ajouter un Footer...';
}


function hydrateForms() {
  const config = state.config || {};

  // 1. Welcome / Leave — hydrate ALL fields (channels, hidden inputs, and embed preview)
  const wl = config.welcome_leave || {};
  setElVal('wl-welcome_channel', wl.welcome_channel);
  setElVal('wl-leave_channel', wl.leave_channel);
  setElVal('wl-welcome_role_filter', wl.welcome_role_filter);
  // Hidden form inputs (synced with embed data store)
  setElVal('wl-welcome_title', wl.welcome_title || '👋 Bienvenue sur le serveur !');
  setElVal('wl-welcome_desc', wl.welcome_desc || 'Bienvenue {user} sur {server} !');
  setElVal('wl-welcome_color', wl.welcome_color || '#00FF00');
  setElVal('wl-welcome_author_name', wl.welcome_author_name || '');
  setElVal('wl-welcome_author_icon', wl.welcome_author_icon || '');
  setElVal('wl-welcome_thumbnail', wl.welcome_thumbnail || '');
  setElVal('wl-welcome_image', wl.welcome_image || '');
  setElVal('wl-welcome_footer', wl.welcome_footer || '');
  setElVal('wl-leave_title', wl.leave_title || '👋 Au revoir');
  setElVal('wl-leave_desc', wl.leave_desc || 'Au revoir {user} !');
  setElVal('wl-leave_color', wl.leave_color || '#FF0000');
  setElVal('wl-leave_author_name', wl.leave_author_name || '');
  setElVal('wl-leave_author_icon', wl.leave_author_icon || '');
  setElVal('wl-leave_thumbnail', wl.leave_thumbnail || '');
  setElVal('wl-leave_image', wl.leave_image || '');
  setElVal('wl-leave_footer', wl.leave_footer || '');
  // Reset mode selector to welcome and refresh embed visual preview
  const modeEl = document.getElementById('wl-edit_mode');
  if (modeEl) modeEl.value = 'welcome';
  wlMode = 'welcome';
  updateEmbedPreview();

  // Announce on Role
  const aor = config.announce_on_role || {};
  setElVal('ar-trigger_role_id', aor.trigger_role_id);
  setElVal('ar-channel_id', aor.channel_id);
  setElVal('ar-embed_title', aor.embed_title || '🎉 Nouveau rôle attribué !');
  setElVal('ar-embed_desc', aor.embed_desc || 'Félicitations {user} ! Tu as reçu le rôle {role} !');
  setElVal('ar-embed_color', aor.embed_color || '#d4af37');
  setElCheck('ar-enabled', aor.enabled === 1);

  // 2. Boost
  const bst = config.boost_config || {};
  setElVal('boost-channel_id', bst.channel_id);
  setElVal('boost-title', bst.title || '🚀 Nouveau Boost de Serveur !');
  setElVal('boost-message', bst.message || '');
  setElVal('boost-reward_money', bst.reward_money ?? 5000);
  setElVal('boost-reward_karma', bst.reward_karma ?? 50);
  setElVal('boost-color', bst.color || '#F47FFF');

  // 3. Logs
  const logs = config.logs || {};
  setElVal('logs-channel_id', logs.channel_id);
  setElVal('logs-events', logs.events || 'all');

  // 4. Quarantaine
  const quar = config.quarantine || {};
  setElVal('quar-role_id', quar.role_id);
  setElVal('quar-channel_id', quar.channel_id);

  // 5. Automod
  const am = config.automod_config || {};
  setElCheck('am-anti_link', am.anti_link === 1);
  setElCheck('am-anti_spam', am.anti_spam === 1);
  setElCheck('am-anti_massmention', am.anti_massmention === 1);
  setElCheck('am-anti_badwords', am.anti_badwords === 1);
  setElVal('am-spam_max_msgs', am.spam_max_msgs ?? 5);
  setElVal('am-massmention_limit', am.massmention_limit ?? 5);
  setElVal('am-badwords_list', am.badwords_list || '');
  setElVal('am-bypass_roles', am.bypass_roles || '');

  // 6. Bump
  const bumpCfg = config.bump_config || {};
  setElVal('bump-reminder_channel', bumpCfg.reminder_channel);
  setElVal('bump-reminder_role', bumpCfg.reminder_role);

  // 7. Permissions
  const perms = config.permissions_config || {};
  setElVal('perm-admin_role_id', perms.admin_role_id);
  setElVal('perm-modo_role_id', perms.modo_role_id);
  let dr = perms.dashboard_roles || '';
  if (Array.isArray(dr)) dr = dr.join(', ');
  setElVal('perm-dashboard_roles', dr);

  // 8. Leveling
  const lc = config.leveling_config || {};
  setElVal('lv-xp_min', lc.xp_min ?? 15);
  setElVal('lv-xp_max', lc.xp_max ?? 25);
  setElVal('lv-xp_base', lc.xp_base ?? 120);
  setElVal('lv-xp_factor', lc.xp_factor ?? 1.35);
  setElVal('lv-announce_channel', lc.announce_channel || 'current');
  setElVal('lv-announce_msg', lc.announce_msg || '');

  // 9. Karma
  const kc = config.karma_config || {};
  setElCheck('km-is_active', kc.is_active === 1);
  setElVal('km-threshold_1', kc.threshold_1 ?? 20);
  setElVal('km-xp_mult_1', kc.xp_mult_1 ?? 1.2);
  setElVal('km-threshold_2', kc.threshold_2 ?? 50);
  setElVal('km-xp_mult_2', kc.xp_mult_2 ?? 1.5);

  // 10. Tribunal
  const trib = config.tribunal_config || {};
  setElVal('trib-category_id', trib.categoryId || trib.category_id);
  setElVal('trib-judge_role_id', trib.judgeRoleId || trib.judge_role_id);
  setElVal('trib-lawyer_role_id', trib.lawyerRoleId || trib.lawyer_role_id);
  setElVal('trib-accused_role_id', trib.accusedRoleId || trib.accused_role_id);
  setElVal('trib-plaintiff_role_id', trib.plaintiffRoleId || trib.plaintiff_role_id);
  setElVal('trib-channel_prefix', trib.channelPrefix || trib.channel_prefix || '⚖️┆procès-');
  setElVal('trib-auto_delete_minutes', trib.autoDeleteMinutes ?? trib.auto_delete_minutes ?? 5);

  // 11. AI
  const aic = config.ai_config || {};
  setElVal('ai-preferred_provider', aic.preferred_provider || 'groq');
  setElVal('ai-groq_text_model', aic.groq_text_model || 'llama-3.3-70b-versatile');
  setElVal('ai-gemini_model', aic.gemini_model || 'gemini-2.5-flash');

  // UNO Config
  const uno = config.uno_config || {};
  setElCheck('uno-is_active', uno.is_active === 1);
  setElVal('uno-announce_channel', uno.announce_channel);
  setElVal('uno-win_xp', uno.win_xp ?? 100);
  setElVal('uno-win_money', uno.win_money ?? 500);

  // Suites Privées
  const shopCfg = config.shop_config || {};
  setElVal('suites-private_suite_category_id', shopCfg.privateSuiteCategoryId);
  setElVal('suites-suite_channel_prefix', shopCfg.suiteChannelPrefix || '👑┆suite-');
  setElVal('suites-suite_price', shopCfg.suitePrice ?? 15000);

  // Render lists
  renderAutorolesJoinList();
  renderAutorolesRoleList();
  renderActionVeriteList();
}

function setElVal(id, val) {
  const el = document.getElementById(id);
  if (el) {
    const sVal = (val !== undefined && val !== null) ? String(val) : '';
    el.value = sVal;
  }
}

function setElCheck(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

// ─── LIST RENDERING ───────────────────────────────────────────────────────────
function renderAutorolesJoinList() {
  const list = document.getElementById('arj-list');
  if (!list) return;
  const items = state.config.autoroles_on_join || [];
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-user-tag"></i><p>Aucun rôle configuré à l\'arrivée</p></div>';
    return;
  }
  list.innerHTML = items.map(ar => `
    <div class="item-row">
      <div class="item-row-left"><i class="fa-solid fa-user-tag"></i><span>@${getRoleName(ar.role_id)}</span></div>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeAutoroleJoin('${ar.role_id}')"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

function renderAutorolesRoleList() {
  const list = document.getElementById('arr-list');
  if (!list) return;
  const items = state.config.autoroles_on_role || [];
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-arrows-rotate"></i><p>Aucune liaison de rôle configurée</p></div>';
    return;
  }
  list.innerHTML = items.map(ar => `
    <div class="role-pair-row">
      <span>@${getRoleName(ar.trigger_role_id)}</span>
      <i class="fa-solid fa-arrow-right role-pair-arrow"></i>
      <span>@${getRoleName(ar.target_role_id)}</span>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeAutoroleRole('${ar.trigger_role_id}', '${ar.target_role_id}')"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

function renderActionVeriteList() {
  const list = document.getElementById('av-list');
  if (!list) return;
  const items = state.config.action_verite || [];
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-dice"></i><p>Aucun défi configuré</p></div>';
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="item-row">
      <div class="item-row-left">
        <span class="badge ${item.type === 'action' ? 'badge-action' : 'badge-verite'}">${item.type.toUpperCase()}</span>
        <span class="badge ${item.category === 'sfw' ? 'badge-sfw' : 'badge-nsfw'}">${item.category.toUpperCase()}</span>
        <span>${item.content}</span>
      </div>
      <button type="button" class="btn btn-danger btn-sm" onclick="deleteActionVerite('${item.id}')"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

function getRoleName(roleId) {
  const r = state.roles.find(x => x.id === roleId);
  return r ? r.name : roleId;
}

// ─── ACTIONS & API SAVERS ─────────────────────────────────────────────────────
async function savePanelConfig(panelName, event) {
  if (event) event.preventDefault();
  const form = event ? event.target : document.querySelector(`#panel-${panelName} form`);
  if (!form) return;

  const formData = new FormData(form);
  const data = { guildId: state.selectedGuild };

  form.querySelectorAll('input, select, textarea').forEach(el => {
    if (!el.name) return;
    if (el.type === 'checkbox') {
      data[el.name] = el.checked;
    } else {
      data[el.name] = el.value;
    }
  });

  try {
    await api('/api/config/' + panelName, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    toast('Configuration enregistrée !');
    // Refresh config
    state.config = await api('/api/config?guildId=' + state.selectedGuild);
    hydrateForms();
  } catch(e) {
    toast(e.message || 'Erreur lors de la sauvegarde', 'error');
  }
}

async function addAutoroleJoin() {
  const roleId = document.getElementById('arj-select').value;
  if (!roleId) { toast('Sélectionnez un rôle', 'error'); return; }
  try {
    const res = await api('/api/config/autoroles/join', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.selectedGuild, role_id: roleId, action: 'add' })
    });
    state.config.autoroles_on_join = res.autoroles;
    renderAutorolesJoinList();
    toast('Rôle automatique ajouté !');
  } catch(e) { toast(e.message, 'error'); }
}

async function removeAutoroleJoin(roleId) {
  try {
    const res = await api('/api/config/autoroles/join', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.selectedGuild, role_id: roleId, action: 'delete' })
    });
    state.config.autoroles_on_join = res.autoroles;
    renderAutorolesJoinList();
    toast('Rôle retiré !');
  } catch(e) { toast(e.message, 'error'); }
}

async function addAutoroleRole() {
  const trig = document.getElementById('arr-trigger').value;
  const targ = document.getElementById('arr-target').value;
  if (!trig || !targ) { toast('Sélectionnez les deux rôles', 'error'); return; }
  try {
    const res = await api('/api/config/autoroles/role', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.selectedGuild, trigger_role_id: trig, target_role_id: targ, action: 'add' })
    });
    state.config.autoroles_on_role = res.autoroles;
    renderAutorolesRoleList();
    toast('Liaison de rôles ajoutée !');
  } catch(e) { toast(e.message, 'error'); }
}

async function removeAutoroleRole(trig, targ) {
  try {
    const res = await api('/api/config/autoroles/role', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.selectedGuild, trigger_role_id: trig, target_role_id: targ, action: 'delete' })
    });
    state.config.autoroles_on_role = res.autoroles;
    renderAutorolesRoleList();
    toast('Liaison retirée !');
  } catch(e) { toast(e.message, 'error'); }
}

async function addActionVerite() {
  const type = document.getElementById('av-type').value;
  const category = document.getElementById('av-cat').value;
  const content = document.getElementById('av-content').value.trim();
  if (!content) { toast('Entrez l\'intitulé du défi', 'error'); return; }
  try {
    const res = await api('/api/config/action-verite/add', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.selectedGuild, type, category, content })
    });
    state.config.action_verite = res.items;
    renderActionVeriteList();
    document.getElementById('av-content').value = '';
    toast('Défi ajouté avec succès !');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteActionVerite(id) {
  try {
    const res = await api('/api/config/action-verite/delete', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.selectedGuild, id })
    });
    state.config.action_verite = res.items;
    renderActionVeriteList();
    toast('Défi supprimé !');
  } catch(e) { toast(e.message, 'error'); }
}

// ─── CATEGORY HUB & WORKSPACE NAVIGATION ─────────────────────────────────────
function renderCategoryHub() {
  const grid = document.getElementById('categoryCardsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  CATEGORY_CARDS.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.onclick = () => openCategoryWorkspace(cat.id);
    card.innerHTML = `
      <div class="category-card-icon">
        <i class="fa-solid ${cat.icon}"></i>
      </div>
      <h3>${cat.title}</h3>
      <p>${cat.desc}</p>
      <div class="category-card-btn">
        Accéder aux modules <i class="fa-solid fa-chevron-right"></i>
      </div>
    `;
    grid.appendChild(card);
  });
}

function showCategoryHub() {
  const hub = document.getElementById('categoryHub');
  const ws = document.getElementById('categoryWorkspace');
  if (hub) hub.style.display = 'block';
  if (ws) ws.style.display = 'none';
}

function openCategoryWorkspace(catId) {
  const hub = document.getElementById('categoryHub');
  const ws = document.getElementById('categoryWorkspace');
  if (hub) hub.style.display = 'none';
  if (ws) ws.style.display = 'flex';
  selectCategory(catId);
}

function selectCategory(catId) {
  state.currentCat = catId;
  const sidebar = document.getElementById('dashSidebar');
  const cat = CATEGORIES[catId];
  if (!cat || !sidebar) return;

  const cardMeta = CATEGORY_CARDS.find(c => c.id === catId) || { icon: 'fa-layer-group', title: cat.label };

  let html = `
    <div class="sidebar-top-bar">
      <button class="btn-sidebar-hub" onclick="showCategoryHub()">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Menu Catégories</span>
      </button>
      <button id="sidebarClose" onclick="toggleMobileSidebar(false)" style="position:absolute; right:15px; top:18px; background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;" class="mobile-only-close">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="sidebar-cat-header">
      <i class="fa-solid ${cardMeta.icon}"></i>
      <span>${cat.label}</span>
    </div>
    <div class="sidebar-items-group">
  `;

  cat.items.forEach((item, i) => {
    const badgeHtml = item.badge ? `<span class="sidebar-badge badge-${item.badge.toLowerCase()}">${item.badge}</span>` : '';
    html += `
      <div class="sidebar-item ${i === 0 ? 'active' : ''}" data-panel="${item.id}" onclick="clickSidebarItem('${item.id}', this)">
        <i class="fa-solid ${item.icon}"></i>
        <span>${item.label}</span>
        ${badgeHtml}
      </div>
    `;
  });

  html += `</div>`;

  html += `
    <div class="sidebar-quick-cats">
      <div class="sidebar-quick-label">SWITCH DE CATÉGORIE</div>
  `;

  CATEGORY_CARDS.forEach(c => {
    if (c.id !== catId) {
      html += `
        <div class="sidebar-quick-item" onclick="openCategoryWorkspace('${c.id}')">
          <i class="fa-solid ${c.icon}"></i>
          <span>${c.title}</span>
        </div>
      `;
    }
  });

  html += `</div>`;

  sidebar.innerHTML = html;

  if (cat.items.length > 0) showPanel(cat.items[0].id);
}

function toggleMobileSidebar(forceState) {
  const sidebar = document.getElementById('dashSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  const isOpen = forceState !== undefined ? forceState : !sidebar.classList.contains('open');
  if (isOpen) {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
  } else {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }
}

function clickSidebarItem(panelId, el) {
  const sidebar = document.getElementById('dashSidebar');
  if (sidebar) {
    sidebar.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
  }
  if (el) el.classList.add('active');
  toggleMobileSidebar(false);
  showPanel(panelId);
}

function showPanel(panelId) {
  state.currentPanel = panelId;
  document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + panelId);
  if (panel) {
    panel.classList.add('active');
    populateAllDropdowns();
    hydrateForms();
  }
}

// ─── EMBED MODAL CLICK-TO-EDIT ENGINE ─────────────────────────────────────────
let activeModalType = '';

function openEmbedModal(type) {
  activeModalType = type;
  const isWelcome = wlMode === 'welcome';

  if (type === 'color') {
    // Open native color picker by creating a temporary input
    const tmp = document.createElement('input');
    tmp.type = 'color';
    tmp.value = getElVal(isWelcome ? 'wl-welcome_color' : 'wl-leave_color') || '#00FF00';
    tmp.style.position = 'absolute';
    tmp.style.opacity = '0';
    document.body.appendChild(tmp);
    tmp.addEventListener('input', e => {
      const c = e.target.value;
      setElVal(isWelcome ? 'wl-welcome_color' : 'wl-leave_color', c);
      updateEmbedPreview();
    });
    tmp.addEventListener('change', () => { document.body.removeChild(tmp); });
    tmp.click();
    return;
  }

  const labels = {
    author: '\u270f\ufe0f Modifier l\'Auteur',
    title: '\u270f\ufe0f Modifier le Titre',
    desc: '\u270f\ufe0f Modifier la Description',
    thumbnail: '\ud83d\uddbc\ufe0f Modifier la Vignette (Thumbnail)',
    image: '\ud83c\udf04 Modifier la Grande Banni\u00e8re',
    footer: '\ud83d\udc5f Modifier le Footer'
  };

  let bodyHtml = '';
  if (type === 'author') {
    const n = getElVal(isWelcome ? 'wl-welcome_author_name' : 'wl-leave_author_name');
    const i = getElVal(isWelcome ? 'wl-welcome_author_icon' : 'wl-leave_author_icon');
    bodyHtml = `
      <div class="form-group" style="margin-bottom:16px;">
        <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-user-ninja"></i> Nom de l'Auteur</label>
        <input type="text" id="modal-author_name" value="${n}" placeholder="Ex: Bagbot Elite" style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
      </div>
      <div class="form-group">
        <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-image"></i> Icône Auteur (URL https://...)</label>
        <input type="text" id="modal-author_icon" value="${i}" placeholder="https://cdn.discordapp.com/..." style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
      </div>`;
  } else if (type === 'title') {
    const v = getElVal(isWelcome ? 'wl-welcome_title' : 'wl-leave_title');
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-heading"></i> Titre de l'Embed</label>
      <input type="text" id="modal-title" value="${v}" placeholder="\ud83d\udc4b Bienvenue !" style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
    </div>`;
  } else if (type === 'desc') {
    const v = getElVal(isWelcome ? 'wl-welcome_desc' : 'wl-leave_desc');
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-align-left"></i> Description</label>
      <textarea id="modal-desc" rows="4" placeholder="Bienvenue {user}..." style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;resize:vertical;">${v}</textarea>
      <p style="font-size:.78rem;color:var(--text-muted);margin-top:6px;">Variables : {user}, {server}, {membercount}</p>
    </div>`;
  } else if (type === 'thumbnail') {
    const v = getElVal(isWelcome ? 'wl-welcome_thumbnail' : 'wl-leave_thumbnail');
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-file-image"></i> URL de la Vignette</label>
      <input type="text" id="modal-thumbnail" value="${v}" placeholder="https://... (laissez vide pour masquer)" style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
    </div>`;
  } else if (type === 'image') {
    const v = getElVal(isWelcome ? 'wl-welcome_image' : 'wl-leave_image');
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-panorama"></i> URL de la Banni\u00e8re</label>
      <input type="text" id="modal-image" value="${v}" placeholder="https://... (image ou GIF)" style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
    </div>`;
  } else if (type === 'footer') {
    const v = getElVal(isWelcome ? 'wl-welcome_footer' : 'wl-leave_footer');
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-shoe-prints"></i> Texte du Footer</label>
      <input type="text" id="modal-footer" value="${v}" placeholder="Ex: Bagbot Elite \u2022 Serveur Officiel" style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
    </div>`;
  }

  const titleEl = document.getElementById('embedModalTitle');
  const bodyEl = document.getElementById('embedModalBody');
  const backdrop = document.getElementById('embedModalBackdrop');
  if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> ${labels[type] || 'Modifier'}`;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (backdrop) backdrop.classList.add('active');
}

function closeEmbedModal(e) {
  if (e && e.target !== document.getElementById('embedModalBackdrop')) return;
  const backdrop = document.getElementById('embedModalBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

function applyEmbedModalChanges() {
  const isWelcome = wlMode === 'welcome';
  if (activeModalType === 'author') {
    const n = document.getElementById('modal-author_name');
    const i = document.getElementById('modal-author_icon');
    setElVal(isWelcome ? 'wl-welcome_author_name' : 'wl-leave_author_name', n ? n.value : '');
    setElVal(isWelcome ? 'wl-welcome_author_icon' : 'wl-leave_author_icon', i ? i.value : '');
  } else if (activeModalType === 'title') {
    const v = document.getElementById('modal-title');
    setElVal(isWelcome ? 'wl-welcome_title' : 'wl-leave_title', v ? v.value : '');
  } else if (activeModalType === 'desc') {
    const v = document.getElementById('modal-desc');
    setElVal(isWelcome ? 'wl-welcome_desc' : 'wl-leave_desc', v ? v.value : '');
  } else if (activeModalType === 'thumbnail') {
    const v = document.getElementById('modal-thumbnail');
    setElVal(isWelcome ? 'wl-welcome_thumbnail' : 'wl-leave_thumbnail', v ? v.value : '');
  } else if (activeModalType === 'image') {
    const v = document.getElementById('modal-image');
    setElVal(isWelcome ? 'wl-welcome_image' : 'wl-leave_image', v ? v.value : '');
  } else if (activeModalType === 'footer') {
    const v = document.getElementById('modal-footer');
    setElVal(isWelcome ? 'wl-welcome_footer' : 'wl-leave_footer', v ? v.value : '');
  }
  updateEmbedPreview();
  const backdrop = document.getElementById('embedModalBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

