require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.DASHBOARD2_PORT || 49602;
const BOT_API_PORT = process.env.BOT_API_PORT || 49605;
const CALLBACK_URL = process.env.DASHBOARD2_CALLBACK_URL || 'http://82.65.75.176:49602/callback';

const {
  db,
  getAutomodConfig,
  updateAutomodConfig,
  getAutorolesOnJoin,
  addAutoroleOnJoin,
  deleteAutoroleOnJoin,
  getAutorolesOnRole,
  addAutoroleOnRole,
  deleteAutoroleOnRole,
  getKarmaConfig,
  updateKarmaConfig,
  getActionVeriteItems,
  addActionVeriteItem,
  deleteActionVeriteItem,
  getAiKeys,
  addAiKey,
  deleteAiKey,
  getAiConfig,
  updateAiConfig,
  getBoostConfig,
  updateBoostConfig,
  getBumpConfig,
  getTicketPanels,
  getTicketOptions,
} = require('./database/db');

db.exec('CREATE TABLE IF NOT EXISTS user_sessions2 (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expired INTEGER NOT NULL)');

class SQLiteSessionStore extends session.Store {
  constructor() {
    super();
    this.getStmt = db.prepare('SELECT sess FROM user_sessions2 WHERE sid = ? AND expired > ?');
    this.setStmt = db.prepare('INSERT INTO user_sessions2 (sid, sess, expired) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired');
    this.destroyStmt = db.prepare('DELETE FROM user_sessions2 WHERE sid = ?');
  }
  get(sid, cb) { try { const r = this.getStmt.get(sid, Date.now()); if (!r) return cb(null, null); cb(null, JSON.parse(r.sess)); } catch(e) { cb(e); } }
  set(sid, sess, cb) { try { const ma = sess && sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 30*24*60*60*1000; this.setStmt.run(sid, JSON.stringify(sess), Date.now()+ma); if(cb) cb(null); } catch(e) { if(cb) cb(e); } }
  destroy(sid, cb) { try { this.destroyStmt.run(sid); if(cb) cb(null); } catch(e) { if(cb) cb(e); } }
}

app.set('trust proxy', 1);
app.use(session({ store: new SQLiteSessionStore(), secret: process.env.SESSION_SECRET || 'bagbot2secret', resave: true, saveUninitialized: true, cookie: { secure: false, maxAge: 30*24*60*60*1000, sameSite: 'lax', httpOnly: true }, name: 'bagbot-elite2.sid' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.static(path.join(__dirname, '../public2'), { etag: false, lastModified: false }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public2/index.html')));

const getGuildId = (req) => (req.query && req.query.guildId) || (req.body && req.body.guildId) || (req.session && req.session.selectedGuild) || null;
const botFetch = async (p, opts) => { const r = await fetch('http://127.0.0.1:' + BOT_API_PORT + p, opts).catch(() => null); if (!r || !r.ok) return null; return r.json().catch(() => null); };

app.get('/login', (req, res) => {
  const id = process.env.DISCORD_CLIENT_ID;
  const ru = encodeURIComponent(CALLBACK_URL);
  res.redirect('https://discord.com/api/oauth2/authorize?client_id=' + id + '&redirect_uri=' + ru + '&response_type=code&scope=identify%20guilds');
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/?error=no_code');
  try {
    const tr = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID, client_secret: process.env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: CALLBACK_URL }) });
    const td = await tr.json();
    if (td.error) throw new Error(td.error);
    const [ur, gr] = await Promise.all([fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + td.access_token } }), fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: 'Bearer ' + td.access_token } })]);
    const ud = await ur.json(); const gd = await gr.json();
    req.session.user = { id: ud.id, username: ud.username, global_name: ud.global_name || ud.username, avatar: ud.avatar, accessToken: td.access_token, guilds: gd };
    req.session.save(e => { if (e) return res.redirect('/?error=session_error'); res.redirect('/'); });
  } catch(e) { console.error(e); res.redirect('/?error=oauth_failed'); }
});

app.get('/logout', (req, res) => { req.session.destroy(() => { res.clearCookie('bagbot-elite2.sid'); res.redirect('/'); }); });

app.get('/api/user', (req, res) => {
  if (!req.session.user) return res.json({ authenticated: false });
  const u = req.session.user;
  const av = u.avatar ? 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.png' : 'https://cdn.discordapp.com/embed/avatars/0.png';
  res.json({ authenticated: true, user: { id: u.id, username: u.username, global_name: u.global_name, avatar: u.avatar, avatar_url: av, guilds: u.guilds }, selectedGuild: req.session.selectedGuild || null });
});

app.get('/api/guilds', async (req, res) => {
  try {
    const botGuilds = await botFetch('/guilds') || [];
    if (req.session.user && req.session.user.guilds && req.session.user.guilds.length > 0) {
      const ids = new Set(botGuilds.map(g => g.id));
      const f = req.session.user.guilds.filter(g => ids.has(g.id));
      if (f.length > 0) return res.json(f);
    }
    res.json(botGuilds);
  } catch(e) { res.json([]); }
});

app.post('/api/select-guild', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  const { guildId } = req.body || {};
  req.session.selectedGuild = guildId || null;
  req.session.save(() => res.json({ success: true, guildId }));
});

app.get('/api/channels', async (req, res) => { const g = getGuildId(req); if (!g) return res.json([]); res.json(await botFetch('/guilds/' + g + '/channels') || []); });
app.get('/api/roles', async (req, res) => { const g = getGuildId(req); if (!g) return res.json([]); res.json(await botFetch('/guilds/' + g + '/roles') || []); });
app.get('/api/bot/info', async (req, res) => { res.json(await botFetch('/bot/info') || { username: 'Bagbot Elite', avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png' }); });

app.get('/api/config', (req, res) => {
  const guildId = getGuildId(req);
  if (!guildId) return res.status(400).json({ error: 'No guild selected' });
  try {
    let wl = db.prepare('SELECT * FROM welcome_leave WHERE guild_id = ?').get(guildId);
    if (!wl) wl = { welcome_channel: null, leave_channel: null, welcome_title: 'Bienvenue', welcome_desc: 'Bienvenue {user}!', welcome_color: '#00FF00', leave_title: 'Au revoir', leave_desc: 'Au revoir {user}!', leave_color: '#FF0000' };
    let lc = db.prepare('SELECT * FROM leveling_config WHERE guild_id = ?').get(guildId);
    if (!lc) lc = { xp_min: 15, xp_max: 25, karma_min: 1, karma_max: 3, money_min: 2, money_max: 5, announce_channel: 'current', announce_msg: 'Bravo {user}! Tu passes au niveau {level}!', xp_base: 120, xp_factor: 1.35 };
    const amc = getAutomodConfig(guildId);
    let logsC = db.prepare('SELECT * FROM logs_config WHERE guild_id = ?').get(guildId);
    if (!logsC) logsC = { channel_id: null, events: 'all' };
    let quar = db.prepare('SELECT * FROM quarantine_config WHERE guild_id = ?').get(guildId);
    if (!quar) quar = { role_id: null, channel_id: null };
    const arj = getAutorolesOnJoin(guildId);
    const arr = getAutorolesOnRole(guildId);
    const kc = getKarmaConfig(guildId);
    const aic = getAiConfig(guildId);
    const aiK = getAiKeys();
    const bc = getBoostConfig(guildId);
    const av = getActionVeriteItems(guildId);
    const tp = getTicketPanels ? getTicketPanels(guildId) : [];
    const to = getTicketOptions ? getTicketOptions(guildId) : [];
    let perm = db.prepare('SELECT * FROM permissions_config WHERE guild_id = ?').get(guildId);
    if (!perm) perm = { admin_role_id: null, modo_role_id: null, dashboard_roles: '[]', admin_cmds_roles: '[]', modo_cmds_roles: '[]' };
    let trib = {};
    try { const tdb = require('./utils/tribunal_db'); trib = tdb.getTribunalConfig(guildId) || {}; } catch(e) {}
    const lr = db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC').all(guildId);
    const bumpCfg = db.prepare('SELECT * FROM bump_config WHERE guild_id = ?').get(guildId) || {};
    const conf = db.prepare('SELECT * FROM confessions WHERE guild_id = ?').all(guildId);
    res.json({ welcome_leave: wl, leveling_config: lc, automod_config: amc, logs: logsC, quarantine: quar, autoroles_on_join: arj, autoroles_on_role: arr, karma_config: kc, ai_config: aic, ai_keys: aiK, boost_config: bc, bump_config: bumpCfg, action_verite: av, ticket_panels: tp, ticket_options: to, permissions_config: perm, tribunal_config: trib, level_rewards: lr, confessions: conf });
  } catch(err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.post('/api/config/welcome-leave', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { welcome_channel, welcome_title, welcome_desc, welcome_color, leave_channel, leave_title, leave_desc, leave_color } = req.body || {};
    db.prepare('INSERT INTO welcome_leave (guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc, welcome_color, leave_title, leave_desc, leave_color) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel=excluded.welcome_channel, leave_channel=excluded.leave_channel, welcome_title=excluded.welcome_title, welcome_desc=excluded.welcome_desc, welcome_color=excluded.welcome_color, leave_title=excluded.leave_title, leave_desc=excluded.leave_desc, leave_color=excluded.leave_color').run(g, welcome_channel||null, leave_channel||null, welcome_title||'', welcome_desc||'', welcome_color||'#00FF00', leave_title||'', leave_desc||'', leave_color||'#FF0000');
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/automod', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { anti_link, anti_spam, anti_massmention, anti_badwords, bypass_roles, badwords_list, spam_max_msgs, massmention_limit } = req.body || {};
    updateAutomodConfig(g, { anti_link: anti_link?1:0, anti_spam: anti_spam?1:0, anti_massmention: anti_massmention?1:0, anti_badwords: anti_badwords?1:0, bypass_roles: bypass_roles||'', badwords_list: badwords_list||'', spam_max_msgs: parseInt(spam_max_msgs)||5, massmention_limit: parseInt(massmention_limit)||5 });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/logs', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try { const { channel_id, events } = req.body||{}; db.prepare('INSERT OR REPLACE INTO logs_config (guild_id, channel_id, events) VALUES (?,?,?)').run(g, channel_id||null, events||'all'); res.json({ success: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/leveling', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { xp_min, xp_max, karma_min, karma_max, money_min, money_max, announce_channel, announce_msg, xp_base, xp_factor } = req.body||{};
    db.prepare('INSERT OR REPLACE INTO leveling_config (guild_id, xp_min, xp_max, karma_min, karma_max, money_min, money_max, announce_channel, announce_msg, xp_base, xp_factor) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(g, parseInt(xp_min)||15, parseInt(xp_max)||25, parseInt(karma_min)||1, parseInt(karma_max)||3, parseInt(money_min)||2, parseInt(money_max)||5, announce_channel||'current', announce_msg||'Bravo {user}! Tu passes au niveau {level}!', parseInt(xp_base)||120, parseFloat(xp_factor)||1.35);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/karma', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { is_active, threshold_1, xp_mult_1, discount_1, threshold_2, xp_mult_2, discount_2, threshold_3, xp_mult_3, discount_3 } = req.body||{};
    getKarmaConfig(g);
    updateKarmaConfig(g, { is_active: is_active?1:0, threshold_1: parseInt(threshold_1)||20, xp_mult_1: parseFloat(xp_mult_1)||1.2, discount_1: parseFloat(discount_1)||5, threshold_2: parseInt(threshold_2)||50, xp_mult_2: parseFloat(xp_mult_2)||1.5, discount_2: parseFloat(discount_2)||10, threshold_3: parseInt(threshold_3)||100, xp_mult_3: parseFloat(xp_mult_3)||2.0, discount_3: parseFloat(discount_3)||20 });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/autoroles/join', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { role_id, action } = req.body||{}; if (!role_id) return res.status(400).json({ error: 'role_id required' });
    if (action === 'delete') deleteAutoroleOnJoin(g, role_id); else addAutoroleOnJoin(g, role_id);
    res.json({ success: true, autoroles: getAutorolesOnJoin(g) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/autoroles/role', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { trigger_role_id, target_role_id, action } = req.body||{};
    if (!trigger_role_id || !target_role_id) return res.status(400).json({ error: 'Both role IDs required' });
    if (action === 'delete') deleteAutoroleOnRole(g, trigger_role_id, target_role_id); else addAutoroleOnRole(g, trigger_role_id, target_role_id);
    res.json({ success: true, autoroles: getAutorolesOnRole(g) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/boost', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try { updateBoostConfig(g, req.body||{}); res.json({ success: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/tribunal', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const tdb = require('./utils/tribunal_db');
    const { category_id, judge_role_id, lawyer_role_id, accused_role_id, plaintiff_role_id, channel_prefix, access_roles, auto_delete_minutes } = req.body||{};
    tdb.updateTribunalConfig(g, { categoryId: category_id||'', judgeRoleId: judge_role_id||'', lawyerRoleId: lawyer_role_id||'', accusedRoleId: accused_role_id||'', plaintiffRoleId: plaintiff_role_id||'', channelPrefix: channel_prefix||'', accessRoles: Array.isArray(access_roles)?access_roles:[], autoDeleteMinutes: parseInt(auto_delete_minutes)||5 });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/bump', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try { const { reminder_channel, reminder_role } = req.body||{}; db.prepare('INSERT OR REPLACE INTO bump_config (guild_id, reminder_channel, reminder_role) VALUES (?,?,?)').run(g, reminder_channel||null, reminder_role||null); res.json({ success: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/action-verite/add', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { type, category, content } = req.body||{};
    if (!type || !category || !content) return res.status(400).json({ error: 'type, category, content required' });
    addActionVeriteItem(g, type, category, content);
    res.json({ success: true, items: getActionVeriteItems(g) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/action-verite/delete', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { id } = req.body||{}; if (!id) return res.status(400).json({ error: 'id required' });
    deleteActionVeriteItem(g, id);
    res.json({ success: true, items: getActionVeriteItems(g) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/ai', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { preferred_provider, groq_text_model, groq_vision_model, groq_server_model, gemini_model } = req.body||{};
    getAiConfig(g);
    const upd = {};
    if (preferred_provider !== undefined) upd.preferred_provider = preferred_provider;
    if (groq_text_model !== undefined) upd.groq_text_model = groq_text_model;
    if (groq_vision_model !== undefined) upd.groq_vision_model = groq_vision_model;
    if (groq_server_model !== undefined) upd.groq_server_model = groq_server_model;
    if (gemini_model !== undefined) upd.gemini_model = gemini_model;
    if (Object.keys(upd).length > 0) updateAiConfig(g, upd);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/ai-keys/add', (req, res) => {
  try {
    const { provider, category, api_key, label } = req.body||{};
    if (!provider || !api_key) return res.status(400).json({ error: 'provider and api_key required' });
    addAiKey(provider, category||'all', api_key, label);
    res.json({ success: true, keys: getAiKeys() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/ai-keys/delete', (req, res) => {
  try {
    const { id } = req.body||{}; if (!id) return res.status(400).json({ error: 'id required' });
    deleteAiKey(id);
    res.json({ success: true, keys: getAiKeys() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/permissions', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { admin_role_id, modo_role_id, dashboard_roles, admin_cmds_roles, modo_cmds_roles } = req.body||{};
    const dr = Array.isArray(dashboard_roles) ? JSON.stringify(dashboard_roles) : (dashboard_roles||'[]');
    const ar = Array.isArray(admin_cmds_roles) ? JSON.stringify(admin_cmds_roles) : (admin_cmds_roles||'[]');
    const mr = Array.isArray(modo_cmds_roles) ? JSON.stringify(modo_cmds_roles) : (modo_cmds_roles||'[]');
    db.prepare('INSERT INTO permissions_config (guild_id, admin_role_id, modo_role_id, dashboard_roles, admin_cmds_roles, modo_cmds_roles) VALUES (?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET admin_role_id=excluded.admin_role_id, modo_role_id=excluded.modo_role_id, dashboard_roles=excluded.dashboard_roles, admin_cmds_roles=excluded.admin_cmds_roles, modo_cmds_roles=excluded.modo_cmds_roles').run(g, admin_role_id||null, modo_role_id||null, dr, ar, mr);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/quarantine', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try { const { role_id, channel_id } = req.body||{}; db.prepare('INSERT OR REPLACE INTO quarantine_config (guild_id, role_id, channel_id) VALUES (?,?,?)').run(g, role_id||null, channel_id||null); res.json({ success: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('[Dashboard2] Premium Dashboard running on port ' + PORT);
  console.log('[Dashboard2] Bot API port: ' + BOT_API_PORT);
  console.log('[Dashboard2] Callback URL: ' + CALLBACK_URL);
});
