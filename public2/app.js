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
const categories = [
  {
    id: 'general', icon: 'fa-house', label: 'Général',
    items: [
      { id: 'welcome-leave', icon: 'fa-door-open', label: 'Arrivées & Départs' },
      { id: 'boost-embed', icon: 'fa-rocket', label: 'Boost Serveur' },
      { id: 'announce-role', icon: 'fa-bullhorn', label: 'Annonce sur Rôle' },
      { id: 'bump', icon: 'fa-bell', label: 'Rappel Bump' },
    ]
  },
  {
    id: 'moderation', icon: 'fa-shield-halved', label: 'Modération',
    items: [
      { id: 'automod', icon: 'fa-robot', label: 'AutoMod' },
      { id: 'logs', icon: 'fa-file-lines', label: 'Logs' },
      { id: 'quarantine', icon: 'fa-lock', label: 'Quarantaine' },
      { id: 'tribunal', icon: 'fa-gavel', label: 'Tribunal' },
    ]
  },
  {
    id: 'economy', icon: 'fa-coins', label: 'Économie',
    items: [
      { id: 'leveling', icon: 'fa-chart-line', label: 'Niveaux & XP' },
      { id: 'karma', icon: 'fa-heart', label: 'Karma' },
      { id: 'rewards', icon: 'fa-trophy', label: 'Récompenses Niveaux' },
    ]
  },
  {
    id: 'autoroles', icon: 'fa-user-tag', label: 'Auto-Rôles',
    items: [
      { id: 'autoroles-join', icon: 'fa-user-plus', label: 'Sur Arrivée' },
      { id: 'autoroles-role', icon: 'fa-rotate', label: 'Sur Attribution de Rôle' },
    ]
  },
  {
    id: 'entertainment', icon: 'fa-gamepad', label: 'Divertissement',
    items: [
      { id: 'action-verite', icon: 'fa-dice', label: 'Action-Vérité' },
      { id: 'confessions', icon: 'fa-comment-dots', label: 'Confessions' },
      { id: 'uno', icon: 'fa-cards-blank', label: 'Jeu UNO' },
    ]
  },
  {
    id: 'ai-tickets', icon: 'fa-robot', label: 'IA & Tickets',
    items: [
      { id: 'ai-config', icon: 'fa-brain', label: 'Config IA' },
      { id: 'tickets', icon: 'fa-ticket', label: 'Tickets' },
    ]
  },
  {
    id: 'settings', icon: 'fa-gear', label: 'Paramètres',
    items: [
      { id: 'permissions', icon: 'fa-key', label: 'Permissions Dashboard' },
      { id: 'suites', icon: 'fa-star', label: 'Suites Privées' },
    ]
  },
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
  const pThumbPlaceholder = document.getElementById('wl-thumb-placeholder');
  const pThumbImg = document.getElementById('wl-preview-thumb-img');
  if (thumb) {
    if (pThumbImg) { pThumbImg.src = thumb; pThumbImg.style.display = 'block'; }
    if (pThumbPlaceholder) pThumbPlaceholder.style.display = 'none';
  } else {
    if (pThumbImg) pThumbImg.style.display = 'none';
    if (pThumbPlaceholder) pThumbPlaceholder.style.display = 'flex';
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
  setElVal('bst-channel_id', bst.channel_id);
  setElVal('bst-reward_money', bst.reward_money ?? 5000);
  setElVal('bst-reward_karma', bst.reward_karma ?? 50);
  setElVal('bst-title', bst.title || '🚀 Nouveau Boost de Serveur !');
  setElVal('bst-message', bst.message || "Merci {user} d'avoir boosté le serveur !");
  setElVal('bst-color', bst.color || '#F47FFF');
  setElVal('bst-author_name', bst.author_name || '');
  setElVal('bst-author_icon', bst.author_icon || '');
  setElVal('bst-thumbnail', bst.thumbnail || '');
  setElVal('bst-image', bst.image || '');
  setElVal('bst-footer', bst.footer || '');
  
  if (typeof updateBoostEmbedPreview === 'function') updateBoostEmbedPreview();

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
  categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.onclick = () => openCategoryWorkspace(cat.id);
    card.innerHTML = `
      <div class="category-card-icon">
        <i class="fa-solid ${cat.icon}"></i>
      </div>
      <h3>${cat.label}</h3>
      <p>Configurez les paramètres de ${cat.label.toLowerCase()}</p>
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
  const cat = categories.find(c => c.id === catId);
  if (!cat || !sidebar) return;

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
      <i class="fa-solid ${cat.icon}"></i>
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

  categories.forEach(c => {
    if (c.id !== catId) {
      html += `
        <div class="sidebar-quick-item" onclick="openCategoryWorkspace('${c.id}')">
          <i class="fa-solid ${c.icon}"></i>
          <span>${c.label}</span>
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
  const isBoost = type.startsWith('bst-');
  const bareType = isBoost ? type.replace('bst-', '') : type;
  const isWelcome = !isBoost && wlMode === 'welcome';
  
  const getFieldId = (t) => {
    if (isBoost) return 'bst-' + (t === 'desc' ? 'message' : t);
    return isWelcome ? 'wl-welcome_' + t : 'wl-leave_' + t;
  };

  if (bareType === 'color') {
    const tmp = document.createElement('input');
    tmp.type = 'color';
    tmp.value = getElVal(getFieldId('color')) || (isBoost ? '#F47FFF' : (isWelcome ? '#00FF00' : '#FF0000'));
    tmp.style.position = 'absolute';
    tmp.style.opacity = '0';
    document.body.appendChild(tmp);
    tmp.addEventListener('input', e => {
      const c = e.target.value;
      setElVal(getFieldId('color'), c);
      if (isBoost) updateBoostEmbedPreview(); else updateEmbedPreview();
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
  if (bareType === 'author') {
    const n = getElVal(getFieldId('author_name'));
    const i = getElVal(getFieldId('author_icon'));
    bodyHtml = `
      <div class="form-group" style="margin-bottom:16px;">
        <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-user-ninja"></i> Nom de l'Auteur</label>
        <input type="text" id="modal-author_name" value="${n}" placeholder="Ex: Bagbot Elite" style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
      </div>
      <div class="form-group">
        <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-image"></i> Icône Auteur (URL https://...)</label>
        <input type="text" id="modal-author_icon" value="${i}" placeholder="https://cdn.discordapp.com/..." style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
      </div>`;
  } else if (bareType === 'title') {
    const v = getElVal(getFieldId('title'));
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-heading"></i> Titre de l'Embed</label>
      <input type="text" id="modal-title" value="${v}" placeholder="Titre..." style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
    </div>`;
  } else if (bareType === 'desc') {
    const v = getElVal(getFieldId('desc'));
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-align-left"></i> Description</label>
      <textarea id="modal-desc" rows="4" placeholder="Description..." style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;resize:vertical;">${v}</textarea>
      <p style="font-size:.78rem;color:var(--text-muted);margin-top:6px;">Variables : {user}, {server}</p>
    </div>`;
  } else if (bareType === 'thumbnail') {
    const v = getElVal(getFieldId('thumbnail'));
    const hasImg = v && v.length > 0;
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-link"></i> URL de la Vignette</label>
      <input type="text" id="modal-thumbnail" value="${v}" placeholder="https://... (laissez vide pour masquer)" oninput="modalImgPreview('modal-thumbnail','modal-thumb-preview')" style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
      <div class="upload-or-divider">ou t\u00e9l\u00e9verser directement</div>
      <label class="btn-upload-img">
        <i class="fa-solid fa-upload"></i> Choisir une image (JPG, PNG, GIF, WEBP)
        <input type="file" accept="image/*" onchange="handleImgUpload(event,'modal-thumbnail','modal-thumb-preview')">
      </label>
      <img id="modal-thumb-preview" class="modal-img-preview" src="${v}" style="${hasImg ? 'display:block' : 'display:none'}">
    </div>`;
  } else if (bareType === 'image') {
    const v = getElVal(getFieldId('image'));
    const hasImg = v && v.length > 0;
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-link"></i> URL de la Banni\u00e8re (image ou GIF)</label>
      <input type="text" id="modal-image" value="${v}" placeholder="https://... (image ou GIF)" oninput="modalImgPreview('modal-image','modal-banner-preview')" style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
      <div class="upload-or-divider">ou t\u00e9l\u00e9verser directement</div>
      <label class="btn-upload-img">
        <i class="fa-solid fa-upload"></i> Choisir une image / GIF (JPG, PNG, GIF, WEBP)
        <input type="file" accept="image/*" onchange="handleImgUpload(event,'modal-image','modal-banner-preview')">
      </label>
      <img id="modal-banner-preview" class="modal-img-preview" src="${v}" style="${hasImg ? 'display:block' : 'display:none'}">
    </div>`;
  } else if (bareType === 'footer') {
    const v = getElVal(getFieldId('footer'));
    bodyHtml = `<div class="form-group">
      <label style="color:var(--gold3);font-size:.85rem;margin-bottom:6px;display:block;"><i class="fa-solid fa-shoe-prints"></i> Texte du Footer</label>
      <input type="text" id="modal-footer" value="${v}" placeholder="Ex: Bagbot Elite \u2022 Serveur Officiel" style="width:100%;padding:10px 14px;background:var(--black3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Outfit,sans-serif;font-size:.9rem;">
    </div>`;
  }

  const titleEl = document.getElementById('embedModalTitle');
  const bodyEl = document.getElementById('embedModalBody');
  const backdrop = document.getElementById('embedModalBackdrop');
  if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> ${labels[bareType] || 'Modifier'}`;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (backdrop) backdrop.classList.add('active');
}

function closeEmbedModal(e) {
  if (e && e.target !== document.getElementById('embedModalBackdrop')) return;
  const backdrop = document.getElementById('embedModalBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

function applyEmbedModalChanges() {
  const isBoost = activeModalType.startsWith('bst-');
  const bareType = isBoost ? activeModalType.replace('bst-', '') : activeModalType;
  const isWelcome = !isBoost && wlMode === 'welcome';
  
  const getFieldId = (t) => {
    if (isBoost) return 'bst-' + (t === 'desc' ? 'message' : t);
    return isWelcome ? 'wl-welcome_' + t : 'wl-leave_' + t;
  };

  if (bareType === 'author') {
    const n = document.getElementById('modal-author_name');
    const i = document.getElementById('modal-author_icon');
    setElVal(getFieldId('author_name'), n ? n.value : '');
    setElVal(getFieldId('author_icon'), i ? i.value : '');
  } else if (bareType === 'title') {
    const v = document.getElementById('modal-title');
    setElVal(getFieldId('title'), v ? v.value : '');
  } else if (bareType === 'desc') {
    const v = document.getElementById('modal-desc');
    setElVal(getFieldId('desc'), v ? v.value : '');
  } else if (bareType === 'thumbnail') {
    const v = document.getElementById('modal-thumbnail');
    setElVal(getFieldId('thumbnail'), v ? v.value : '');
  } else if (bareType === 'image') {
    const v = document.getElementById('modal-image');
    setElVal(getFieldId('image'), v ? v.value : '');
  } else if (bareType === 'footer') {
    const v = document.getElementById('modal-footer');
    setElVal(getFieldId('footer'), v ? v.value : '');
  }
  
  if (isBoost) updateBoostEmbedPreview(); else updateEmbedPreview();
  const backdrop = document.getElementById('embedModalBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

function updateBoostEmbedPreview() {
  const title       = getElVal('bst-title');
  const desc        = getElVal('bst-message');
  const color       = getElVal('bst-color');
  const authorName  = getElVal('bst-author_name');
  const authorIcon  = getElVal('bst-author_icon');
  const thumb       = getElVal('bst-thumbnail');
  const image       = getElVal('bst-image');
  const footer      = getElVal('bst-footer');

  const botAvatarImg = document.getElementById('bst-bot-avatar-img');
  if (botAvatarImg && state.botInfo && state.botInfo.avatarURL) botAvatarImg.src = state.botInfo.avatarURL;

  const bar = document.getElementById('bst-embed-color-bar');
  if (bar) bar.style.background = color || '#F47FFF';

  const pAuthorName = document.getElementById('bst-preview-author-name');
  const pAuthorIcon = document.getElementById('bst-preview-author-icon');
  if (pAuthorName) pAuthorName.textContent = authorName || 'Cliquez pour ajouter un Auteur...';
  if (pAuthorIcon) {
    if (authorIcon) { pAuthorIcon.src = authorIcon; pAuthorIcon.style.display = 'block'; }
    else { pAuthorIcon.style.display = 'none'; }
  }

  const pTitle = document.getElementById('bst-preview-title');
  if (pTitle) pTitle.textContent = title || '🚀 Nouveau Boost de Serveur !';

  const pDesc = document.getElementById('bst-preview-desc');
  if (pDesc) pDesc.textContent = desc || "Merci {user} d'avoir boosté le serveur !";

  const pThumbPlaceholder = document.getElementById('bst-thumb-placeholder');
  const pThumbImg = document.getElementById('bst-preview-thumb-img');
  if (thumb) {
    if (pThumbImg) { pThumbImg.src = thumb; pThumbImg.style.display = 'block'; }
    if (pThumbPlaceholder) pThumbPlaceholder.style.display = 'none';
  } else {
    if (pThumbImg) pThumbImg.style.display = 'none';
    if (pThumbPlaceholder) pThumbPlaceholder.style.display = 'flex';
  }

  const pBannerPlaceholder = document.getElementById('bst-banner-placeholder');
  const pBannerImg = document.getElementById('bst-preview-banner-img');
  if (image) {
    if (pBannerImg) { pBannerImg.src = image; pBannerImg.style.display = 'block'; }
    if (pBannerPlaceholder) pBannerPlaceholder.style.display = 'none';
  } else {
    if (pBannerImg) pBannerImg.style.display = 'none';
    if (pBannerPlaceholder) pBannerPlaceholder.style.display = 'flex';
  }

  const pFooterText = document.getElementById('bst-preview-footer-text');
  if (pFooterText) pFooterText.textContent = footer || 'Cliquez pour ajouter un Footer...';
}

// ─── IMAGE UPLOAD HELPERS ──────────────────────────────────────────────────────
// Called when user picks a file — reads it as base64 and sets URL input + preview
async function handleImgUpload(event, inputId, previewId) {
  const file = event.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const previewEl = document.getElementById(previewId);
    const inputEl = document.getElementById(inputId);
    if (previewEl) { previewEl.src = URL.createObjectURL(file); previewEl.style.display = 'block'; }
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) {
      if (inputEl) inputEl.value = data.url;
      if (previewEl) previewEl.src = data.url;
      toast('Image uploadée avec succès !', 'success');
    } else {
      toast('Erreur upload: ' + (data.error || 'inconnu'), 'error');
    }
  } catch(e) {
    toast('Erreur upload: ' + e.message, 'error');
  }
}

// Called when user types a URL — live-previews the image
function modalImgPreview(inputId, previewId) {
  const inputEl = document.getElementById(inputId);
  const previewEl = document.getElementById(previewId);
  if (!inputEl || !previewEl) return;
  const url = inputEl.value.trim();
  if (url) {
    previewEl.src = url;
    previewEl.style.display = 'block';
    previewEl.onerror = () => { previewEl.style.display = 'none'; };
  } else {
    previewEl.style.display = 'none';
  }
}

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);


