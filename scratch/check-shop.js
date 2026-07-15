const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../database.sqlite'));

console.log("SHOP ITEMS:");
console.log(db.prepare("SELECT * FROM shop").all());
