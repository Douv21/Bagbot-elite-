with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    code = f.read()

dup_snippet = """  try {
    const { welcome_channel, welcome_title, welcome_desc, welcome_color, leave_channel, leave_title, leave_desc, leave_color } = req.body || {};
    db.prepare('INSERT INTO welcome_leave (guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc, welcome_color, leave_title, leave_desc, leave_color) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel=excluded.welcome_channel, leave_channel=excluded.leave_channel, welcome_title=excluded.welcome_title, welcome_desc=excluded.welcome_desc, welcome_color=excluded.welcome_color, leave_title=excluded.leave_title, leave_desc=excluded.leave_desc, leave_color=excluded.leave_color').run(g, welcome_channel||null, leave_channel||null, welcome_title||'', welcome_desc||'', welcome_color||'#00FF00', leave_title||'', leave_desc||'', leave_color||'#FF0000');
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});"""

code = code.replace(dup_snippet, "")

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Duplicate snippet in dashboard2.js removed!")
