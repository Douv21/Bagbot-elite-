import re

# 1. Update src/dashboard2.js
with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    d2_code = f.read()

old_wl_route = """app.post('/api/config/welcome-leave', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { welcome_channel, welcome_title, welcome_desc, welcome_color, leave_channel, leave_title, leave_desc, leave_color } = req.body || {};
    db.prepare('INSERT INTO welcome_leave (guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc, welcome_color, leave_title, leave_desc, leave_color) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel=excluded.welcome_channel, leave_channel=excluded.leave_channel, welcome_title=excluded.welcome_title, welcome_desc=excluded.welcome_desc, welcome_color=excluded.welcome_color, leave_title=excluded.leave_title, leave_desc=excluded.leave_desc, leave_color=excluded.leave_color').run(g, welcome_channel||null, leave_channel||null, welcome_title||'', welcome_desc||'', welcome_color||'#00FF00', leave_title||'', leave_desc||'', leave_color||'#FF0000');
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});"""

new_wl_route = """app.post('/api/config/welcome-leave', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { welcome_channel, welcome_title, welcome_desc, welcome_color, leave_channel, leave_title, leave_desc, leave_color, welcome_role_filter } = req.body || {};
    db.prepare('INSERT INTO welcome_leave (guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc, welcome_color, leave_title, leave_desc, leave_color, welcome_role_filter) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel=excluded.welcome_channel, leave_channel=excluded.leave_channel, welcome_title=excluded.welcome_title, welcome_desc=excluded.welcome_desc, welcome_color=excluded.welcome_color, leave_title=excluded.leave_title, leave_desc=excluded.leave_desc, leave_color=excluded.leave_color, welcome_role_filter=excluded.welcome_role_filter').run(g, welcome_channel||null, leave_channel||null, welcome_title||'', welcome_desc||'', welcome_color||'#00FF00', leave_title||'', leave_desc||'', leave_color||'#FF0000', welcome_role_filter||null);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});"""

d2_code = d2_code.replace(old_wl_route, new_wl_route)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2_code)

print("src/dashboard2.js updated to save welcome_role_filter in SQLite!")

# 2. Update public2/index.html to add welcome_role_filter select field
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target_grid = """                <div class="form-group">
                  <label><i class="fa-solid fa-heading"></i> Titre du message</label>
                  <input type="text" id="wl-welcome_title" name="welcome_title" placeholder="👋 Bienvenue sur le serveur !">
                </div>"""

new_role_field = """                <div class="form-group">
                  <label><i class="fa-solid fa-user-tag"></i> Rôle d'annonce d'arrivée (Optionnel)</label>
                  <select id="wl-welcome_role_filter" name="welcome_role_filter" data-type="role">
                    <option value="">— Immédiat (Tous les membres) —</option>
                  </select>
                  <p class="form-hint">Si sélectionné, le message s'affichera seulement lorsque ce rôle sera attribué au membre.</p>
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-heading"></i> Titre du message</label>
                  <input type="text" id="wl-welcome_title" name="welcome_title" placeholder="👋 Bienvenue sur le serveur !">
                </div>"""

html = html.replace(target_grid, new_role_field)

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated with Rôle d'annonce d'arrivée field!")

# 3. Update public2/app.js to hydrate welcome_role_filter and automatically open sidebar on mobile when entering category
with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Add welcome_role_filter hydration
old_wl_hydrate = "setElVal('wl-welcome_channel', wl.welcome_channel);"
new_wl_hydrate = "setElVal('wl-welcome_channel', wl.welcome_channel);\n  setElVal('wl-welcome_role_filter', wl.welcome_role_filter);"
app_js = app_js.replace(old_wl_hydrate, new_wl_hydrate)

# Update openCategoryWorkspace to open sidebar drawer on mobile
old_open_ws = """function openCategoryWorkspace(catId) {
  const hub = document.getElementById('categoryHub');
  const ws = document.getElementById('categoryWorkspace');
  if (hub) hub.style.display = 'none';
  if (ws) ws.style.display = 'flex';
  selectCategory(catId);
}"""

new_open_ws = """function openCategoryWorkspace(catId) {
  const hub = document.getElementById('categoryHub');
  const ws = document.getElementById('categoryWorkspace');
  if (hub) hub.style.display = 'none';
  if (ws) ws.style.display = 'flex';
  selectCategory(catId);
  if (window.innerWidth <= 900) {
    toggleMobileSidebar(true);
  }
}"""

app_js = app_js.replace(old_open_ws, new_open_ws)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js updated with welcome_role_filter hydration and smooth mobile sidebar drawer trigger!")
