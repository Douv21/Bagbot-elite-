const Database = require('better-sqlite3');
const path = require('path');

// Initialisation de la base de données SQLite
const db = new Database(path.join(__dirname, '../../database.sqlite'));
db.pragma('journal_mode = WAL');

// Initialiser les tables si elles n'existent pas
function initDatabase() {
  // 1. Économie & Karma
  db.prepare(`
    CREATE TABLE IF NOT EXISTS economy (
      guild_id TEXT,
      user_id TEXT,
      wallet INTEGER DEFAULT 0,
      bank INTEGER DEFAULT 0,
      karma INTEGER DEFAULT 0,
      last_work INTEGER DEFAULT 0,
      last_crime INTEGER DEFAULT 0,
      last_rob INTEGER DEFAULT 0,
      last_fish INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    )
  `).run();

  try {
    db.prepare('ALTER TABLE economy ADD COLUMN last_daily INTEGER DEFAULT 0').run();
  } catch (e) {}

  db.prepare(`
    CREATE TABLE IF NOT EXISTS karma_config (
      guild_id TEXT PRIMARY KEY,
      is_active INTEGER DEFAULT 1,
      announce_rewards INTEGER DEFAULT 1,
      threshold_1 INTEGER DEFAULT 20,
      xp_mult_1 REAL DEFAULT 1.2,
      discount_1 REAL DEFAULT 5,
      threshold_2 INTEGER DEFAULT 50,
      xp_mult_2 REAL DEFAULT 1.5,
      discount_2 REAL DEFAULT 10,
      threshold_3 INTEGER DEFAULT 100,
      xp_mult_3 REAL DEFAULT 2.0,
      discount_3 REAL DEFAULT 20
    )
  `).run();

  // 2. Système de Niveaux (Leveling)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS leveling (
      guild_id TEXT,
      user_id TEXT,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      last_xp_message INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    )
  `).run();

  // 3. Suivi du temps vocal (pour XP vocal)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS voice_xp (
      guild_id TEXT,
      user_id TEXT,
      join_time INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    )
  `).run();

  // 4. Récompenses de rôles par niveau
  db.prepare(`
    CREATE TABLE IF NOT EXISTS level_rewards (
      guild_id TEXT,
      level INTEGER,
      role_id TEXT,
      PRIMARY KEY (guild_id, level)
    )
  `).run();

  // 5. Salons de confession
  db.prepare(`
    CREATE TABLE IF NOT EXISTS confessions (
      guild_id TEXT,
      channel_id TEXT,
      confession_name TEXT,
      use_thread INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, channel_id)
    )
  `).run();

  try {
    db.prepare('ALTER TABLE confessions ADD COLUMN confession_name TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE confessions ADD COLUMN use_thread INTEGER DEFAULT 0').run();
  } catch (e) {}

  // 6. Configuration de Bienvenue & Départ
  db.prepare(`
    CREATE TABLE IF NOT EXISTS welcome_leave (
      guild_id TEXT PRIMARY KEY,
      welcome_channel TEXT,
      leave_channel TEXT,
      welcome_title TEXT,
      welcome_desc TEXT,
      welcome_color TEXT DEFAULT '#00FF00',
      welcome_thumbnail INTEGER DEFAULT 1,
      welcome_image TEXT,
      leave_title TEXT,
      leave_desc TEXT,
      leave_color TEXT DEFAULT '#FF0000',
      welcome_thumbnail INTEGER DEFAULT 1,
      welcome_image TEXT,
      welcome_author_name TEXT,
      welcome_author_icon TEXT,
      welcome_footer TEXT,
      welcome_role_filter TEXT,
      leave_title TEXT,
      leave_desc TEXT,
      leave_color TEXT DEFAULT '#FF0000',
      leave_thumbnail INTEGER DEFAULT 1,
      leave_image TEXT,
      leave_author_name TEXT,
      leave_author_icon TEXT,
      leave_footer TEXT
    )
  `).run();

  try {
    db.prepare('ALTER TABLE welcome_leave ADD COLUMN welcome_image TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE welcome_leave ADD COLUMN leave_image TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE welcome_leave ADD COLUMN welcome_author_name TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE welcome_leave ADD COLUMN welcome_author_icon TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE welcome_leave ADD COLUMN welcome_footer TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE welcome_leave ADD COLUMN welcome_role_filter TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE welcome_leave ADD COLUMN leave_author_name TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE welcome_leave ADD COLUMN leave_author_icon TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE welcome_leave ADD COLUMN leave_footer TEXT').run();
  } catch (e) {}

  // 7. Configuration de la Quarantaine
  db.prepare(`
    CREATE TABLE IF NOT EXISTS quarantine_config (
      guild_id TEXT PRIMARY KEY,
      role_id TEXT,
      channel_id TEXT
    )
  `).run();

  // 8. Utilisateurs en quarantaine (pour restituer les rôles après)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS quarantined_users (
      guild_id TEXT,
      user_id TEXT,
      old_roles TEXT, -- Stocké sous forme de JSON string
      PRIMARY KEY (guild_id, user_id)
    )
  `).run();

  // 9. Boutique (Shop)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS shop (
      guild_id TEXT,
      item_name TEXT,
      price INTEGER,
      description TEXT,
      role_id TEXT, -- Si l'achat donne un rôle
      PRIMARY KEY (guild_id, item_name)
    )
  `).run();

  // 10. Inventaire
  db.prepare(`
    CREATE TABLE IF NOT EXISTS inventory (
      guild_id TEXT,
      user_id TEXT,
      item_name TEXT,
      quantity INTEGER DEFAULT 1,
      PRIMARY KEY (guild_id, user_id, item_name)
    )
  `).run();

  // 11. Configuration des Logs d'activité
  db.prepare(`
    CREATE TABLE IF NOT EXISTS logs_config (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT,
      events TEXT DEFAULT 'all' -- Liste d'événements séparés par des virgules ou 'all'
    )
  `).run();

  // 12. Warnings (Avertissements de modération)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      user_id TEXT,
      reason TEXT,
      moderator_id TEXT,
      timestamp INTEGER
    )
  `).run();

  // 13. Configuration du jeu de devinette de mot/phrase
  db.prepare(`
    CREATE TABLE IF NOT EXISTS game_config (
      guild_id TEXT PRIMARY KEY,
      secret_phrase TEXT,
      reward_money INTEGER DEFAULT 0,
      reward_xp INTEGER DEFAULT 0,
      reward_role_id TEXT,
      is_active INTEGER DEFAULT 0
    )
  `).run();

  // 14. Lettres trouvées par l'utilisateur
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_letters (
      guild_id TEXT,
      user_id TEXT,
      unlocked_letters TEXT,
      PRIMARY KEY (guild_id, user_id)
    )
  `).run();

  // 15. Configuration du Leveling (min/max XP, canal et message d'annonce)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS leveling_config (
      guild_id TEXT PRIMARY KEY,
      xp_min INTEGER DEFAULT 15,
      xp_max INTEGER DEFAULT 25,
      karma_min INTEGER DEFAULT 1,
      karma_max INTEGER DEFAULT 3,
      money_min INTEGER DEFAULT 2,
      money_max INTEGER DEFAULT 5,
      nsfw_xp_reward INTEGER DEFAULT 0,
      nsfw_money_reward INTEGER DEFAULT 0,
      announce_channel TEXT DEFAULT 'current',
      announce_msg TEXT DEFAULT 'Bravo {user} ! Tu passes au niveau {level} !',
      xp_base INTEGER DEFAULT 120,
      xp_factor REAL DEFAULT 1.35
    )
  `).run();

  // Ajouter les colonnes de configuration de leveling / karma / nsfw si elles n'existent pas
  try {
    db.prepare('ALTER TABLE leveling_config ADD COLUMN karma_min INTEGER DEFAULT 1').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE leveling_config ADD COLUMN karma_max INTEGER DEFAULT 3').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE leveling_config ADD COLUMN money_min INTEGER DEFAULT 2').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE leveling_config ADD COLUMN money_max INTEGER DEFAULT 5').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE leveling_config ADD COLUMN nsfw_xp_reward INTEGER DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE leveling_config ADD COLUMN nsfw_money_reward INTEGER DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE leveling_config ADD COLUMN xp_base INTEGER DEFAULT 120').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE leveling_config ADD COLUMN xp_factor REAL DEFAULT 1.35').run();
  } catch (e) {}

  // Ajouter les colonnes de statistiques utilisateurs dans leveling si elles n'existent pas
  try {
    db.prepare('ALTER TABLE leveling ADD COLUMN nsfw_messages INTEGER DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE leveling ADD COLUMN total_messages INTEGER DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE leveling ADD COLUMN voice_minutes INTEGER DEFAULT 0').run();
  } catch (e) {}

  // 16. GIFs pour les commandes d'action
  db.prepare(`
    CREATE TABLE IF NOT EXISTS action_gifs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      action_name TEXT,
      gif_url TEXT
    )
  `).run();

  // 17. Automod Config
  db.prepare(`
    CREATE TABLE IF NOT EXISTS automod_config (
      guild_id TEXT PRIMARY KEY,
      anti_link INTEGER DEFAULT 0,
      anti_spam INTEGER DEFAULT 0,
      anti_massmention INTEGER DEFAULT 0,
      anti_badwords INTEGER DEFAULT 0,
      bypass_roles TEXT DEFAULT '',
      badwords_list TEXT DEFAULT '',
      spam_max_msgs INTEGER DEFAULT 5,
      massmention_limit INTEGER DEFAULT 5
    )
  `).run();

  // 18. Auto-rôles embeds
  db.prepare(`
    CREATE TABLE IF NOT EXISTS autorole_embeds (
      guild_id TEXT,
      message_id TEXT PRIMARY KEY,
      channel_id TEXT,
      title TEXT,
      description TEXT,
      color TEXT DEFAULT '#5865F2',
      thumbnail INTEGER DEFAULT 0,
      image_url TEXT
    )
  `).run();

  // 19. Auto-rôles options (boutons)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS autorole_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT,
      role_id TEXT,
      label TEXT,
      emoji TEXT,
      style TEXT DEFAULT 'PRIMARY'
    )
  `).run();

  // 20. Auto-rôles à l'arrivée
  db.prepare(`
    CREATE TABLE IF NOT EXISTS autoroles_on_join (
      guild_id TEXT,
      role_id TEXT,
      PRIMARY KEY (guild_id, role_id)
    )
  `).run();

  // 21. Auto-rôles sur obtention de rôle
  db.prepare(`
    CREATE TABLE IF NOT EXISTS autoroles_on_role (
      guild_id TEXT,
      trigger_role_id TEXT,
      target_role_id TEXT,
      PRIMARY KEY (guild_id, trigger_role_id, target_role_id)
    )
  `).run();

  // 22. Salons de comptage (counting)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS counting_channels (
      guild_id TEXT,
      channel_id TEXT PRIMARY KEY,
      mode TEXT DEFAULT 'normal',
      current_number REAL DEFAULT 0,
      last_user_id TEXT,
      high_score REAL DEFAULT 0,
      start_number REAL DEFAULT 0
    )
  `).run();

  // 23. Suites privées
  db.prepare(`
    CREATE TABLE IF NOT EXISTS private_suites (
      guild_id TEXT,
      user_id TEXT,
      text_channel_id TEXT,
      voice_channel_id TEXT,
      expires_at INTEGER,
      PRIMARY KEY (guild_id, user_id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS unlimited_forums (
      guild_id TEXT,
      channel_id TEXT,
      PRIMARY KEY (guild_id, channel_id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS action_verite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      type TEXT,
      category TEXT,
      content TEXT
    )
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS action_verite_config (
      guild_id TEXT PRIMARY KEY,
      sfw_channel_id TEXT,
      nsfw_channel_id TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ticket_panels (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT,
      message_id TEXT,
      title TEXT,
      description TEXT,
      color TEXT,
      thumbnail INTEGER DEFAULT 0,
      selector_type TEXT DEFAULT 'select',
      image_url TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ticket_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      label TEXT,
      value TEXT,
      emoji TEXT,
      button_style TEXT DEFAULT 'Primary',
      category_id TEXT,
      required_role_id TEXT,
      support_roles TEXT,
      ping_users TEXT,
      description TEXT,
      image_url TEXT
    )
  `).run();

  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN description TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_panels ADD COLUMN image_url TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN image_url TEXT").run();
  } catch (e) {}

  db.prepare(`
    CREATE TABLE IF NOT EXISTS active_tickets (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT,
      user_id TEXT,
      option_id INTEGER,
      status TEXT DEFAULT 'open',
      created_at INTEGER
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS action_rewards (
      guild_id TEXT,
      action_name TEXT,
      min_money INTEGER DEFAULT 5,
      max_money INTEGER DEFAULT 15,
      min_karma INTEGER DEFAULT 1,
      max_karma INTEGER DEFAULT 3,
      PRIMARY KEY (guild_id, action_name)
    )
  `).run();
  // Migrations pour les auto-rôles embeds (type et mode)
  try {
    db.prepare("ALTER TABLE autorole_embeds ADD COLUMN type TEXT DEFAULT 'buttons'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE autorole_embeds ADD COLUMN mode TEXT DEFAULT 'normal'").run();
  } catch (e) {}
  
  // Migration pour l'avatar personnalisé du bot par guilde
  try {
    db.prepare("ALTER TABLE welcome_leave ADD COLUMN custom_bot_avatar TEXT").run();
  } catch (e) {}

  // Migration pour la chance d'apparition des lettres du mot caché
  try {
    db.prepare("ALTER TABLE game_config ADD COLUMN appearance_chance REAL DEFAULT 15").run();
  } catch (e) {}

  // 19. Localisation des membres
  db.prepare(`
    CREATE TABLE IF NOT EXISTS member_locations (
      guild_id TEXT,
      user_id TEXT,
      raw_address TEXT,
      latitude REAL,
      longitude REAL,
      city TEXT,
      country TEXT,
      PRIMARY KEY (guild_id, user_id)
    )
  `).run();

  // 20. Configuration des permissions (rôles admin et modo)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS permissions_config (
      guild_id TEXT PRIMARY KEY,
      admin_role_id TEXT,
      modo_role_id TEXT
    )
  `).run();

  // 21. Conversations pour lovecalc évolutif
  db.prepare(`
    CREATE TABLE IF NOT EXISTS member_chats (
      guild_id TEXT,
      user1_id TEXT,
      user2_id TEXT,
      message_count INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user1_id, user2_id)
    )
  `).run();

  // 22. Messages personnalisés pour chaque action
  db.prepare(`
    CREATE TABLE IF NOT EXISTS custom_action_messages (
      guild_id TEXT,
      action_name TEXT,
      self_message TEXT,
      target_message TEXT,
      PRIMARY KEY (guild_id, action_name)
    )
  `).run();

  // 23. Genre et pronoms des utilisateurs pour les actions personnalisées
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_genders (
      user_id TEXT PRIMARY KEY,
      gender TEXT,
      pronoun TEXT
    )
  `).run();

  // 24. Thèmes de cartes personnalisés par rôle
  db.prepare(`
    CREATE TABLE IF NOT EXISTS role_themes (
      guild_id TEXT,
      role_id TEXT,
      theme_name TEXT,
      PRIMARY KEY (guild_id, role_id)
    )
  `).run();
}

// --- Fonctions utilitaires de base de données ---

// Économie
const getEconomy = (guildId, userId) => {
  const row = db.prepare('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO economy (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
    return { guild_id: guildId, user_id: userId, wallet: 0, bank: 0, karma: 0, last_work: 0, last_crime: 0, last_rob: 0, last_fish: 0, last_daily: 0 };
  }
  return row;
};

const updateEconomy = (guildId, userId, data) => {
  getEconomy(guildId, userId); // Assure la création
  const keys = Object.keys(data);
  const assignments = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => data[k]);
  db.prepare(`UPDATE economy SET ${assignments} WHERE guild_id = ? AND user_id = ?`).run(...values, guildId, userId);
};

// Leveling
const getLeveling = (guildId, userId) => {
  const row = db.prepare('SELECT * FROM leveling WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO leveling (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
    return { guild_id: guildId, user_id: userId, xp: 0, level: 0, last_xp_message: 0, nsfw_messages: 0, total_messages: 0, voice_minutes: 0 };
  }
  return row;
};

const updateLeveling = (guildId, userId, data) => {
  getLeveling(guildId, userId); // Assure la création
  const keys = Object.keys(data);
  const assignments = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => data[k]);
  db.prepare(`UPDATE leveling SET ${assignments} WHERE guild_id = ? AND user_id = ?`).run(...values, guildId, userId);
};

// Leveling Config
const getLevelingConfig = (guildId) => {
  const row = db.prepare('SELECT * FROM leveling_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO leveling_config (guild_id) VALUES (?)').run(guildId);
    return { guild_id: guildId, xp_min: 15, xp_max: 25, karma_min: 1, karma_max: 3, money_min: 2, money_max: 5, nsfw_xp_reward: 0, nsfw_money_reward: 0, announce_channel: 'current', announce_msg: 'Bravo {user} ! Tu passes au niveau {level} !', xp_base: 120, xp_factor: 1.35 };
  }
  return row;
};

const updateLevelingConfig = (guildId, data) => {
  getLevelingConfig(guildId); // Assure la création
  const keys = Object.keys(data);
  const assignments = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => data[k]);
  db.prepare(`UPDATE leveling_config SET ${assignments} WHERE guild_id = ?`).run(...values, guildId);
};

// Action GIFs
const getActionGifs = (guildId, actionName) => {
  return db.prepare('SELECT * FROM action_gifs WHERE guild_id = ? AND action_name = ?').all(guildId, actionName);
};

const getAllActionGifs = (guildId) => {
  return db.prepare('SELECT * FROM action_gifs WHERE guild_id = ?').all(guildId);
};

const addActionGif = (guildId, actionName, gifUrl) => {
  return db.prepare('INSERT INTO action_gifs (guild_id, action_name, gif_url) VALUES (?, ?, ?)').run(guildId, actionName, gifUrl);
};

const deleteActionGif = (guildId, id) => {
  return db.prepare('DELETE FROM action_gifs WHERE guild_id = ? AND id = ?').run(guildId, id);
};

const getConfessions = (guildId) => {
  return db.prepare('SELECT * FROM confessions WHERE guild_id = ?').all(guildId);
};

const addConfession = (guildId, channelId, confessionName, useThread) => {
  return db.prepare(`
    INSERT OR REPLACE INTO confessions (guild_id, channel_id, confession_name, use_thread)
    VALUES (?, ?, ?, ?)
  `).run(guildId, channelId, confessionName || 'Confession', useThread ? 1 : 0);
};

const deleteConfession = (guildId, channelId) => {
  return db.prepare('DELETE FROM confessions WHERE guild_id = ? AND channel_id = ?').run(guildId, channelId);
};

// Automod
const getAutomodConfig = (guildId) => {
  const row = db.prepare('SELECT * FROM automod_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare(`
      INSERT OR IGNORE INTO automod_config (guild_id, anti_link, anti_spam, anti_massmention, anti_badwords, bypass_roles, badwords_list, spam_max_msgs, massmention_limit)
      VALUES (?, 0, 0, 0, 0, '', '', 5, 5)
    `).run(guildId);
    return { guild_id: guildId, anti_link: 0, anti_spam: 0, anti_massmention: 0, anti_badwords: 0, bypass_roles: '', badwords_list: '', spam_max_msgs: 5, massmention_limit: 5 };
  }
  return row;
};

const updateAutomodConfig = (guildId, data) => {
  getAutomodConfig(guildId); // Assure la création
  const keys = Object.keys(data);
  const assignments = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => data[k]);
  db.prepare(`UPDATE automod_config SET ${assignments} WHERE guild_id = ?`).run(...values, guildId);
};

// Auto-Rôles Embeds & Options
const getAutoroleEmbeds = (guildId) => {
  return db.prepare('SELECT * FROM autorole_embeds WHERE guild_id = ?').all(guildId);
};

const getAutoroleOptions = (messageId) => {
  return db.prepare('SELECT * FROM autorole_options WHERE message_id = ?').all(messageId);
};

const addAutoroleEmbed = (guildId, messageId, channelId, title, description, color, thumbnail, imageUrl, type = 'buttons', mode = 'normal') => {
  return db.prepare(`
    INSERT INTO autorole_embeds (guild_id, message_id, channel_id, title, description, color, thumbnail, image_url, type, mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, messageId, channelId, title, description, color, thumbnail, imageUrl, type, mode);
};

const addAutoroleOption = (messageId, roleId, label, emoji, style) => {
  return db.prepare(`
    INSERT INTO autorole_options (message_id, role_id, label, emoji, style)
    VALUES (?, ?, ?, ?, ?)
  `).run(messageId, roleId, label, emoji, style);
};

const deleteAutoroleEmbed = (guildId, messageId) => {
  db.prepare('DELETE FROM autorole_options WHERE message_id = ?').run(messageId);
  return db.prepare('DELETE FROM autorole_embeds WHERE guild_id = ? AND message_id = ?').run(guildId, messageId);
};

// Auto-Rôles à l'arrivée
const getAutorolesOnJoin = (guildId) => {
  return db.prepare('SELECT * FROM autoroles_on_join WHERE guild_id = ?').all(guildId);
};

const addAutoroleOnJoin = (guildId, roleId) => {
  return db.prepare('INSERT OR IGNORE INTO autoroles_on_join (guild_id, role_id) VALUES (?, ?)').run(guildId, roleId);
};

const deleteAutoroleOnJoin = (guildId, roleId) => {
  return db.prepare('DELETE FROM autoroles_on_join WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
};

// Auto-Rôles sur obtention
const getAutorolesOnRole = (guildId) => {
  return db.prepare('SELECT * FROM autoroles_on_role WHERE guild_id = ?').all(guildId);
};

const addAutoroleOnRole = (guildId, triggerRoleId, targetRoleId) => {
  return db.prepare('INSERT OR IGNORE INTO autoroles_on_role (guild_id, trigger_role_id, target_role_id) VALUES (?, ?, ?)').run(guildId, triggerRoleId, targetRoleId);
};

const deleteAutoroleOnRole = (guildId, triggerRoleId, targetRoleId) => {
  return db.prepare('DELETE FROM autoroles_on_role WHERE guild_id = ? AND trigger_role_id = ? AND target_role_id = ?').run(guildId, triggerRoleId, targetRoleId);
};

// Counting Channels
const getCountingChannels = (guildId) => {
  return db.prepare('SELECT * FROM counting_channels WHERE guild_id = ?').all(guildId);
};

const getCountingChannel = (channelId) => {
  return db.prepare('SELECT * FROM counting_channels WHERE channel_id = ?').get(channelId);
};

const addCountingChannel = (guildId, channelId, mode, startNumber) => {
  return db.prepare(`
    INSERT OR REPLACE INTO counting_channels (guild_id, channel_id, mode, current_number, high_score, start_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, channelId, mode, startNumber, 0, startNumber);
};

const updateCountingChannel = (channelId, data) => {
  const keys = Object.keys(data);
  const assignments = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => data[k]);
  return db.prepare(`UPDATE counting_channels SET ${assignments} WHERE channel_id = ?`).run(...values, channelId);
};

const deleteCountingChannel = (guildId, channelId) => {
  return db.prepare('DELETE FROM counting_channels WHERE guild_id = ? AND channel_id = ?').run(guildId, channelId);
};

// Private Suites
const getPrivateSuite = (guildId, userId) => {
  return db.prepare('SELECT * FROM private_suites WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
};

const getPrivateSuiteByChannel = (channelId) => {
  return db.prepare('SELECT * FROM private_suites WHERE text_channel_id = ? OR voice_channel_id = ?').get(channelId, channelId);
};

const getAllPrivateSuites = () => {
  return db.prepare('SELECT * FROM private_suites').all();
};

const addPrivateSuite = (guildId, userId, textChannelId, voiceChannelId, expiresAt) => {
  return db.prepare(`
    INSERT OR REPLACE INTO private_suites (guild_id, user_id, text_channel_id, voice_channel_id, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, userId, textChannelId, voiceChannelId, expiresAt);
};

const deletePrivateSuite = (guildId, userId) => {
  return db.prepare('DELETE FROM private_suites WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
};

const updatePrivateSuiteExpiry = (guildId, userId, expiresAt) => {
  return db.prepare('UPDATE private_suites SET expires_at = ? WHERE guild_id = ? AND user_id = ?').run(expiresAt, guildId, userId);
};

const getKarmaConfig = (guildId) => {
  let config = db.prepare('SELECT * FROM karma_config WHERE guild_id = ?').get(guildId);
  if (!config) {
    db.prepare('INSERT OR IGNORE INTO karma_config (guild_id) VALUES (?)').run(guildId);
    config = db.prepare('SELECT * FROM karma_config WHERE guild_id = ?').get(guildId);
  }
  return config;
};

const updateKarmaConfig = (guildId, updates) => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  return db.prepare(`UPDATE karma_config SET ${fields} WHERE guild_id = ?`).run(...values, guildId);
};

const getUnlimitedForums = (guildId) => {
  return db.prepare('SELECT channel_id FROM unlimited_forums WHERE guild_id = ?').all(guildId).map(r => r.channel_id);
};

const updateUnlimitedForums = (guildId, channelIds) => {
  db.prepare('DELETE FROM unlimited_forums WHERE guild_id = ?').run(guildId);
  const insert = db.prepare('INSERT INTO unlimited_forums (guild_id, channel_id) VALUES (?, ?)');
  for (const chId of channelIds) {
    insert.run(guildId, chId);
  }
};

const DEFAULT_AV = [
  { type: 'verite', category: 'sfw', content: "Quel est ton plus grand rêve dans la vie ?" },
  { type: 'verite', category: 'sfw', content: "Quelle est la chose la plus ridicule que tu aies faite par amour ?" },
  { type: 'verite', category: 'sfw', content: "Si tu pouvais changer une chose chez toi, ce serait quoi ?" },
  { type: 'verite', category: 'sfw', content: "Quel est ton pire souvenir d'école ?" },
  { type: 'verite', category: 'sfw', content: "Quelle est ta plus grande phobie ?" },
  
  { type: 'action', category: 'sfw', content: "Fais 10 pompes d'affilée !" },
  { type: 'action', category: 'sfw', content: "Chante le refrain de ta chanson préférée à haute voix !" },
  { type: 'action', category: 'sfw', content: "Envoie un emoji rigolo au dernier ami avec qui tu as discuté !" },
  { type: 'action', category: 'sfw', content: "Raconte ta blague la plus nulle en faisant rire tout le monde." },
  { type: 'action', category: 'sfw', content: "Fais une imitation d'un animal pendant 30 secondes." },

  { type: 'verite', category: 'nsfw', content: "Quel est ton fantasme le plus inavouable ?" },
  { type: 'verite', category: 'nsfw', content: "Quel est l'endroit le plus insolite où tu aies fait l'amour ?" },
  { type: 'verite', category: 'nsfw', content: "Quelle est ta position préférée ?" },
  { type: 'verite', category: 'nsfw', content: "As-tu déjà eu un coup d'un soir ? Si oui, raconte." },
  { type: 'verite', category: 'nsfw', content: "Quelle est la chose la plus cochonne que tu aies faite ?" },

  { type: 'action', category: 'nsfw', content: "Décris de manière très sensuelle ton partenaire idéal." },
  { type: 'action', category: 'nsfw', content: "Envoie un message coquin à la personne de ton choix sur le serveur." },
  { type: 'action', category: 'nsfw', content: "Décris ta lingerie/sous-vêtement actuel avec des mots très évocateurs." },
  { type: 'action', category: 'nsfw', content: "Mime une scène coquine uniquement en utilisant des emojis." },
  { type: 'action', category: 'nsfw', content: "Fais une confession intime en direct dans ce salon." }
];

const getActionVeriteItems = (guildId) => {
  return db.prepare('SELECT * FROM action_verite WHERE guild_id = ?').all(guildId);
};

const addActionVeriteItem = (guildId, type, category, content) => {
  return db.prepare('INSERT INTO action_verite (guild_id, type, category, content) VALUES (?, ?, ?, ?)').run(guildId, type, category, content);
};

const deleteActionVeriteItem = (guildId, id) => {
  return db.prepare('DELETE FROM action_verite WHERE guild_id = ? AND id = ?').run(guildId, id);
};

const getRandomActionVeriteItem = (guildId, type, category) => {
  const items = db.prepare('SELECT * FROM action_verite WHERE guild_id = ? AND type = ? AND category = ?').all(guildId, type, category);
  if (items.length > 0) {
    return items[Math.floor(Math.random() * items.length)].content;
  }
  const filtered = DEFAULT_AV.filter(i => i.type === type && i.category === category);
  return filtered[Math.floor(Math.random() * filtered.length)].content;
};

const getActionVeriteConfig = (guildId) => {
  let config = db.prepare('SELECT * FROM action_verite_config WHERE guild_id = ?').get(guildId);
  if (!config) {
    db.prepare('INSERT OR IGNORE INTO action_verite_config (guild_id) VALUES (?)').run(guildId);
    config = db.prepare('SELECT * FROM action_verite_config WHERE guild_id = ?').get(guildId);
  }
  return config;
};

const updateActionVeriteConfig = (guildId, updates) => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  return db.prepare(`UPDATE action_verite_config SET ${fields} WHERE guild_id = ?`).run(...values, guildId);
};

const getTicketPanel = (guildId) => {
  let panel = db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ?').get(guildId);
  if (!panel) {
    db.prepare('INSERT OR IGNORE INTO ticket_panels (guild_id, title, description, color, selector_type) VALUES (?, ?, ?, ?, ?)')
      .run(guildId, '🎫 Support / Tickets', 'Sélectionnez ou cliquez sur le bouton correspondant pour ouvrir un ticket d\'assistance.', '#5865F2', 'select');
    panel = db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ?').get(guildId);
  }
  return panel;
};

const updateTicketPanel = (guildId, updates) => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  return db.prepare(`UPDATE ticket_panels SET ${fields} WHERE guild_id = ?`).run(...values, guildId);
};

const getTicketOptions = (guildId) => {
  return db.prepare('SELECT * FROM ticket_options WHERE guild_id = ?').all(guildId);
};

const addTicketOption = (guildId, option) => {
  const { label, value, emoji, button_style, category_id, required_role_id, support_roles, ping_users, description, image_url } = option;
  return db.prepare(`
    INSERT INTO ticket_options (guild_id, label, value, emoji, button_style, category_id, required_role_id, support_roles, ping_users, description, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, label, value, emoji, button_style || 'Primary', category_id || null, required_role_id || null, JSON.stringify(support_roles || []), JSON.stringify(ping_users || []), description || null, image_url || null);
};

const deleteTicketOption = (guildId, id) => {
  return db.prepare('DELETE FROM ticket_options WHERE guild_id = ? AND id = ?').run(guildId, id);
};

const updateTicketOption = (guildId, id, option) => {
  const { label, value, emoji, button_style, category_id, required_role_id, support_roles, ping_users, description, image_url } = option;
  return db.prepare(`
    UPDATE ticket_options SET
      label = ?,
      value = ?,
      emoji = ?,
      button_style = ?,
      category_id = ?,
      required_role_id = ?,
      support_roles = ?,
      ping_users = ?,
      description = ?,
      image_url = ?
    WHERE guild_id = ? AND id = ?
  `).run(
    label,
    value,
    emoji || null,
    button_style || 'Primary',
    category_id || null,
    required_role_id || null,
    JSON.stringify(support_roles || []),
    JSON.stringify(ping_users || []),
    description || null,
    image_url || null,
    guildId,
    id
  );
};

const getActionReward = (guildId, actionName) => {
  let reward = db.prepare('SELECT * FROM action_rewards WHERE guild_id = ? AND action_name = ?').get(guildId, actionName);
  if (!reward) {
    let defMinMoney = 5, defMaxMoney = 15;
    let defMinKarma = 1, defMaxKarma = 3;
    
    if (actionName === 'daily') {
      defMinMoney = 500; defMaxMoney = 1000;
      defMinKarma = 0; defMaxKarma = 0;
    } else if (actionName === 'travailler') {
      defMinMoney = 100; defMaxMoney = 300;
      defMinKarma = 1; defMaxKarma = 1;
    } else if (actionName === 'pecher') {
      defMinMoney = 25; defMaxMoney = 400;
      defMinKarma = 1; defMaxKarma = 1;
    }

    reward = {
      guild_id: guildId,
      action_name: actionName,
      min_money: defMinMoney,
      max_money: defMaxMoney,
      min_karma: defMinKarma,
      max_karma: defMaxKarma
    };
  }
  return reward;
};

const updateActionReward = (guildId, actionName, rewards) => {
  const { min_money, max_money, min_karma, max_karma } = rewards;
  return db.prepare(`
    INSERT OR REPLACE INTO action_rewards (guild_id, action_name, min_money, max_money, min_karma, max_karma)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, actionName, min_money, max_money, min_karma, max_karma);
};

const getActiveTicket = (channelId) => {
  return db.prepare('SELECT * FROM active_tickets WHERE channel_id = ?').get(channelId);
};

const addActiveTicket = (channelId, guildId, userId, optionId) => {
  return db.prepare('INSERT OR REPLACE INTO active_tickets (channel_id, guild_id, user_id, option_id, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(channelId, guildId, userId, optionId, Date.now());
};

const deleteActiveTicket = (channelId) => {
  return db.prepare('DELETE FROM active_tickets WHERE channel_id = ?').run(channelId);
};

const getPermissionsConfig = (guildId) => {
  let row = db.prepare('SELECT * FROM permissions_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO permissions_config (guild_id) VALUES (?)').run(guildId);
    row = { guild_id: guildId, admin_role_id: null, modo_role_id: null };
  }
  return row;
};

const updatePermissionsConfig = (guildId, adminRoleId, modoRoleId) => {
  return db.prepare('UPDATE permissions_config SET admin_role_id = ?, modo_role_id = ? WHERE guild_id = ?').run(adminRoleId, modoRoleId, guildId);
};

const incrementMemberChat = (guildId, user1Id, user2Id) => {
  const [u1, u2] = [user1Id, user2Id].sort();
  db.prepare(`
    INSERT INTO member_chats (guild_id, user1_id, user2_id, message_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT (guild_id, user1_id, user2_id)
    DO UPDATE SET message_count = message_count + 1
  `).run(guildId, u1, u2);
};

const getMemberChatCount = (guildId, user1Id, user2Id) => {
  const [u1, u2] = [user1Id, user2Id].sort();
  const row = db.prepare('SELECT message_count FROM member_chats WHERE guild_id = ? AND user1_id = ? AND user2_id = ?').get(guildId, u1, u2);
  return row ? row.message_count : 0;
};

const getCustomActionMessage = (guildId, actionName) => {
  return db.prepare('SELECT * FROM custom_action_messages WHERE guild_id = ? AND action_name = ?').get(guildId, actionName);
};

const updateCustomActionMessage = (guildId, actionName, selfMessage, targetMessage) => {
  db.prepare(`
    INSERT INTO custom_action_messages (guild_id, action_name, self_message, target_message)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (guild_id, action_name)
    DO UPDATE SET self_message = EXCLUDED.self_message, target_message = EXCLUDED.target_message
  `).run(guildId, actionName, selfMessage || null, targetMessage || null);
};

const getUserGender = (userId) => {
  return db.prepare('SELECT * FROM user_genders WHERE user_id = ?').get(userId);
};

const setUserGender = (userId, gender, pronoun) => {
  db.prepare(`
    INSERT INTO user_genders (user_id, gender, pronoun)
    VALUES (?, ?, ?)
    ON CONFLICT (user_id)
    DO UPDATE SET gender = EXCLUDED.gender, pronoun = EXCLUDED.pronoun
  `).run(userId, gender, pronoun);
};

const getRoleThemes = (guildId) => {
  return db.prepare('SELECT * FROM role_themes WHERE guild_id = ?').all(guildId);
};

const addRoleTheme = (guildId, roleId, themeName) => {
  db.prepare(`
    INSERT INTO role_themes (guild_id, role_id, theme_name)
    VALUES (?, ?, ?)
    ON CONFLICT (guild_id, role_id)
    DO UPDATE SET theme_name = EXCLUDED.theme_name
  `).run(guildId, roleId, themeName);
};

const deleteRoleTheme = (guildId, roleId) => {
  db.prepare('DELETE FROM role_themes WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
};

module.exports = {
  db,
  initDatabase,
  getPermissionsConfig,
  updatePermissionsConfig,
  getEconomy,
  updateEconomy,
  getLeveling,
  updateLeveling,
  getLevelingConfig,
  updateLevelingConfig,
  getActionGifs,
  getAllActionGifs,
  addActionGif,
  deleteActionGif,
  getConfessions,
  addConfession,
  deleteConfession,
  getAutomodConfig,
  updateAutomodConfig,
  getAutoroleEmbeds,
  getAutoroleOptions,
  addAutoroleEmbed,
  addAutoroleOption,
  deleteAutoroleEmbed,
  getAutorolesOnJoin,
  addAutoroleOnJoin,
  deleteAutoroleOnJoin,
  getAutorolesOnRole,
  addAutoroleOnRole,
  deleteAutoroleOnRole,
  getCountingChannels,
  getCountingChannel,
  addCountingChannel,
  updateCountingChannel,
  deleteCountingChannel,
  getPrivateSuite,
  getPrivateSuiteByChannel,
  getAllPrivateSuites,
  addPrivateSuite,
  deletePrivateSuite,
  updatePrivateSuiteExpiry,
  getKarmaConfig,
  updateKarmaConfig,
  getUnlimitedForums,
  updateUnlimitedForums,
  getActionVeriteItems,
  addActionVeriteItem,
  deleteActionVeriteItem,
  getRandomActionVeriteItem,
  getActionVeriteConfig,
  updateActionVeriteConfig,
  getTicketPanel,
  updateTicketPanel,
  getTicketOptions,
  addTicketOption,
  updateTicketOption,
  deleteTicketOption,
  getActionReward,
  updateActionReward,
  getActiveTicket,
  addActiveTicket,
  deleteActiveTicket,
  incrementMemberChat,
  getMemberChatCount,
  getCustomActionMessage,
  updateCustomActionMessage,
  getUserGender,
  setUserGender,
  getRoleThemes,
  addRoleTheme,
  deleteRoleTheme
};
