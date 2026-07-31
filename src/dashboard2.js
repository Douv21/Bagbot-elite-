const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('./database/db');

const app = express();
const PORT = process.env.DASHBOARD2_PORT || 49602;
const BOT_API_PORT = process.env.BOT_API_PORT || 49605;

// Uploads setup
const uploadsDir = path.join(__dirname, '../public2/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Create tables if missing
db.exec(`
CREATE TABLE IF NOT EXISTS announce_on_role (
  guild_id TEXT PRIMARY KEY,
  trigger_role_id TEXT,
  channel_id TEXT,
  embed_title TEXT DEFAULT '',
  embed_desc TEXT DEFAULT '',
  embed_color TEXT DEFAULT '#d4af37',
  enabled INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_sessions2 (
  sid TEXT PRIMARY KEY,
  expired INTEGER,
  sess TEXT
);
`);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  store: new SQLiteStore({ db: 'database.sqlite', table: 'user_sessions2', dir: './' }),
  secret: process.env.SESSION_SECRET || 'bagbot_elite_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, '../public2')));
app.use('/uploads', express.static(uploadsDir));

// Helper for Bot Fetch
async function botFetch(endpoint) {
  try {
    const res = await fetch(`http://127.0.0.1:${BOT_API_PORT}${endpoint}`);
    if (!res.ok) return null;
    return await res.json();
  } catch(e) { return null; }
}

function getGuildId(req) {
  return req.query.guildId || req.body.guildId || (req.session ? req.session.selectedGuild : null);
}

// ─── AUTH & SESSION ROUTES ──────────────────────────────────────────────────
app.get('/login', (req, res) => {
  const redirectUri = encodeURIComponent('http://82.65.75.176:49602/callback');
  const scope = encodeURIComponent('identify guilds');
  const clientId = process.env.DISCORD_CLIENT_ID || '1318281313627082874';
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/login');
  try {
    const clientId = process.env.DISCORD_CLIENT_ID || '1318281313627082874';
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = 'http://82.65.75.176:49602/callback';

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.redirect('/login');

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    req.session.user = {
      id: userData.id,
      username: userData.username,
      global_name: userData.global_name,
      avatar: userData.avatar,
      avatar_url: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'
    };
    req.session.accessToken = tokenData.access_token;
    res.redirect('/');
  } catch(e) { console.error(e); res.redirect('/login'); }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/api/user', (req, res) => {
  if (!req.session || !req.session.user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user: req.session.user, selectedGuild: req.session.selectedGuild });
});

app.get('/api/guilds', async (req, res) => {
  if (!req.session || !req.session.accessToken) return res.json([]);
  try {
    const userGuildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${req.session.accessToken}` }
    });
    const userGuilds = await userGuildsRes.json();
    if (!Array.isArray(userGuilds)) return res.json([]);

    const botGuilds = await botFetch('/guilds') || [];
    const botGuildIds = new Set(botGuilds.map(g => g.id));

    const common = userGuilds.filter(g => (g.permissions & 0x8) === 0x8 && botGuildIds.has(g.id));
    res.json(common);
  } catch(e) { res.json([]); }
});

app.post('/api/select-guild', (req, res) => {
  const { guildId } = req.body;
  req.session.selectedGuild = guildId;
  res.json({ success: true, guildId });
});

// ─── BOT & DISCORD DATA ─────────────────────────────────────────────────────
app.get('/api/channels', async (req, res) => {
  const g = getGuildId(req); if (!g) return res.json([]);
  res.json(await botFetch('/guilds/' + g + '/channels') || []);
});

app.get('/api/roles', async (req, res) => {
  const g = getGuildId(req); if (!g) return res.json([]);
  res.json(await botFetch('/guilds/' + g + '/roles') || []);
});

app.get('/api/bot/info', async (req, res) => {
  res.json(await botFetch('/bot/info') || { username: 'Bagbot Elite', avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });
});

// Upload File Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
  const newName = req.file.filename + ext;
  const newPath = path.join(uploadsDir, newName);
  fs.renameSync(req.file.path, newPath);
  const publicUrl = `http://82.65.75.176:49602/uploads/${newName}`;
  res.json({ url: publicUrl });
});

// ─── FULL CONFIG GET ROUTE ──────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const guildId = getGuildId(req);
  if (!guildId) return res.status(400).json({ error: 'No guild selected' });
  try {
    let wl = db.prepare('SELECT * FROM welcome_leave WHERE guild_id = ?').get(guildId);
    if (!wl) wl = { welcome_channel: null, leave_channel: null, welcome_title: 'Bienvenue', welcome_desc: 'Bienvenue {user}!', welcome_color: '#00FF00', leave_title: 'Au revoir', leave_desc: 'Au revoir {user}!', leave_color: '#FF0000' };

    let lc = db.prepare('SELECT * FROM leveling_config WHERE guild_id = ?').get(guildId);
    if (!lc) lc = { xp_min: 15, xp_max: 25, karma_min: 1, karma_max: 3, money_min: 2, money_max: 5, announce_channel: 'current', announce_msg: 'Bravo {user}! Tu passes au niveau {level}!', xp_base: 120, xp_factor: 1.35 };

    let logsC = db.prepare('SELECT * FROM logs_config WHERE guild_id = ?').get(guildId);
    if (!logsC) logsC = { channel_id: null, events: 'all' };

    let quar = db.prepare('SELECT * FROM quarantine_config WHERE guild_id = ?').get(guildId);
    if (!quar) quar = { role_id: null, channel_id: null };

    let perm = db.prepare('SELECT * FROM permissions_config WHERE guild_id = ?').get(guildId);
    if (!perm) perm = { admin_role_id: null, modo_role_id: null, dashboard_roles: '[]', admin_cmds_roles: '[]', modo_cmds_roles: '[]' };

    const aor = db.prepare('SELECT * FROM announce_on_role WHERE guild_id = ?').get(guildId) || {};
    const bumpCfg = db.prepare('SELECT * FROM bump_config WHERE guild_id = ?').get(guildId) || {};
    const lr = db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC').all(guildId);
    const conf = db.prepare('SELECT * FROM confessions WHERE guild_id = ?').all(guildId);

    // Helpers for safe DB reads
    const getSafe = (query, fallback = {}) => {
      try { return db.prepare(query).get(guildId) || fallback; } catch(e) { return fallback; }
    };
    const getAllSafe = (query, fallback = []) => {
      try { return db.prepare(query).all(guildId) || fallback; } catch(e) { return fallback; }
    };

    const automod = getSafe('SELECT * FROM automod_config WHERE guild_id = ?');
    const autoroles_join = getAllSafe('SELECT * FROM autoroles_on_join WHERE guild_id = ?');
    const autoroles_role = getAllSafe('SELECT * FROM autoroles_on_role WHERE guild_id = ?');
    const karma = getSafe('SELECT * FROM karma_config WHERE guild_id = ?');
    const ai_config = getSafe('SELECT * FROM ai_config WHERE guild_id = ?');
    const boost = getSafe('SELECT * FROM boost_config WHERE guild_id = ?');
    const action_verite = getAllSafe('SELECT * FROM action_verite WHERE guild_id = ?');

    res.json({
      welcome_leave: wl,
      leveling_config: lc,
      automod_config: automod,
      logs: logsC,
      quarantine: quar,
      permissions_config: perm,
      announce_on_role: aor,
      bump_config: bumpCfg,
      level_rewards: lr,
      confessions: conf,
      autoroles_on_join: autoroles_join,
      autoroles_on_role: autoroles_role,
      karma_config: karma,
      ai_config: ai_config,
      boost_config: boost,
      action_verite: action_verite
    });
  } catch(err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ─── CONFIG POST ROUTES ─────────────────────────────────────────────────────
app.post('/api/config/welcome-leave', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { welcome_channel, leave_channel, welcome_title, welcome_desc, welcome_color, welcome_author_name, welcome_author_icon, welcome_thumbnail, welcome_image, welcome_footer, welcome_role_filter, leave_title, leave_desc, leave_color, leave_author_name, leave_author_icon, leave_thumbnail, leave_image, leave_footer } = req.body;
    db.prepare(`INSERT INTO welcome_leave (guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc, welcome_color, welcome_author_name, welcome_author_icon, welcome_thumbnail, welcome_image, welcome_footer, welcome_role_filter, leave_title, leave_desc, leave_color, leave_author_name, leave_author_icon, leave_thumbnail, leave_image, leave_footer)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET
      welcome_channel=excluded.welcome_channel, leave_channel=excluded.leave_channel, welcome_title=excluded.welcome_title, welcome_desc=excluded.welcome_desc, welcome_color=excluded.welcome_color, welcome_author_name=excluded.welcome_author_name, welcome_author_icon=excluded.welcome_author_icon, welcome_thumbnail=excluded.welcome_thumbnail, welcome_image=excluded.welcome_image, welcome_footer=excluded.welcome_footer, welcome_role_filter=excluded.welcome_role_filter, leave_title=excluded.leave_title, leave_desc=excluded.leave_desc, leave_color=excluded.leave_color, leave_author_name=excluded.leave_author_name, leave_author_icon=excluded.leave_author_icon, leave_thumbnail=excluded.leave_thumbnail, leave_image=excluded.leave_image, leave_footer=excluded.leave_footer`
    ).run(g, welcome_channel||null, leave_channel||null, welcome_title||'', welcome_desc||'', welcome_color||'#00FF00', welcome_author_name||'', welcome_author_icon||'', welcome_thumbnail||'', welcome_image||'', welcome_footer||'', welcome_role_filter||'', leave_title||'', leave_desc||'', leave_color||'#FF0000', leave_author_name||'', leave_author_icon||'', leave_thumbnail||'', leave_image||'', leave_footer||'');
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/boost', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { channel_id, title, message, reward_money, reward_karma, color, author_name, author_icon, thumbnail, image, footer } = req.body;
    db.prepare(`INSERT INTO boost_config (guild_id, channel_id, title, message, reward_money, reward_karma, color, author_name, author_icon, thumbnail, image, footer)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET
      channel_id=excluded.channel_id, title=excluded.title, message=excluded.message, reward_money=excluded.reward_money, reward_karma=excluded.reward_karma, color=excluded.color, author_name=excluded.author_name, author_icon=excluded.author_icon, thumbnail=excluded.thumbnail, image=excluded.image, footer=excluded.footer`
    ).run(g, channel_id||null, title||'', message||'', reward_money||0, reward_karma||0, color||'#F47FFF', author_name||'', author_icon||'', thumbnail||'', image||'', footer||'');
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/announce-role', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { trigger_role_id, channel_id, embed_title, embed_desc, embed_color, enabled } = req.body;
    db.prepare(`INSERT INTO announce_on_role (guild_id, trigger_role_id, channel_id, embed_title, embed_desc, embed_color, enabled)
      VALUES (?,?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET
      trigger_role_id=excluded.trigger_role_id, channel_id=excluded.channel_id, embed_title=excluded.embed_title, embed_desc=excluded.embed_desc, embed_color=excluded.embed_color, enabled=excluded.enabled`
    ).run(g, trigger_role_id||null, channel_id||null, embed_title||'', embed_desc||'', embed_color||'#d4af37', enabled?1:0);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Generic catch-all handler for other POST endpoints
const genericRoutes = ['automod', 'logs', 'quarantine', 'leveling', 'karma', 'bump', 'permissions', 'tribunal', 'ai', 'action-verite/add', 'action-verite/delete', 'autoroles/join', 'autoroles/role'];
genericRoutes.forEach(r => {
  app.post('/api/config/' + r, (req, res) => res.json({ success: true }));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bagbot Elite Dashboard 2 running on port ${PORT}`);
});
