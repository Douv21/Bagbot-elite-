const Database = require('better-sqlite3');
const db = new Database('/home/maison/bagbot-elite/database.sqlite');

// Check user_sessions (the actual session store table)
const cols = db.prepare("PRAGMA table_info(user_sessions)").all();
console.log('user_sessions COLUMNS:', cols.map(c => c.name).join(', '));

const rows = db.prepare('SELECT * FROM user_sessions ORDER BY rowid DESC LIMIT 5').all();
console.log('user_sessions COUNT:', rows.length);
rows.forEach(function(r) {
  try {
    // Try all possible column names for session data
    const raw = r.data || r.sess || r.session_data || r.value || '';
    if (raw) {
      const p = JSON.parse(raw);
      console.log('  USER:', p.user ? p.user.username : 'NO_USER',
        '| GUILDS:', (p.user && p.user.guilds) ? p.user.guilds.length : 0,
        '| selectedGuild:', p.selectedGuild || 'none');
    } else {
      console.log('  RAW KEYS:', Object.keys(r).join(','), '| SAMPLE:', JSON.stringify(r).substring(0, 200));
    }
  } catch(e) {
    console.log('  PARSE_ERR:', e.message, Object.keys(r).join(','));
  }
});

// Also check if sessions table exists (alternative name)
const sessionsTbl = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%sess%'").all();
console.log('Session-like tables:', sessionsTbl.map(t => t.name).join(', ') || 'NONE');

