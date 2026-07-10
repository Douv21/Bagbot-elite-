const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

// 1. Connect to the SQLite database
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log("Connected to SQLite DB at:", dbPath);

try {
  db.prepare("ALTER TABLE ticket_options ADD COLUMN description TEXT").run();
  console.log("Added description column to ticket_options.");
} catch (e) {}

try {
  // 2. Read the Freebox config file
  const configPath = path.join(__dirname, 'freebox-config.json');
  const content = fs.readFileSync(configPath, 'utf8');
  const data = JSON.parse(content);

  if (!data.guilds) {
    console.error("No guilds found in freebox-config.json.");
    process.exit(1);
  }

  const guildIds = Object.keys(data.guilds);
  console.log(`Found ${guildIds.length} guild(s) in freebox-config.json.`);

  // Initialize DB transaction
  const migrationTx = db.transaction(() => {
    for (const guildId of guildIds) {
      console.log(`\n--- Migrating Guild: ${guildId} ---`);
      const g = data.guilds[guildId];

      // A. ECONOMY BALANCES
      if (g.economy && g.economy.balances) {
        const insertEconomy = db.prepare(`
          INSERT INTO economy (guild_id, user_id, wallet, bank, karma)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(guild_id, user_id) DO UPDATE SET
            wallet = excluded.wallet,
            bank = excluded.bank,
            karma = excluded.karma
        `);

        let ecoCount = 0;
        const userIds = Object.keys(g.economy.balances);
        for (const userId of userIds) {
          const bal = g.economy.balances[userId];
          const wallet = bal.money || bal.amount || 0;
          const bank = bal.bank || 0;
          const karma = bal.karma || 0;
          insertEconomy.run(guildId, userId, wallet, bank, karma);
          ecoCount++;
        }
        console.log(`✅ Migrated ${ecoCount} economy balances.`);
      }

      // B. LEVELING CONFIG
      if (g.levels) {
        const insertLevelConfig = db.prepare(`
          INSERT INTO leveling_config (guild_id, xp_min, xp_max, announce_channel, announce_msg)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(guild_id) DO UPDATE SET
            xp_min = excluded.xp_min,
            xp_max = excluded.xp_max,
            announce_channel = excluded.announce_channel,
            announce_msg = excluded.announce_msg
        `);

        const xpMin = g.levels.xpMessageMin ?? 15;
        const xpMax = g.levels.xpMessageMax ?? 25;
        const announceChannel = g.levels.announce?.levelUp?.channelId ?? 'current';
        const announceMsg = g.levels.announce?.levelUp?.template || 'Bravo {user} ! Tu passes au niveau {level} !';

        insertLevelConfig.run(guildId, xpMin, xpMax, announceChannel, announceMsg);
        console.log(`✅ Migrated leveling curve & announce config.`);

        // C. LEVEL REWARDS
        if (g.levels.rewards) {
          const insertReward = db.prepare(`
            INSERT INTO level_rewards (guild_id, level, role_id)
            VALUES (?, ?, ?)
            ON CONFLICT(guild_id, level) DO UPDATE SET
              role_id = excluded.role_id
          `);

          let rewardCount = 0;
          for (const lvl of Object.keys(g.levels.rewards)) {
            const roleId = g.levels.rewards[lvl];
            insertReward.run(guildId, parseInt(lvl, 10), roleId);
            rewardCount++;
          }
          console.log(`✅ Migrated ${rewardCount} level rewards.`);
        }

        // D. USER LEVELS (LEVELING TABLE)
        if (g.levels.users) {
          const insertUserLevel = db.prepare(`
            INSERT INTO leveling (guild_id, user_id, xp, level, total_messages)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, user_id) DO UPDATE SET
              xp = excluded.xp,
              level = excluded.level,
              total_messages = excluded.total_messages
          `);

          let userLevelCount = 0;
          for (const userId of Object.keys(g.levels.users)) {
            const rec = g.levels.users[userId];
            const xp = rec.xp ?? 0;
            const level = rec.level ?? 0;
            const totalMessages = rec.messages ?? 0;
            insertUserLevel.run(guildId, userId, xp, level, totalMessages);
            userLevelCount++;
          }
          console.log(`✅ Migrated ${userLevelCount} user leveling records.`);
        }
      }

      // E. WELCOME / GOODBYE (WELCOME_LEAVE TABLE)
      if (g.welcome || g.goodbye) {
        const welcomeChannel = g.welcome?.channelId || null;
        const welcomeDesc = g.welcome?.message || null;
        const welcomeTitle = g.welcome?.title || 'Bienvenue !';
        
        const leaveChannel = g.goodbye?.channelId || null;
        const leaveDesc = g.goodbye?.message || null;
        const leaveTitle = g.goodbye?.title || 'Au revoir !';

        db.prepare(`
          INSERT INTO welcome_leave (guild_id, welcome_channel, welcome_title, welcome_desc, leave_channel, leave_title, leave_desc)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(guild_id) DO UPDATE SET
            welcome_channel = excluded.welcome_channel,
            welcome_title = excluded.welcome_title,
            welcome_desc = excluded.welcome_desc,
            leave_channel = excluded.leave_channel,
            leave_title = excluded.leave_title,
            leave_desc = excluded.leave_desc
        `).run(guildId, welcomeChannel, welcomeTitle, welcomeDesc, leaveChannel, leaveTitle, leaveDesc);
        console.log(`✅ Migrated Welcome/Goodbye configurations.`);
      }

      // F. COUNTING CHANNELS
      if (g.counting && g.counting.channels && g.counting.channels.length > 0) {
        const channelId = g.counting.channels[0];
        const currentNumber = g.counting.state?.current ?? 0;
        const lastUserId = g.counting.state?.lastUserId || null;
        const highScore = g.counting.achievedNumbers ? Math.max(...g.counting.achievedNumbers, 0) : 0;

        db.prepare(`
          INSERT INTO counting_channels (guild_id, channel_id, mode, current_number, last_user_id, high_score, start_number)
          VALUES (?, ?, 'normal', ?, ?, ?, 0)
          ON CONFLICT(channel_id) DO UPDATE SET
            current_number = excluded.current_number,
            last_user_id = excluded.last_user_id,
            high_score = excluded.high_score
        `).run(guildId, channelId, currentNumber, lastUserId, highScore);
        console.log(`✅ Migrated Counting channel configuration & high score.`);
      }

      // G. TICKET PANELS
      if (g.tickets) {
        db.prepare(`
          INSERT INTO ticket_panels (guild_id, title, description, color, selector_type)
          VALUES (?, ?, ?, '#5865F2', 'select')
          ON CONFLICT(guild_id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description
        `).run(guildId, g.tickets.panelTitle || '🎫 Ouvrir un ticket', g.tickets.panelText || '');
        console.log(`✅ Migrated Ticket Panel text and title.`);

        // H. TICKET OPTIONS
        if (g.tickets.categories && g.tickets.categories.length > 0) {
          // Clean existing ticket options to avoid duplicate imports on rerun
          db.prepare('DELETE FROM ticket_options WHERE guild_id = ?').run(guildId);

          const insertTicketOption = db.prepare(`
            INSERT INTO ticket_options (guild_id, label, value, emoji, button_style, category_id, required_role_id, support_roles, ping_users, description)
            VALUES (?, ?, ?, ?, 'Primary', null, ?, ?, ?, ?)
          `);

          let optionCount = 0;
          for (const cat of g.tickets.categories) {
            const requiredRoleId = cat.excludeRoleIds && cat.excludeRoleIds.length > 0 ? null : (cat.accessRoleIds ? cat.accessRoleIds[0] : null);
            const supportRoles = cat.staffAccessRoleIds || [];
            const pingUsers = []; // empty by default in old setup or mapped differently
            const description = cat.description || null;

            insertTicketOption.run(
              guildId,
              cat.label,
              cat.key,
              cat.emoji || '🎫',
              requiredRoleId,
              JSON.stringify(supportRoles),
              JSON.stringify(pingUsers),
              description
            );
            optionCount++;
          }
          console.log(`✅ Migrated ${optionCount} Ticket Options categories.`);
        }
      }
    }
  });

  migrationTx();
  console.log("\n⭐️ ALL DATA MIGRATED SUCCESSFULLY FROM FREEBOX VM DATABASE! ⭐️");

} catch (err) {
  console.error("Migration failed:", err);
}
