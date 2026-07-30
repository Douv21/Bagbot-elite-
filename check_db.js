const Database = require('better-sqlite3');
const db1 = new Database('/home/maison/bagbot-elite/database.sqlite');
console.log('=== database.sqlite ===');
try { console.log('welcome_leave:', db1.prepare('SELECT * FROM welcome_leave').all()); } catch(e){ console.log(e.message); }
try { console.log('ticket_panels:', db1.prepare('SELECT * FROM ticket_panels').all()); } catch(e){ console.log(e.message); }
try { console.log('ticket_options:', db1.prepare('SELECT * FROM ticket_options').all()); } catch(e){ console.log(e.message); }
try { console.log('autorole_embeds:', db1.prepare('SELECT * FROM autorole_embeds').all()); } catch(e){ console.log(e.message); }

try {
  const db2 = new Database('/home/maison/bagbot-elite/src/database/data.db');
  console.log('=== data.db ===');
  console.log('tables:', db2.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
  try { console.log('welcome_leave data.db:', db2.prepare('SELECT * FROM welcome_leave').all()); } catch(e){}
  try { console.log('ticket_panels data.db:', db2.prepare('SELECT * FROM ticket_panels').all()); } catch(e){}
} catch(e) {
  console.log('data.db error:', e.message);
}
