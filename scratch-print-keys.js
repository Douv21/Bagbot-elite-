const { db } = require('./src/database/db');
console.log(db.prepare('SELECT id, provider, category, label, is_active FROM ai_keys').all());
