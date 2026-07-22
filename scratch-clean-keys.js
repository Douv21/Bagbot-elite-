const { db } = require('./src/database/db');

// Désactiver les clés Groq 5, 6, 7, 8, 9 qui renvoient "Organization has been restricted" par Groq
const restrictedIds = [5, 6, 7, 8, 9];
const stmt = db.prepare('UPDATE ai_keys SET is_active = 0 WHERE id = ?');

for (const id of restrictedIds) {
  stmt.run(id);
  console.log(`Clé ID ${id} désactivée.`);
}

console.log('Nettoyage des clés terminé. Seules les clés valides (1, 2, 3, 4, 10) restent actives.');
