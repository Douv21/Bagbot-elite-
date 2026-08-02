import re

# 1. Update src/dashboard2.js /login route
with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    d2_code = f.read()

old_d2_login = """app.get('/login', (req, res) => {
  const host = req.get('host') || '82.65.75.176:49602';
  const protocol = req.protocol || 'http';
  const target = encodeURIComponent(`${protocol}://${host}/`);
  res.redirect(`http://82.65.75.176:49601/login?redirect=${target}`);
});"""

new_d2_login = """app.get('/login', (req, res) => {
  const id = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent('http://82.65.75.176:49601/callback');
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${id}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds&state=port49602`);
});"""

d2_code = d2_code.replace(old_d2_login, new_d2_login)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2_code)

print("src/dashboard2.js updated with state=port49602 OAuth2 parameter!")

# 2. Update src/dashboard.js /callback route to inspect req.query.state
with open('src/dashboard.js', 'r', encoding='utf-8') as f:
    d1_code = f.read()

# Restore clean /login in dashboard.js
old_d1_login = """app.get('/login', (req, res) => {
  if (req.query.redirect) {
    req.session.postLoginRedirect = req.query.redirect;
  }
  const redirectUri = process.env.DISCORD_CALLBACK_URL || 'http://82.65.75.176:49601/callback';"""

clean_d1_login = """app.get('/login', (req, res) => {
  const redirectUri = process.env.DISCORD_CALLBACK_URL || 'http://82.65.75.176:49601/callback';"""

d1_code = d1_code.replace(old_d1_login, clean_d1_login)

# Update /callback redirect logic in dashboard.js
old_d1_callback = """const target = req.session.postLoginRedirect || '/';
    delete req.session.postLoginRedirect;
    res.redirect(target);"""

new_d1_callback = """if (req.query.state === 'port49602') {
      res.redirect('http://82.65.75.176:49602/');
    } else {
      res.redirect('/');
    }"""

d1_code = d1_code.replace(old_d1_callback, new_d1_callback)

with open('src/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(d1_code)

print("src/dashboard.js updated to redirect state=port49602 to http://82.65.75.176:49602/!")
