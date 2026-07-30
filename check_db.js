const Database = require('better-sqlite3');
const db = new Database('/home/maison/bagbot-elite/database.sqlite');

const verifPanel = db.prepare("SELECT * FROM ticket_panels WHERE guild_id = '1360897918504271882' AND allowed_options LIKE '%verif18%'").get();
if (!verifPanel) {
  console.log('Inserting missing panel for verif18...');
  db.prepare(`
    INSERT INTO ticket_panels (guild_id, channel_id, message_id, title, description, color, thumbnail, selector_type, image_url, allowed_options)
    VALUES ('1360897918504271882', NULL, NULL, '🔞 Vérification 18+', 'Cliquez sur le bouton ci-dessous pour effectuer votre vérification d’âge 18+ auprès du staff.', '#e74c3c', 1, 'buttons', NULL, '["verif18"]')
  `).run();
  console.log('Panel inserted successfully!');
} else {
  console.log('verif18 panel already exists:', verifPanel);
}

console.log('=== UPDATED TICKET PANELS ===', db.prepare("SELECT * FROM ticket_panels WHERE guild_id = '1360897918504271882'").all());
