const Database = require('better-sqlite3');
const db = new Database('/home/maison/bagbot-elite/database.sqlite');

// Remove extra panel 6 if present
db.prepare("DELETE FROM ticket_panels WHERE id = 6 OR title LIKE '%Vérification 18+%'").run();

// Set Panel 2 allowed_options to null (All categories in 1 single panel)
db.prepare("UPDATE ticket_panels SET allowed_options = NULL WHERE guild_id = '1360897918504271882'").run();

console.log('=== TICKET PANELS 1360897918504271882 ===');
console.log(db.prepare("SELECT * FROM ticket_panels WHERE guild_id = '1360897918504271882'").all());

console.log('=== TICKET OPTIONS 1360897918504271882 ===');
console.log(db.prepare("SELECT * FROM ticket_options WHERE guild_id = '1360897918504271882'").all());
