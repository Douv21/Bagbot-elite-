
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

// ─── CATEGORY DEFINITIONS (REORGANIZED ACCORDING TO USER DIRECTIVE) ────────────
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
    desc: 'Tribunal, Star de la Semaine, Confessions, Mot Caché, Action-Vérité, GIFs',
    items: [
      { id: 'tribunal', label: 'Tribunal Discord', icon: 'fa-gavel', badge: 'JEU' },
      { id: 'star', label: 'Star de la Semaine', icon: 'fa-star', badge: 'TOP' },
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

// ─── SAFE DOM HYDRATION HELPERS ──────────────────────────────────────────────
function safeSetVal(id, val) {
  const el = document.getElementById(id);
  if (el) {
    const sVal = (val !== undefined && val !== null) ? String(val) : '';
    el.value = sVal;
    el.setAttribute('data-saved-value', sVal);
    if (el.tagName === 'SELECT') {
      let matched = false;
      Array.from(el.options).forEach((opt, idx) => {
        if (String(opt.value) === sVal) {
          opt.selected = true;
          el.selectedIndex = idx;
          matched = true;
        } else {
          opt.selected = false;
        }
      });
      if (!matched && el.options.length > 0) {
        // Keep default or first if sVal empty
      }
    }
  }
}

function safeSetCheck(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

function populateDropdowns() {
  if (!state.channels || !state.roles) return;

  // Channel selects
  document.querySelectorAll('select.channel-select, select[id*="channel"], select[name*="channel"]').forEach(select => {
    const saved = select.getAttribute('data-saved-value') || select.value || '';
    select.innerHTML = '<option value="">— Aucun —</option>';
    state.channels.filter(c => c.type === 0 || c.type === 5).sort((a,b) => a.name.localeCompare(b.name)).forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = '#' + ch.name;
      select.appendChild(opt);
    });
    if (saved) { select.value = saved; select.setAttribute('data-saved-value', saved); }
  });

  // Role selects
  document.querySelectorAll('select.role-select, select[id*="role"], select[name*="role"]').forEach(select => {
    const saved = select.getAttribute('data-saved-value') || select.value || '';
    select.innerHTML = '<option value="">— Aucun —</option>';
    [...state.roles].sort((a,b) => b.position - a.position).forEach(r => {
      if (r.name !== '@everyone') {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        select.appendChild(opt);
      }
    });
    if (saved) { select.value = saved; select.setAttribute('data-saved-value', saved); }
  });

  // Category selects (type 4)
  document.querySelectorAll('select.category-select, select[id*="cat"], select[name*="cat"]').forEach(select => {
    const saved = select.getAttribute('data-saved-value') || select.value || '';
    select.innerHTML = '<option value="">— Aucune —</option>';
    state.channels.filter(c => c.type === 4).sort((a,b) => a.name.localeCompare(b.name)).forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = '📁 ' + ch.name;
      select.appendChild(opt);
    });
    if (saved) { select.value = saved; select.setAttribute('data-saved-value', saved); }
  });
}

function loadGuildConfiguration() {
  const config = state.config || {};

  // 1. Welcome / Leave
  const wl = config.welcome_leave || {};
  safeSetVal('target-channel-select', wl.welcome_channel);
  safeSetVal('wl-welcome_channel', wl.welcome_channel);
  safeSetVal('embed-title-input', wl.welcome_title || '👋 Bienvenue');
  safeSetVal('wl-welcome_title', wl.welcome_title || '👋 Bienvenue');
  safeSetVal('embed-desc-field', wl.welcome_desc || 'Bienvenue {user} sur le serveur !');
  safeSetVal('wl-welcome_desc', wl.welcome_desc || 'Bienvenue {user} sur le serveur !');
  safeSetVal('embed-color-picker', wl.welcome_color || '#00ff00');
  safeSetVal('wl-welcome_color', wl.welcome_color || '#00ff00');
  safeSetVal('wl-leave_channel', wl.leave_channel);
  safeSetVal('wl-leave_title', wl.leave_title || '👋 Au revoir');
  safeSetVal('wl-leave_desc', wl.leave_desc || 'Au revoir {user} !');
  safeSetVal('wl-leave_color', wl.leave_color || '#ff0000');

  // 2. Automod
  const am = config.automod_config || {};
  safeSetCheck('am-anti_link', am.anti_link === 1);
  safeSetCheck('automod_anti_link', am.anti_link === 1);
  safeSetCheck('am-anti_spam', am.anti_spam === 1);
  safeSetCheck('automod_anti_spam', am.anti_spam === 1);
  safeSetCheck('am-anti_massmention', am.anti_massmention === 1);
  safeSetCheck('automod_anti_massmention', am.anti_massmention === 1);
  safeSetCheck('am-anti_badwords', am.anti_badwords === 1);
  safeSetCheck('automod_anti_badwords', am.anti_badwords === 1);
  safeSetVal('am-spam_max_msgs', am.spam_max_msgs ?? 5);
  safeSetVal('automod_spam_max_msgs', am.spam_max_msgs ?? 5);
  safeSetVal('am-massmention_limit', am.massmention_limit ?? 5);
  safeSetVal('automod_massmention_limit', am.massmention_limit ?? 5);
  safeSetVal('am-badwords_list', am.badwords_list || '');
  safeSetVal('automod_badwords_list', am.badwords_list || '');
  safeSetVal('am-bypass_roles', am.bypass_roles || '');
  safeSetVal('automod_bypass_roles', am.bypass_roles || '');

  // 3. Logs
  const logs = config.logs || {};
  safeSetVal('logs-channel_id', logs.channel_id);
  safeSetVal('logs-events', logs.events || 'all');

  // 4. Quarantaine
  const quar = config.quarantine || {};
  safeSetVal('quar-role_id', quar.role_id);
  safeSetVal('quarantine_role', quar.role_id);
  safeSetVal('quar-channel_id', quar.channel_id);
  safeSetVal('quarantine_channel', quar.channel_id);

  // 5. Leveling
  const lc = config.leveling_config || {};
  safeSetVal('lv-xp_min', lc.xp_min ?? 15);
  safeSetVal('xp_min', lc.xp_min ?? 15);
  safeSetVal('lv-xp_max', lc.xp_max ?? 25);
  safeSetVal('xp_max', lc.xp_max ?? 25);
  safeSetVal('lv-xp_base', lc.xp_base ?? 120);
  safeSetVal('xp_base', lc.xp_base ?? 120);
  safeSetVal('lv-xp_factor', lc.xp_factor ?? 1.35);
  safeSetVal('xp_factor', lc.xp_factor ?? 1.35);
  safeSetVal('lv-karma_min', lc.karma_min ?? 1);
  safeSetVal('karma_min', lc.karma_min ?? 1);
  safeSetVal('lv-karma_max', lc.karma_max ?? 3);
  safeSetVal('karma_max', lc.karma_max ?? 3);
  safeSetVal('lv-announce_channel', lc.announce_channel || 'current');
  safeSetVal('announce_channel', lc.announce_channel || 'current');
  safeSetVal('lv-announce_msg', lc.announce_msg || '');
  safeSetVal('announce_msg', lc.announce_msg || '');

  // 6. Karma
  const kc = config.karma_config || {};
  safeSetCheck('km-is_active', kc.is_active === 1);
  safeSetVal('km-threshold_1', kc.threshold_1 ?? 20);
  safeSetVal('km-xp_mult_1', kc.xp_mult_1 ?? 1.2);
  safeSetVal('km-discount_1', kc.discount_1 ?? 5);
  safeSetVal('km-threshold_2', kc.threshold_2 ?? 50);
  safeSetVal('km-xp_mult_2', kc.xp_mult_2 ?? 1.5);
  safeSetVal('km-discount_2', kc.discount_2 ?? 10);
  safeSetVal('km-threshold_3', kc.threshold_3 ?? 100);
  safeSetVal('km-xp_mult_3', kc.xp_mult_3 ?? 2.0);
  safeSetVal('km-discount_3', kc.discount_3 ?? 20);

  // 7. Tribunal
  const trib = config.tribunal_config || {};
  safeSetVal('trib-category_id', trib.categoryId || trib.category_id);
  safeSetVal('tribunal_category', trib.categoryId || trib.category_id);
  safeSetVal('trib-judge_role_id', trib.judgeRoleId || trib.judge_role_id);
  safeSetVal('tribunal_judge_role', trib.judgeRoleId || trib.judge_role_id);
  safeSetVal('trib-lawyer_role_id', trib.lawyerRoleId || trib.lawyer_role_id);
  safeSetVal('tribunal_lawyer_role', trib.lawyerRoleId || trib.lawyer_role_id);
  safeSetVal('trib-accused_role_id', trib.accusedRoleId || trib.accused_role_id);
  safeSetVal('tribunal_accused_role', trib.accusedRoleId || trib.accused_role_id);
  safeSetVal('trib-plaintiff_role_id', trib.plaintiffRoleId || trib.plaintiff_role_id);
  safeSetVal('tribunal_plaintiff_role', trib.plaintiffRoleId || trib.plaintiff_role_id);
  safeSetVal('trib-channel_prefix', trib.channelPrefix || trib.channel_prefix || '⚖️┆procès-');
  safeSetVal('tribunal_channel_prefix', trib.channelPrefix || trib.channel_prefix || '⚖️┆procès-');
  safeSetVal('trib-auto_delete_minutes', trib.autoDeleteMinutes ?? trib.auto_delete_minutes ?? 5);
  safeSetVal('tribunal_auto_delete_minutes', trib.autoDeleteMinutes ?? trib.auto_delete_minutes ?? 5);

  // 8. Boost
  const bst = config.boost_config || {};
  safeSetCheck('boost_enabled', bst.enabled !== 0);
  safeSetVal('boost-channel_id', bst.channel_id);
  safeSetVal('boost_channel', bst.channel_id);
  safeSetVal('boost-title', bst.title || '🚀 Nouveau Boost de Serveur !');
  safeSetVal('boost_title', bst.title || '🚀 Nouveau Boost de Serveur !');
  safeSetVal('boost-message', bst.message || '');
  safeSetVal('boost_message', bst.message || '');
  safeSetVal('boost-color', bst.color || '#F47FFF');
  safeSetVal('boost_color', bst.color || '#F47FFF');
  safeSetVal('boost-reward_money', bst.reward_money ?? 5000);
  safeSetVal('boost_reward_money', bst.reward_money ?? 5000);
  safeSetVal('boost-reward_karma', bst.reward_karma ?? 50);
  safeSetVal('boost_reward_karma', bst.reward_karma ?? 50);

  // 9. Bump
  const bumpCfg = config.bump_config || {};
  safeSetVal('bump-reminder_channel', bumpCfg.reminder_channel);
  safeSetVal('bump_reminder_channel', bumpCfg.reminder_channel);
  safeSetVal('bump-reminder_role', bumpCfg.reminder_role);
  safeSetVal('bump_reminder_role', bumpCfg.reminder_role);

  // 10. Jeu Mot Caché
  const game = config.game_config || {};
  safeSetCheck('game_is_active', game.is_active === 1);
  safeSetVal('game_secret_phrase', game.secret_phrase || '');
  safeSetVal('game_reward_money', game.reward_money ?? 0);
  safeSetVal('game_reward_xp', game.reward_xp ?? 0);
  safeSetVal('game_announce_channel', game.announce_channel || '');

  // 11. AI Config
  const aic = config.ai_config || {};
  safeSetVal('ai-preferred_provider', aic.preferred_provider || 'groq');
  safeSetVal('ai-groq_text_model', aic.groq_text_model || 'llama-3.3-70b-versatile');
  safeSetVal('ai-groq_vision_model', aic.groq_vision_model || 'llama-3.2-11b-vision-preview');
  safeSetVal('ai-gemini_model', aic.gemini_model || 'gemini-2.5-flash');

  // 12. Permissions
  const perms = config.permissions_config || {};
  safeSetVal('perm-admin_role_id', perms.admin_role_id);
  safeSetVal('perm_admin_role_id', perms.admin_role_id);
  safeSetVal('perm-modo_role_id', perms.modo_role_id);
  safeSetVal('perm_modo_role_id', perms.modo_role_id);
  let dr = perms.dashboard_roles || '';
  if (Array.isArray(dr)) dr = dr.join(', ');
  safeSetVal('perm-dashboard_roles', dr);
  safeSetVal('perm_dashboard_roles', dr);
}


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

  // Populate dropdowns & hydrate all form values
  try {
    populateDropdowns();
    loadGuildConfiguration();
  } catch(e) {
    console.error('Error during DOM hydration:', e);
  }

  // Render Category Hub cards & display hub
  renderCategoryHub();
  showCategoryHub();
}

// ─── CATEGORY HUB & WORKSPACE NAVIGATION ─────────────────────────────────────
const CATEGORY_CARDS = [
  { id: 'general', title: 'GESTION DU SERVEUR', icon: 'fa-sliders', desc: 'Arrivées, Départs, Boost, Annonces, Embeds, Auto-Rôles & Logs' },
  { id: 'moderation', title: 'SÉCURITÉ & MODÉRATION', icon: 'fa-shield-halved', desc: 'Quarantaine, AutoMod, Rappels de Bump, Forums & Permissions' },
  { id: 'economie', title: 'NIVEAUX & ÉCONOMIE', icon: 'fa-chart-line', desc: 'Niveaux & XP, Quêtes, Karma & Boutique' },
  { id: 'divertissement', title: 'DIVERTISSEMENT & JEUX', icon: 'fa-gamepad', desc: 'Tribunal, Star de la Semaine, Confessions, Mot Caché, Action-Vérité (18+)' },
  { id: 'support', title: 'SUPPORT & TICKETS', icon: 'fa-headset', desc: 'Support, Panneaux de Tickets & Carte des Membres' },
  { id: 'assistant', title: 'ASSISTANT IA', icon: 'fa-robot', desc: 'Assistant IA Admin VIP' },
  { id: 'ai', title: 'CLÉS & PARAMÈTRES IA', icon: 'fa-brain', desc: 'Clés & Modèles IA' },
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
  selectCategory(catId);
}

// ─── CATEGORY / SIDEBAR ───────────────────────────────────────────────────────
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

  // Quick category links at bottom of lateral sidebar
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

  // Show first panel of the active category
  if (cat.items.length > 0) showPanel(cat.items[0].id);
}

function clickSidebarItem(panelId, el) {
  const sidebar = document.getElementById('dashSidebar');
  if (sidebar) {
    sidebar.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
  }
  if (el) el.classList.add('active');
  showPanel(panelId);
}

function showPanel(panelId) {
  state.currentPanel = panelId;
  document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + panelId);
  if (panel) {
    panel.classList.add('active');
    try { populateDropdowns(); } catch(e) {}
    try { loadGuildConfiguration(); } catch(e) {}
    fillPanel(panelId);
  }
}

// ─── PANEL FILLERS ────────────────────────────────────────────────────────────
function fillPanel(panelId) {
  const fn = panelFillers[panelId];
  if (fn) {
    fn();
  } else {
    fillGenericPanel(panelId);
  }
}

const panelFillers = {
  'welcome-leave': fillWelcomeLeave,
  'boost': fillBoost,
  'announcements': fillAnnouncements,
  'embed-sender': fillEmbedSender,
  'autoroles-join': fillAutorolesJoin,
  'autoroles-role': fillAutorolesRole,
  'autothread': fillAutothread,
  'logs': fillLogs,
  
  'quarantine': fillQuarantine,
  'automod': fillAutomod,
  'forums': fillForums,
  'permissions': fillPermissions,
  'tribunal': fillTribunal,
  
  'leveling': fillLeveling,
  'quests': fillQuests,
  'karma': fillKarma,
  'shop': fillShop,
  
  'confessions': fillConfessions,
  'counting': fillCounting,
  'game': fillGame,
  'action-verite': fillActionVerite,
  'bump': fillBump,
  'gifs': fillGifs,
  
  'tickets': fillTickets,
  'map': fillMap,
  
  'assistant': fillAssistant,
  'star': fillStar,
  
  'ai': fillAi,
};

function fillGenericPanel(panelId) {
  const panel = document.getElementById('panel-' + panelId);
  if (!panel) return;
  panel.querySelectorAll('select').forEach(select => {
    const val = select.value;
    if (select.id.includes('channel') || select.name.includes('channel')) {
      buildChannelOptions(select, state.channels, val);
    } else if (select.id.includes('role') || select.name.includes('role')) {
      buildRoleOptions(select, state.roles, val);
    } else if (select.id.includes('cat') || select.name.includes('cat')) {
      buildCategoryOptions(select, state.channels, val);
    }
  });
}

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


// ─── COMPLETE FILLERS FOR ALL 28 PANELS ─────────────────────────────────────

function fillAnnouncements() {
  const cfg = state.config.announcements || state.config.welcome_leave || {};
  const sel = document.getElementById('announcements_channel') || document.getElementById('ann_channel');
  if (sel) buildChannelOptions(sel, state.channels, cfg.announce_channel || cfg.channel_id, [0]);
}

function fillEmbedSender() {
  const sel = document.getElementById('embed_target_channel') || document.getElementById('embed_channel');
  if (sel) buildChannelOptions(sel, state.channels, sel.value, [0]);
}

function fillAutothread() {
  const sel = document.getElementById('autothread_channel_select') || document.getElementById('autothread_channel');
  if (sel) buildChannelOptions(sel, state.channels, state.config.autothread_channel, [0]);
}

function fillForums() {
  const container = document.getElementById('unlimited_forum_checkboxes_container');
  if (container) {
    container.innerHTML = '';
    const forums = state.channels.filter(ch => ch.type === 15);
    if (forums.length === 0) {
      container.innerHTML = '<p style="color:#8a7fa0;">Aucun salon Forum trouvé sur ce serveur.</p>';
    } else {
      forums.forEach(ch => {
        const div = document.createElement('div');
        div.style.display = 'flex'; div.style.alignItems = 'center'; div.style.gap = '10px'; div.style.marginBottom = '8px';
        div.innerHTML = `<input type="checkbox" value="${ch.id}" id="forum_cb_${ch.id}"><label for="forum_cb_${ch.id}" style="color:#fff;">📢 ${ch.name}</label>`;
        container.appendChild(div);
      });
    }
  }
}

function fillQuests() {
  const container = document.getElementById('quests_list_container');
  if (container) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-scroll"></i><p>Système de quêtes actif</p></div>';
  }
}

function fillShop() {
  const items = state.config.shop || [];
  const list = document.getElementById('shop_items_list');
  if (list) {
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-shop"></i><p>Aucun article en boutique</p></div>';
    } else {
      list.innerHTML = items.map(item => `<div class="item-row"><span>${item.name} (${item.price} XP)</span></div>`).join('');
    }
  }
}

function fillConfessions() {
  const list = state.config.confessions || [];
  const container = document.getElementById('confessions_list');
  if (container) {
    if (list.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-mask"></i><p>Aucun salon de confession configuré</p></div>';
    } else {
      container.innerHTML = list.map(c => `<div class="item-row"><span>Salon #${channelName(c.channel_id)}</span></div>`).join('');
    }
  }
}

function fillCounting() {
  const sel = document.getElementById('counting_channel');
  if (sel) buildChannelOptions(sel, state.channels, sel.value, [0]);
}

function fillGame() {
  const game = state.config.game_config || {};
  const elPhrase = document.getElementById('game_secret_phrase');
  if (elPhrase) elPhrase.value = game.secret_phrase || '';
  const elChan = document.getElementById('game_announce_channel');
  if (elChan) buildChannelOptions(elChan, state.channels, game.announce_channel, [0]);
}

function fillGifs() {
  const list = document.getElementById('gifs_list');
  if (list) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-file-video"></i><p>GIFs d\'action prêts</p></div>';
  }
}

function fillTickets() {
  const catSel = document.getElementById('ticket_opt_category');
  if (catSel) buildCategoryOptions(catSel, state.channels, catSel.value);
  const logSel = document.getElementById('ticket_log_channel');
  if (logSel) buildChannelOptions(logSel, state.channels, logSel.value, [0]);
}

function fillMap() {
  const mapCont = document.getElementById('members_map_container');
  if (mapCont) {
    mapCont.innerHTML = '<div class="empty-state"><i class="fa-solid fa-map-location-dot"></i><p>Carte des membres active</p></div>';
  }
}

function fillAssistant() {
  // Assistant IA panel init
}

function fillStar() {
  const starCfg = state.config.star_config || {};
  const sel = document.getElementById('star_channel_select');
  if (sel) buildChannelOptions(sel, state.channels, starCfg.channel_id, [0]);
}


// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
