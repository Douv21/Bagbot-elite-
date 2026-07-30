const Database = require('better-sqlite3');
const db = new Database('/home/maison/bagbot-elite/database.sqlite');

console.log('=== PANELS 1360897918504271882 ===');
console.log(db.prepare("SELECT * FROM ticket_panels WHERE guild_id = '1360897918504271882'").all());

console.log('=== OPTIONS 1360897918504271882 ===');
console.log(db.prepare("SELECT * FROM ticket_options WHERE guild_id = '1360897918504271882'").all());

console.log('=== WELCOME LEAVE 1360897918504271882 ===');
console.log(db.prepare("SELECT * FROM welcome_leave WHERE guild_id = '1360897918504271882'").all());

console.log('=== WELCOME LEAVE ALL ===');
console.log(db.prepare("SELECT * FROM welcome_leave").all());
