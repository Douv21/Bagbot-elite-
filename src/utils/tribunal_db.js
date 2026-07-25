const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Création des tables si non existantes
db.prepare(`
  CREATE TABLE IF NOT EXISTS tribunal_config (
    guild_id TEXT PRIMARY KEY,
    category_id TEXT,
    judge_role_id TEXT,
    lawyer_role_id TEXT,
    accused_role_id TEXT,
    channel_prefix TEXT DEFAULT '⚖️┆procès-'
  )
`).run();

try { db.prepare("ALTER TABLE tribunal_config ADD COLUMN judge_role_id TEXT").run(); } catch (_) {}
try { db.prepare("ALTER TABLE tribunal_config ADD COLUMN lawyer_role_id TEXT").run(); } catch (_) {}
try { db.prepare("ALTER TABLE tribunal_config ADD COLUMN accused_role_id TEXT").run(); } catch (_) {}
try { db.prepare("ALTER TABLE tribunal_config ADD COLUMN plaintiff_role_id TEXT").run(); } catch (_) {}
try { db.prepare("ALTER TABLE tribunal_config ADD COLUMN channel_prefix TEXT DEFAULT '⚖️┆procès-'").run(); } catch (_) {}
try { db.prepare("ALTER TABLE tribunal_config ADD COLUMN access_roles TEXT DEFAULT '[]'").run(); } catch (_) {}
try { db.prepare("ALTER TABLE tribunal_config ADD COLUMN auto_delete_minutes INTEGER DEFAULT 5").run(); } catch (_) {}

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

try { db.prepare("ALTER TABLE tribunal_cases ADD COLUMN delete_at INTEGER DEFAULT 0").run(); } catch (_) {}

function getTribunalConfig(guildId) {
  const row = db.prepare('SELECT * FROM tribunal_config WHERE guild_id = ?').get(guildId);
  let accessRoles = [];
  try { accessRoles = JSON.parse(row ? (row.access_roles || '[]') : '[]'); } catch (e) {}
  return {
    categoryId: row ? (row.category_id || '') : '',
    judgeRoleId: row ? (row.judge_role_id || '') : '',
    lawyerRoleId: row ? (row.lawyer_role_id || '') : '',
    accusedRoleId: row ? (row.accused_role_id || '') : '',
    plaintiffRoleId: row ? (row.plaintiff_role_id || '') : '',
    channelPrefix: row ? (row.channel_prefix || '⚖️┆procès-') : '⚖️┆procès-',
    accessRoles: Array.isArray(accessRoles) ? accessRoles : [],
    autoDeleteMinutes: row ? (row.auto_delete_minutes ?? 5) : 5
  };
}

function updateTribunalConfig(guildId, data) {
  const current = getTribunalConfig(guildId);
  const next = { ...current, ...data };
  const accessRolesStr = typeof next.accessRoles === 'string' ? next.accessRoles : JSON.stringify(next.accessRoles || []);
  db.prepare(`
    INSERT INTO tribunal_config (guild_id, category_id, judge_role_id, lawyer_role_id, accused_role_id, plaintiff_role_id, channel_prefix, access_roles, auto_delete_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      category_id = excluded.category_id,
      judge_role_id = excluded.judge_role_id,
      lawyer_role_id = excluded.lawyer_role_id,
      accused_role_id = excluded.accused_role_id,
      plaintiff_role_id = excluded.plaintiff_role_id,
      channel_prefix = excluded.channel_prefix,
      access_roles = excluded.access_roles,
      auto_delete_minutes = excluded.auto_delete_minutes
  `).run(guildId, next.categoryId, next.judgeRoleId, next.lawyerRoleId, next.accusedRoleId, next.plaintiffRoleId, next.channelPrefix, accessRolesStr, next.autoDeleteMinutes);
  return next;
}

function getTribunalCase(guildId, caseId) {
  const row = db.prepare('SELECT * FROM tribunal_cases WHERE guild_id = ? AND case_id = ?').get(guildId, caseId);
  if (!row) return null;
  return {
    id: row.case_id,
    guildId: row.guild_id,
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
    closedAt: row.closed_at,
    deleteAt: row.delete_at || 0
  };
}

function getAllTribunalCases(guildId) {
  const rows = guildId 
    ? db.prepare('SELECT * FROM tribunal_cases WHERE guild_id = ?').all(guildId)
    : db.prepare('SELECT * FROM tribunal_cases').all();
  return rows.map(row => ({
    id: row.case_id,
    guildId: row.guild_id,
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
    closedAt: row.closed_at,
    deleteAt: row.delete_at || 0
  }));
}

function upsertTribunalCase(guildId, caseId, data) {
  const current = getTribunalCase(guildId, caseId) || {
    id: caseId,
    guildId,
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
    closedAt: 0,
    deleteAt: 0
  };
  const next = { ...current, ...data };
  db.prepare(`
    INSERT INTO tribunal_cases (
      guild_id, case_id, channel_id, panel_message_id, plaintiff_id, accused_id,
      plaintiff_lawyer_id, accused_lawyer_id, judge_id, charge, status, created_at, closed_at, delete_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      closed_at = excluded.closed_at,
      delete_at = excluded.delete_at
  `).run(
    guildId, caseId, next.channelId, next.panelMessageId, next.plaintiffId, next.accusedId,
    next.plaintiffLawyerId, next.accusedLawyerId, next.judgeId, next.charge, next.status, next.createdAt, next.closedAt, next.deleteAt
  );
  return next;
}

module.exports = {
  getTribunalConfig,
  updateTribunalConfig,
  getTribunalCase,
  getAllTribunalCases,
  upsertTribunalCase
};
