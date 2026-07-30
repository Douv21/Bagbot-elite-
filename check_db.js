const Database = require('better-sqlite3');
const db1 = new Database('/home/maison/bagbot-elite/database.sqlite');
console.log('=== WELCOME LEAVE DETAILS ===');
console.log(db1.prepare('SELECT * FROM welcome_leave').all());

console.log('=== TICKET PANELS DETAILS ===');
console.log(db1.prepare('SELECT * FROM ticket_panels').all());

console.log('=== AUTOROLE EMBEDS DETAILS ===');
console.log(db1.prepare('SELECT * FROM autorole_embeds').all());
