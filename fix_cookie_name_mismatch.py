with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    d2_code = f.read()

# Fix cookie name to match dashboard.js: bagbot-elite.sid
old_session_config = """app.use(session({
  store: new SQLiteSessionStore(),
  secret: process.env.SESSION_SECRET || 'bagbot-elite-secret-key-change-in-production',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 30*24*60*60*1000, sameSite: 'lax', httpOnly: true },
  name: 'connect.sid'
}));"""

new_session_config = """app.use(session({
  store: new SQLiteSessionStore(),
  secret: process.env.SESSION_SECRET || 'bagbot-elite-secret-key-change-in-production',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 30*24*60*60*1000, sameSite: 'lax', httpOnly: true },
  name: 'bagbot-elite.sid'
}));"""

d2_code = d2_code.replace(old_session_config, new_session_config)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2_code)

print("src/dashboard2.js updated with matching cookie name 'bagbot-elite.sid'!")
