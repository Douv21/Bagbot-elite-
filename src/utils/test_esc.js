const Database = require('better-sqlite3');
const db = new Database('/home/maison/bagbot-elite/database.sqlite');
console.log("Member Locations:", db.prepare('SELECT * FROM member_locations').all());
