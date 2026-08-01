import re

# 1. Update src/dashboard.js
with open('src/dashboard.js', 'r', encoding='utf-8') as f:
    d1_code = f.read()

# Replace /login in dashboard.js
old_d1_login = """app.get('/login', (req, res) => {
  if (req.query.redirect) {
    req.session.postLoginRedirect = req.query.redirect;
  }
  req.session.save(() => {
    const redirectUri = process.env.DISCORD_CALLBACK_URL || 'http://82.65.75.176:49601/callback';
    const id = process.env.DISCORD_CLIENT_ID;
    const ru = encodeURIComponent(redirectUri);
    res.redirect('https://discord.com/api/oauth2/authorize?client_id=' + id + '&redirect_uri=' + ru + '&response_type=code&scope=identify%20guilds');
  });
});"""

new_d1_login = """app.get('/login', (req, res) => {
  const target = req.query.redirect || '/';
  const redirectUri = process.env.DISCORD_CALLBACK_URL || 'http://82.65.75.176:49601/callback';
  const id = process.env.DISCORD_CLIENT_ID;
  const ru = encodeURIComponent(redirectUri);
  const st = encodeURIComponent(target);
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${id}&redirect_uri=${ru}&response_type=code&scope=identify%20guilds&state=${st}`);
});"""

d1_code = d1_code.replace(old_d1_login, new_d1_login)

# Replace /callback redirect target in dashboard.js
old_d1_callback = """const target = req.session.postLoginRedirect || '/';
    delete req.session.postLoginRedirect;
    res.redirect(target);"""

new_d1_callback = """let target = '/';
    if (req.query.state) {
      try { target = decodeURIComponent(req.query.state); } catch(e) {}
    }
    res.redirect(target);"""

d1_code = d1_code.replace(old_d1_callback, new_d1_callback)

with open('src/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(d1_code)

print("src/dashboard.js updated with URL state parameter OAuth2 redirect!")

# 2. Update src/dashboard2.js /login
with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    d2_code = f.read()

old_d2_login = """app.get('/login', (req, res) => {
  res.redirect('http://82.65.75.176:49601/login?redirect=http://82.65.75.176:49602/');
});"""

new_d2_login = """app.get('/login', (req, res) => {
  const host = req.get('host') || '82.65.75.176:49602';
  const protocol = req.protocol || 'http';
  const target = `${protocol}://${host}/`;
  res.redirect(`http://82.65.75.176:49601/login?redirect=${encodeURIComponent(target)}`);
});"""

d2_code = d2_code.replace(old_d2_login, new_d2_login)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2_code)

print("src/dashboard2.js updated with dynamic host redirect!")
