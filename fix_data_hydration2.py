import re

with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Replace or insert safeSetVal, safeSetCheck, populateDropdowns, loadGuildConfiguration
hydration_code = """
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
"""

# Inject loadGuildConfiguration into loadDashboard
load_dash_idx = app_js.find('async function loadDashboard')
if load_dash_idx != -1:
    # Insert hydration code before loadDashboard
    app_js = app_js[:load_dash_idx] + hydration_code + "\n\n" + app_js[load_dash_idx:]

# Call populateDropdowns() and loadGuildConfiguration() inside loadDashboard()
old_load = """    state.channels = channels;
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
  showCategoryHub();"""

new_load = """    state.channels = channels;
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
  showCategoryHub();"""

app_js = app_js.replace(old_load, new_load)

# Also call loadGuildConfiguration() in showPanel()
old_show_panel = """function showPanel(panelId) {
  state.currentPanel = panelId;
  document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + panelId);
  if (panel) {
    panel.classList.add('active');
    fillPanel(panelId);
  }
}"""

new_show_panel = """function showPanel(panelId) {
  state.currentPanel = panelId;
  document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + panelId);
  if (panel) {
    panel.classList.add('active');
    try { populateDropdowns(); } catch(e) {}
    try { loadGuildConfiguration(); } catch(e) {}
    fillPanel(panelId);
  }
}"""

app_js = app_js.replace(old_show_panel, new_show_panel)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js upgraded with complete DOM Hydration & safeSetVal Engine!")
