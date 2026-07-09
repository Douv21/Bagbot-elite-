const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

// Connect to the new SQLite database
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log("Connected to SQLite DB at:", dbPath);

try {
  const content = fs.readFileSync('/var/data/config.json', 'utf8');
  const data = JSON.parse(content);

  if (!data.guilds) {
    console.log("No guilds found in config.json.");
    process.exit(0);
  }

  const guildIds = Object.keys(data.guilds);
  console.log(`Found ${guildIds.length} guild(s) in config.json.`);

  let economyCount = 0;
  let forumCount = 0;

  // Prepare insert statements
  const insertEconomy = db.prepare(`
    INSERT INTO economy (guild_id, user_id, wallet, bank, karma)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      wallet = excluded.wallet,
      bank = excluded.bank,
      karma = excluded.karma
  `);

  // Ensure table exists just in case
  db.prepare(`
    CREATE TABLE IF NOT EXISTS unlimited_forums (
      guild_id TEXT,
      channel_id TEXT,
      PRIMARY KEY (guild_id, channel_id)
    )
  `).run();

  const insertForum = db.prepare(`
    INSERT INTO unlimited_forums (guild_id, channel_id)
    VALUES (?, ?)
    ON CONFLICT(guild_id, channel_id) DO NOTHING
  `);

  // Run in a single transaction for safety and speed
  const migrationTx = db.transaction(() => {
    for (const guildId of guildIds) {
      const guild = data.guilds[guildId];

      // 1. Migrate Economy Balances
      if (guild.economy && guild.economy.balances) {
        const userIds = Object.keys(guild.economy.balances);
        for (const userId of userIds) {
          const bal = guild.economy.balances[userId];
          const wallet = bal.money || bal.amount || 0;
          const bank = bal.bank || 0;
          const karma = bal.karma || 0;

          insertEconomy.run(guildId, userId, wallet, bank, karma);
          economyCount++;
        }
      }

      // 2. Migrate Unlimited Forums
      if (guild.forum && guild.forum.unlimitedChannels) {
        for (const channelId of guild.forum.unlimitedChannels) {
          insertForum.run(guildId, channelId);
          forumCount++;
        }
      }
    }
  });

  migrationTx();

  console.log(`Migration complete!`);
  console.log(`- Imported/Updated ${economyCount} economy balances.`);
  console.log(`- Imported ${forumCount} unlimited forum channels.`);
} catch (err) {
  console.error("Migration failed:", err);
}
