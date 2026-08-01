with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    d2_code = f.read()

# Update /login and /callback in dashboard2.js to be 100% standalone on port 49602
old_login_callback = """app.get('/login', (req, res) => {
  const id = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent('http://82.65.75.176:49601/callback');
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${id}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds&state=port49602`);
});"""

new_login_callback = """const CALLBACK_URL = process.env.DASHBOARD2_CALLBACK_URL || 'http://82.65.75.176:49602/callback';

app.get('/login', (req, res) => {
  const id = process.env.DISCORD_CLIENT_ID;
  const ru = encodeURIComponent(CALLBACK_URL);
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${id}&redirect_uri=${ru}&response_type=code&scope=identify%20guilds`);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/?error=no_code');
  try {
    const tr = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALLBACK_URL
      })
    });
    const td = await tr.json();
    if (td.error) throw new Error(td.error);
    const [ur, gr] = await Promise.all([
      fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + td.access_token } }),
      fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: 'Bearer ' + td.access_token } })
    ]);
    const ud = await ur.json();
    const gd = await gr.json();
    req.session.user = {
      id: ud.id,
      username: ud.username,
      global_name: ud.global_name || ud.username,
      avatar: ud.avatar,
      accessToken: td.access_token,
      guilds: gd
    };
    req.session.save(err => {
      res.redirect('/');
    });
  } catch(e) {
    console.error('[Dashboard2 OAuth Error]', e);
    res.redirect('/?error=oauth_failed');
  }
});"""

d2_code = d2_code.replace(old_login_callback, new_login_callback)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2_code)

print("src/dashboard2.js updated to handle /login and /callback natively on port 49602!")
