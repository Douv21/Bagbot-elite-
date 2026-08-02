import re

# 1. Update src/dashboard.js (Dashboard 1) to support targetPort parameter
with open('src/dashboard.js', 'r', encoding='utf-8') as f:
    d1 = f.read()

# Update /login in Dashboard 1
old_d1_login = """// Route de connexion Discord OAuth2
app.get('/login', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(getRedirectUri(req));
  const scope = encodeURIComponent('identify guilds guilds.members.read');
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`);
});"""

new_d1_login = """// Route de connexion Discord OAuth2 (supports port delegation)
app.get('/login', (req, res) => {
  if (req.query.port) {
    req.session.targetPort = req.query.port;
  }
  const clientId = process.env.DISCORD_CLIENT_ID || '1523016917588115566';
  const redirectUri = encodeURIComponent(getRedirectUri(req));
  const scope = encodeURIComponent('identify guilds guilds.members.read');
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`);
});"""

# Update /callback redirect in Dashboard 1
old_d1_cb_save = """      console.log(`[/callback] Session enregistrée pour ${userData.username}, redirection vers /`);
      res.redirect('/');"""

new_d1_cb_save = """      console.log(`[/callback] Session enregistrée pour ${userData.username}`);
      const tPort = req.session.targetPort;
      delete req.session.targetPort;
      if (tPort === '49602') {
        return res.redirect('http://82.65.75.176:49602/?auth_success=1');
      }
      res.redirect('/');"""

d1 = d1.replace(old_d1_login, new_d1_login)
d1 = d1.replace(old_d1_cb_save, new_d1_cb_save)

with open('src/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(d1)

print("src/dashboard.js updated for OAuth delegation!")

# 2. Update src/dashboard2.js (Dashboard 2) to delegate /login and check shared session
with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    d2 = f.read()

# Replace /login in Dashboard 2
old_d2_login = """app.get('/login', (req, res) => {
  const redirectUri = encodeURIComponent('http://82.65.75.176:49602/callback');
  const scope = encodeURIComponent('identify guilds');
  const clientId = process.env.DISCORD_CLIENT_ID || '1523016917588115566';
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`);
});"""

new_d2_login = """app.get('/login', (req, res) => {
  res.redirect('http://82.65.75.176:49601/login?port=49602');
});"""

d2 = d2.replace(old_d2_login, new_d2_login)

# Update /api/user in Dashboard 2 to check both local session and Dashboard 1 session
old_d2_user = """app.get('/api/user', (req, res) => {
  if (!req.session || !req.session.user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user: req.session.user, selectedGuild: req.session.selectedGuild });
});"""

new_d2_user = """app.get('/api/user', async (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ authenticated: true, user: req.session.user, selectedGuild: req.session.selectedGuild });
  }
  // Try fetching session from Dashboard 1 (shared cookies on same host)
  try {
    const cookieHeader = req.headers.cookie || '';
    const d1Res = await fetch('http://127.0.0.1:49601/api/user', {
      headers: { cookie: cookieHeader }
    });
    if (d1Res.ok) {
      const d1Data = await d1Res.json();
      if (d1Data && d1Data.authenticated && d1Data.user) {
        req.session.user = d1Data.user;
        if (d1Data.selectedGuild) req.session.selectedGuild = d1Data.selectedGuild;
        return res.json({ authenticated: true, user: d1Data.user, selectedGuild: req.session.selectedGuild });
      }
    }
  } catch(e) {}
  res.json({ authenticated: false });
});"""

d2 = d2.replace(old_d2_user, new_d2_user)

# Update /api/guilds in Dashboard 2 to use user's accessToken or fetch from D1
old_d2_guilds = """app.get('/api/guilds', async (req, res) => {
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
});"""

new_d2_guilds = """app.get('/api/guilds', async (req, res) => {
  const cookieHeader = req.headers.cookie || '';
  try {
    const d1Res = await fetch('http://127.0.0.1:49601/api/guilds', {
      headers: { cookie: cookieHeader }
    });
    if (d1Res.ok) {
      const guilds = await d1Res.json();
      if (Array.isArray(guilds) && guilds.length > 0) return res.json(guilds);
    }
  } catch(e) {}
  // Fallback to bot guilds if authenticated
  if (req.session && req.session.user) {
    const botGuilds = await botFetch('/guilds') || [];
    return res.json(botGuilds);
  }
  res.json([]);
});"""

d2 = d2.replace(old_d2_guilds, new_d2_guilds)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2)

print("src/dashboard2.js updated for shared OAuth authentication!")
