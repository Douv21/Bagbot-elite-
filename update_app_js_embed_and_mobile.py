import re

with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Add mode switcher & live embed preview logic
embed_preview_js = """
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
  const elTitle = document.getElementById('wl-active_title');
  const elDesc = document.getElementById('wl-active_desc');
  const elColor = document.getElementById('wl-active_color');

  if (isWelcome) {
    if (elTitle) elTitle.value = wl.welcome_title || document.getElementById('wl-welcome_title').value || '👋 Bienvenue';
    if (elDesc) elDesc.value = wl.welcome_desc || document.getElementById('wl-welcome_desc').value || 'Bienvenue {user} sur le serveur !';
    if (elColor) elColor.value = wl.welcome_color || document.getElementById('wl-welcome_color').value || '#00FF00';
  } else {
    if (elTitle) elTitle.value = wl.leave_title || document.getElementById('wl-leave_title').value || '👋 Au revoir';
    if (elDesc) elDesc.value = wl.leave_desc || document.getElementById('wl-leave_desc').value || 'Au revoir {user} !';
    if (elColor) elColor.value = wl.leave_color || document.getElementById('wl-leave_color').value || '#FF0000';
  }
  updateEmbedPreview();
}

function updateEmbedPreview() {
  const elTitle = document.getElementById('wl-active_title');
  const elDesc = document.getElementById('wl-active_desc');
  const elColor = document.getElementById('wl-active_color');
  if (!elTitle || !elDesc || !elColor) return;

  const title = elTitle.value;
  const desc = elDesc.value;
  const color = elColor.value;

  const bar = document.getElementById('wl-embed-bar-color');
  if (bar) bar.style.background = color;

  if (wlMode === 'welcome') {
    setElVal('wl-welcome_title', title);
    setElVal('wl-welcome_desc', desc);
    setElVal('wl-welcome_color', color);
  } else {
    setElVal('wl-leave_title', title);
    setElVal('wl-leave_desc', desc);
    setElVal('wl-leave_color', color);
  }
}
"""

# Inject before hydrateForms
hydrate_idx = app_js.find('function hydrateForms()')
if hydrate_idx != -1:
    app_js = app_js[:hydrate_idx] + embed_preview_js + "\n\n" + app_js[hydrate_idx:]

# Call switchWelcomeLeaveMode('welcome') inside hydrateForms
old_wl_hydrate = "setElVal('wl-leave_color', wl.leave_color || '#ff0000');"
new_wl_hydrate = "setElVal('wl-leave_color', wl.leave_color || '#ff0000');\n  switchWelcomeLeaveMode('welcome');"

app_js = app_js.replace(old_wl_hydrate, new_wl_hydrate)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js updated with live Discord Embed preview logic!")

# Now update public2/style.css for Discord Embed styling
with open('public2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

discord_embed_css = """
/* DISCORD EMBED PREVIEW STYLING */
.discord-preview-card {
  background: #18191c !important;
  border: 1px solid #2f3136 !important;
}
.discord-message-box {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #2f3136;
  border-radius: 12px;
}
.discord-bot-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}
.discord-message-body {
  flex: 1;
}
.discord-author-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.discord-name {
  font-weight: 700;
  color: #ffffff;
  font-size: 0.95rem;
}
.discord-bot-badge {
  background: #5865f2;
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
}
.discord-time {
  font-size: 0.75rem;
  color: #72767d;
}
.discord-embed-card {
  display: flex;
  background: #2f3136;
  border-radius: 6px;
  overflow: hidden;
  border-left: 0;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}
.discord-left-bar {
  width: 5px;
  background: #00ff00;
  transition: background 0.3s;
}
.discord-embed-inner {
  padding: 16px;
  flex: 1;
}
"""

css += "\n" + discord_embed_css

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("public2/style.css updated with Discord Embed Preview styling!")
