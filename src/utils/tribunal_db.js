const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Création des tables si non existantes
db.prepare(`
  CREATE TABLE IF NOT EXISTS tribunal_config (
    guild_id TEXT PRIMARY KEY,
    category_id TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS tribunal_cases (
    guild_id TEXT,
    case_id TEXT,
    channel_id TEXT,
    panel_message_id TEXT,
    plaintiff_id TEXT,
    accused_id TEXT,
    plaintiff_lawyer_id TEXT,
    accused_lawyer_id TEXT,
    judge_id TEXT,
    charge TEXT,
    status TEXT,
    created_at INTEGER,
    closed_at INTEGER,
    PRIMARY KEY (guild_id, case_id)
  )
`).run();

function getTribunalConfig(guildId) {
  const row = db.prepare('SELECT * FROM tribunal_config WHERE guild_id = ?').get(guildId);
  return {
    categoryId: row ? row.category_id : ''
  };
}

function updateTribunalConfig(guildId, data) {
  const current = getTribunalConfig(guildId);
  const next = { ...current, ...data };
  db.prepare(`
    INSERT INTO tribunal_config (guild_id, category_id) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET category_id = excluded.category_id
  `).run(guildId, next.categoryId);
  return next;
}

function getTribunalCase(guildId, caseId) {
  const row = db.prepare('SELECT * FROM tribunal_cases WHERE guild_id = ? AND case_id = ?').get(guildId, caseId);
  if (!row) return null;
  return {
    id: row.case_id,
    createdAt: row.created_at,
    status: row.status,
    plaintiffId: row.plaintiff_id,
    accusedId: row.accused_id,
    plaintiffLawyerId: row.plaintiff_lawyer_id,
    accusedLawyerId: row.accused_lawyer_id,
    judgeId: row.judge_id,
    charge: row.charge,
    channelId: row.channel_id,
    panelMessageId: row.panel_message_id,
    closedAt: row.closed_at
  };
}

function upsertTribunalCase(guildId, caseId, data) {
  const current = getTribunalCase(guildId, caseId) || {
    id: caseId,
    createdAt: Date.now(),
    status: 'open',
    plaintiffId: '',
    accusedId: '',
    plaintiffLawyerId: '',
    accusedLawyerId: '',
    judgeId: '',
    charge: '',
    channelId: '',
    panelMessageId: '',
    closedAt: 0
  };
  const next = { ...current, ...data };
  db.prepare(`
    INSERT INTO tribunal_cases (
      guild_id, case_id, channel_id, panel_message_id, plaintiff_id, accused_id,
      plaintiff_lawyer_id, accused_lawyer_id, judge_id, charge, status, created_at, closed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, case_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      panel_message_id = excluded.panel_message_id,
      plaintiff_id = excluded.plaintiff_id,
      accused_id = excluded.accused_id,
      plaintiff_lawyer_id = excluded.plaintiff_lawyer_id,
      accused_lawyer_id = excluded.accused_lawyer_id,
      judge_id = excluded.judge_id,
      charge = excluded.charge,
      status = excluded.status,
      created_at = excluded.created_at,
      closed_at = excluded.closed_at
  `).run(
    guildId, caseId, next.channelId, next.panelMessageId, next.plaintiffId, next.accusedId,
    next.plaintiffLawyerId, next.accusedLawyerId, next.judgeId, next.charge, next.status, next.createdAt, next.closedAt
  );
  return next;
}

module.exports = {
  getTribunalConfig,
  updateTribunalConfig,
  getTribunalCase,
  upsertTribunalCase
};
