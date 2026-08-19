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
      require_validation INTEGER DEFAULT 0,
      validation_channel_id TEXT,
      ping_role_id TEXT,
      PRIMARY KEY (guild_id, channel_id)
    )
  `).run();

  try {
    db.prepare('ALTER TABLE confessions ADD COLUMN confession_name TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE confessions ADD COLUMN use_thread INTEGER DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE confessions ADD COLUMN require_validation INTEGER DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE confessions ADD COLUMN validation_channel_id TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE confessions ADD COLUMN ping_role_id TEXT').run();
  } catch (e) {}

  // 5b. Table des confessions en attente de validation staff
  db.prepare(`
    CREATE TABLE IF NOT EXISTS pending_confessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      target_channel_id TEXT,
      user_id TEXT,
      user_tag TEXT,
      confession_text TEXT,
      confession_name TEXT,
      use_thread INTEGER DEFAULT 0,
      validation_channel_id TEXT,
      validation_message_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER
    )
  `).run();

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

  db.prepare(`
    CREATE TABLE IF NOT EXISTS boost_config (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT,
      title TEXT DEFAULT '🚀 Nouveau Boost de Serveur !',
      message TEXT DEFAULT '🎉 Un grand MERCI à {user.mention} d''avoir boosté **{server}** ! Grâce à toi, le serveur gagne en puissance ! 💖',
      color TEXT DEFAULT '#F47FFF',
      reward_money INTEGER DEFAULT 5000,
      reward_karma INTEGER DEFAULT 50,
      image_url TEXT,
      enabled INTEGER DEFAULT 1
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

  // 9b. Rôles Temporaires
  db.prepare(`
    CREATE TABLE IF NOT EXISTS temporary_roles (
      guild_id TEXT,
      user_id TEXT,
      role_id TEXT,
      expires_at INTEGER,
      PRIMARY KEY (guild_id, user_id, role_id)
    )
  `).run();

  // Migrations pour ajouter les colonnes supplémentaires à la table shop
  try {
    db.prepare('ALTER TABLE shop ADD COLUMN role_duration_ms INTEGER DEFAULT 0').run();
  } catch (_) {}
  try {
    db.prepare('ALTER TABLE shop ADD COLUMN reward_xp INTEGER DEFAULT 0').run();
  } catch (_) {}
  try {
    db.prepare('ALTER TABLE shop ADD COLUMN reward_karma INTEGER DEFAULT 0').run();
  } catch (_) {}

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
      start_number REAL DEFAULT 0,
      emoji_success TEXT DEFAULT '✅',
      emoji_error TEXT DEFAULT '❌',
      emoji_highscore TEXT DEFAULT '🏆',
      emoji_chance TEXT DEFAULT '🍀'
    )
  `).run();

  try { db.prepare("ALTER TABLE counting_channels ADD COLUMN emoji_success TEXT DEFAULT '✅'").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE counting_channels ADD COLUMN emoji_error TEXT DEFAULT '❌'").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE counting_channels ADD COLUMN emoji_highscore TEXT DEFAULT '🏆'").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE counting_channels ADD COLUMN emoji_chance TEXT DEFAULT '🍀'").run(); } catch (e) {}

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
    CREATE TABLE IF NOT EXISTS shop_config (
      guild_id TEXT PRIMARY KEY,
      private_suite_category_id TEXT,
      suite_channel_prefix TEXT DEFAULT '👑┆suite-'
    )
  `).run();

  try {
    db.prepare("ALTER TABLE shop_config ADD COLUMN suite_channel_prefix TEXT DEFAULT '👑┆suite-'").run();
  } catch (e) {}

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

  // 45. Commandes Personnalisées
  db.prepare(`
    CREATE TABLE IF NOT EXISTS custom_commands (
      guild_id TEXT,
      command_name TEXT,
      description TEXT,
      actions_json TEXT,
      PRIMARY KEY (guild_id, command_name)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS custom_command_settings (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT DEFAULT '/',
      delete_trigger INTEGER DEFAULT 0
    )
  `).run();

  // 46. Réactions de Mots (Word Reactions)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS word_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      trigger_word TEXT,
      emojis_json TEXT,
      allowed_roles_json TEXT DEFAULT '[]',
      forbidden_roles_json TEXT DEFAULT '[]',
      allowed_channels_json TEXT DEFAULT '[]',
      forbidden_channels_json TEXT DEFAULT '[]'
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS word_reaction_settings (
      guild_id TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 1
    )
  `).run();

  // 47. Logo / Profil du Bot par Serveur
  db.prepare(`
    CREATE TABLE IF NOT EXISTS server_bot_profile (
      guild_id TEXT PRIMARY KEY,
      custom_logo_url TEXT,
      custom_name TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ticket_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      channel_id TEXT,
      message_id TEXT,
      title TEXT,
      description TEXT,
      color TEXT,
      thumbnail INTEGER DEFAULT 1,
      selector_type TEXT DEFAULT 'select',
      image_url TEXT,
      allowed_options TEXT -- Liste stockée en JSON des options autorisées
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
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN member_roles_add TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN member_roles_remove TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN certify_roles_add TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN certify_roles_remove TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN show_member_button INTEGER DEFAULT 1").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN show_certify_button INTEGER DEFAULT 1").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN require_age_verification INTEGER DEFAULT 0").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN min_age_required INTEGER DEFAULT 18").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN age_verified_role_id TEXT DEFAULT NULL").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE ticket_options ADD COLUMN age_verification_log_channel TEXT DEFAULT NULL").run();
  } catch (e) {}

  db.prepare(`
    CREATE TABLE IF NOT EXISTS age_verifications (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      min_age INTEGER DEFAULT 18,
      status TEXT DEFAULT 'pending',
      verification_method TEXT,
      estimated_age INTEGER,
      created_at INTEGER,
      verified_at INTEGER
    )
  `).run();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(ticket_panels)").all();
    const isPrimaryKeyGuildId = tableInfo.some(col => col.name === 'guild_id' && col.pk === 1);
    if (isPrimaryKeyGuildId) {
      db.prepare('CREATE TABLE IF NOT EXISTS ticket_panels_backup (guild_id TEXT, channel_id TEXT, message_id TEXT, title TEXT, description TEXT, color TEXT, thumbnail INTEGER, selector_type TEXT, image_url TEXT)').run();
      db.prepare('INSERT OR IGNORE INTO ticket_panels_backup SELECT guild_id, channel_id, message_id, title, description, color, thumbnail, selector_type, image_url FROM ticket_panels').run();
      db.prepare('DROP TABLE IF EXISTS ticket_panels').run();
      db.prepare(`
        CREATE TABLE IF NOT EXISTS ticket_panels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT,
          channel_id TEXT,
          message_id TEXT,
          title TEXT,
          description TEXT,
          color TEXT,
          thumbnail INTEGER DEFAULT 1,
          selector_type TEXT DEFAULT 'select',
          image_url TEXT,
          allowed_options TEXT
        )
      `).run();
      const oldPanels = db.prepare('SELECT * FROM ticket_panels_backup').all();
      const insert = db.prepare('INSERT INTO ticket_panels (guild_id, channel_id, message_id, title, description, color, thumbnail, selector_type, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const p of oldPanels) {
        insert.run(p.guild_id, p.channel_id, p.message_id, p.title, p.description, p.color, p.thumbnail || 1, p.selector_type || 'select', p.image_url);
      }
      db.prepare('DROP TABLE IF EXISTS ticket_panels_backup').run();
    }
  } catch (e) {
    console.error('Error during ticket_panels migration:', e);
  }

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

  db.prepare(`
    CREATE TABLE IF NOT EXISTS role_boosters (
      guild_id TEXT,
      role_id TEXT,
      xp_multiplier REAL DEFAULT 1.0,
      karma_multiplier REAL DEFAULT 1.0,
      money_multiplier REAL DEFAULT 1.0,
      PRIMARY KEY (guild_id, role_id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS invite_config (
      guild_id TEXT PRIMARY KEY,
      log_channel_id TEXT,
      enabled INTEGER DEFAULT 1
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS invite_tracking (
      guild_id TEXT,
      user_id TEXT,
      inviter_id TEXT,
      invite_code TEXT,
      joined_at INTEGER,
      PRIMARY KEY (guild_id, user_id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_invite_counts (
      guild_id TEXT,
      inviter_id TEXT,
      regular INTEGER DEFAULT 0,
      fake INTEGER DEFAULT 0,
      left INTEGER DEFAULT 0,
      bonus INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, inviter_id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS command_permissions (
      guild_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      allowed_roles TEXT DEFAULT '[]',
      allowed_users TEXT DEFAULT '[]',
      denied_roles TEXT DEFAULT '[]',
      PRIMARY KEY (guild_id, command_name)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      quest_type TEXT DEFAULT 'messages',
      target_count INTEGER DEFAULT 1,
      channel_ids TEXT DEFAULT '[]',
      reward_xp INTEGER DEFAULT 0,
      reward_money INTEGER DEFAULT 0,
      reward_karma INTEGER DEFAULT 0,
      reward_role_id TEXT DEFAULT NULL,
      is_daily INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_quests (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      quest_id INTEGER NOT NULL,
      current_count INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      completed_at INTEGER DEFAULT NULL,
      PRIMARY KEY (guild_id, user_id, quest_id)
    )
  `).run();

  // 35. Conservation des Rôles d'Âge au départ/retour des membres
  db.prepare(`
    CREATE TABLE IF NOT EXISTS saved_user_age_roles (
      guild_id TEXT,
      user_id TEXT,
      role_id TEXT,
      PRIMARY KEY (guild_id, user_id)
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

  // Migration pour la chance d'apparition des lettres du mot caché et l'émoji personnalisé
  try {
    db.prepare("ALTER TABLE game_config ADD COLUMN appearance_chance REAL DEFAULT 15").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE game_config ADD COLUMN letter_emoji TEXT DEFAULT '🔍'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE game_config ADD COLUMN announce_channel TEXT DEFAULT 'dm'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE game_config ADD COLUMN ephemeral_letters INTEGER DEFAULT 1").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE game_config ADD COLUMN reward_chance INTEGER DEFAULT 0").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE game_config ADD COLUMN allowed_channels TEXT DEFAULT '[]'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE quests ADD COLUMN reward_chance INTEGER DEFAULT 0").run();
  } catch (e) {}

  // Recréer role_themes pour supporter plusieurs thèmes par rôle (clé composite)
  try {
    // Vérifier si la table a une contrainte unique sur role_id en créant une sauvegarde temporaire
    db.prepare('CREATE TABLE IF NOT EXISTS role_themes_temp (guild_id TEXT, role_id TEXT, theme_name TEXT)').run();
    db.prepare('INSERT INTO role_themes_temp SELECT guild_id, role_id, theme_name FROM role_themes').run();
    db.prepare('DROP TABLE IF EXISTS role_themes').run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS role_themes (
        guild_id TEXT,
        role_id TEXT,
        theme_name TEXT,
        PRIMARY KEY (guild_id, role_id, theme_name)
      )
    `).run();
    db.prepare('INSERT OR IGNORE INTO role_themes SELECT guild_id, role_id, theme_name FROM role_themes_temp').run();
    db.prepare('DROP TABLE IF EXISTS role_themes_temp').run();
  } catch (e) {
    console.error('Erreur migration role_themes:', e);
  }

  // 25. Bump Config et reminders
  db.prepare(`
    CREATE TABLE IF NOT EXISTS bump_config (
      guild_id TEXT PRIMARY KEY,
      reminder_channel TEXT,
      reminder_role TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS bump_reminders (
      guild_id TEXT,
      bot_name TEXT,
      next_bump_at INTEGER,
      channel_id TEXT,
      PRIMARY KEY (guild_id, bot_name)
    )
  `).run();

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

  // 20. Configuration des permissions (rôles admin, modo et dérogations)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS permissions_config (
      guild_id TEXT PRIMARY KEY,
      admin_role_id TEXT,
      modo_role_id TEXT,
      dashboard_roles TEXT DEFAULT '',
      admin_cmds_roles TEXT DEFAULT '',
      modo_cmds_roles TEXT DEFAULT ''
    )
  `).run();

  try {
    db.prepare("ALTER TABLE permissions_config ADD COLUMN dashboard_roles TEXT DEFAULT ''").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE permissions_config ADD COLUMN admin_cmds_roles TEXT DEFAULT ''").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE permissions_config ADD COLUMN modo_cmds_roles TEXT DEFAULT ''").run();
  } catch (e) {}

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
      PRIMARY KEY (guild_id, role_id, theme_name)
    )
  `).run();

  // 26. Auto-Thread Channels
  db.prepare(`
    CREATE TABLE IF NOT EXISTS autothread_channels (
      guild_id TEXT,
      channel_id TEXT,
      image_only INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, channel_id)
    )
  `).run();

  // 27. Statistiques des sessions de comptage (Leaderboard par session)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS counting_stats (
      channel_id TEXT,
      user_id TEXT,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (channel_id, user_id)
    )
  `).run();

  // 28. Clés d'API Multi-Fournisseurs IA (Groq, Gemini)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT, -- 'groq' ou 'gemini'
      category TEXT DEFAULT 'all', -- 'all', 'text', 'vision', 'server'
      api_key TEXT,
      label TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER
    )
  `).run();

  // 29. Configuration globale IA par guilde
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_config (
      guild_id TEXT PRIMARY KEY,
      preferred_provider TEXT DEFAULT 'auto',
      groq_text_model TEXT DEFAULT 'llama-3.3-70b-versatile',
      groq_vision_model TEXT DEFAULT 'llama-3.2-11b-vision-preview',
      groq_server_model TEXT DEFAULT 'llama-3.3-70b-versatile',
      gemini_model TEXT DEFAULT 'gemini-2.0-flash'
    )
  `).run();

  // 30. Système Star de la Semaine
  db.prepare(`
    CREATE TABLE IF NOT EXISTS star_config (
      guild_id TEXT PRIMARY KEY,
      is_active INTEGER DEFAULT 1,
      announce_channel_id TEXT DEFAULT '',
      star_role_id TEXT DEFAULT '',
      reward_coins INTEGER DEFAULT 1000,
      reward_karma INTEGER DEFAULT 50,
      points_normal INTEGER DEFAULT 1,
      points_nsfw INTEGER DEFAULT 2,
      points_selfie INTEGER DEFAULT 3,
      points_nude INTEGER DEFAULT 5,
      selfie_channels TEXT DEFAULT '',
      nude_channels TEXT DEFAULT '',
      election_day INTEGER DEFAULT 0,
      election_hour INTEGER DEFAULT 23,
      announce_title TEXT DEFAULT '⭐ Star de la Semaine !',
      announce_desc TEXT DEFAULT 'Félicitations à {user} qui devient la **Star de la Semaine** avec **{points} points** ! 🌟\n\nIl/Elle remporte le rôle {role} et brille sur le serveur !',
      announce_color TEXT DEFAULT '#F1C40F',
      announce_image TEXT DEFAULT '',
      last_election_time INTEGER DEFAULT 0,
      current_star_user_id TEXT DEFAULT ''
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS star_weekly_points (
      guild_id TEXT,
      user_id TEXT,
      points INTEGER DEFAULT 0,
      normal_count INTEGER DEFAULT 0,
      nsfw_count INTEGER DEFAULT 0,
      selfie_count INTEGER DEFAULT 0,
      nude_count INTEGER DEFAULT 0,
      week_identifier TEXT,
      PRIMARY KEY (guild_id, user_id, week_identifier)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS star_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      user_id TEXT,
      points INTEGER,
      week_identifier TEXT,
      elected_at INTEGER
    )
  `).run();

  // 36. Sondages et Fiches d'Évaluation Multi-Critères
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sondages (
      id TEXT PRIMARY KEY,
      guild_id TEXT,
      channel_id TEXT,
      results_channel_id TEXT,
      title TEXT,
      description TEXT,
      rating_icon TEXT DEFAULT '⭐',
      text_type TEXT DEFAULT 'long',
      color TEXT DEFAULT '#F1C40F',
      created_by TEXT,
      created_at INTEGER,
      sections TEXT DEFAULT '[]',
      has_general_remark INTEGER DEFAULT 1
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sondage_responses (
      sondage_id TEXT,
      user_id TEXT,
      rating INTEGER,
      comment TEXT,
      created_at INTEGER,
      responses_json TEXT DEFAULT '{}',
      PRIMARY KEY (sondage_id, user_id)
    )
  `).run();

  try { db.prepare("ALTER TABLE sondages ADD COLUMN sections TEXT DEFAULT '[]'").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE sondages ADD COLUMN has_general_remark INTEGER DEFAULT 1").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE sondages ADD COLUMN avatar_image TEXT DEFAULT ''").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE sondages ADD COLUMN banner_image TEXT DEFAULT ''").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE sondages ADD COLUMN short_description TEXT DEFAULT ''").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE sondages ADD COLUMN mentions TEXT DEFAULT '[]'").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE sondages ADD COLUMN google_form_url TEXT DEFAULT ''").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE sondage_responses ADD COLUMN responses_json TEXT DEFAULT '{}'").run(); } catch (e) {}
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

// Pour les DMs : récupère les GIFs de toutes les guildes (mélangés aléatoirement)
const getActionGifsAnyGuild = (actionName) => {
  const gifs = db.prepare('SELECT * FROM action_gifs WHERE action_name = ?').all(actionName);
  // Mélanger pour ne pas toujours montrer les gifs de la même guilde
  for (let i = gifs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gifs[i], gifs[j]] = [gifs[j], gifs[i]];
  }
  return gifs;
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
    INSERT OR REPLACE INTO autorole_embeds (guild_id, message_id, channel_id, title, description, color, thumbnail, image_url, type, mode)
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

const addCountingChannel = (guildId, channelId, mode, startNumber, emojiSuccess = '✅', emojiError = '❌', emojiHighscore = '🏆', emojiChance = '🍀') => {
  const existing = db.prepare('SELECT current_number, high_score FROM counting_channels WHERE channel_id = ?').get(channelId);
  const currentNum = existing ? existing.current_number : startNumber;
  const highScore = existing ? existing.high_score : 0;

  return db.prepare(`
    INSERT INTO counting_channels (guild_id, channel_id, mode, current_number, high_score, start_number, emoji_success, emoji_error, emoji_highscore, emoji_chance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(channel_id) DO UPDATE SET
      mode = excluded.mode,
      start_number = excluded.start_number,
      emoji_success = excluded.emoji_success,
      emoji_error = excluded.emoji_error,
      emoji_highscore = excluded.emoji_highscore,
      emoji_chance = excluded.emoji_chance
  `).run(guildId, channelId, mode, currentNum, highScore, startNumber, emojiSuccess, emojiError, emojiHighscore, emojiChance);
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

const ensureDefaultShopItems = (guildId) => {
  const defaultThematicItems = [
    { item_name: 'Suite Privée 1 Jour', price: 500, description: 'Votre suite privée personnelle et intimiste pendant 24h.' },
    { item_name: 'Suite Privée 7 Jours', price: 2000, description: 'Votre suite privée personnelle et intimiste pendant toute une semaine.' },
    { item_name: 'Suite Privée 1 Mois', price: 7000, description: 'Votre suite privée personnelle et intimiste pendant un mois entier.' },
    { item_name: '🍀 Chance de Comptage', price: 300, description: 'Sauve une erreur dans le salon de comptage si vous décidez de l\'utiliser !' },
    // Sensualité & Séduction
    { item_name: '💋 Parfum d\'Ambre & d\'Érotisme', price: 150, description: 'Un effluve enivrant d\'ambre et de musc qui captive les sens.', reward_xp: 30, reward_karma: 10 },
    { item_name: '🍷 Coupe de Champagne & Fraises', price: 100, description: 'Deux coupes pétillantes servies avec des fraises juteuses pour une soirée en tête-à-tête.', reward_xp: 50, reward_karma: 5 },
    { item_name: '💄 Baiser Rouge Passionnel', price: 200, description: 'L\'empreinte indélébile d\'un baiser voluptueux sur la peau...', reward_xp: 80, reward_karma: 15 },
    { item_name: '🌹 Pluie de Pétales de Rose', price: 250, description: 'Un tapis de pétales parfumés pour éveiller le désir et le romantisme.', reward_xp: 100, reward_karma: 20 },
    // BDSM & Passion Intenses
    { item_name: '⛓️ Menottes en Velours Noir', price: 350, description: 'Menottes molletonnées pour soumettre ou se laisser soumettre avec complicité.', reward_xp: 120, reward_karma: 25 },
    { item_name: '🪶 Plume d\'Oie & Caresse Sensuelle', price: 180, description: 'Une caresse de frissons le long de la colonne vertébrale.', reward_xp: 75, reward_karma: 10 },
    { item_name: '🙈 Bandeau de Soie Obscure', price: 220, description: 'Un masque de soie pour priver de la vue et décupler la sensibilité du toucher.', reward_xp: 90, reward_karma: 15 },
    { item_name: '🪢 Corde de Soie Shibari', price: 400, description: 'Une corde de soie tressée pour l\'art délicat des liens charnels.', reward_xp: 150, reward_karma: 30 },
    // Sexy & Coquin
    { item_name: '👠 Lingerie de Dentelle Fine', price: 500, description: 'Une parure affriolante et sensuelle qui attire tous les désirs.', reward_xp: 180, reward_karma: 35 },
    { item_name: '🕯️ Huile de Massage Chauffante', price: 300, description: 'Une huile délicatement parfumée qui chauffe au doux contact de la peau.', reward_xp: 110, reward_karma: 20 },
    // Réconfort & Tendresse
    { item_name: '🧸 Gros Nounours Réconfortant', price: 120, description: 'Un câlin géant et moelleux pour apporter douceur et chaleur réconfortante.', reward_xp: 60, reward_karma: 10 },
    { item_name: '☕ Chocolat Chaud & Guimauves', price: 80, description: 'Une tasse gourmande parfumée à la cannelle, bien enveloppante.', reward_xp: 40, reward_karma: 5 },
    { item_name: '💆 Massage Attentionné', price: 280, description: 'Un massage délicat des épaules et de la nuque pour dénouer le stress.', reward_xp: 100, reward_karma: 20 }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO shop (guild_id, item_name, price, description, role_id, reward_xp, reward_karma)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of defaultThematicItems) {
    stmt.run(guildId, it.item_name, it.price, it.description, it.role_id || null, it.reward_xp || 0, it.reward_karma || 0);
  }
};

const getShopConfig = (guildId) => {
  let row = db.prepare('SELECT * FROM shop_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO shop_config (guild_id, private_suite_category_id, suite_channel_prefix) VALUES (?, ?, ?)').run(guildId, null, '👑┆suite-');
    row = { guild_id: guildId, private_suite_category_id: null, suite_channel_prefix: '👑┆suite-' };
  }
  return {
    privateSuiteCategoryId: row.private_suite_category_id || '',
    suiteChannelPrefix: row.suite_channel_prefix || '👑┆suite-'
  };
};

const updateShopConfig = (guildId, privateSuiteCategoryId, suiteChannelPrefix) => {
  db.prepare(`
    INSERT INTO shop_config (guild_id, private_suite_category_id, suite_channel_prefix)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      private_suite_category_id = EXCLUDED.private_suite_category_id,
      suite_channel_prefix = EXCLUDED.suite_channel_prefix
  `).run(guildId, privateSuiteCategoryId || null, suiteChannelPrefix || '👑┆suite-');
};

const addTemporaryRole = (guildId, userId, roleId, expiresAt) => {
  db.prepare(`
    INSERT OR REPLACE INTO temporary_roles (guild_id, user_id, role_id, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(guildId, userId, roleId, expiresAt);
};

const getTemporaryRoles = () => {
  return db.prepare('SELECT * FROM temporary_roles').all();
};

const deleteTemporaryRole = (guildId, userId, roleId) => {
  db.prepare('DELETE FROM temporary_roles WHERE guild_id = ? AND user_id = ? AND role_id = ?')
    .run(guildId, userId, roleId);
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

const getAutoThreadChannels = (guildId) => {
  return db.prepare('SELECT * FROM autothread_channels WHERE guild_id = ?').all(guildId);
};

const updateAutoThreadChannels = (guildId, channels) => {
  db.prepare('DELETE FROM autothread_channels WHERE guild_id = ?').run(guildId);
  const insert = db.prepare('INSERT INTO autothread_channels (guild_id, channel_id, image_only) VALUES (?, ?, ?)');
  for (const ch of channels) {
    insert.run(guildId, ch.channel_id, ch.image_only ? 1 : 0);
  }
};

const getAiKeys = (provider = null, category = null) => {
  let query = 'SELECT * FROM ai_keys WHERE 1=1';
  const params = [];
  if (provider) {
    query += ' AND provider = ?';
    params.push(provider);
  }
  if (category && category !== 'all') {
    query += " AND (category = ? OR category = 'all')";
    params.push(category);
  }
  query += ' ORDER BY id ASC';
  return db.prepare(query).all(...params);
};

const addAiKey = (provider, category, apiKey, label) => {
  return db.prepare(`
    INSERT INTO ai_keys (provider, category, api_key, label, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(provider, category || 'all', apiKey.trim(), label || `${provider.toUpperCase()} Key`, Date.now());
};

const updateAiKey = (id, updates) => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  return db.prepare(`UPDATE ai_keys SET ${fields} WHERE id = ?`).run(...values, id);
};

const deleteAiKey = (id) => {
  return db.prepare('DELETE FROM ai_keys WHERE id = ?').run(id);
};

const getAiConfig = (guildId) => {
  let config = db.prepare('SELECT * FROM ai_config WHERE guild_id = ?').get(guildId);
  if (!config) {
    db.prepare('INSERT OR IGNORE INTO ai_config (guild_id) VALUES (?)').run(guildId);
    config = db.prepare('SELECT * FROM ai_config WHERE guild_id = ?').get(guildId);
  }
  return config;
};

const updateAiConfig = (guildId, updates) => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  return db.prepare(`UPDATE ai_config SET ${fields} WHERE guild_id = ?`).run(...values, guildId);
};

const incrementCountingStat = (channelId, userId) => {
  return db.prepare(`
    INSERT INTO counting_stats (channel_id, user_id, count)
    VALUES (?, ?, 1)
    ON CONFLICT(channel_id, user_id) DO UPDATE SET count = count + 1
  `).run(channelId, userId);
};

const getCountingStats = (channelId) => {
  return db.prepare('SELECT user_id, count FROM counting_stats WHERE channel_id = ? ORDER BY count DESC LIMIT 10').all(channelId);
};

const resetCountingStats = (channelId) => {
  return db.prepare('DELETE FROM counting_stats WHERE channel_id = ?').run(channelId);
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

const getTicketPanels = (guildId) => {
  return db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ?').all(guildId);
};

const getTicketPanelById = (panelId) => {
  return db.prepare('SELECT * FROM ticket_panels WHERE id = ?').get(panelId);
};

const addTicketPanel = (guildId, panel) => {
  const { channel_id, message_id, title, description, color, thumbnail, selector_type, image_url, allowed_options } = panel;
  return db.prepare(`
    INSERT INTO ticket_panels (guild_id, channel_id, message_id, title, description, color, thumbnail, selector_type, image_url, allowed_options)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId,
    channel_id || null,
    message_id || null,
    title || '🎫 Support / Tickets',
    description || 'Sélectionnez ou cliquez sur le bouton correspondant pour ouvrir un ticket d\'assistance.',
    color || '#5865F2',
    thumbnail === undefined ? 1 : (thumbnail ? 1 : 0),
    selector_type || 'select',
    image_url || null,
    JSON.stringify(allowed_options || [])
  );
};

const updateTicketPanelById = (panelId, updates) => {
  const u = { ...updates };
  if (u.allowed_options) {
    u.allowed_options = JSON.stringify(u.allowed_options);
  }
  const fields = Object.keys(u).map(k => `${k} = ?`).join(', ');
  const values = Object.values(u);
  return db.prepare(`UPDATE ticket_panels SET ${fields} WHERE id = ?`).run(...values, panelId);
};

const deleteTicketPanel = (panelId) => {
  return db.prepare('DELETE FROM ticket_panels WHERE id = ?').run(panelId);
};

const getTicketOptions = (guildId) => {
  return db.prepare('SELECT * FROM ticket_options WHERE guild_id = ?').all(guildId);
};

const addTicketOption = (guildId, option) => {
  const { label, value, emoji, button_style, category_id, required_role_id, support_roles, ping_users, description, image_url, member_roles_add, member_roles_remove, certify_roles_add, certify_roles_remove, show_member_button, show_certify_button, require_age_verification, min_age_required, age_verified_role_id, age_verification_log_channel } = option;
  return db.prepare(`
    INSERT INTO ticket_options (guild_id, label, value, emoji, button_style, category_id, required_role_id, support_roles, ping_users, description, image_url, member_roles_add, member_roles_remove, certify_roles_add, certify_roles_remove, show_member_button, show_certify_button, require_age_verification, min_age_required, age_verified_role_id, age_verification_log_channel)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId, 
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
    JSON.stringify(member_roles_add || []),
    JSON.stringify(member_roles_remove || []),
    JSON.stringify(certify_roles_add || []),
    JSON.stringify(certify_roles_remove || []),
    show_member_button !== undefined ? show_member_button : 1,
    show_certify_button !== undefined ? show_certify_button : 1,
    require_age_verification ? 1 : 0,
    min_age_required ? parseInt(min_age_required) : 18,
    age_verified_role_id || null,
    age_verification_log_channel || null
  );
};

const deleteTicketOption = (guildId, id) => {
  return db.prepare('DELETE FROM ticket_options WHERE guild_id = ? AND id = ?').run(guildId, id);
};

const updateTicketOption = (guildId, id, option) => {
  const { label, value, emoji, button_style, category_id, required_role_id, support_roles, ping_users, description, image_url, member_roles_add, member_roles_remove, certify_roles_add, certify_roles_remove, show_member_button, show_certify_button, require_age_verification, min_age_required, age_verified_role_id, age_verification_log_channel } = option;
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
      image_url = ?,
      member_roles_add = ?,
      member_roles_remove = ?,
      certify_roles_add = ?,
      certify_roles_remove = ?,
      show_member_button = ?,
      show_certify_button = ?,
      require_age_verification = ?,
      min_age_required = ?,
      age_verified_role_id = ?,
      age_verification_log_channel = ?
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
    JSON.stringify(member_roles_add || []),
    JSON.stringify(member_roles_remove || []),
    JSON.stringify(certify_roles_add || []),
    JSON.stringify(certify_roles_remove || []),
    show_member_button !== undefined ? show_member_button : 1,
    show_certify_button !== undefined ? show_certify_button : 1,
    require_age_verification ? 1 : 0,
    min_age_required ? parseInt(min_age_required) : 18,
    age_verified_role_id || null,
    age_verification_log_channel || null,
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

const getAllActionRewards = (guildId) => {
  return db.prepare('SELECT * FROM action_rewards WHERE guild_id = ?').all(guildId);
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
    row = { guild_id: guildId, admin_role_id: null, modo_role_id: null, dashboard_roles: '', admin_cmds_roles: '', modo_cmds_roles: '' };
  }
  return row;
};

const updatePermissionsConfig = (guildId, adminRoleId, modoRoleId, dashboardRoles = '', adminCmdsRoles = '', modoCmdsRoles = '') => {
  return db.prepare(`
    INSERT INTO permissions_config (guild_id, admin_role_id, modo_role_id, dashboard_roles, admin_cmds_roles, modo_cmds_roles)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      admin_role_id = excluded.admin_role_id,
      modo_role_id = excluded.modo_role_id,
      dashboard_roles = excluded.dashboard_roles,
      admin_cmds_roles = excluded.admin_cmds_roles,
      modo_cmds_roles = excluded.modo_cmds_roles
  `).run(
    guildId,
    adminRoleId || null,
    modoRoleId || null,
    typeof dashboardRoles === 'string' ? dashboardRoles : JSON.stringify(dashboardRoles || []),
    typeof adminCmdsRoles === 'string' ? adminCmdsRoles : JSON.stringify(adminCmdsRoles || []),
    typeof modoCmdsRoles === 'string' ? modoCmdsRoles : JSON.stringify(modoCmdsRoles || [])
  );
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
    INSERT OR IGNORE INTO role_themes (guild_id, role_id, theme_name)
    VALUES (?, ?, ?)
  `).run(guildId, roleId, themeName);
};

const deleteRoleTheme = (guildId, roleId, themeName) => {
  if (themeName) {
    db.prepare('DELETE FROM role_themes WHERE guild_id = ? AND role_id = ? AND theme_name = ?').run(guildId, roleId, themeName);
  } else {
    db.prepare('DELETE FROM role_themes WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
  }
};

const getBumpConfig = (guildId) => {
  const row = db.prepare('SELECT * FROM bump_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO bump_config (guild_id) VALUES (?)').run(guildId);
    return { guild_id: guildId, reminder_channel: null, reminder_role: null };
  }
  return row;
};

const updateBumpConfig = (guildId, reminderChannel, reminderRole) => {
  getBumpConfig(guildId); // Assure la création
  db.prepare(`
    UPDATE bump_config 
    SET reminder_channel = ?, reminder_role = ?
    WHERE guild_id = ?
  `).run(reminderChannel || null, reminderRole || null, guildId);
};

// --- STAR DE LA SEMAINE ---

function getStarConfig(guildId) {
  let row = db.prepare('SELECT * FROM star_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare(`
      INSERT INTO star_config (guild_id) VALUES (?)
    `).run(guildId);
    row = db.prepare('SELECT * FROM star_config WHERE guild_id = ?').get(guildId);
  }
  return row;
}

function updateStarConfig(guildId, config) {
  const current = getStarConfig(guildId);
  const updated = { ...current, ...config };

  db.prepare(`
    INSERT OR REPLACE INTO star_config (
      guild_id, is_active, announce_channel_id, star_role_id, reward_coins, reward_karma,
      points_normal, points_nsfw, points_selfie, points_nude, selfie_channels, nude_channels,
      election_day, election_hour, announce_title, announce_desc, announce_color, announce_image,
      last_election_time, current_star_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId,
    updated.is_active !== undefined ? Number(updated.is_active) : 1,
    updated.announce_channel_id || '',
    updated.star_role_id || '',
    updated.reward_coins !== undefined ? Number(updated.reward_coins) : 1000,
    updated.reward_karma !== undefined ? Number(updated.reward_karma) : 50,
    updated.points_normal !== undefined ? Number(updated.points_normal) : 1,
    updated.points_nsfw !== undefined ? Number(updated.points_nsfw) : 2,
    updated.points_selfie !== undefined ? Number(updated.points_selfie) : 3,
    updated.points_nude !== undefined ? Number(updated.points_nude) : 5,
    Array.isArray(updated.selfie_channels) ? updated.selfie_channels.join(',') : (updated.selfie_channels || ''),
    Array.isArray(updated.nude_channels) ? updated.nude_channels.join(',') : (updated.nude_channels || ''),
    updated.election_day !== undefined ? Number(updated.election_day) : 0,
    updated.election_hour !== undefined ? Number(updated.election_hour) : 23,
    updated.announce_title || '⭐ Star de la Semaine !',
    updated.announce_desc || 'Félicitations à {user} qui devient la **Star de la Semaine** avec **{points} points** ! 🌟\n\nIl/Elle remporte le rôle {role} et brille sur le serveur !',
    updated.announce_color || '#F1C40F',
    updated.announce_image || '',
    updated.last_election_time !== undefined ? Number(updated.last_election_time) : 0,
    updated.current_star_user_id || ''
  );
  return getStarConfig(guildId);
}

function getCurrentWeekIdentifier(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function addStarPoints(guildId, userId, points, category = 'normal') {
  const weekId = getCurrentWeekIdentifier();
  const existing = db.prepare('SELECT * FROM star_weekly_points WHERE guild_id = ? AND user_id = ? AND week_identifier = ?')
    .get(guildId, userId, weekId);

  if (!existing) {
    const normal = category === 'normal' ? 1 : 0;
    const nsfw = category === 'nsfw' ? 1 : 0;
    const selfie = category === 'selfie' ? 1 : 0;
    const nude = category === 'nude' ? 1 : 0;

    db.prepare(`
      INSERT INTO star_weekly_points (guild_id, user_id, points, normal_count, nsfw_count, selfie_count, nude_count, week_identifier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, userId, points, normal, nsfw, selfie, nude, weekId);
  } else {
    let col = 'normal_count';
    if (category === 'nsfw') col = 'nsfw_count';
    else if (category === 'selfie') col = 'selfie_count';
    else if (category === 'nude') col = 'nude_count';

    db.prepare(`
      UPDATE star_weekly_points
      SET points = points + ?, ${col} = ${col} + 1
      WHERE guild_id = ? AND user_id = ? AND week_identifier = ?
    `).run(points, guildId, userId, weekId);
  }
}

function getStarWeeklyLeaderboard(guildId, weekIdentifier = null, limit = 10) {
  const weekId = weekIdentifier || getCurrentWeekIdentifier();
  return db.prepare(`
    SELECT * FROM star_weekly_points
    WHERE guild_id = ? AND week_identifier = ?
    ORDER BY points DESC
    LIMIT ?
  `).all(guildId, weekId, limit);
}

function getUserStarWeeklyPoints(guildId, userId, weekIdentifier = null) {
  const weekId = weekIdentifier || getCurrentWeekIdentifier();
  return db.prepare('SELECT * FROM star_weekly_points WHERE guild_id = ? AND user_id = ? AND week_identifier = ?')
    .get(guildId, userId, weekId);
}

function recordStarElection(guildId, userId, points, weekIdentifier) {
  db.prepare(`
    INSERT INTO star_history (guild_id, user_id, points, week_identifier, elected_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, userId, points, weekIdentifier, Math.floor(Date.now() / 1000));
}

function getStarHistory(guildId, limit = 10) {
  return db.prepare('SELECT * FROM star_history WHERE guild_id = ? ORDER BY elected_at DESC LIMIT ?')
    .all(guildId, limit);
}

// --- PENDING CONFESSIONS HELPERS ---

function getPendingConfession(id) {
  return db.prepare('SELECT * FROM pending_confessions WHERE id = ?').get(id);
}

function createPendingConfession(data) {
  const info = db.prepare(`
    INSERT INTO pending_confessions (
      guild_id, target_channel_id, user_id, user_tag, confession_text, 
      confession_name, use_thread, validation_channel_id, validation_message_id, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.guild_id,
    data.target_channel_id,
    data.user_id,
    data.user_tag || null,
    data.confession_text,
    data.confession_name || '💬 Confession Anonyme',
    data.use_thread ? 1 : 0,
    data.validation_channel_id || null,
    data.validation_message_id || null,
    data.status || 'pending',
    data.created_at || Date.now()
  );
  return info.lastInsertRowid;
}

function updatePendingConfessionMessageId(id, messageId) {
  db.prepare('UPDATE pending_confessions SET validation_message_id = ? WHERE id = ?').run(messageId, id);
}

function updatePendingConfessionStatus(id, status) {
  db.prepare('UPDATE pending_confessions SET status = ? WHERE id = ?').run(status, id);
}

function createSondage(data) {
  const { id, guild_id, channel_id, results_channel_id, title, description, rating_icon, text_type, color, created_by, sections, has_general_remark, avatar_image, banner_image, short_description, mentions } = data;
  return db.prepare(`
    INSERT INTO sondages (id, guild_id, channel_id, results_channel_id, title, description, rating_icon, text_type, color, created_by, created_at, sections, has_general_remark, avatar_image, banner_image, short_description, mentions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, guild_id, channel_id, results_channel_id || null, title, description || '', 
    rating_icon || '⭐', text_type || 'long', color || '#F1C40F', created_by || '', Date.now(),
    typeof sections === 'string' ? sections : JSON.stringify(sections || []),
    has_general_remark !== undefined ? (has_general_remark ? 1 : 0) : 1,
    avatar_image || '', banner_image || '', short_description || '',
    typeof mentions === 'string' ? mentions : JSON.stringify(mentions || [])
  );
}

function getSondage(id) {
  return db.prepare('SELECT * FROM sondages WHERE id = ?').get(id);
}

function saveSondageResponse(sondageId, userId, rating, comment) {
  return db.prepare(`
    INSERT INTO sondage_responses (sondage_id, user_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(sondage_id, user_id) DO UPDATE SET
      rating = excluded.rating,
      comment = excluded.comment,
      created_at = excluded.created_at
  `).run(sondageId, userId, rating, comment || '', Date.now());
}

function getSondageResponses(sondageId) {
  return db.prepare('SELECT * FROM sondage_responses WHERE sondage_id = ? ORDER BY created_at DESC').all(sondageId);
}

function hasUserVotedSondage(sondageId, userId) {
  const row = db.prepare('SELECT 1 FROM sondage_responses WHERE sondage_id = ? AND user_id = ?').get(sondageId, userId);
  return !!row;
}

module.exports = {
  createSondage,
  getSondage,
  saveSondageResponse,
  getSondageResponses,
  hasUserVotedSondage,
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
  getActionGifsAnyGuild,
  getAllActionGifs,

  addActionGif,
  deleteActionGif,
  getConfessions,
  addConfession,
  deleteConfession,
  getAutomodConfig,
  updateAutomodConfig,
  getBoostConfig,
  updateBoostConfig,
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
  getShopConfig,
  updateShopConfig,
  ensureDefaultShopItems,
  addTemporaryRole,
  getTemporaryRoles,
  deleteTemporaryRole,
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
  getTicketPanels,
  getTicketPanelById,
  addTicketPanel,
  updateTicketPanelById,
  deleteTicketPanel,
  getTicketOptions,
  addTicketOption,
  updateTicketOption,
  deleteTicketOption,
  getActionReward,
  getAllActionRewards,
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
  deleteRoleTheme,
  getBumpConfig,
  updateBumpConfig,
  getAutoThreadChannels,
  updateAutoThreadChannels,
  incrementCountingStat,
  getCountingStats,
  resetCountingStats,
  getAiKeys,
  addAiKey,
  updateAiKey,
  deleteAiKey,
  getAiConfig,
  updateAiConfig,
  getStarConfig,
  updateStarConfig,
  getCurrentWeekIdentifier,
  addStarPoints,
  getStarWeeklyLeaderboard,
  getUserStarWeeklyPoints,
  recordStarElection,
  getStarHistory,
  getPendingConfession,
  createPendingConfession,
  updatePendingConfessionMessageId,
  updatePendingConfessionStatus,
  getCommandPermission,
  getAllCommandPermissions,
  setCommandPermission,
  getQuests,
  getQuestById,
  addQuest,
  updateQuest,
  deleteQuest,
  getUserQuests,
  incrementQuestProgress,
  getQuarantineConfig,
  updateQuarantineConfig
};

function getQuarantineConfig(guildId) {
  return db.prepare('SELECT * FROM quarantine_config WHERE guild_id = ?').get(guildId);
}

function updateQuarantineConfig(guildId, roleId, channelId) {
  return db.prepare(`
    INSERT INTO quarantine_config (guild_id, role_id, channel_id)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      role_id = excluded.role_id,
      channel_id = excluded.channel_id
  `).run(guildId, roleId || null, channelId || null);
}

function getCommandPermission(guildId, commandName) {
  return db.prepare('SELECT * FROM command_permissions WHERE guild_id = ? AND command_name = ?').get(guildId, commandName);
}

function getAllCommandPermissions(guildId) {
  return db.prepare('SELECT * FROM command_permissions WHERE guild_id = ?').all(guildId);
}

function setCommandPermission(guildId, commandName, data) {
  const { enabled, allowed_roles, allowed_users, denied_roles } = data;
  return db.prepare(`
    INSERT INTO command_permissions (guild_id, command_name, enabled, allowed_roles, allowed_users, denied_roles)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, command_name) DO UPDATE SET
      enabled = excluded.enabled,
      allowed_roles = excluded.allowed_roles,
      allowed_users = excluded.allowed_users,
      denied_roles = excluded.denied_roles
  `).run(
    guildId,
    commandName,
    enabled !== undefined ? (enabled ? 1 : 0) : 1,
    typeof allowed_roles === 'string' ? allowed_roles : JSON.stringify(allowed_roles || []),
    typeof allowed_users === 'string' ? allowed_users : JSON.stringify(allowed_users || []),
    typeof denied_roles === 'string' ? denied_roles : JSON.stringify(denied_roles || [])
  );
}

function getQuests(guildId) {
  return db.prepare('SELECT * FROM quests WHERE guild_id = ? ORDER BY id DESC').all(guildId);
}

function getQuestById(id) {
  return db.prepare('SELECT * FROM quests WHERE id = ?').get(id);
}

function addQuest(guildId, data) {
  const { title, description, quest_type, target_count, channel_ids, reward_xp, reward_money, reward_karma, reward_role_id, reward_chance, is_daily, enabled } = data;
  return db.prepare(`
    INSERT INTO quests (guild_id, title, description, quest_type, target_count, channel_ids, reward_xp, reward_money, reward_karma, reward_role_id, reward_chance, is_daily, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId,
    title,
    description || '',
    quest_type || 'messages',
    parseInt(target_count) || 1,
    typeof channel_ids === 'string' ? channel_ids : JSON.stringify(channel_ids || []),
    parseInt(reward_xp) || 0,
    parseInt(reward_money) || 0,
    parseInt(reward_karma) || 0,
    reward_role_id || null,
    parseInt(reward_chance) || 0,
    is_daily ? 1 : 0,
    enabled !== undefined ? (enabled ? 1 : 0) : 1
  );
}

function updateQuest(id, data) {
  const { title, description, quest_type, target_count, channel_ids, reward_xp, reward_money, reward_karma, reward_role_id, reward_chance, is_daily, enabled } = data;
  return db.prepare(`
    UPDATE quests SET
      title = ?,
      description = ?,
      quest_type = ?,
      target_count = ?,
      channel_ids = ?,
      reward_xp = ?,
      reward_money = ?,
      reward_karma = ?,
      reward_role_id = ?,
      reward_chance = ?,
      is_daily = ?,
      enabled = ?
    WHERE id = ?
  `).run(
    title,
    description || '',
    quest_type || 'messages',
    parseInt(target_count) || 1,
    typeof channel_ids === 'string' ? channel_ids : JSON.stringify(channel_ids || []),
    parseInt(reward_xp) || 0,
    parseInt(reward_money) || 0,
    parseInt(reward_karma) || 0,
    reward_role_id || null,
    parseInt(reward_chance) || 0,
    is_daily ? 1 : 0,
    enabled !== undefined ? (enabled ? 1 : 0) : 1,
    id
  );
}

function deleteQuest(id) {
  db.prepare('DELETE FROM user_quests WHERE quest_id = ?').run(id);
  return db.prepare('DELETE FROM quests WHERE id = ?').run(id);
}

function getUserQuests(guildId, userId) {
  const quests = db.prepare('SELECT * FROM quests WHERE guild_id = ? AND enabled = 1').all(guildId);
  const userProgress = db.prepare('SELECT * FROM user_quests WHERE guild_id = ? AND user_id = ?').all(guildId, userId);
  const progressMap = new Map(userProgress.map(p => [p.quest_id, p]));

  return quests.map(q => {
    const p = progressMap.get(q.id) || { current_count: 0, completed: 0, completed_at: null };
    let channelIds = [];
    try { channelIds = JSON.parse(q.channel_ids || '[]'); } catch (e) {}
    return {
      ...q,
      channel_ids: channelIds,
      current_count: p.current_count,
      completed: Boolean(p.completed),
      completed_at: p.completed_at
    };
  });
}

function incrementQuestProgress(guildId, userId, questType, channelId, amount = 1, client = null) {
  try {
    const activeQuests = db.prepare('SELECT * FROM quests WHERE guild_id = ? AND quest_type = ? AND enabled = 1').all(guildId, questType);
    if (activeQuests.length === 0) return;

    for (const q of activeQuests) {
      let allowedChannels = [];
      try { allowedChannels = JSON.parse(q.channel_ids || '[]'); } catch (e) {}

      if (allowedChannels.length > 0 && channelId && !allowedChannels.includes(channelId)) {
        continue;
      }

      let userP = db.prepare('SELECT * FROM user_quests WHERE guild_id = ? AND user_id = ? AND quest_id = ?').get(guildId, userId, q.id);
      if (userP && userP.completed === 1) {
        continue;
      }

      const newCount = (userP ? userP.current_count : 0) + amount;
      const isCompleted = newCount >= q.target_count ? 1 : 0;
      const now = isCompleted ? Date.now() : null;

      db.prepare(`
        INSERT INTO user_quests (guild_id, user_id, quest_id, current_count, completed, completed_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id, quest_id) DO UPDATE SET
          current_count = excluded.current_count,
          completed = excluded.completed,
          completed_at = COALESCE(user_quests.completed_at, excluded.completed_at)
      `).run(guildId, userId, q.id, newCount, isCompleted, now);

      if (isCompleted && (!userP || userP.completed === 0)) {
        if (q.reward_money > 0) {
          const eco = getEconomy(guildId, userId);
          updateEconomy(guildId, userId, { bank: eco.bank + q.reward_money });
        }
        if (q.reward_xp > 0) {
          const lev = getLeveling(guildId, userId);
          updateLeveling(guildId, userId, { xp: lev.xp + q.reward_xp });
        }
        if (q.reward_karma > 0) {
          const eco = getEconomy(guildId, userId);
          updateEconomy(guildId, userId, { karma: eco.karma + q.reward_karma });
        }
        if (q.reward_chance > 0) {
          const invItem = db.prepare("SELECT quantity FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = '🍀 Chance de Comptage'").get(guildId, userId);
          if (invItem) {
            db.prepare("UPDATE inventory SET quantity = quantity + ? WHERE guild_id = ? AND user_id = ? AND item_name = '🍀 Chance de Comptage'").run(q.reward_chance, guildId, userId);
          } else {
            db.prepare("INSERT INTO inventory (guild_id, user_id, item_name, quantity) VALUES (?, ?, '🍀 Chance de Comptage', ?)").run(guildId, userId, q.reward_chance);
          }
        }

        if (client) {
          try {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
              const member = guild.members.cache.get(userId);
              if (member) {
                if (q.reward_role_id) {
                  member.roles.add(q.reward_role_id).catch(() => null);
                }
                const { EmbedBuilder } = require('discord.js');
                let rewardText = `💰 **${q.reward_money} pièces**\n⚡ **${q.reward_xp} XP**\n⭐ **${q.reward_karma} Karma**`;
                if (q.reward_chance > 0) rewardText += `\n🍀 **${q.reward_chance} Chance(s) de Comptage**`;
                if (q.reward_role_id) rewardText += `\n🎭 <@&${q.reward_role_id}>`;

                const embed = new EmbedBuilder()
                  .setTitle('🎉 QUÊTE ACCOMPLIE !')
                  .setDescription(`Bravo <@${userId}> ! Vous avez accompli la quête **"${q.title}"** !`)
                  .addFields({ name: '🏆 Récompenses obtenues', value: rewardText })
                  .setColor('#F1C40F')
                  .setTimestamp();

                const channel = guild.channels.cache.get(channelId);
                if (channel) {
                  channel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => null);
                }
              }
            }
          } catch (e) {
            console.error('Erreur notif quête:', e);
          }
        }
      }
    }
  } catch (err) {
    console.error('Erreur incrementQuestProgress:', err);
  }
}

function getCommandPermission(guildId, commandName) {
  return db.prepare('SELECT * FROM command_permissions WHERE guild_id = ? AND command_name = ?').get(guildId, commandName);
}

function getAllCommandPermissions(guildId) {
  return db.prepare('SELECT * FROM command_permissions WHERE guild_id = ?').all(guildId);
}

function getBoostConfig(guildId) {
  let row = db.prepare('SELECT * FROM boost_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    row = {
      guild_id: guildId,
      channel_id: null,
      title: '🚀 Nouveau Boost de Serveur !',
      message: '🎉 Un grand MERCI à {user.mention} d\'avoir boosté **{server}** ! Grâce à toi, le serveur gagne en puissance ! 💖',
      color: '#F47FFF',
      reward_money: 5000,
      reward_karma: 50,
      image_url: '',
      enabled: 1
    };
  }
  return row;
}

function updateBoostConfig(guildId, data) {
  const stmt = db.prepare(`
    INSERT INTO boost_config (guild_id, channel_id, title, message, color, reward_money, reward_karma, image_url, enabled)
    VALUES (@guild_id, @channel_id, @title, @message, @color, @reward_money, @reward_karma, @image_url, @enabled)
    ON CONFLICT(guild_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      title = excluded.title,
      message = excluded.message,
      color = excluded.color,
      reward_money = excluded.reward_money,
      reward_karma = excluded.reward_karma,
      image_url = excluded.image_url,
      enabled = excluded.enabled
  `);
  stmt.run({
    guild_id: guildId,
    channel_id: data.channel_id || null,
    title: data.title || '🚀 Nouveau Boost de Serveur !',
    message: data.message || '🎉 Un grand MERCI à {user.mention} d\'avoir boosté **{server}** ! Grâce à toi, le serveur gagne en puissance ! 💖',
    color: data.color || '#F47FFF',
    reward_money: parseInt(data.reward_money) || 0,
    reward_karma: parseInt(data.reward_karma) || 0,
    image_url: data.image_url || '',
    enabled: data.enabled ? 1 : 0
  });
}

function setCommandPermission(guildId, commandName, data) {
  const { enabled, allowed_roles, allowed_users, denied_roles } = data;
  return db.prepare(`
    INSERT INTO command_permissions (guild_id, command_name, enabled, allowed_roles, allowed_users, denied_roles)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, command_name) DO UPDATE SET
      enabled = excluded.enabled,
      allowed_roles = excluded.allowed_roles,
      allowed_users = excluded.allowed_users,
      denied_roles = excluded.denied_roles
  `).run(
    guildId,
    commandName,
    enabled !== undefined ? (enabled ? 1 : 0) : 1,
    typeof allowed_roles === 'string' ? allowed_roles : JSON.stringify(allowed_roles || []),
    typeof allowed_users === 'string' ? allowed_users : JSON.stringify(allowed_users || []),
    typeof denied_roles === 'string' ? denied_roles : JSON.stringify(denied_roles || [])
  );
}

function createAgeVerificationSession(id, guildId, userId, channelId, minAge = 18) {
  return db.prepare(`
    INSERT INTO age_verifications (id, guild_id, user_id, channel_id, min_age, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, guildId, userId, channelId, minAge, Date.now());
}

function getAgeVerificationSession(id) {
  return db.prepare('SELECT * FROM age_verifications WHERE id = ?').get(id);
}

function completeAgeVerification(id, method, estimatedAge) {
  return db.prepare(`
    UPDATE age_verifications
    SET status = 'verified', verification_method = ?, estimated_age = ?, verified_at = ?
    WHERE id = ?
  `).run(method, estimatedAge, Date.now(), id);
}

// --- FONCTIONS ROLE BOOSTERS ---

function getRoleBoosters(guildId) {
  return db.prepare('SELECT * FROM role_boosters WHERE guild_id = ?').all(guildId);
}

function addOrUpdateRoleBooster(guildId, roleId, xpMultiplier = 1.0, karmaMultiplier = 1.0, moneyMultiplier = 1.0) {
  return db.prepare(`
    INSERT INTO role_boosters (guild_id, role_id, xp_multiplier, karma_multiplier, money_multiplier)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, role_id) DO UPDATE SET
      xp_multiplier = excluded.xp_multiplier,
      karma_multiplier = excluded.karma_multiplier,
      money_multiplier = excluded.money_multiplier
  `).run(guildId, roleId, parseFloat(xpMultiplier) || 1.0, parseFloat(karmaMultiplier) || 1.0, parseFloat(moneyMultiplier) || 1.0);
}

function deleteRoleBooster(guildId, roleId) {
  return db.prepare('DELETE FROM role_boosters WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
}

function getMemberRoleMultipliers(guildId, member) {
  const defaultMultipliers = { xp_multiplier: 1.0, karma_multiplier: 1.0, money_multiplier: 1.0 };
  if (!member || !member.roles || !member.roles.cache) return defaultMultipliers;

  const boosters = getRoleBoosters(guildId);
  if (!boosters || boosters.length === 0) return defaultMultipliers;

  let maxXp = 1.0;
  let maxKarma = 1.0;
  let maxMoney = 1.0;

  for (const booster of boosters) {
    if (member.roles.cache.has(booster.role_id)) {
      if (booster.xp_multiplier > maxXp) maxXp = booster.xp_multiplier;
      if (booster.karma_multiplier > maxKarma) maxKarma = booster.karma_multiplier;
      if (booster.money_multiplier > maxMoney) maxMoney = booster.money_multiplier;
    }
  }

  return {
    xp_multiplier: maxXp,
    karma_multiplier: maxKarma,
    money_multiplier: maxMoney
  };
}

// --- FONCTIONS INVITE TRACKER ---

function getInviteConfig(guildId) {
  return db.prepare('SELECT * FROM invite_config WHERE guild_id = ?').get(guildId) || { log_channel_id: null, enabled: 1 };
}

function updateInviteConfig(guildId, logChannelId, enabled = 1) {
  return db.prepare(`
    INSERT INTO invite_config (guild_id, log_channel_id, enabled)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      log_channel_id = excluded.log_channel_id,
      enabled = excluded.enabled
  `).run(guildId, logChannelId || null, enabled ? 1 : 0);
}

function recordInviteJoin(guildId, userId, inviterId, inviteCode) {
  db.prepare(`
    INSERT OR REPLACE INTO invite_tracking (guild_id, user_id, inviter_id, invite_code, joined_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, userId, inviterId || 'vanity', inviteCode || 'vanity', Date.now());

  if (inviterId && inviterId !== 'vanity' && inviterId !== 'unknown') {
    db.prepare(`
      INSERT INTO user_invite_counts (guild_id, inviter_id, regular, fake, left, bonus)
      VALUES (?, ?, 1, 0, 0, 0)
      ON CONFLICT(guild_id, inviter_id) DO UPDATE SET
        regular = regular + 1
    `).run(guildId, inviterId);
  }
}

function recordInviteLeave(guildId, userId) {
  const tracked = db.prepare('SELECT * FROM invite_tracking WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (tracked && tracked.inviter_id && tracked.inviter_id !== 'vanity' && tracked.inviter_id !== 'unknown') {
    db.prepare(`
      UPDATE user_invite_counts
      SET left = left + 1
      WHERE guild_id = ? AND inviter_id = ?
    `).run(guildId, tracked.inviter_id);
  }
  return tracked;
}

function getUserInviteStats(guildId, inviterId) {
  const row = db.prepare('SELECT * FROM user_invite_counts WHERE guild_id = ? AND inviter_id = ?').get(guildId, inviterId);
  if (!row) return { regular: 0, fake: 0, left: 0, bonus: 0, total: 0 };
  const total = (row.regular || 0) + (row.bonus || 0) - (row.left || 0) - (row.fake || 0);
  return { ...row, total: Math.max(0, total) };
}

function getInviteLeaderboard(guildId, limit = 10) {
  const rows = db.prepare('SELECT * FROM user_invite_counts WHERE guild_id = ?').all(guildId);
  return rows.map(r => {
    const total = (r.regular || 0) + (r.bonus || 0) - (r.left || 0) - (r.fake || 0);
    return { ...r, total: Math.max(0, total) };
  }).sort((a, b) => b.total - a.total).slice(0, limit);
}

// Helper functions for Custom Commands
function getCustomCommands(guildId) {
  return db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?').all(guildId);
}

function saveCustomCommand(guildId, commandName, description, actionsJson) {
  db.prepare(`
    INSERT INTO custom_commands (guild_id, command_name, description, actions_json)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, command_name) DO UPDATE SET
      description = excluded.description,
      actions_json = excluded.actions_json
  `).run(guildId, commandName.toLowerCase(), description, actionsJson);
}

function deleteCustomCommand(guildId, commandName) {
  db.prepare('DELETE FROM custom_commands WHERE guild_id = ? AND LOWER(command_name) = LOWER(?)').run(guildId, commandName);
}

function getCustomCommandSettings(guildId) {
  const row = db.prepare('SELECT * FROM custom_command_settings WHERE guild_id = ?').get(guildId);
  return row || { prefix: '/', delete_trigger: 0 };
}

function saveCustomCommandSettings(guildId, prefix, deleteTrigger) {
  db.prepare(`
    INSERT INTO custom_command_settings (guild_id, prefix, delete_trigger)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      prefix = excluded.prefix,
      delete_trigger = excluded.delete_trigger
  `).run(guildId, prefix, deleteTrigger ? 1 : 0);
}

// Helper functions for Word Reactions
function getWordReactions(guildId) {
  return db.prepare('SELECT * FROM word_reactions WHERE guild_id = ?').all(guildId);
}

function addWordReaction(guildId, triggerWord, emojisJson, allowedRolesJson, forbiddenRolesJson, allowedChannelsJson, forbiddenChannelsJson) {
  return db.prepare(`
    INSERT INTO word_reactions (guild_id, trigger_word, emojis_json, allowed_roles_json, forbidden_roles_json, allowed_channels_json, forbidden_channels_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId,
    triggerWord.toLowerCase(),
    emojisJson,
    allowedRolesJson || '[]',
    forbiddenRolesJson || '[]',
    allowedChannelsJson || '[]',
    forbiddenChannelsJson || '[]'
  );
}

function deleteWordReaction(guildId, id) {
  db.prepare('DELETE FROM word_reactions WHERE guild_id = ? AND id = ?').run(guildId, id);
}

function getWordReactionSettings(guildId) {
  const row = db.prepare('SELECT * FROM word_reaction_settings WHERE guild_id = ?').get(guildId);
  return row || { is_enabled: 1 };
}

function saveWordReactionSettings(guildId, isEnabled) {
  db.prepare(`
    INSERT INTO word_reaction_settings (guild_id, is_enabled)
    VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      is_enabled = excluded.is_enabled
  `).run(guildId, isEnabled ? 1 : 0);
}

// Helper functions for Server Bot Profile (Custom Logo)
function getServerBotProfile(guildId) {
  const row = db.prepare('SELECT * FROM server_bot_profile WHERE guild_id = ?').get(guildId);
  return row || { custom_logo_url: null, custom_name: null };
}

function saveServerBotProfile(guildId, customLogoUrl, customName) {
  db.prepare(`
    INSERT INTO server_bot_profile (guild_id, custom_logo_url, custom_name)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      custom_logo_url = excluded.custom_logo_url,
      custom_name = excluded.custom_name
  `).run(guildId, customLogoUrl, customName);
}

module.exports = {
  ...module.exports,
  createAgeVerificationSession,
  getAgeVerificationSession,
  completeAgeVerification,
  getRoleBoosters,
  addOrUpdateRoleBooster,
  deleteRoleBooster,
  getMemberRoleMultipliers,
  getInviteConfig,
  updateInviteConfig,
  recordInviteJoin,
  recordInviteLeave,
  getUserInviteStats,
  getInviteLeaderboard,
  getCustomCommands,
  saveCustomCommand,
  deleteCustomCommand,
  getCustomCommandSettings,
  saveCustomCommandSettings,
  getWordReactions,
  addWordReaction,
  deleteWordReaction,
  getWordReactionSettings,
  saveWordReactionSettings,
  getServerBotProfile,
  saveServerBotProfile
};
