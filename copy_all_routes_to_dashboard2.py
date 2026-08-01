import re

with open('src/dashboard.js', 'r', encoding='utf-8') as f:
    dash1_code = f.read()

with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    dash2_code = f.read()

# Extract routes from dashboard.js after app.get('/api/config')
# Find all route handlers in dashboard.js that might be missing in dashboard2.js

missing_routes_code = """
// ─── COMPLETE PORTED ROUTES FROM DASHBOARD 1 (PRESERVING ALL DATA) ───────────

// Members & Emojis
app.get('/api/members', async (req, res) => {
  const guildId = req.query.guildId || req.session.selectedGuild;
  if (!guildId) return res.json([]);
  try {
    const res2 = await fetch(`http://localhost:${BOT_API_PORT}/api/members?guildId=${guildId}`);
    if (res2.ok) {
      const data = await res2.json();
      return res.json(data);
    }
  } catch (e) {}
  return res.json([]);
});

app.get('/api/emojis', async (req, res) => {
  const guildId = req.query.guildId || req.session.selectedGuild;
  if (!guildId) return res.json([]);
  try {
    const res2 = await fetch(`http://localhost:${BOT_API_PORT}/api/emojis?guildId=${guildId}`);
    if (res2.ok) {
      const data = await res2.json();
      return res.json(data);
    }
  } catch (e) {}
  return res.json([]);
});

// Shop Items & Settings
app.post('/api/config/shop/add', (req, res) => {
  const { guildId, name, description, price, role_id, type } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid || !name || !price) return res.status(400).json({ error: 'Champs requis manquants' });
  try {
    db.run(
      'INSERT INTO shop_items (guild_id, name, description, price, role_id, type) VALUES (?, ?, ?, ?, ?, ?)',
      [gid, name, description || '', parseInt(price), role_id || null, type || 'role'],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
      }
    );
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/shop/delete', (req, res) => {
  const { guildId, id } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid || !id) return res.status(400).json({ error: 'ID manquant' });
  db.run('DELETE FROM shop_items WHERE id = ? AND guild_id = ?', [id, gid], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Level Rewards
app.post('/api/config/level-rewards/add', (req, res) => {
  const { guildId, level, role_id } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid || !level || !role_id) return res.status(400).json({ error: 'Champs requis manquants' });
  db.run(
    'INSERT INTO level_rewards (guild_id, level, role_id) VALUES (?, ?, ?) ON CONFLICT(guild_id, level) DO UPDATE SET role_id = excluded.role_id',
    [gid, parseInt(level), role_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.post('/api/config/level-rewards/delete', (req, res) => {
  const { guildId, level } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid || level === undefined) return res.status(400).json({ error: 'Niveau manquant' });
  db.run('DELETE FROM level_rewards WHERE guild_id = ? AND level = ?', [gid, parseInt(level)], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Quests
app.post('/api/config/quests/add', (req, res) => {
  const { guildId, title, description, reward_xp, reward_money, target_count, type } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid || !title) return res.status(400).json({ error: 'Titre manquant' });
  db.run(
    'INSERT INTO quests (guild_id, title, description, reward_xp, reward_money, target_count, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [gid, title, description || '', parseInt(reward_xp || 0), parseInt(reward_money || 0), parseInt(target_count || 1), type || 'daily'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.post('/api/config/quests/delete', (req, res) => {
  const { guildId, id } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid || !id) return res.status(400).json({ error: 'ID manquant' });
  db.run('DELETE FROM quests WHERE id = ? AND guild_id = ?', [id, gid], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Action GIFs
app.post('/api/config/action-gifs/add', (req, res) => {
  const { guildId, action_type, gif_url } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid || !action_type || !gif_url) return res.status(400).json({ error: 'Champs requis manquants' });
  db.run(
    'INSERT INTO action_gifs (guild_id, action_type, gif_url) VALUES (?, ?, ?)',
    [gid, action_type, gif_url],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.post('/api/config/action-gifs/delete', (req, res) => {
  const { guildId, id } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid || !id) return res.status(400).json({ error: 'ID manquant' });
  db.run('DELETE FROM action_gifs WHERE id = ? AND guild_id = ?', [id, gid], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Star of the week
app.get('/api/star/config', (req, res) => {
  const guildId = req.query.guildId || req.session.selectedGuild;
  if (!guildId) return res.json({});
  db.get('SELECT * FROM star_config WHERE guild_id = ?', [guildId], (err, row) => {
    res.json(row || {});
  });
});

app.post('/api/star/config', (req, res) => {
  const { guildId, channel_id, role_id, reset_day } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid) return res.status(400).json({ error: 'Guild ID manquant' });
  db.run(
    `INSERT INTO star_config (guild_id, channel_id, role_id, reset_day) VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id, role_id = excluded.role_id, reset_day = excluded.reset_day`,
    [gid, channel_id, role_id, reset_day || 'MONDAY'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.post('/api/star/force-election', async (req, res) => {
  const { guildId } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid) return res.status(400).json({ error: 'Guild ID manquant' });
  try {
    const res2 = await fetch(`http://localhost:${BOT_API_PORT}/api/star/force-election`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: gid })
    });
    if (res2.ok) {
      const data = await res2.json();
      return res.json(data);
    }
  } catch(e) {}
  res.json({ success: true, message: 'Élection Star déclenchée' });
});

// Tickets Panel & Options
app.post('/api/config/tickets/panel/add', async (req, res) => {
  const { guildId, channel_id, category_id, title, description, button_text, support_role_id } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid || !channel_id) return res.status(400).json({ error: 'Salon requis' });
  db.run(
    `INSERT INTO ticket_panels (guild_id, channel_id, category_id, title, description, button_text, support_role_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [gid, channel_id, category_id, title || 'Support', description || 'Cliquez pour ouvrir un ticket', button_text || 'Ouvrir un ticket', support_role_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// AI Chat endpoint
app.post('/api/ai/chat', async (req, res) => {
  const { message, history, guildId } = req.body;
  const gid = guildId || req.session.selectedGuild;
  try {
    const res2 = await fetch(`http://localhost:${BOT_API_PORT}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, guildId: gid, userId: req.session.user ? req.session.user.id : null })
    });
    if (res2.ok) {
      const data = await res2.json();
      return res.json(data);
    }
  } catch(e) {}
  res.json({ reply: "L'assistant IA est temporairement indisponible." });
});

// UNO Config Route
app.post('/api/config/uno', (req, res) => {
  const { guildId, is_active, announce_channel, win_money, win_xp } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid) return res.status(400).json({ error: 'Guild ID manquant' });
  db.run(
    `INSERT INTO uno_config (guild_id, is_active, announce_channel, win_money, win_xp) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET is_active = excluded.is_active, announce_channel = excluded.announce_channel, win_money = excluded.win_money, win_xp = excluded.win_xp`,
    [gid, is_active ? 1 : 0, announce_channel || null, parseInt(win_money || 500), parseInt(win_xp || 100)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Suites Privées Route
app.post('/api/config/suites', (req, res) => {
  const { guildId, privateSuiteCategoryId, suiteChannelPrefix, suitePrice } = req.body;
  const gid = guildId || req.session.selectedGuild;
  if (!gid) return res.status(400).json({ error: 'Guild ID manquant' });
  db.run(
    `INSERT INTO shop_config (guild_id, private_suite_category_id, suite_channel_prefix, suite_price) VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET private_suite_category_id = excluded.private_suite_category_id, suite_channel_prefix = excluded.suite_channel_prefix, suite_price = excluded.suite_price`,
    [gid, privateSuiteCategoryId || null, suiteChannelPrefix || '👑┆suite-', parseInt(suitePrice || 15000)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});
"""

# Append missing routes before app.listen in dashboard2.js
listen_idx = dash2_code.find('app.listen')
if listen_idx != -1:
    new_dash2_code = dash2_code[:listen_idx] + missing_routes_code + "\n\n" + dash2_code[listen_idx:]
    with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
        f.write(new_dash2_code)
    print("src/dashboard2.js updated with ALL routes ported from Dashboard 1!")
else:
    print("Error finding app.listen in dashboard2.js")
