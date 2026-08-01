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
    const {
      welcome_channel, welcome_title, welcome_desc, welcome_color, welcome_author_name, welcome_author_icon, welcome_image, welcome_footer, welcome_role_filter,
      leave_channel, leave_title, leave_desc, leave_color, leave_author_name, leave_author_icon, leave_image, leave_footer
    } = req.body || {};

    db.prepare(`INSERT INTO welcome_leave (
      guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc, welcome_color, welcome_author_name, welcome_author_icon, welcome_image, welcome_footer, welcome_role_filter,
      leave_title, leave_desc, leave_color, leave_author_name, leave_author_icon, leave_image, leave_footer
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(guild_id) DO UPDATE SET
      welcome_channel=excluded.welcome_channel, leave_channel=excluded.leave_channel,
      welcome_title=excluded.welcome_title, welcome_desc=excluded.welcome_desc, welcome_color=excluded.welcome_color,
      welcome_author_name=excluded.welcome_author_name, welcome_author_icon=excluded.welcome_author_icon,
      welcome_image=excluded.welcome_image, welcome_footer=excluded.welcome_footer, welcome_role_filter=excluded.welcome_role_filter,
      leave_title=excluded.leave_title, leave_desc=excluded.leave_desc, leave_color=excluded.leave_color,
      leave_author_name=excluded.leave_author_name, leave_author_icon=excluded.leave_author_icon,
      leave_image=excluded.leave_image, leave_footer=excluded.leave_footer`
    ).run(
      g, welcome_channel||null, leave_channel||null,
      welcome_title||'', welcome_desc||'', welcome_color||'#00FF00', welcome_author_name||'', welcome_author_icon||'', welcome_image||'', welcome_footer||'', welcome_role_filter||null,
      leave_title||'', leave_desc||'', leave_color||'#FF0000', leave_author_name||'', leave_author_icon||'', leave_image||'', leave_footer||''
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});"""

d2_code = d2_code.replace(old_wl_route, new_wl_route)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2_code)

print("src/dashboard2.js updated cleanly!")
