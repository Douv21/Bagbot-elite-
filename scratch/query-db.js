const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../src/database/data.db'));

console.log('--- Tables in database ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

console.log('--- Content of autorole_embeds ---');
const embeds = db.prepare("SELECT * FROM autorole_embeds").all();
console.log(embeds);

console.log('--- Content of autorole_options ---');
const options = db.prepare("SELECT * FROM autorole_options").all();
console.log(options);
