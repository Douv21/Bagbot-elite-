const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new Database(dbPath);

console.log("Existing settings:", db.prepare("SELECT * FROM leveling_config").all());

db.prepare("UPDATE leveling_config SET xp_base = 500, xp_factor = 1.10").run();

console.log("Updated settings:", db.prepare("SELECT * FROM leveling_config").all());
