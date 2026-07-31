const Database = require('better-sqlite3');
const db = new Database('/home/maison/bagbot-elite/database.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('TABLES:', tables.map(t => t.name).join(', '));

if (tables.find(t => t.name === 'sessions')) {
  const rows = db.prepare('SELECT sess FROM sessions ORDER BY rowid DESC LIMIT 5').all();
  console.log('SESSION COUNT:', rows.length);
  rows.forEach(function(r) {
    try {
      const p = JSON.parse(r.sess);
      console.log('  USER:', p.user ? p.user.username : 'NO_USER', '| GUILDS:', (p.user && p.user.guilds) ? p.user.guilds.length : 0, '| selectedGuild:', p.selectedGuild || 'none');
    } catch(e) {
      console.log('  PARSE_ERR:', e.message);
    }
  });
} else {
  console.log('NO sessions TABLE');
}
