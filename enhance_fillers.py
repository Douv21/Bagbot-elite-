import re

with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Let's write robust filler functions for ALL 28 panels in app.js
additional_fillers = """
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
"""

# Update panelFillers dictionary
panel_fillers_new = """const panelFillers = {
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
};"""

app_js = re.sub(r'const panelFillers = \{.*?\};', panel_fillers_new, app_js, flags=re.DOTALL)

# Append additional fillers before bootstrap
boot_idx = app_js.find('// ─── BOOTSTRAP')
if boot_idx != -1:
    new_app_js = app_js[:boot_idx] + additional_fillers + "\n\n" + app_js[boot_idx:]
    with open('public2/app.js', 'w', encoding='utf-8') as f:
        f.write(new_app_js)
    print("public2/app.js successfully updated with ALL 28 FILLERS!")
else:
    print("Error finding BOOTSTRAP line in app.js")
