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


// ─── WELCOME / LEAVE DISCORD EMBED LIVE PREVIEW ──────────────────────────────
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

  const wl = state.config.welcome_leave || {};
  const elAuthorName = document.getElementById('wl-active_author_name');
  const elAuthorIcon = document.getElementById('wl-active_author_icon');
  const elTitle = document.getElementById('wl-active_title');
  const elDesc = document.getElementById('wl-active_desc');
  const elColor = document.getElementById('wl-active_color');
  const elThumb = document.getElementById('wl-active_thumbnail');
  const elImage = document.getElementById('wl-active_image');
  const elFooter = document.getElementById('wl-active_footer');

  if (isWelcome) {
    if (elAuthorName) elAuthorName.value = wl.welcome_author_name || '';
    if (elAuthorIcon) elAuthorIcon.value = wl.welcome_author_icon || '';
    if (elTitle) elTitle.value = wl.welcome_title || '👋 Bienvenue sur le serveur !';
    if (elDesc) elDesc.value = wl.welcome_desc || 'Bienvenue {user} sur {server} !';
    if (elColor) elColor.value = wl.welcome_color || '#00FF00';
    if (elThumb) elThumb.value = wl.welcome_thumbnail || '';
    if (elImage) elImage.value = wl.welcome_image || '';
    if (elFooter) elFooter.value = wl.welcome_footer || '';
  } else {
    if (elAuthorName) elAuthorName.value = wl.leave_author_name || '';
    if (elAuthorIcon) elAuthorIcon.value = wl.leave_author_icon || '';
    if (elTitle) elTitle.value = wl.leave_title || '👋 Au revoir';
    if (elDesc) elDesc.value = wl.leave_desc || 'Au revoir {user} !';
    if (elColor) elColor.value = wl.leave_color || '#FF0000';
    if (elThumb) elThumb.value = wl.leave_thumbnail || '';
    if (elImage) elImage.value = wl.leave_image || '';
    if (elFooter) elFooter.value = wl.leave_footer || '';
  }
  updateEmbedPreview();
}

function updateEmbedPreview() {
  const elAuthorName = document.getElementById('wl-active_author_name');
  const elAuthorIcon = document.getElementById('wl-active_author_icon');
  const elTitle = document.getElementById('wl-active_title');
  const elDesc = document.getElementById('wl-active_desc');
  const elColor = document.getElementById('wl-active_color');
  const elThumb = document.getElementById('wl-active_thumbnail');
  const elImage = document.getElementById('wl-active_image');
  const elFooter = document.getElementById('wl-active_footer');
  if (!elTitle || !elDesc || !elColor) return;

  const authorName = elAuthorName ? elAuthorName.value : '';
  const authorIcon = elAuthorIcon ? elAuthorIcon.value : '';
  const title = elTitle.value;
  const desc = elDesc.value;
  const color = elColor.value;
  const thumb = elThumb ? elThumb.value : '';
  const image = elImage ? elImage.value : '';
  const footer = elFooter ? elFooter.value : '';

  const botAvatarImg = document.getElementById('wl-embed-bot-avatar');
  if (botAvatarImg && state.botInfo.avatarURL) botAvatarImg.src = state.botInfo.avatarURL;

  const bar = document.getElementById('wl-embed-bar-color');
  if (bar) bar.style.background = color;

  const pAuthorWrap = document.getElementById('wl-preview-author-wrap');
  const pAuthorName = document.getElementById('wl-preview-author-name');
  const pAuthorIcon = document.getElementById('wl-preview-author-icon');
  if (authorName || authorIcon) {
    if (pAuthorWrap) pAuthorWrap.style.display = 'flex';
    if (pAuthorName) pAuthorName.textContent = authorName;
    if (pAuthorIcon) {
      if (authorIcon) { pAuthorIcon.src = authorIcon; pAuthorIcon.style.display = 'block'; }
      else { pAuthorIcon.style.display = 'none'; }
    }
  } else {
    if (pAuthorWrap) pAuthorWrap.style.display = 'none';
  }

  const pTitle = document.getElementById('wl-preview-title');
  if (pTitle) pTitle.textContent = title || (wlMode === 'welcome' ? '👋 Bienvenue sur le serveur !' : '👋 Au revoir');

  const pDesc = document.getElementById('wl-preview-desc');
  if (pDesc) pDesc.textContent = desc || (wlMode === 'welcome' ? 'Bienvenue {user} sur {server} !' : 'Au revoir {user} !');

  const pThumbWrap = document.getElementById('wl-preview-thumb-wrap');
  const pThumbImg = document.getElementById('wl-preview-thumb-img');
  if (thumb) {
    if (pThumbWrap) pThumbWrap.style.display = 'block';
    if (pThumbImg) pThumbImg.src = thumb;
  } else {
    if (pThumbWrap) pThumbWrap.style.display = 'none';
  }

  const pBannerWrap = document.getElementById('wl-preview-banner-wrap');
  const pBannerImg = document.getElementById('wl-preview-banner-img');
  if (image) {
    if (pBannerWrap) pBannerWrap.style.display = 'block';
    if (pBannerImg) pBannerImg.src = image;
  } else {
    if (pBannerWrap) pBannerWrap.style.display = 'none';
  }

  const pFooterWrap = document.getElementById('wl-preview-footer-wrap');
  const pFooterText = document.getElementById('wl-preview-footer-text');
  if (footer) {
    if (pFooterWrap) pFooterWrap.style.display = 'flex';
    if (pFooterText) pFooterText.textContent = footer;
  } else {
    if (pFooterWrap) pFooterWrap.style.display = 'none';
  }

  if (wlMode === 'welcome') {
    setElVal('wl-welcome_author_name', authorName);
    setElVal('wl-welcome_author_icon', authorIcon);
    setElVal('wl-welcome_title', title);
    setElVal('wl-welcome_desc', desc);
    setElVal('wl-welcome_color', color);
    setElVal('wl-welcome_thumbnail', thumb);
    setElVal('wl-welcome_image', image);
    setElVal('wl-welcome_footer', footer);
  } else {
    setElVal('wl-leave_author_name', authorName);
    setElVal('wl-leave_author_icon', authorIcon);
    setElVal('wl-leave_title', title);
    setElVal('wl-leave_desc', desc);
    setElVal('wl-leave_color', color);
    setElVal('wl-leave_thumbnail', thumb);
    setElVal('wl-leave_image', image);
    setElVal('wl-leave_footer', footer);
  }
}


function hydrateForms() {
  const config = state.config || {};

  // 1. Welcome / Leave
  const wl = config.welcome_leave || {};
  setElVal('wl-welcome_channel', wl.welcome_channel);
  setElVal('wl-welcome_role_filter', wl.welcome_role_filter);
  setElVal('wl-welcome_title', wl.welcome_title || '👋 Bienvenue');
  setElVal('wl-welcome_desc', wl.welcome_desc || 'Bienvenue {user} sur le serveur !');
  setElVal('wl-welcome_color', wl.welcome_color || '#00ff00');
  setElVal('wl-leave_channel', wl.leave_channel);
  setElVal('wl-leave_title', wl.leave_title || '👋 Au revoir');
  setElVal('wl-leave_desc', wl.leave_desc || 'Au revoir {user} !');
  setElVal('wl-leave_color', wl.leave_color || '#ff0000');
  switchWelcomeLeaveMode('welcome');

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
  if (window.innerWidth <= 900) {
    toggleMobileSidebar(true);
  }
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

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
