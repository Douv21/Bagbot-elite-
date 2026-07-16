const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Chemins sur le serveur Debian
const dbPath = '/home/maison/bagbot-elite/database.sqlite';
const configPath = '/home/maison/bagbot/data.before-migrate/config.json';

if (!fs.existsSync(dbPath)) {
  console.error("Base de données introuvable à", dbPath);
  process.exit(1);
}
if (!fs.existsSync(configPath)) {
  console.error("Fichier config.json introuvable à", configPath);
  process.exit(1);
}

const db = new Database(dbPath);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log("Début de l'importation...");

const stmt = db.prepare('INSERT INTO action_verite (guild_id, type, category, content) VALUES (?, ?, ?, ?)');

// Vider l'ancienne table action_verite pour repartir sur de bonnes bases
db.prepare('DELETE FROM action_verite').run();

let count = 0;

for (const guildId of Object.keys(config.guilds)) {
  const gd = config.guilds[guildId];
  if (!gd.truthdare) continue;

  // SFW Prompts
  if (gd.truthdare.sfw && gd.truthdare.sfw.prompts) {
    for (const prompt of gd.truthdare.sfw.prompts) {
      if (prompt.text && prompt.type) {
        stmt.run(guildId, prompt.type, 'sfw', prompt.text);
        count++;
      }
    }
  }

  // NSFW Prompts
  if (gd.truthdare.nsfw && gd.truthdare.nsfw.prompts) {
    for (const prompt of gd.truthdare.nsfw.prompts) {
      if (prompt.text && prompt.type) {
        stmt.run(guildId, prompt.type, 'nsfw', prompt.text);
        count++;
      }
    }
  }
}

console.log(`Importation réussie de ${count} éléments Action / Vérité !`);
db.close();
