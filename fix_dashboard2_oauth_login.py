import re

# 1. Update src/dashboard.js to support redirecting back to Dashboard 2 after OAuth2 callback
with open('src/dashboard.js', 'r', encoding='utf-8') as f:
    d1_code = f.read()

# Update /login in dashboard.js to save redirect query parameter
old_d1_login = """app.get('/login', (req, res) => {
  const redirectUri = process.env.DISCORD_CALLBACK_URL || 'http://82.65.75.176:49601/callback';"""

new_d1_login = """app.get('/login', (req, res) => {
  if (req.query.redirect) {
    req.session.postLoginRedirect = req.query.redirect;
  }
  const redirectUri = process.env.DISCORD_CALLBACK_URL || 'http://82.65.75.176:49601/callback';"""

d1_code = d1_code.replace(old_d1_login, new_d1_login)

# Update /callback in dashboard.js to handle postLoginRedirect
old_d1_callback_redirect = "res.redirect('/');"
new_d1_callback_redirect = """const target = req.session.postLoginRedirect || '/';
    delete req.session.postLoginRedirect;
    res.redirect(target);"""

d1_code = d1_code.replace(old_d1_callback_redirect, new_d1_callback_redirect)

with open('src/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(d1_code)

print("src/dashboard.js updated to handle post-login redirects!")

# 2. Update src/dashboard2.js to use shared SQLite session store user_sessions and handle login
with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    d2_code = f.read()

# Update session store table name from user_sessions2 to user_sessions and share secret/cookie name
old_d2_session_setup = """db.exec('CREATE TABLE IF NOT EXISTS user_sessions2 (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expired INTEGER NOT NULL)');

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
app.use(session({ store: new SQLiteSessionStore(), secret: process.env.SESSION_SECRET || 'bagbot2secret', resave: true, saveUninitialized: true, cookie: { secure: false, maxAge: 30*24*60*60*1000, sameSite: 'lax', httpOnly: true }, name: 'bagbot-elite2.sid' }));"""

new_d2_session_setup = """db.exec('CREATE TABLE IF NOT EXISTS user_sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expired INTEGER NOT NULL)');

class SQLiteSessionStore extends session.Store {
  constructor() {
    super();
    this.getStmt = db.prepare('SELECT sess FROM user_sessions WHERE sid = ? AND expired > ?');
    this.setStmt = db.prepare('INSERT INTO user_sessions (sid, sess, expired) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired');
    this.destroyStmt = db.prepare('DELETE FROM user_sessions WHERE sid = ?');
  }
  get(sid, cb) { try { const r = this.getStmt.get(sid, Date.now()); if (!r) return cb(null, null); cb(null, JSON.parse(r.sess)); } catch(e) { cb(e); } }
  set(sid, sess, cb) { try { const ma = sess && sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 30*24*60*60*1000; this.setStmt.run(sid, JSON.stringify(sess), Date.now()+ma); if(cb) cb(null); } catch(e) { if(cb) cb(e); } }
  destroy(sid, cb) { try { this.destroyStmt.run(sid); if(cb) cb(null); } catch(e) { if(cb) cb(e); } }
}

app.set('trust proxy', 1);
app.use(session({
  store: new SQLiteSessionStore(),
  secret: process.env.SESSION_SECRET || 'bagbot-elite-secret-key-change-in-production',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 30*24*60*60*1000, sameSite: 'lax', httpOnly: true },
  name: 'connect.sid'
}));"""

d2_code = d2_code.replace(old_d2_session_setup, new_d2_session_setup)

# Update /login in dashboard2.js to use the whitelisted OAuth2 login endpoint and redirect back to 49602
old_d2_login = """app.get('/login', (req, res) => {
  const id = process.env.DISCORD_CLIENT_ID;
  const ru = encodeURIComponent(CALLBACK_URL);
  res.redirect('https://discord.com/api/oauth2/authorize?client_id=' + id + '&redirect_uri=' + ru + '&response_type=code&scope=identify%20guilds');
});"""

new_d2_login = """app.get('/login', (req, res) => {
  const host = req.get('host') || '82.65.75.176:49602';
  const protocol = req.protocol || 'http';
  const target = encodeURIComponent(`${protocol}://${host}/`);
  res.redirect(`http://82.65.75.176:49601/login?redirect=${target}`);
});"""

d2_code = d2_code.replace(old_d2_login, new_d2_login)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2_code)

print("src/dashboard2.js updated to share SQLite session store and handle OAuth2 login seamlessly!")
