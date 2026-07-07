const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../database.sqlite'));

const getAutoroleEmbeds = (guildId) => {
  return db.prepare('SELECT * FROM autorole_embeds WHERE guild_id = ?').all(guildId);
};

const getAutoroleOptions = (messageId) => {
  return db.prepare('SELECT * FROM autorole_options WHERE message_id = ?').all(messageId);
};

const guildId = '1330994758775996566';
const embeds = getAutoroleEmbeds(guildId);
for (const embed of embeds) {
  embed.options = getAutoroleOptions(embed.message_id);
}
console.log('--- API Config mock output ---');
console.log(JSON.stringify(embeds, null, 2));
