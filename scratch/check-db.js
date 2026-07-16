const { db } = require('../src/database/db');
console.log('Ticket panels:', db.prepare('SELECT * FROM ticket_panels').all());
console.log('Ticket options:', db.prepare('SELECT * FROM ticket_options').all());
