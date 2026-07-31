
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
    label: 'Général',
    items: [
      { id: 'welcome-leave', label: 'Bienvenue & Départ', icon: 'fa-hand-wave' },
    ]
  },
  moderation: {
    label: 'Modération',
    items: [
      { id: 'automod', label: 'Auto-Modération', icon: 'fa-shield-halved' },
      { id: 'logs', label: 'Logs', icon: 'fa-scroll' },
      { id: 'tribunal', label: 'Tribunal', icon: 'fa-gavel' },
      { id: 'quarantine', label: 'Quarantaine', icon: 'fa-lock' },
    ]
  },
  economie: {
    label: 'Économie',
    items: [
      { id: 'leveling', label: 'Niveaux & XP', icon: 'fa-chart-line' },
      { id: 'karma', label: 'Karma', icon: 'fa-heart-pulse' },
    ]
  },
  autoroles: {
    label: 'Auto-Rôles',
    items: [
      { id: 'autoroles-join', label: "À l'Arrivée", icon: 'fa-user-plus' },
      { id: 'autoroles-role', label: 'Sur Rôle', icon: 'fa-arrows-rotate' },
    ]
  },
  divertissement: {
    label: 'Divertissement',
    items: [
      { id: 'action-verite', label: 'Action ou Vérité', icon: 'fa-dice' },
    ]
  },
  ia: {
    label: 'IA & Tickets',
    items: [
      { id: 'ai', label: 'Config IA', icon: 'fa-brain' },
    ]
  },
  parametres: {
    label: 'Paramètres',
    items: [
      { id: 'boost', label: 'Boost', icon: 'fa-rocket' },
      { id: 'bump', label: 'Bump Reminders', icon: 'fa-bell' },
      { id: 'permissions', label: 'Permissions', icon: 'fa-shield-check' },
    ]
  },
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  if (el) el.classList.add('active');
}

function toast(msg, type = 'success', duration = 3500) {
  const cont = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  t.innerHTML = '<i class="fa-solid ' + (icons[type] || 'fa-circle-info') + '"></i><span>' + msg + '</span>';
  cont.appendChild(t);
  setTimeout(() => {
    t.classList.add('removing');
    setTimeout(() => t.remove(), 320);
  }, duration);
}

async function api(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  } catch (e) {
    throw e;
  }
}

function buildChannelOptions(select, channels, selectedId, types = null) {
  const current = selectedId || select.value;
  select.innerHTML = '<option value="">— Aucun —</option>';
  let list = channels;
  if (types) list = channels.filter(c => types.includes(c.type));
  list.sort((a, b) => a.name.localeCompare(b.name));
  for (const ch of list) {
    const opt = document.createElement('option');
    opt.value = ch.id;
    opt.textContent = '#' + ch.name;
    if (ch.id === current) opt.selected = true;
    select.appendChild(opt);
  }
}

function buildRoleOptions(select, roles, selectedId) {
  const current = selectedId || select.value;
  select.innerHTML = '<option value="">— Aucun —</option>';
  const sorted = [...roles].sort((a, b) => b.position - a.position);
  for (const r of sorted) {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.name;
    if (r.id === current) opt.selected = true;
    select.appendChild(opt);
  }
}

function buildCategoryOptions(select, channels, selectedId) {
  const current = selectedId || select.value;
  select.innerHTML = '<option value="">— Aucune —</option>';
  const cats = channels.filter(c => c.type === 4);
  for (const c of cats) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === current) opt.selected = true;
    select.appendChild(opt);
  }
}

function roleName(roleId) {
  const r = state.roles.find(x => x.id === roleId);
  return r ? r.name : roleId;
}

function channelName(channelId) {
  const c = state.channels.find(x => x.id === channelId);
  return c ? '#' + c.name : channelId;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  // Load bot info for login page
  try {
    const bi = await api('/api/bot/info');
    state.botInfo = bi;
    if (bi.username) document.getElementById('loginBotName').textContent = bi.username;
    if (bi.avatarURL) {
      const icon = document.getElementById('loginBotIcon');
      icon.innerHTML = '<img src="' + bi.avatarURL + '" alt="Bot">';
    }
  } catch(e) {}

  // Check auth
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
    console.error(e);
    showPage('login');
  }
}

// ─── GUILD SELECTION ──────────────────────────────────────────────────────────
async function showGuilds() {
  showPage('guilds');
  // Show user info
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
      let iconHtml;
      if (g.icon) {
        iconHtml = '<div class="guild-icon-wrap"><img src="https://cdn.discordapp.com/icons/' + g.id + '/' + g.icon + '.png" alt="' + g.name + '"></div>';
      } else {
        const letter = g.name.charAt(0).toUpperCase();
        iconHtml = '<div class="guild-icon-wrap"><span class="guild-avatar-letter">' + letter + '</span></div>';
      }
      card.innerHTML = iconHtml + '<h3>' + g.name + '</h3>';
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

  // Header bot info
  if (state.botInfo.username) document.getElementById('headerBotName').textContent = state.botInfo.username;
  if (state.botInfo.avatarURL) document.getElementById('headerBotAvatar').src = state.botInfo.avatarURL;

  // User info
  if (state.user) {
    document.getElementById('headerUserAvatar').src = state.user.avatar_url;
    document.getElementById('headerUserName').textContent = state.user.global_name || state.user.username;
  }

  // Guild info
  const guildId = state.selectedGuild;
  const g = guild || state.guilds.find(x => x.id === guildId) || { name: 'Serveur', id: guildId };
  document.getElementById('headerGuildName').textContent = g.name;
  const iconEl = document.getElementById('headerGuildIcon');
  if (g.icon) {
    iconEl.innerHTML = '<img src="https://cdn.discordapp.com/icons/' + g.id + '/' + g.icon + '.png" alt="">';
  } else {
    iconEl.textContent = g.name ? g.name.charAt(0).toUpperCase() : 'S';
  }

  // Load channels, roles, config in parallel
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
    console.error('Error loading data:', e);
    state.channels = [];
    state.roles = [];
    state.config = {};
  }

  // Render Category Hub cards & display hub
  renderCategoryHub();
  showCategoryHub();
}

// ─── CATEGORY HUB & WORKSPACE NAVIGATION ─────────────────────────────────────
const CATEGORY_CARDS = [
  { id: 'general', title: 'Général', icon: 'fa-house', desc: 'Bienvenue, Départs & Annonces du serveur' },
  { id: 'moderation', title: 'Modération', icon: 'fa-shield-halved', desc: 'AutoMod, Logs, Tribunal & Quarantaine' },
  { id: 'economie', title: 'Économie & Niveaux', icon: 'fa-star', desc: 'Système XP, Niveaux & Karma' },
  { id: 'autoroles', title: 'Auto-Rôles', icon: 'fa-masks-theater', desc: "Rôles à l'arrivée & Rôles sur réaction" },
  { id: 'divertissement', title: 'Divertissement', icon: 'fa-gamepad', desc: 'Jeux interactifs & Action ou Vérité' },
  { id: 'ia', title: 'IA & Tickets', icon: 'fa-robot', desc: 'Assistant IA & Système de Tickets' },
  { id: 'parametres', title: 'Paramètres', icon: 'fa-gear', desc: 'Boost, Bump & Permissions Dashboard' },
];

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

  const btn = document.querySelector(`.cat-btn[data-cat="${catId}"]`);
  selectCategory(catId, btn);
}

// ─── CATEGORY / SIDEBAR ───────────────────────────────────────────────────────
function selectCategory(catId, btnEl) {
  state.currentCat = catId;
  // Update cat buttons
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  // Render sidebar
  const sidebar = document.getElementById('dashSidebar');
  const cat = CATEGORIES[catId];
  if (!cat) return;
  sidebar.innerHTML = '<div class="sidebar-cat-label">' + cat.label + '</div>';
  cat.items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'sidebar-item' + (i === 0 ? ' active' : '');
    el.innerHTML = '<i class="fa-solid ' + item.icon + '"></i> ' + item.label;
    el.onclick = () => {
      sidebar.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
      el.classList.add('active');
      showPanel(item.id);
    };
    sidebar.appendChild(el);
  });

  // Show first panel
  if (cat.items.length > 0) showPanel(cat.items[0].id);
}

function showPanel(panelId) {
  state.currentPanel = panelId;
  document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + panelId);
  if (panel) {
    panel.classList.add('active');
    fillPanel(panelId);
  }
}

// ─── PANEL FILLERS ────────────────────────────────────────────────────────────
function fillPanel(panelId) {
  const fn = panelFillers[panelId];
  if (fn) fn();
}

const panelFillers = {
  'welcome-leave': fillWelcomeLeave,
  'automod': fillAutomod,
  'logs': fillLogs,
  'tribunal': fillTribunal,
  'quarantine': fillQuarantine,
  'leveling': fillLeveling,
  'karma': fillKarma,
  'autoroles-join': fillAutorolesJoin,
  'autoroles-role': fillAutorolesRole,
  'action-verite': fillActionVerite,
  'ai': fillAi,
  'boost': fillBoost,
  'bump': fillBump,
  'permissions': fillPermissions,
};

function fillWelcomeLeave() {
  const wl = state.config.welcome_leave || {};
  buildChannelOptions(document.getElementById('wl-welcome_channel'), state.channels, wl.welcome_channel, [0]);
  buildChannelOptions(document.getElementById('wl-leave_channel'), state.channels, wl.leave_channel, [0]);
  document.getElementById('wl-welcome_title').value = wl.welcome_title || '';
  document.getElementById('wl-welcome_desc').value = wl.welcome_desc || '';
  document.getElementById('wl-leave_title').value = wl.leave_title || '';
  document.getElementById('wl-leave_desc').value = wl.leave_desc || '';
  const wc = wl.welcome_color || '#00FF00';
  const lc = wl.leave_color || '#FF0000';
  document.getElementById('wl-welcome_color').value = wc;
  document.getElementById('wl-welcome_color_preview').style.background = wc;
  document.getElementById('wl-welcome_color_val').textContent = wc;
  document.getElementById('wl-leave_color').value = lc;
  document.getElementById('wl-leave_color_preview').style.background = lc;
  document.getElementById('wl-leave_color_val').textContent = lc;
  document.getElementById('wl-welcome_color').addEventListener('input', function() {
    document.getElementById('wl-welcome_color_preview').style.background = this.value;
    document.getElementById('wl-welcome_color_val').textContent = this.value;
  });
  document.getElementById('wl-leave_color').addEventListener('input', function() {
    document.getElementById('wl-leave_color_preview').style.background = this.value;
    document.getElementById('wl-leave_color_val').textContent = this.value;
  });
}

function fillAutomod() {
  const amc = state.config.automod_config || {};
  document.getElementById('am-anti_link').checked = !!amc.anti_link;
  document.getElementById('am-anti_spam').checked = !!amc.anti_spam;
  document.getElementById('am-anti_massmention').checked = !!amc.anti_massmention;
  document.getElementById('am-anti_badwords').checked = !!amc.anti_badwords;
  document.getElementById('am-spam_max_msgs').value = amc.spam_max_msgs || 5;
  document.getElementById('am-massmention_limit').value = amc.massmention_limit || 5;
  document.getElementById('am-badwords_list').value = amc.badwords_list || '';
  document.getElementById('am-bypass_roles').value = amc.bypass_roles || '';
}

function fillLogs() {
  const logs = state.config.logs || {};
  buildChannelOptions(document.getElementById('logs-channel_id'), state.channels, logs.channel_id, [0]);
  const evSel = document.getElementById('logs-events');
  evSel.value = logs.events || 'all';
}

function fillTribunal() {
  const trib = state.config.tribunal_config || {};
  buildCategoryOptions(document.getElementById('trib-category_id'), state.channels, trib.categoryId || trib.category_id || '');
  buildRoleOptions(document.getElementById('trib-judge_role_id'), state.roles, trib.judgeRoleId || trib.judge_role_id || '');
  buildRoleOptions(document.getElementById('trib-lawyer_role_id'), state.roles, trib.lawyerRoleId || trib.lawyer_role_id || '');
  buildRoleOptions(document.getElementById('trib-accused_role_id'), state.roles, trib.accusedRoleId || trib.accused_role_id || '');
  buildRoleOptions(document.getElementById('trib-plaintiff_role_id'), state.roles, trib.plaintiffRoleId || trib.plaintiff_role_id || '');
  document.getElementById('trib-channel_prefix').value = trib.channelPrefix || trib.channel_prefix || '⚖️┆procès-';
  document.getElementById('trib-auto_delete_minutes').value = trib.autoDeleteMinutes || trib.auto_delete_minutes || 5;
}

function fillQuarantine() {
  const q = state.config.quarantine || {};
  buildRoleOptions(document.getElementById('quar-role_id'), state.roles, q.role_id);
  buildChannelOptions(document.getElementById('quar-channel_id'), state.channels, q.channel_id, [0]);
}

function fillLeveling() {
  const lc = state.config.leveling_config || {};
  document.getElementById('lv-xp_min').value = lc.xp_min || 15;
  document.getElementById('lv-xp_max').value = lc.xp_max || 25;
  document.getElementById('lv-xp_base').value = lc.xp_base || 120;
  document.getElementById('lv-xp_factor').value = lc.xp_factor || 1.35;
  document.getElementById('lv-karma_min').value = lc.karma_min || 1;
  document.getElementById('lv-karma_max').value = lc.karma_max || 3;
  document.getElementById('lv-announce_msg').value = lc.announce_msg || '';
  const sel = document.getElementById('lv-announce_channel');
  sel.innerHTML = '<option value="current">Salon actuel</option><option value="">— Aucun —</option>';
  for (const ch of state.channels.filter(c => c.type === 0)) {
    const opt = document.createElement('option');
    opt.value = ch.id;
    opt.textContent = '#' + ch.name;
    if (ch.id === lc.announce_channel) opt.selected = true;
    sel.appendChild(opt);
  }
  if (lc.announce_channel === 'current') sel.value = 'current';
  else if (!lc.announce_channel) sel.value = '';
}

function fillKarma() {
  const kc = state.config.karma_config || {};
  document.getElementById('km-is_active').checked = !!kc.is_active;
  document.getElementById('km-threshold_1').value = kc.threshold_1 || 20;
  document.getElementById('km-xp_mult_1').value = kc.xp_mult_1 || 1.2;
  document.getElementById('km-discount_1').value = kc.discount_1 || 5;
  document.getElementById('km-threshold_2').value = kc.threshold_2 || 50;
  document.getElementById('km-xp_mult_2').value = kc.xp_mult_2 || 1.5;
  document.getElementById('km-discount_2').value = kc.discount_2 || 10;
  document.getElementById('km-threshold_3').value = kc.threshold_3 || 100;
  document.getElementById('km-xp_mult_3').value = kc.xp_mult_3 || 2.0;
  document.getElementById('km-discount_3').value = kc.discount_3 || 20;
}

function renderAutorolesJoinList() {
  const list = document.getElementById('arj-list');
  const autoroles = state.config.autoroles_on_join || [];
  if (autoroles.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-user-tag"></i><p>Aucun rôle configuré</p></div>';
    return;
  }
  list.innerHTML = '';
  for (const ar of autoroles) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = '<div class="item-row-left"><i class="fa-solid fa-user-tag"></i><span>@' + roleName(ar.role_id) + '</span></div><button type="button" class="btn btn-danger btn-icon btn-sm" onclick="removeAutoroleJoin(\'' + ar.role_id + '\')"><i class="fa-solid fa-trash"></i></button>';
    list.appendChild(row);
  }
}

function fillAutorolesJoin() {
  buildRoleOptions(document.getElementById('arj-role_id'), state.roles, '');
  renderAutorolesJoinList();
}

async function addAutoroleJoin() {
  const roleId = document.getElementById('arj-role_id').value;
  if (!roleId) return toast('Sélectionnez un rôle', 'error');
  try {
    const data = await api('/api/config/autoroles/join', { method: 'POST', body: JSON.stringify({ guildId: state.selectedGuild, role_id: roleId }) });
    state.config.autoroles_on_join = data.autoroles;
    renderAutorolesJoinList();
    toast('Rôle ajouté avec succès !');
  } catch(e) { toast(e.message, 'error'); }
}

async function removeAutoroleJoin(roleId) {
  try {
    const data = await api('/api/config/autoroles/join', { method: 'POST', body: JSON.stringify({ guildId: state.selectedGuild, role_id: roleId, action: 'delete' }) });
    state.config.autoroles_on_join = data.autoroles;
    renderAutorolesJoinList();
    toast('Rôle supprimé');
  } catch(e) { toast(e.message, 'error'); }
}

function renderAutorolesRoleList() {
  const list = document.getElementById('arr-list');
  const autoroles = state.config.autoroles_on_role || [];
  if (autoroles.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-arrows-rotate"></i><p>Aucune règle configurée</p></div>';
    return;
  }
  list.innerHTML = '';
  for (const ar of autoroles) {
    const row = document.createElement('div');
    row.className = 'role-pair-row';
    row.innerHTML = '<span>Si @' + roleName(ar.trigger_role_id) + '</span><i class="fa-solid fa-arrow-right role-pair-arrow"></i><span>Attribuer @' + roleName(ar.target_role_id) + '</span><button type="button" class="btn btn-danger btn-icon btn-sm" onclick="removeAutoroleRole(\'' + ar.trigger_role_id + '\',\'' + ar.target_role_id + '\')"><i class="fa-solid fa-trash"></i></button>';
    list.appendChild(row);
  }
}

function fillAutorolesRole() {
  buildRoleOptions(document.getElementById('arr-trigger_role_id'), state.roles, '');
  buildRoleOptions(document.getElementById('arr-target_role_id'), state.roles, '');
  renderAutorolesRoleList();
}

async function addAutoroleRole() {
  const trigger = document.getElementById('arr-trigger_role_id').value;
  const target = document.getElementById('arr-target_role_id').value;
  if (!trigger || !target) return toast('Sélectionnez les deux rôles', 'error');
  try {
    const data = await api('/api/config/autoroles/role', { method: 'POST', body: JSON.stringify({ guildId: state.selectedGuild, trigger_role_id: trigger, target_role_id: target }) });
    state.config.autoroles_on_role = data.autoroles;
    renderAutorolesRoleList();
    toast('Règle ajoutée !');
  } catch(e) { toast(e.message, 'error'); }
}

async function removeAutoroleRole(trigger, target) {
  try {
    const data = await api('/api/config/autoroles/role', { method: 'POST', body: JSON.stringify({ guildId: state.selectedGuild, trigger_role_id: trigger, target_role_id: target, action: 'delete' }) });
    state.config.autoroles_on_role = data.autoroles;
    renderAutorolesRoleList();
    toast('Règle supprimée');
  } catch(e) { toast(e.message, 'error'); }
}

function renderAvList() {
  const wrap = document.getElementById('av-list-wrap');
  const items = state.config.action_verite || [];
  if (items.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><i class="fa-solid fa-dice"></i><p>Aucun élément personnalisé (utilise les défauts)</p></div>';
    return;
  }
  let html = '<table class="data-table"><thead><tr><th>Type</th><th>Cat.</th><th>Contenu</th><th></th></tr></thead><tbody>';
  for (const it of items) {
    const typeBadge = '<span class="badge badge-' + it.type + '">' + (it.type === 'verite' ? 'Vérité' : 'Action') + '</span>';
    const catBadge = '<span class="badge badge-' + it.category + '">' + it.category.toUpperCase() + '</span>';
    const content = it.content.length > 60 ? it.content.substring(0, 60) + '…' : it.content;
    html += '<tr><td>' + typeBadge + '</td><td>' + catBadge + '</td><td>' + content + '</td><td><button type="button" class="btn btn-danger btn-icon btn-sm" onclick="deleteAv(' + it.id + ')"><i class="fa-solid fa-trash"></i></button></td></tr>';
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function fillActionVerite() {
  renderAvList();
}

async function addActionVerite() {
  const type = document.getElementById('av-type').value;
  const category = document.getElementById('av-category').value;
  const content = document.getElementById('av-content').value.trim();
  if (!content) return toast('Entrez un contenu', 'error');
  try {
    const data = await api('/api/config/action-verite/add', { method: 'POST', body: JSON.stringify({ guildId: state.selectedGuild, type, category, content }) });
    state.config.action_verite = data.items;
    document.getElementById('av-content').value = '';
    renderAvList();
    toast('Élément ajouté !');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteAv(id) {
  try {
    const data = await api('/api/config/action-verite/delete', { method: 'POST', body: JSON.stringify({ guildId: state.selectedGuild, id }) });
    state.config.action_verite = data.items;
    renderAvList();
    toast('Élément supprimé');
  } catch(e) { toast(e.message, 'error'); }
}

function renderAiKeysList() {
  const wrap = document.getElementById('aikeys-list');
  const keys = state.config.ai_keys || [];
  if (keys.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><i class="fa-solid fa-key"></i><p>Aucune clé API configurée</p></div>';
    return;
  }
  wrap.innerHTML = '';
  for (const k of keys) {
    const row = document.createElement('div');
    row.className = 'ai-key-row';
    const masked = k.api_key.length > 8 ? k.api_key.substring(0, 6) + '…' + k.api_key.slice(-4) : '****';
    row.innerHTML = '<span class="ai-key-label">' + (k.label || 'Clé API') + ' — ' + masked + '</span><span class="ai-key-provider">' + k.provider + ' / ' + k.category + '</span><button type="button" class="btn btn-danger btn-icon btn-sm" onclick="deleteAiKey(' + k.id + ')"><i class="fa-solid fa-trash"></i></button>';
    wrap.appendChild(row);
  }
}

function fillAi() {
  const aic = state.config.ai_config || {};
  document.getElementById('ai-preferred_provider').value = aic.preferred_provider || 'auto';
  document.getElementById('ai-groq_text_model').value = aic.groq_text_model || 'llama-3.3-70b-versatile';
  document.getElementById('ai-groq_vision_model').value = aic.groq_vision_model || 'llama-3.2-11b-vision-preview';
  document.getElementById('ai-gemini_model').value = aic.gemini_model || 'gemini-2.0-flash';
  renderAiKeysList();
}

async function addAiKey() {
  const provider = document.getElementById('aikey-provider').value;
  const category = document.getElementById('aikey-category').value;
  const key = document.getElementById('aikey-key').value.trim();
  const label = document.getElementById('aikey-label').value.trim();
  if (!key) return toast('Entrez une clé API', 'error');
  try {
    const data = await api('/api/config/ai-keys/add', { method: 'POST', body: JSON.stringify({ provider, category, api_key: key, label }) });
    state.config.ai_keys = data.keys;
    document.getElementById('aikey-key').value = '';
    document.getElementById('aikey-label').value = '';
    renderAiKeysList();
    toast('Clé ajoutée !');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteAiKey(id) {
  try {
    const data = await api('/api/config/ai-keys/delete', { method: 'POST', body: JSON.stringify({ id }) });
    state.config.ai_keys = data.keys;
    renderAiKeysList();
    toast('Clé supprimée');
  } catch(e) { toast(e.message, 'error'); }
}

function fillBoost() {
  const bc = state.config.boost_config || {};
  buildChannelOptions(document.getElementById('boost-channel_id'), state.channels, bc.channel_id, [0]);
  document.getElementById('boost-title').value = bc.title || '🚀 Nouveau Boost de Serveur !';
  document.getElementById('boost-message').value = bc.message || '';
  const c = bc.color || '#F47FFF';
  document.getElementById('boost-color').value = c;
  document.getElementById('boost-color-preview').style.background = c;
  document.getElementById('boost-reward_money').value = bc.reward_money || 5000;
  document.getElementById('boost-reward_karma').value = bc.reward_karma || 50;
}

function fillBump() {
  const bc = state.config.bump_config || {};
  buildChannelOptions(document.getElementById('bump-reminder_channel'), state.channels, bc.reminder_channel, [0]);
  buildRoleOptions(document.getElementById('bump-reminder_role'), state.roles, bc.reminder_role);
}

function fillPermissions() {
  const perm = state.config.permissions_config || {};
  buildRoleOptions(document.getElementById('perm-admin_role_id'), state.roles, perm.admin_role_id);
  buildRoleOptions(document.getElementById('perm-modo_role_id'), state.roles, perm.modo_role_id);
  let dr = perm.dashboard_roles || '[]';
  try { dr = JSON.parse(dr); if (!Array.isArray(dr)) dr = []; } catch(e) { dr = []; }
  document.getElementById('perm-dashboard_roles').value = dr.join(', ');
}

// ─── FORM SAVES ───────────────────────────────────────────────────────────────
async function saveWelcomeLeave(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  data.guildId = state.selectedGuild;
  try {
    await api('/api/config/welcome-leave', { method: 'POST', body: JSON.stringify(data) });
    state.config.welcome_leave = { ...state.config.welcome_leave, ...data };
    toast('Bienvenue & Départ sauvegardé !');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveAutomod(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    guildId: state.selectedGuild,
    anti_link: form.anti_link.checked,
    anti_spam: form.anti_spam.checked,
    anti_massmention: form.anti_massmention.checked,
    anti_badwords: form.anti_badwords.checked,
    spam_max_msgs: form.spam_max_msgs.value,
    massmention_limit: form.massmention_limit.value,
    badwords_list: form.badwords_list.value,
    bypass_roles: form.bypass_roles.value,
  };
  try {
    await api('/api/config/automod', { method: 'POST', body: JSON.stringify(data) });
    toast('Automod sauvegardé !');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveLogs(e) {
  e.preventDefault();
  const data = { guildId: state.selectedGuild, channel_id: document.getElementById('logs-channel_id').value, events: document.getElementById('logs-events').value };
  try {
    await api('/api/config/logs', { method: 'POST', body: JSON.stringify(data) });
    toast('Logs sauvegardés !');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveTribunal(e) {
  e.preventDefault();
  const data = {
    guildId: state.selectedGuild,
    category_id: document.getElementById('trib-category_id').value,
    judge_role_id: document.getElementById('trib-judge_role_id').value,
    lawyer_role_id: document.getElementById('trib-lawyer_role_id').value,
    accused_role_id: document.getElementById('trib-accused_role_id').value,
    plaintiff_role_id: document.getElementById('trib-plaintiff_role_id').value,
    channel_prefix: document.getElementById('trib-channel_prefix').value,
    auto_delete_minutes: document.getElementById('trib-auto_delete_minutes').value,
  };
  try {
    await api('/api/config/tribunal', { method: 'POST', body: JSON.stringify(data) });
    toast('Tribunal sauvegardé !');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveQuarantine(e) {
  e.preventDefault();
  const data = { guildId: state.selectedGuild, role_id: document.getElementById('quar-role_id').value, channel_id: document.getElementById('quar-channel_id').value };
  try {
    await api('/api/config/quarantine', { method: 'POST', body: JSON.stringify(data) });
    toast('Quarantaine sauvegardée !');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveLeveling(e) {
  e.preventDefault();
  const data = {
    guildId: state.selectedGuild,
    xp_min: document.getElementById('lv-xp_min').value,
    xp_max: document.getElementById('lv-xp_max').value,
    xp_base: document.getElementById('lv-xp_base').value,
    xp_factor: document.getElementById('lv-xp_factor').value,
    karma_min: document.getElementById('lv-karma_min').value,
    karma_max: document.getElementById('lv-karma_max').value,
    announce_channel: document.getElementById('lv-announce_channel').value,
    announce_msg: document.getElementById('lv-announce_msg').value,
  };
  try {
    await api('/api/config/leveling', { method: 'POST', body: JSON.stringify(data) });
    toast('Leveling sauvegardé !');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveKarma(e) {
  e.preventDefault();
  const data = {
    guildId: state.selectedGuild,
    is_active: document.getElementById('km-is_active').checked,
    threshold_1: document.getElementById('km-threshold_1').value,
    xp_mult_1: document.getElementById('km-xp_mult_1').value,
    discount_1: document.getElementById('km-discount_1').value,
    threshold_2: document.getElementById('km-threshold_2').value,
    xp_mult_2: document.getElementById('km-xp_mult_2').value,
    discount_2: document.getElementById('km-discount_2').value,
    threshold_3: document.getElementById('km-threshold_3').value,
    xp_mult_3: document.getElementById('km-xp_mult_3').value,
    discount_3: document.getElementById('km-discount_3').value,
  };
  try {
    await api('/api/config/karma', { method: 'POST', body: JSON.stringify(data) });
    toast('Karma sauvegardé !');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveAi(e) {
  e.preventDefault();
  const data = {
    guildId: state.selectedGuild,
    preferred_provider: document.getElementById('ai-preferred_provider').value,
    groq_text_model: document.getElementById('ai-groq_text_model').value,
    groq_vision_model: document.getElementById('ai-groq_vision_model').value,
    gemini_model: document.getElementById('ai-gemini_model').value,
  };
  try {
    await api('/api/config/ai', { method: 'POST', body: JSON.stringify(data) });
    toast('Configuration IA sauvegardée !');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveBoost(e) {
  e.preventDefault();
  const data = {
    guildId: state.selectedGuild,
    channel_id: document.getElementById('boost-channel_id').value,
    title: document.getElementById('boost-title').value,
    message: document.getElementById('boost-message').value,
    color: document.getElementById('boost-color').value,
    reward_money: document.getElementById('boost-reward_money').value,
    reward_karma: document.getElementById('boost-reward_karma').value,
  };
  try {
    await api('/api/config/boost', { method: 'POST', body: JSON.stringify(data) });
    toast('Boost sauvegardé !');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveBump(e) {
  e.preventDefault();
  const data = {
    guildId: state.selectedGuild,
    reminder_channel: document.getElementById('bump-reminder_channel').value,
    reminder_role: document.getElementById('bump-reminder_role').value,
  };
  try {
    await api('/api/config/bump', { method: 'POST', body: JSON.stringify(data) });
    toast('Bump sauvegardé !');
  } catch(e) { toast(e.message, 'error'); }
}

async function savePermissions(e) {
  e.preventDefault();
  const drRaw = document.getElementById('perm-dashboard_roles').value;
  const dr = drRaw.split(',').map(s => s.trim()).filter(Boolean);
  const data = {
    guildId: state.selectedGuild,
    admin_role_id: document.getElementById('perm-admin_role_id').value,
    modo_role_id: document.getElementById('perm-modo_role_id').value,
    dashboard_roles: dr,
  };
  try {
    await api('/api/config/permissions', { method: 'POST', body: JSON.stringify(data) });
    toast('Permissions sauvegardées !');
  } catch(e) { toast(e.message, 'error'); }
}

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
