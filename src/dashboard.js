require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { client } = require('./index');
const { 
  db, 
  getAllActionGifs, 
  addActionGif, 
  deleteActionGif, 
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
  getKarmaConfig,
  updateKarmaConfig,
  getUnlimitedForums,
  updateUnlimitedForums,
  getActionVeriteItems,
  addActionVeriteItem,
  deleteActionVeriteItem,
  getActionVeriteConfig,
  updateActionVeriteConfig,
  getTicketPanels,
  getTicketPanelById,
  addTicketPanel,
  updateTicketPanelById,
  deleteTicketPanel,
  getTicketOptions,
  addTicketOption,
  deleteTicketOption,
  getAutoThreadChannels,
  updateAutoThreadChannels,
  getAiKeys,
  addAiKey,
  updateAiKey,
  deleteAiKey,
  getAiConfig,
  updateAiConfig
} = require('./database/db');

const app = express();
const PORT = process.env.PORT || 49601;

// Trust proxy (pour HTTPS/Nginx)
app.set('trust proxy', 1);

// Configuration de Multer pour le téléversement de fichiers
const multer = require('multer');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Route générique pour téléverser des fichiers
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier téléversé' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Persistent SQLite Session Store pour express-session
db.exec(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired INTEGER NOT NULL
  )
`);

class SQLiteSessionStore extends session.Store {
  constructor() {
    super();
    this.getStmt = db.prepare('SELECT sess FROM user_sessions WHERE sid = ? AND expired > ?');
    this.setStmt = db.prepare(`
      INSERT INTO user_sessions (sid, sess, expired) VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired
    `);
    this.destroyStmt = db.prepare('DELETE FROM user_sessions WHERE sid = ?');
  }

  get(sid, callback) {
    try {
      const row = this.getStmt.get(sid, Date.now());
      if (!row) return callback(null, null);
      const data = JSON.parse(row.sess);
      callback(null, data);
    } catch (err) {
      callback(err);
    }
  }

  set(sid, sess, callback) {
    try {
      const maxAge = sess && sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 30 * 24 * 60 * 60 * 1000;
      const expired = Date.now() + maxAge;
      const sessStr = JSON.stringify(sess);
      this.setStmt.run(sid, sessStr, expired);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      this.destroyStmt.run(sid);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }
}

// Middleware Session
const isHttps = process.env.HTTPS_PROXY === 'true';
app.use(session({
  store: new SQLiteSessionStore(),
  secret: process.env.SESSION_SECRET || 'bagbot-elite-secret-key-change-in-production',
  resave: true,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    httpOnly: true
  },
  name: 'bagbot-elite.sid'
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middlewares
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

function getReqGuildId(req) {
  return (req.query && req.query.guildId) || (req.body && req.body.guildId) || (req.session && req.session.selectedGuild) || null;
}

app.use((req, res, next) => {
  const gId = (req.query && req.query.guildId) || (req.body && req.body.guildId);
  if (gId && req.session) {
    req.session.selectedGuild = gId;
  }
  next();
});

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});
// Désactiver la mise en cache globale (HTML, JS, CSS, APIs)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}));

app.get('/verify-age.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/verify-age.html'));
});

app.get('/verify-age', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/verify-age.html'));
});

app.get('/form.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/form.html'));
});

app.get('/form', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/form.html'));
});

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Fonction pour générer le redirect_uri de manière dynamique
const getRedirectUri = (req) => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/callback`;
};

// Route de connexion Discord OAuth2 (supports port delegation)
app.get('/login', (req, res) => {
  if (req.query.port) {
    req.session.targetPort = req.query.port;
  }
  const clientId = process.env.DISCORD_CLIENT_ID || '1523016917588115566';
  const redirectUri = encodeURIComponent(getRedirectUri(req));
  const scope = encodeURIComponent('identify guilds guilds.members.read');
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`);
});

// Callback Discord OAuth2
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  console.log(`[/callback] Code reçu de Discord: ${code ? 'oui' : 'non'}`);
  if (!code) {
    return res.redirect('/?error=no_code');
  }

  const redirectUri = getRedirectUri(req);
  console.log(`[/callback] Redirect URI calculée: ${redirectUri}`);

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error('[/callback] Erreur récupération token Discord:', tokenData);
      throw new Error(tokenData.error);
    }

    // Récupérer les infos utilisateur
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const userData = await userResponse.json();
    console.log(`[/callback] Utilisateur Discord identifié: ${userData.username} (${userData.id})`);

    // Récupérer les serveurs de l'utilisateur
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const guildsData = await guildsResponse.json();
    console.log(`[/callback] Récupéré ${guildsData.length} serveurs pour l'utilisateur.`);

    // Sauvegarder en session
    req.session.user = {
      id: userData.id,
      username: userData.username,
      global_name: userData.global_name || userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
      accessToken: tokenData.access_token,
      guilds: guildsData
    };

    req.session.save((err) => {
      if (err) {
        console.error('[/callback] Erreur sauvegarde session:', err);
        return res.redirect('/?error=session_error');
      }
      console.log(`[/callback] Session enregistrée pour ${userData.username}`);
      const tPort = req.session.targetPort;
      delete req.session.targetPort;
      if (tPort === '49602') {
        return res.redirect('http://82.65.75.176:49602/?auth_success=1');
      }
      res.redirect('/');
    });
  } catch (error) {
    console.error('[/callback] Erreur OAuth2 globale:', error);
    res.redirect('/?error=oauth_failed');
  }
});

// Déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Erreur destruction session:', err);
    res.clearCookie('bagbot-elite.sid');
    res.redirect('/login');
  });
});


app.post('/api/log-error', (req, res) => {
  console.error('❌ [CLIENT-SIDE ERROR]', req.body);
  res.sendStatus(200);
});

// API pour obtenir l'utilisateur connecté
app.get('/api/user', (req, res) => {
  console.log(`[/api/user] Vérification auth. Session user existante: ${req.session.user ? req.session.user.username : 'non'}`);
  if (req.session.user) {
    const u = req.session.user;
    let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
    if (u.avatar) {
      avatarUrl = `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`;
    } else if (u.id) {
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(BigInt(u.id) >> 22n) % 5n}.png`;
    }

    res.json({ 
      authenticated: true, 
      user: {
        id: u.id,
        username: u.username,
        global_name: u.global_name || u.username,
        avatar: u.avatar,
        avatar_url: avatarUrl,
        guilds: u.guilds
      }
    });
  } else {
    // Session active sans user Discord — accès mode bot owner
    // Permet au dashboard de fonctionner après expiration de session Discord
    res.json({ 
      authenticated: true, 
      user: {
        id: '0',
        username: 'Administrateur',
        global_name: 'Administrateur',
        avatar: null,
        avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
        guilds: []
      }
    });
  }
});


// API pour obtenir les serveurs (filtrés)
app.get('/api/guilds', async (req, res) => {
  try {
    const botApiPort = process.env.BOT_API_PORT || 49605;
    const botGuildsResponse = await fetch(`http://127.0.0.1:${botApiPort}/guilds`).catch(() => null);

    let botGuilds = [];
    if (botGuildsResponse && botGuildsResponse.ok) {
      botGuilds = await botGuildsResponse.json();
    }

    // Si session utilisateur disponible, filtrer par ses guilds
    if (req.session && req.session.user && req.session.user.guilds && req.session.user.guilds.length > 0) {
      const userGuilds = req.session.user.guilds;
      const botGuildIds = new Set(botGuilds.map(g => g.id));
      const filteredGuilds = userGuilds.filter(guild => botGuildIds.has(guild.id));
      if (filteredGuilds.length > 0) {
        return res.json(filteredGuilds);
      }
    }

    // Fallback: renvoyer directement les guilds du bot (toujours disponible)
    res.json(botGuilds);
  } catch (error) {
    console.error('Error filtering guilds:', error);
    res.json([]);
  }
});


// API pour sélectionner un serveur
app.post('/api/select-guild', (req, res) => {
  const { guildId } = req.body || {};
  if (req.session && req.session.user) {
    if (!guildId) {
      req.session.selectedGuild = null;
      return req.session.save(() => res.json({ success: true }));
    }

    req.session.selectedGuild = guildId;
    req.session.save((err) => {
      if (err) console.error('Erreur sauvegarde session select-guild:', err);
      res.json({ success: true, guildId });
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

function getReqGuildId(req) {
  return (req.query && req.query.guildId) || (req.body && req.body.guildId) || (req.session && req.session.selectedGuild) || null;
}

app.use((req, res, next) => {
  const gId = (req.query && req.query.guildId) || (req.body && req.body.guildId);
  if (gId && req.session) {
    req.session.selectedGuild = gId;
  }
  next();
});

// API pour obtenir le serveur sélectionné
app.get('/api/selected-guild', (req, res) => {
  if (req.session.selectedGuild) {
    res.json({ guildId: req.session.selectedGuild });
  } else {
    res.json({ guildId: null });
  }
});

// API pour obtenir les salons (via le bot)
app.get('/api/channels', async (req, res) => {
  try {
    const guildId = (req.query && req.query.guildId) || (req.session && req.session.selectedGuild);
    if (!guildId) {
      return res.json([]);
    }
    const botApiPort = process.env.BOT_API_PORT || 49605;
    const response = await fetch(`http://127.0.0.1:${botApiPort}/guilds/${guildId}/channels`).catch(() => null);
    if (response && response.ok) {
      const channels = await response.json();
      res.json(channels);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Erreur chargement channels:', error);
    res.json([]);
  }
});

// API pour obtenir les rôles (via le bot)
app.get('/api/roles', async (req, res) => {
  try {
    const guildId = (req.query && req.query.guildId) || (req.session && req.session.selectedGuild);
    if (!guildId) {
      return res.json([]);
    }
    const botApiPort = process.env.BOT_API_PORT || 49605;
    const response = await fetch(`http://127.0.0.1:${botApiPort}/guilds/${guildId}/roles`).catch(() => null);
    if (response && response.ok) {
      const roles = await response.json();
      res.json(roles);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Erreur chargement roles:', error);
    res.json([]);
  }
});

// API pour obtenir les membres (via le bot)
app.get('/api/members', async (req, res) => {
  try {
    const guildId = (req.query && req.query.guildId) || (req.body && req.body.guildId) || (req.session && req.session.selectedGuild);
    if (!guildId) {
      return res.json([]);
    }
    const botApiPort = process.env.BOT_API_PORT || 49605;
    const response = await fetch(`http://127.0.0.1:${botApiPort}/guilds/${guildId}/members`).catch(() => null);
    if (response && response.ok) {
      const members = await response.json();
      res.json(members);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Erreur chargement membres:', error);
    res.json([]);
  }
});

// Obtenir les informations du bot (nom et avatar réel)
app.get('/api/bot/info', async (req, res) => {
  try {
    const guildId = (req.query && req.query.guildId) || (req.session && req.session.selectedGuild);
    let customLogo = null;
    let customName = null;
    if (guildId) {
      const { getServerBotProfile } = require('./database/db');
      const profile = getServerBotProfile(guildId);
      if (profile) {
        customLogo = profile.custom_logo_url;
        customName = profile.custom_name;
      }
    }

    const botApiPort = process.env.BOT_API_PORT || 49605;
    const response = await fetch(`http://127.0.0.1:${botApiPort}/bot/info`).catch(() => null);
    if (response && response.ok) {
      const data = await response.json();
      if (customLogo) data.avatarURL = customLogo;
      if (customName) data.username = customName;
      res.json(data);
    } else {
      res.json({
        username: customName || 'Bagbot Elite',
        avatarURL: customLogo || 'https://cdn.discordapp.com/embed/avatars/0.png'
      });
    }
  } catch (error) {
    res.json({ username: 'Bagbot Elite', avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });
  }
});

// Changer l'avatar du bot globalement
app.post('/api/bot/avatar', async (req, res) => {
  try {
    const guildId = (req.query && req.query.guildId) || (req.body && req.body.guildId) || (req.session && req.session.selectedGuild);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { avatar_url } = req.body || {};

    let wl = db.prepare('SELECT * FROM welcome_leave WHERE guild_id = ?').get(guildId);
    if (!wl) {
      db.prepare('INSERT INTO welcome_leave (guild_id, custom_bot_avatar) VALUES (?, ?)').run(guildId, avatar_url || null);
    } else {
      db.prepare('UPDATE welcome_leave SET custom_bot_avatar = ? WHERE guild_id = ?').run(avatar_url || null, guildId);
    }

    res.json({ success: true, avatarURL: avatar_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- API DE CONFIGURATION SQLITE ---

// 1. Obtenir toute la configuration d'un serveur
app.get('/api/config', (req, res) => {
  try {
    const guildId = (req.query && req.query.guildId) || (req.body && req.body.guildId) || (req.session && req.session.selectedGuild);
    if (!guildId) {
      return res.status(400).json({ error: 'No guild selected' });
    }

    // Bienvenue & Départ
    let welcomeLeave = db.prepare('SELECT * FROM welcome_leave WHERE guild_id = ?').get(guildId);
    if (!welcomeLeave) {
      welcomeLeave = {
        welcome_channel: null,
        leave_channel: null,
        welcome_title: '👋 Bienvenue',
        welcome_desc: 'Bienvenue {user} sur le serveur !',
        welcome_color: '#00FF00',
        welcome_thumbnail: 1,
        welcome_image: null,
        welcome_author_name: null,
        welcome_author_icon: null,
        welcome_footer: null,
        welcome_role_filter: null,
        leave_title: '👋 Au revoir',
        leave_desc: 'Au revoir {user} !',
        leave_color: '#FF0000',
        leave_thumbnail: 1,
        leave_image: null,
        leave_author_name: null,
        leave_author_icon: null,
        leave_footer: null
      };
    }

    // Confessions
    const confessions = db.prepare('SELECT * FROM confessions WHERE guild_id = ?').all(guildId);
    const confessionChannel = confessions.length > 0 ? confessions[0].channel_id : null;

    // Configuration Jeu Mot Caché
    let gameConfig = db.prepare('SELECT * FROM game_config WHERE guild_id = ?').get(guildId);
    if (!gameConfig) {
      gameConfig = { secret_phrase: '', reward_money: 0, reward_xp: 0, reward_role_id: null, is_active: 0 };
    }

    // Quarantaine
    let quarantine = db.prepare('SELECT * FROM quarantine_config WHERE guild_id = ?').get(guildId);
    if (!quarantine) {
      quarantine = { role_id: null, channel_id: null };
    }

    // Logs
    let logs = db.prepare('SELECT * FROM logs_config WHERE guild_id = ?').get(guildId);
    if (!logs) {
      logs = { channel_id: null, events: 'all' };
    }

    // Seeder de suites si manquantes
    const suites = ['Suite Privée 1 Jour', 'Suite Privée 7 Jours', 'Suite Privée 1 Mois'];
    const suitePrices = { 'Suite Privée 1 Jour': 500, 'Suite Privée 7 Jours': 2000, 'Suite Privée 1 Mois': 7000 };
    const suiteDescs = {
      'Suite Privée 1 Jour': 'Votre suite privée personnelle (salon textuel) pendant 24 heures.',
      'Suite Privée 7 Jours': 'Votre suite privée personnelle (salon textuel) pendant une semaine.',
      'Suite Privée 1 Mois': 'Votre suite privée personnelle (salon textuel) pendant un mois.'
    };
    
    suites.forEach(sName => {
      const exists = db.prepare('SELECT 1 FROM shop WHERE guild_id = ? AND item_name = ?').get(guildId, sName);
      if (!exists) {
        db.prepare('INSERT INTO shop (guild_id, item_name, price, description, role_id) VALUES (?, ?, ?, ?, ?)')
          .run(guildId, sName, suitePrices[sName], suiteDescs[sName], null);
      }
    });

    // Boutique (Shop)
    const { ensureDefaultShopItems } = require('./database/db');
    ensureDefaultShopItems(guildId);
    const shopItems = db.prepare('SELECT * FROM shop WHERE guild_id = ?').all(guildId);

    // Récompenses de niveaux
    const levelRewards = db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC').all(guildId);

    // Configuration Leveling
    let levelingConfig = db.prepare('SELECT * FROM leveling_config WHERE guild_id = ?').get(guildId);
    if (!levelingConfig) {
      levelingConfig = {
        xp_min: 15,
        xp_max: 25,
        karma_min: 1,
        karma_max: 3,
        money_min: 2,
        money_max: 5,
        nsfw_xp_reward: 0,
        nsfw_money_reward: 0,
        announce_channel: 'current',
        announce_msg: 'Bravo {user} ! Tu passes au niveau {level} !'
      };
    }

    const automodConfig = getAutomodConfig(guildId);

    // Auto-rôles
    const autoroleEmbeds = getAutoroleEmbeds(guildId);
    for (const embed of autoroleEmbeds) {
      embed.options = getAutoroleOptions(embed.message_id);
    }
    const autorolesOnJoin = getAutorolesOnJoin(guildId);
    const autorolesOnRole = getAutorolesOnRole(guildId);

    // Counting
    const countingChannels = getCountingChannels(guildId);

    // Permissions Config
    let permissionsConfig = db.prepare('SELECT * FROM permissions_config WHERE guild_id = ?').get(guildId);
    if (!permissionsConfig) {
      permissionsConfig = { admin_role_id: null, modo_role_id: null, dashboard_roles: '[]', admin_cmds_roles: '[]', modo_cmds_roles: '[]' };
    }

    const { getBumpConfig, getShopConfig, getBoostConfig } = require('./database/db');
    const bumpConfig = getBumpConfig(guildId);
    const shopConfig = getShopConfig(guildId);
    const boostConfig = getBoostConfig(guildId);

    // Tribunal Config
    const tribunalDb = require('./utils/tribunal_db');
    const tribunalConfig = tribunalDb.getTribunalConfig(guildId);
    const { getAllActionRewards } = require('./database/db');
    const actionRewards = getAllActionRewards(guildId);

    res.json({
      welcome_leave: welcomeLeave,
      boost_config: boostConfig,
      permissions_config: permissionsConfig,
      confession: { channel_id: confessionChannel },
      confessions: confessions,
      game_config: gameConfig,
      quarantine: quarantine,
      logs: logs,
      shop: shopItems,
      level_rewards: levelRewards,
      leveling_config: levelingConfig,
      automod_config: automodConfig,
      autorole_embeds: autoroleEmbeds,
      autoroles_on_join: autorolesOnJoin,
      autoroles_on_role: autorolesOnRole,
      counting_channels: countingChannels,
      bump_config: bumpConfig,
      shop_config: shopConfig,
      tribunal_config: tribunalConfig,
      action_rewards: actionRewards
    });
  } catch (error) {
    console.error('Erreur chargement config:', error);
    res.status(500).json({ error: 'Erreur chargement' });
  }
});

// Sauvegarder la configuration des permissions (admin & modo)
app.post('/api/config/permissions', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { admin_role_id, modo_role_id, dashboard_roles, admin_cmds_roles, modo_cmds_roles } = req.body || {};
    const { updatePermissionsConfig } = require('./database/db');

    updatePermissionsConfig(
      guildId,
      admin_role_id || null,
      modo_role_id || null,
      dashboard_roles || [],
      admin_cmds_roles || [],
      modo_cmds_roles || []
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde permissions:', error);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// 2. Sauvegarder Bienvenue & Départ
app.post('/api/config/welcome-leave', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const {
      welcome_channel, leave_channel, welcome_title, welcome_desc,
      welcome_color, welcome_thumbnail, welcome_image, welcome_author_name, welcome_author_icon, welcome_footer, welcome_role_filter,
      leave_title, leave_desc, leave_color, leave_thumbnail, leave_image, leave_author_name, leave_author_icon, leave_footer
    } = req.body || {};

    db.prepare(`
      INSERT INTO welcome_leave (
        guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc,
        welcome_color, welcome_thumbnail, welcome_image, welcome_author_name, welcome_author_icon, welcome_footer, welcome_role_filter,
        leave_title, leave_desc, leave_color, leave_thumbnail, leave_image, leave_author_name, leave_author_icon, leave_footer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        welcome_channel = excluded.welcome_channel,
        leave_channel = excluded.leave_channel,
        welcome_title = excluded.welcome_title,
        welcome_desc = excluded.welcome_desc,
        welcome_color = excluded.welcome_color,
        welcome_thumbnail = excluded.welcome_thumbnail,
        welcome_image = excluded.welcome_image,
        welcome_author_name = excluded.welcome_author_name,
        welcome_author_icon = excluded.welcome_author_icon,
        welcome_footer = excluded.welcome_footer,
        welcome_role_filter = excluded.welcome_role_filter,
        leave_title = excluded.leave_title,
        leave_desc = excluded.leave_desc,
        leave_color = excluded.leave_color,
        leave_thumbnail = excluded.leave_thumbnail,
        leave_image = excluded.leave_image,
        leave_author_name = excluded.leave_author_name,
        leave_author_icon = excluded.leave_author_icon,
        leave_footer = excluded.leave_footer
    `).run(
      guildId, welcome_channel || null, leave_channel || null, welcome_title || '', welcome_desc || '',
      welcome_color || '#00FF00', welcome_thumbnail ? 1 : 0, welcome_image || null, welcome_author_name || null, welcome_author_icon || null, welcome_footer || null, welcome_role_filter || null,
      leave_title || '', leave_desc || '', leave_color || '#FF0000', leave_thumbnail ? 1 : 0, leave_image || null, leave_author_name || null, leave_author_icon || null, leave_footer || null
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 2.b Récupérer et Sauvegarder la configuration Boost
app.get('/api/config/boost', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { getBoostConfig } = require('./database/db');
    const config = getBoostConfig(guildId);
    res.json(config);
  } catch (error) {
    console.error('Erreur lecture config boost:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/boost', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { updateBoostConfig } = require('./database/db');
    updateBoostConfig(guildId, req.body || {});
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde config boost:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Sauvegarder Confessions
app.post('/api/config/confessions', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { channels } = req.body || {}; // Un tableau de { channel_id, confession_name, use_thread }
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'Un tableau de salons est requis.' });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM confessions WHERE guild_id = ?').run(guildId);
      const stmt = db.prepare(`
        INSERT INTO confessions (guild_id, channel_id, confession_name, use_thread, require_validation, validation_channel_id, ping_role_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const ch of channels) {
        if (ch.channel_id) {
          stmt.run(
            guildId,
            ch.channel_id,
            ch.confession_name || 'Confession Anonyme',
            ch.use_thread ? 1 : 0,
            ch.require_validation ? 1 : 0,
            ch.validation_channel_id || null,
            ch.ping_role_id || null
          );
        }
      }
    })();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Sauvegarder Quarantaine
app.post('/api/config/quarantine', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { role_id, channel_id } = req.body || {};

    db.prepare(`
      INSERT OR REPLACE INTO quarantine_config (guild_id, role_id, channel_id)
      VALUES (?, ?, ?)
    `).run(guildId, role_id || null, channel_id || null);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Sauvegarder la configuration du Tribunal
app.post('/api/config/tribunal', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { category_id, judge_role_id, lawyer_role_id, accused_role_id, plaintiff_role_id, channel_prefix, access_roles, auto_delete_minutes } = req.body || {};
    const tribunalDb = require('./utils/tribunal_db');
    tribunalDb.updateTribunalConfig(guildId, {
      categoryId: category_id || '',
      judgeRoleId: judge_role_id || '',
      lawyerRoleId: lawyer_role_id || '',
      accusedRoleId: accused_role_id || '',
      plaintiffRoleId: plaintiff_role_id || '',
      channelPrefix: channel_prefix || '⚖️┆procès-',
      accessRoles: Array.isArray(access_roles) ? access_roles : (typeof access_roles === 'string' ? JSON.parse(access_roles || '[]') : []),
      autoDeleteMinutes: parseInt(auto_delete_minutes) || 5
    });

    if (client.syncExistingChannels) client.syncExistingChannels();

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde config tribunal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sauvegarder la configuration de la Boutique (catégorie et préfixe suites privées)
app.post('/api/config/shop-settings', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { private_suite_category_id, suite_channel_prefix } = req.body || {};
    const { updateShopConfig } = require('./database/db');
    updateShopConfig(guildId, private_suite_category_id || null, suite_channel_prefix || '👑┆suite-');

    if (client.syncExistingChannels) client.syncExistingChannels();

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde config boutique:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resynchroniser manuellement tous les salons des suites privées et du tribunal
app.post('/api/config/sync-channels', async (req, res) => {
  try {
    if (client.syncExistingChannels) {
      await client.syncExistingChannels();
    }
    res.json({ success: true, message: 'Resynchronisation des salons effectuée !' });
  } catch (error) {
    console.error('Erreur resynchronisation manuelle:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Sauvegarder Logs d'activité
app.post('/api/config/logs', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { channel_id, events } = req.body || {};

    db.prepare(`
      INSERT OR REPLACE INTO logs_config (guild_id, channel_id, events)
      VALUES (?, ?, ?)
    `).run(guildId, channel_id || null, events || 'all');

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Ajouter un objet/rôle à la Boutique
app.post('/api/config/shop/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { item_name, price, description, role_id, role_duration_ms, reward_xp, reward_karma } = req.body || {};
    if (!item_name || !price) {
      return res.status(400).json({ error: 'Nom et prix requis' });
    }

    db.prepare(`
      INSERT OR REPLACE INTO shop (guild_id, item_name, price, description, role_id, role_duration_ms, reward_xp, reward_karma)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      item_name,
      price,
      description || '',
      role_id || null,
      role_duration_ms || 0,
      reward_xp || 0,
      reward_karma || 0
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Supprimer un objet de la Boutique
app.post('/api/config/shop/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { item_name } = req.body || {};
    if (item_name && item_name.toLowerCase().startsWith('suite privée')) {
      return res.status(400).json({ error: 'Les suites privées ne peuvent pas être supprimées.' });
    }

    db.prepare('DELETE FROM shop WHERE guild_id = ? AND item_name = ?').run(guildId, item_name);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 7.5 Modifier le prix d'un objet de la Boutique
app.post('/api/config/shop/update-price', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { item_name, price } = req.body || {};
    if (!item_name || price === undefined) {
      return res.status(400).json({ error: 'Nom et prix requis' });
    }

    db.prepare('UPDATE shop SET price = ? WHERE guild_id = ? AND item_name = ?').run(price, guildId, item_name);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Ajouter une récompense de niveau
app.post('/api/config/level-rewards/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { level, role_id } = req.body || {};
    if (!level || !role_id) {
      return res.status(400).json({ error: 'Niveau et rôle requis' });
    }

    db.prepare(`
      INSERT OR REPLACE INTO level_rewards (guild_id, level, role_id)
      VALUES (?, ?, ?)
    `).run(guildId, level, role_id);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 9. Supprimer une récompense de niveau
app.post('/api/config/level-rewards/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { level } = req.body || {};

    db.prepare('DELETE FROM level_rewards WHERE guild_id = ? AND level = ?').run(guildId, level);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 10. Sauvegarder la configuration de leveling (min/max XP, annonce)
app.post('/api/config/leveling', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { 
      xp_min, xp_max, 
      karma_min, karma_max, 
      money_min, money_max, 
      nsfw_xp_reward, nsfw_money_reward, 
      announce_channel, announce_msg,
      xp_base, xp_factor
    } = req.body || {};

    db.prepare(`
      INSERT OR REPLACE INTO leveling_config (
        guild_id, xp_min, xp_max, 
        karma_min, karma_max, 
        money_min, money_max, 
        nsfw_xp_reward, nsfw_money_reward, 
        announce_channel, announce_msg,
        xp_base, xp_factor
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      xp_min !== undefined ? parseInt(xp_min) : 15,
      xp_max !== undefined ? parseInt(xp_max) : 25,
      karma_min !== undefined ? parseInt(karma_min) : 1,
      karma_max !== undefined ? parseInt(karma_max) : 3,
      money_min !== undefined ? parseInt(money_min) : 2,
      money_max !== undefined ? parseInt(money_max) : 5,
      nsfw_xp_reward !== undefined ? parseInt(nsfw_xp_reward) : 0,
      nsfw_money_reward !== undefined ? parseInt(nsfw_money_reward) : 0,
      announce_channel || 'current',
      announce_msg || 'Bravo {user} ! Tu passes au niveau {level} !',
      xp_base !== undefined ? parseInt(xp_base) : 120,
      xp_factor !== undefined ? parseFloat(xp_factor) : 1.35
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 10b. Réinitialiser les messages NSFW de tous les membres (FEU)
app.post('/api/config/leveling/reset-nsfw', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    db.prepare('UPDATE leveling SET nsfw_messages = 0 WHERE guild_id = ?').run(guildId);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- COMMANDES PERSONNALISÉES API ---
app.get('/api/bot/custom-commands/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { getCustomCommands, getCustomCommandSettings } = require('./database/db');
  res.json({
    commands: getCustomCommands(guildId),
    settings: getCustomCommandSettings(guildId)
  });
});

app.post('/api/bot/custom-commands/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { command_name, description, actions_json } = req.body || {};
  if (!command_name) return res.status(400).json({ error: 'Nom de commande requis' });
  const { saveCustomCommand } = require('./database/db');
  saveCustomCommand(guildId, command_name, description || '', typeof actions_json === 'string' ? actions_json : JSON.stringify(actions_json || []));
  res.json({ success: true });
});

app.delete('/api/bot/custom-commands/:guildId/:commandName', (req, res) => {
  const { guildId, commandName } = req.params;
  const { deleteCustomCommand } = require('./database/db');
  deleteCustomCommand(guildId, commandName);
  res.json({ success: true });
});

app.post('/api/bot/custom-commands/settings/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { prefix, delete_trigger } = req.body || {};
  const { saveCustomCommandSettings } = require('./database/db');
  saveCustomCommandSettings(guildId, prefix || '/', delete_trigger ? 1 : 0);
  res.json({ success: true });
});

// --- RÉACTIONS DE MOTS API ---
app.get('/api/bot/word-reactions/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { getWordReactions, getWordReactionSettings } = require('./database/db');
  res.json({
    reactions: getWordReactions(guildId),
    settings: getWordReactionSettings(guildId)
  });
});

app.post('/api/bot/word-reactions/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { trigger_word, emojis_json, allowed_roles_json, forbidden_roles_json, allowed_channels_json, forbidden_channels_json } = req.body || {};
  if (!trigger_word || !emojis_json) return res.status(400).json({ error: 'Mot déclencheur et émojis requis' });
  const { addWordReaction } = require('./database/db');
  addWordReaction(
    guildId,
    trigger_word,
    typeof emojis_json === 'string' ? emojis_json : JSON.stringify(emojis_json),
    typeof allowed_roles_json === 'string' ? allowed_roles_json : JSON.stringify(allowed_roles_json || []),
    typeof forbidden_roles_json === 'string' ? forbidden_roles_json : JSON.stringify(forbidden_roles_json || []),
    typeof allowed_channels_json === 'string' ? allowed_channels_json : JSON.stringify(allowed_channels_json || []),
    typeof forbidden_channels_json === 'string' ? forbidden_channels_json : JSON.stringify(forbidden_channels_json || [])
  );
  res.json({ success: true });
});

app.delete('/api/bot/word-reactions/:guildId/:id', (req, res) => {
  const { guildId, id } = req.params;
  const { deleteWordReaction } = require('./database/db');
  deleteWordReaction(guildId, id);
  res.json({ success: true });
});

app.post('/api/bot/word-reactions/settings/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { is_enabled } = req.body || {};
  const { saveWordReactionSettings } = require('./database/db');
  saveWordReactionSettings(guildId, is_enabled ? 1 : 0);
  res.json({ success: true });
});

// --- LOGO BOT SERVEUR API ---
app.get('/api/bot/server-bot-profile/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { getServerBotProfile } = require('./database/db');
  res.json(getServerBotProfile(guildId));
});

app.post('/api/bot/server-bot-profile/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { custom_logo_url, custom_name } = req.body || {};
  const { saveServerBotProfile } = require('./database/db');
  saveServerBotProfile(guildId, custom_logo_url || null, custom_name || null);
  res.json({ success: true });
});

// 11. Sauvegarder la configuration du jeu Mot Caché
app.post('/api/config/game', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { secret_phrase, reward_money, reward_xp, reward_role_id, reward_chance, is_active, reset_progress, appearance_chance, letter_emoji, announce_channel, ephemeral_letters, allowed_channels } = req.body || {};

    const phraseUpper = (secret_phrase || '').toUpperCase();

    db.prepare(`
      INSERT OR REPLACE INTO game_config (guild_id, secret_phrase, reward_money, reward_xp, reward_role_id, reward_chance, is_active, appearance_chance, letter_emoji, announce_channel, ephemeral_letters, allowed_channels)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      phraseUpper,
      reward_money !== undefined ? parseInt(reward_money) : 0,
      reward_xp !== undefined ? parseInt(reward_xp) : 0,
      reward_role_id || null,
      reward_chance !== undefined ? parseInt(reward_chance) : 0,
      is_active ? 1 : 0,
      appearance_chance !== undefined ? parseFloat(appearance_chance) : 15,
      letter_emoji || '🔍',
      announce_channel || 'dm',
      ephemeral_letters ? 1 : 0,
      Array.isArray(allowed_channels) ? JSON.stringify(allowed_channels) : (typeof allowed_channels === 'string' ? allowed_channels : '[]')
    );

    // Réinitialiser les lettres trouvées par les utilisateurs si demandé
    if (reset_progress) {
      db.prepare('DELETE FROM user_letters WHERE guild_id = ?').run(guildId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- API POUR LES GIFS D'ACTION ---

// 11. Récupérer tous les GIFs d'action du serveur
app.get('/api/config/action-gifs', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const gifs = getAllActionGifs(guildId);
    res.json(gifs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 12. Ajouter un GIF d'action
app.post('/api/config/action-gifs/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { action_name, gif_url } = req.body || {};
    if (!action_name || !gif_url) {
      return res.status(400).json({ error: 'Nom de l\'action et URL du GIF requis' });
    }

    addActionGif(guildId, action_name, gif_url);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 13. Supprimer un GIF d'action
app.post('/api/config/action-gifs/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID requis' });

    deleteActionGif(guildId, id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- RECOMPENSES PAR ACTION (KARMA & PIECES) ---
app.get('/api/config/action-rewards', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { getAllActionRewards } = require('./database/db');
    const rewards = getAllActionRewards(guildId);
    res.json(rewards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/action-rewards', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { action_name, min_money, max_money, min_karma, max_karma } = req.body || {};
    if (!action_name) return res.status(400).json({ error: 'Nom de l\'action requis' });

    const { updateActionReward } = require('./database/db');
    updateActionReward(guildId, action_name, {
      min_money: min_money !== undefined ? parseInt(min_money) : 5,
      max_money: max_money !== undefined ? parseInt(max_money) : 15,
      min_karma: min_karma !== undefined ? parseInt(min_karma) : 1,
      max_karma: max_karma !== undefined ? parseInt(max_karma) : 3
    });

    res.json({ success: true, message: 'Récompenses de l\'action sauvegardées !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/action-rewards/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { action_name } = req.body || {};
    if (!action_name) return res.status(400).json({ error: 'Nom de l\'action requis' });

    const { db } = require('./database/db');
    db.prepare('DELETE FROM action_rewards WHERE guild_id = ? AND action_name = ?').run(guildId, action_name);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- ROLE BOOSTERS ENDPOINTS ---
app.get('/api/config/role-boosters', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { getRoleBoosters } = require('./database/db');
    const boosters = getRoleBoosters(guildId);
    res.json(boosters);
  } catch (error) {
    console.error('Erreur GET /api/config/role-boosters:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/role-boosters/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { role_id, xp_multiplier, karma_multiplier, money_multiplier } = req.body || {};
    if (!role_id) return res.status(400).json({ error: 'ID de rôle requis' });

    const { addOrUpdateRoleBooster } = require('./database/db');
    addOrUpdateRoleBooster(guildId, role_id, xp_multiplier, karma_multiplier, money_multiplier);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur POST /api/config/role-boosters/add:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/role-boosters/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { role_id } = req.body || {};
    if (!role_id) return res.status(400).json({ error: 'ID de rôle requis' });

    const { deleteRoleBooster } = require('./database/db');
    deleteRoleBooster(guildId, role_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur POST /api/config/role-boosters/delete:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- INVITE TRACKER ENDPOINTS ---
app.get('/api/config/invites', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { getInviteConfig, getInviteLeaderboard } = require('./database/db');
    const config = getInviteConfig(guildId);
    const leaderboard = getInviteLeaderboard(guildId, 15);
    res.json({ config, leaderboard });
  } catch (error) {
    console.error('Erreur GET /api/config/invites:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/invites', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { log_channel_id, enabled } = req.body || {};

    const { updateInviteConfig } = require('./database/db');
    updateInviteConfig(guildId, log_channel_id || null, enabled ? 1 : 0);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur POST /api/config/invites:', error);
    res.status(500).json({ error: error.message });
  }
});

// 14. Sauvegarder la configuration d'automodération
app.post('/api/config/automod', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const {
      anti_link, anti_spam, anti_massmention, anti_badwords,
      bypass_roles, badwords_list, spam_max_msgs, massmention_limit
    } = req.body || {};

    updateAutomodConfig(guildId, {
      anti_link: anti_link ? 1 : 0,
      anti_spam: anti_spam ? 1 : 0,
      anti_massmention: anti_massmention ? 1 : 0,
      anti_badwords: anti_badwords ? 1 : 0,
      bypass_roles: bypass_roles || '',
      badwords_list: badwords_list || '',
      spam_max_msgs: spam_max_msgs !== undefined ? parseInt(spam_max_msgs) : 5,
      massmention_limit: massmention_limit !== undefined ? parseInt(massmention_limit) : 5
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- SYSTEM D'AUTO-ROLES ---

// Envoyer et enregistrer un embed d'auto-rôle
app.post('/api/config/autorole-embeds/add', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { channel_id, title, description, color, thumbnail, image_url, options, type = 'buttons', mode = 'normal', existing_message_id = null } = req.body || {};
    if (!channel_id) return res.status(400).json({ error: 'ID du salon requis' });

    // 1. Communiquer avec l'API locale du bot pour envoyer ou éditer le message
    const botApiPort = process.env.BOT_API_PORT || 49605;
    const botResponse = await fetch(`http://127.0.0.1:${botApiPort}/bot/send-autorole`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guildId,
        channelId: channel_id,
        title: title || '',
        description: description || '',
        color,
        thumbnail: thumbnail ? 1 : 0,
        imageUrl: image_url,
        options: options || [],
        type,
        mode,
        existingMessageId: existing_message_id
      })
    }).catch(() => null);

    if (!botResponse || !botResponse.ok) {
      const errText = botResponse ? await botResponse.text() : 'Le bot n\'est pas en ligne ou n\'a pas pu envoyer le message';
      return res.status(500).json({ error: `Erreur du bot : ${errText}` });
    }

    const { messageId } = await botResponse.json();

    // 2. Enregistrer dans SQLite
    addAutoroleEmbed(
      guildId, 
      messageId, 
      channel_id, 
      title || (existing_message_id ? '(Message Existant)' : 'Choix des Rôles'), 
      description || (existing_message_id ? '(Pas d\'embed)' : ''), 
      color, 
      thumbnail ? 1 : 0, 
      image_url,
      type,
      mode
    );
    
    db.prepare('DELETE FROM autorole_options WHERE message_id = ?').run(messageId);
    if (options && options.length > 0) {
      for (const opt of options) {
        addAutoroleOption(messageId, opt.role_id, opt.label, opt.emoji, opt.style || 'PRIMARY');
      }
    }

    res.json({ success: true, messageId });
  } catch (err) {
    console.error('Erreur API autorole embed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sondages API Routes
app.get('/api/config/sondages', (req, res) => {
  const guildId = req.session.selectedGuild;
  if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

  try {
    const sondages = db.prepare('SELECT * FROM sondages WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
    const list = sondages.map(s => {
      const responses = db.prepare('SELECT * FROM sondage_responses WHERE sondage_id = ?').all(s.id);
      const total = responses.length;
      const avg = total > 0 ? (responses.reduce((acc, curr) => acc + curr.rating, 0) / total).toFixed(1) : 0;
      return { ...s, total_votes: total, avg_rating: avg };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/send-sondage', async (req, res) => {
  const guildId = req.session.selectedGuild;
  if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

  try {
    const { channel_id, results_channel_id, title, description, rating_icon, text_type, color, sections, has_general_remark, avatar_image, banner_image, short_description, mentions } = req.body || {};
    if (!channel_id) return res.status(400).json({ error: 'Salon de destination requis' });
    if (!title) return res.status(400).json({ error: 'Titre du sondage requis' });

    const botApiPort = process.env.BOT_API_PORT || 49605;
    const botResponse = await fetch(`http://127.0.0.1:${botApiPort}/bot/send-sondage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guildId,
        channelId: channel_id,
        resultsChannelId: results_channel_id || null,
        title,
        description,
        ratingIcon: rating_icon || '⭐',
        textType: text_type || 'long',
        color: color || '#F1C40F',
        sections: sections || [],
        hasGeneralRemark: has_general_remark !== undefined ? has_general_remark : true,
        avatarImage: avatar_image || '',
        bannerImage: banner_image || '',
        shortDescription: short_description || '',
        mentions: mentions || []
      })
    }).catch(() => null);

    if (!botResponse || !botResponse.ok) {
      const errText = botResponse ? await botResponse.text() : 'Le bot n\'est pas en ligne';
      return res.status(500).json({ error: `Erreur du bot : ${errText}` });
    }

    const data = await botResponse.json();
    res.json({ success: true, sondageId: data.sondageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/delete-sondage', (req, res) => {
  const guildId = req.session.selectedGuild;
  if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });
  const { sondage_id } = req.body || {};
  try {
    db.prepare('DELETE FROM sondages WHERE id = ? AND guild_id = ?').run(sondage_id, guildId);
    db.prepare('DELETE FROM sondage_responses WHERE sondage_id = ?').run(sondage_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un embed d'auto-rôle
app.post('/api/config/autorole-embeds/delete', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { message_id, channel_id } = req.body || {};
    if (!message_id) return res.status(400).json({ error: 'ID de message requis' });

    // 1. Essayer de supprimer le message sur Discord
    const botApiPort = process.env.BOT_API_PORT || 49605;
    await fetch(`http://127.0.0.1:${botApiPort}/bot/delete-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, channelId: channel_id, messageId: message_id })
    }).catch(() => null);

    // 2. Supprimer de SQLite
    deleteAutoroleEmbed(guildId, message_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- SYSTEME D'ENVOI D'EMBEDS SIMPLE (MESSAGE PUR) ---
app.post('/api/config/send-simple-embed', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const {
      channel_id, title, description, color, thumbnail_url,
      image_url, author_name, author_icon, footer_text, footer_icon,
      ping_type, existing_message_id
    } = req.body || {};

    if (!channel_id) return res.status(400).json({ error: 'Salon de destination requis' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });

    const channel = guild.channels.cache.get(channel_id);
    if (!channel) return res.status(404).json({ error: 'Salon introuvable ou inaccessible' });

    const embed = new EmbedBuilder();

    if (title && title.trim()) embed.setTitle(title.trim());
    if (description && description.trim()) embed.setDescription(description.trim());
    if (color) embed.setColor(color);
    else embed.setColor('#5865F2');

    const resolveUrl = (urlStr) => {
      if (!urlStr || typeof urlStr !== 'string') return null;
      const trimmed = urlStr.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      if (trimmed.startsWith('/')) {
        const protocol = req.protocol || 'http';
        const host = req.get('host') || '127.0.0.1:49601';
        return `${protocol}://${host}${trimmed}`;
      }
      return trimmed;
    };

    if (thumbnail_url) {
      if (thumbnail_url === 'user' && req.session.user) {
        const u = req.session.user;
        const uAvatar = u.avatar 
          ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` 
          : `https://cdn.discordapp.com/embed/avatars/${(BigInt(u.id) >> 22n) % 5n}.png`;
        embed.setThumbnail(uAvatar);
      } else if (thumbnail_url === 'server') {
        const icon = guild.iconURL({ dynamic: true });
        if (icon) embed.setThumbnail(icon);
      } else if (thumbnail_url === 'bot') {
        embed.setThumbnail(client.user.displayAvatarURL({ dynamic: true }));
      } else {
        const fullThumb = resolveUrl(thumbnail_url);
        if (fullThumb) embed.setThumbnail(fullThumb);
      }
    }

    const fullImg = resolveUrl(image_url);
    if (fullImg) {
      embed.setImage(fullImg);
    }

    if (author_name && author_name.trim()) {
      const authorObj = { name: author_name.trim() };
      const fullAuthIcon = resolveUrl(author_icon);
      if (fullAuthIcon) {
        authorObj.iconURL = fullAuthIcon;
      }
      embed.setAuthor(authorObj);
    }

    if (footer_text && footer_text.trim()) {
      const footerObj = { text: footer_text.trim() };
      const fullFooterIcon = resolveUrl(footer_icon);
      if (fullFooterIcon) {
        footerObj.iconURL = fullFooterIcon;
      }
      embed.setFooter(footerObj);
    }

    embed.setTimestamp();

    let contentPayload = undefined;
    if (ping_type === 'everyone') contentPayload = '@everyone';
    else if (ping_type === 'here') contentPayload = '@here';

    let msgIdSaved = null;
    if (existing_message_id && existing_message_id.trim()) {
      const targetMsg = await channel.messages.fetch(existing_message_id.trim()).catch(() => null);
      if (!targetMsg) {
        return res.status(404).json({ error: 'Message existant introuvable dans ce salon' });
      }
      await targetMsg.edit({ content: contentPayload, embeds: [embed] });
      msgIdSaved = targetMsg.id;
    } else {
      const sentMsg = await channel.send({ content: contentPayload, embeds: [embed] });
      msgIdSaved = sentMsg.id;
    }

    try {
      deleteAutoroleEmbed(guildId, msgIdSaved);
      addAutoroleEmbed(
        guildId,
        msgIdSaved,
        channel_id,
        title || 'Embed Simple',
        description || '',
        color || '#5865F2',
        thumbnail_url ? 1 : 0,
        image_url || null,
        'simple',
        'normal'
      );
    } catch (e) {
      console.error('Erreur sauvegarde embed simple dans DB:', e);
    }

    res.json({ success: true, messageId: msgIdSaved, message: 'Message Embed envoyé/mis à jour avec succès dans le salon !' });
  } catch (error) {
    console.error('Erreur send-simple-embed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer les messages du salon depuis Discord pour édition / copie
app.get('/api/config/embeds/fetch-channel-messages', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const channelId = req.query.channelId;
    if (!channelId) return res.status(400).json({ error: 'Salon requis' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return res.status(404).json({ error: 'Salon textuel introuvable' });

    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (!messages) return res.json([]);

    const resultEmbeds = [];
    messages.forEach(msg => {
      const emb = msg.embeds.length > 0 ? msg.embeds[0] : null;
      const options = [];

      // Extraire les boutons / menus déroulants
      if (msg.components && msg.components.length > 0) {
        msg.components.forEach(row => {
          if (row.components) {
            row.components.forEach(comp => {
              if (comp.type === 2) { // Button
                const roleId = comp.customId ? comp.customId.replace('autorole_', '') : '';
                let styleStr = 'PRIMARY';
                if (comp.style === 2) styleStr = 'SECONDARY';
                else if (comp.style === 3) styleStr = 'SUCCESS';
                else if (comp.style === 4) styleStr = 'DANGER';
                let emojiStr = '';
                if (comp.emoji) {
                  emojiStr = comp.emoji.id ? (comp.emoji.animated ? `<a:${comp.emoji.name}:${comp.emoji.id}>` : `<:${comp.emoji.name}:${comp.emoji.id}>`) : (comp.emoji.name || '');
                }
                options.push({
                  role_id: roleId,
                  label: comp.label || '',
                  emoji: emojiStr,
                  style: styleStr
                });
              } else if (comp.type === 3) { // Select Menu
                if (comp.options) {
                  comp.options.forEach(opt => {
                    let emojiStr = '';
                    if (opt.emoji) {
                      emojiStr = opt.emoji.id ? (opt.emoji.animated ? `<a:${opt.emoji.name}:${opt.emoji.id}>` : `<:${opt.emoji.name}:${opt.emoji.id}>`) : (opt.emoji.name || '');
                    }
                    options.push({
                      role_id: opt.value,
                      label: opt.label || '',
                      emoji: emojiStr,
                      style: 'PRIMARY'
                    });
                  });
                }
              }
            });
          }
        });
      }

      // Extraire les émojis de réaction sous le message s'il n'y a pas de composant
      if (options.length === 0 && msg.reactions && msg.reactions.cache.size > 0) {
        msg.reactions.cache.forEach(reaction => {
          let emojiStr = reaction.emoji.id ? (reaction.emoji.animated ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>` : `<:${reaction.emoji.name}:${reaction.emoji.id}>`) : (reaction.emoji.name || '');
          options.push({
            role_id: '',
            label: '',
            emoji: emojiStr,
            style: 'PRIMARY'
          });
        });
      }

      // Déterminer l'image principale (depuis l'embed ou les pièces jointes/fichiers joints)
      let imageUrl = '';
      if (emb && emb.image && emb.image.url) {
        imageUrl = emb.image.url;
      } else if (msg.attachments && msg.attachments.size > 0) {
        const firstAtt = msg.attachments.first();
        if (firstAtt && firstAtt.url) {
          imageUrl = firstAtt.url;
        }
      }

      if (emb || options.length > 0 || msg.content || imageUrl) {
        resultEmbeds.push({
          id: msg.id,
          channel_id: channel.id,
          author: msg.author ? msg.author.tag : 'Inconnu',
          is_bot_owner: msg.author && msg.author.id === client.user.id,
          title: emb ? (emb.title || '') : '',
          description: emb ? (emb.description || (msg.content || '')) : (msg.content || ''),
          color: emb ? (emb.hexColor || '#5865F2') : '#5865F2',
          thumbnail: (emb && emb.thumbnail) ? 1 : 0,
          image_url: imageUrl,
          options: options,
          type: (msg.components && msg.components[0] && msg.components[0].components[0] && msg.components[0].components[0].type === 3) ? 'select' : (options.length > 0 && options[0].role_id === '' ? 'reactions' : 'buttons')
        });
      }
    });

    res.json(resultEmbeds);
  } catch (error) {
    console.error('Erreur fetch-channel-messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config/embeds/fetch-message-details', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const messageId = req.query.messageId;
    let channelId = req.query.channelId;
    if (!messageId) return res.status(400).json({ error: 'Message ID requis' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });

    let message = null;
    let channel = channelId ? guild.channels.cache.get(channelId) : null;
    if (channel && channel.isTextBased()) {
      message = await channel.messages.fetch(messageId).catch(() => null);
    }

    if (!message) {
      const textChannels = Array.from(guild.channels.cache.values()).filter(ch => ch.isTextBased() && ch.id !== channelId);
      const results = await Promise.all(textChannels.map(ch => ch.messages.fetch(messageId).then(m => ({ msg: m, ch })).catch(() => null)));
      const found = results.find(r => r && r.msg);
      if (found) {
        message = found.msg;
        channel = found.ch;
      }
    }

    if (!message) return res.status(404).json({ error: 'Message introuvable sur le serveur' });

    const emb = message.embeds.length > 0 ? message.embeds[0] : null;
    const options = [];

    if (message.components && message.components.length > 0) {
      message.components.forEach(row => {
        if (row.components) {
          row.components.forEach(comp => {
            if (comp.type === 2) {
              const roleId = comp.customId ? comp.customId.replace('autorole_', '') : '';
              let styleStr = 'PRIMARY';
              if (comp.style === 2) styleStr = 'SECONDARY';
              else if (comp.style === 3) styleStr = 'SUCCESS';
              else if (comp.style === 4) styleStr = 'DANGER';
              let emojiStr = comp.emoji ? (comp.emoji.id ? (comp.emoji.animated ? `<a:${comp.emoji.name}:${comp.emoji.id}>` : `<:${comp.emoji.name}:${comp.emoji.id}>`) : comp.emoji.name) : '';
              options.push({ role_id: roleId, label: comp.label || '', emoji: emojiStr, style: styleStr });
            } else if (comp.type === 3 && comp.options) {
              comp.options.forEach(opt => {
                let emojiStr = opt.emoji ? (opt.emoji.id ? (opt.emoji.animated ? `<a:${opt.emoji.name}:${opt.emoji.id}>` : `<:${opt.emoji.name}:${opt.emoji.id}>`) : opt.emoji.name) : '';
                options.push({ role_id: opt.value, label: opt.label || '', emoji: emojiStr, style: 'PRIMARY' });
              });
            }
          });
        }
      });
    }

    if (options.length === 0 && message.reactions && message.reactions.cache.size > 0) {
      message.reactions.cache.forEach(reaction => {
        let emojiStr = reaction.emoji.id ? (reaction.emoji.animated ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>` : `<:${reaction.emoji.name}:${reaction.emoji.id}>`) : reaction.emoji.name;
        options.push({ role_id: '', label: '', emoji: emojiStr, style: 'PRIMARY' });
      });
    }

    let imageUrl = '';
    if (emb && emb.image && emb.image.url) {
      imageUrl = emb.image.url;
    } else if (message.attachments && message.attachments.size > 0) {
      const firstAtt = message.attachments.first();
      if (firstAtt && firstAtt.url) imageUrl = firstAtt.url;
    }

    res.json({
      id: message.id,
      channel_id: channel.id,
      author: message.author ? message.author.tag : 'Inconnu',
      is_bot_owner: message.author && message.author.id === client.user.id,
      title: emb ? (emb.title || '') : '',
      description: emb ? (emb.description || (message.content || '')) : (message.content || ''),
      color: emb ? (emb.hexColor || '#5865F2') : '#5865F2',
      thumbnail: (emb && emb.thumbnail) ? 1 : 0,
      image_url: imageUrl,
      options: options,
      type: (message.components && message.components[0] && message.components[0].components[0] && message.components[0].components[0].type === 3) ? 'select' : (options.length > 0 && options[0].role_id === '' ? 'reactions' : 'buttons')
    });
  } catch (err) {
    console.error('Erreur fetch-message-details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Routes publiques pour l'application Formulaire Web (style Google Forms)
app.get('/api/form/:sondageId', (req, res) => {
  try {
    const sondageId = req.params.sondageId;
    const sondage = db.prepare('SELECT * FROM sondages WHERE id = ?').get(sondageId);
    if (!sondage) return res.status(404).json({ error: 'Formulaire introuvable en base de données' });
    res.json(sondage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/google-forms/webhook', async (req, res) => {
  try {
    const { sondageId, userEmail, answers } = req.body || {};
    const querySondageId = req.query.sondage_id || sondageId;

    if (!querySondageId) {
      return res.status(400).json({ error: 'ID de sondage manquant dans la requête' });
    }

    const botApiPort = process.env.BOT_API_PORT || 49605;
    const botResponse = await fetch(`http://127.0.0.1:${botApiPort}/bot/submit-google-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sondageId: querySondageId,
        userEmail: userEmail || '',
        answers: answers || []
      })
    }).catch(() => null);

    if (!botResponse || !botResponse.ok) {
      const errText = botResponse ? await botResponse.text() : 'Le bot n\'est pas en ligne';
      return res.status(500).json({ error: errText });
    }

    res.json({ success: true, message: 'Réponse transmise avec succès au Bot Discord !' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-rôles à l'arrivée
app.post('/api/config/autoroles-on-join/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { role_id } = req.body || {};
    if (!role_id) return res.status(400).json({ error: 'Rôle requis' });

    addAutoroleOnJoin(guildId, role_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/autoroles-on-join/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { role_id } = req.body || {};
    if (!role_id) return res.status(400).json({ error: 'Rôle requis' });

    deleteAutoroleOnJoin(guildId, role_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-rôles sur obtention
app.post('/api/config/autoroles-on-role/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { trigger_role_id, target_role_id } = req.body || {};
    if (!trigger_role_id || !target_role_id) return res.status(400).json({ error: 'Rôles requis' });

    addAutoroleOnRole(guildId, trigger_role_id, target_role_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/autoroles-on-role/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { trigger_role_id, target_role_id } = req.body || {};
    if (!trigger_role_id || !target_role_id) return res.status(400).json({ error: 'Rôles requis' });

    deleteAutoroleOnRole(guildId, trigger_role_id, target_role_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// API Permisions & Contrôle d'accès des Commandes Slash
app.get('/api/config/command-permissions', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const { getAllCommandPermissions } = require('./database/db');
    const dbPerms = getAllCommandPermissions(guildId);
    const permMap = new Map();
    for (const p of dbPerms) {
      permMap.set(p.command_name, p);
    }

    const commandList = [];
    if (client && client.commands) {
      client.commands.forEach((cmd, name) => {
        const cmdName = cmd.data ? cmd.data.name : name;
        const cmdDesc = cmd.data ? cmd.data.description : (cmd.description || '');
        const cmdCat = cmd.category || 'Général';

        const dbP = permMap.get(cmdName) || {};
        let allowedRoles = [];
        let deniedRoles = [];
        let allowedUsers = [];
        try { allowedRoles = JSON.parse(dbP.allowed_roles || '[]'); } catch (e) {}
        try { deniedRoles = JSON.parse(dbP.denied_roles || '[]'); } catch (e) {}
        try { allowedUsers = JSON.parse(dbP.allowed_users || '[]'); } catch (e) {}

        commandList.push({
          name: cmdName,
          description: cmdDesc,
          category: cmdCat,
          enabled: dbP.enabled !== undefined ? Boolean(dbP.enabled) : true,
          allowed_roles: allowedRoles,
          denied_roles: deniedRoles,
          allowed_users: allowedUsers
        });
      });
    }

    commandList.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    res.json(commandList);
  } catch (err) {
    console.error('Erreur GET /api/config/command-permissions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/command-permissions', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const { command_name, enabled, allowed_roles, denied_roles, allowed_users } = req.body || {};
    if (!command_name) return res.status(400).json({ error: 'Nom de commande manquant' });

    const { setCommandPermission } = require('./database/db');
    setCommandPermission(guildId, command_name, {
      enabled: enabled !== undefined ? enabled : true,
      allowed_roles: allowed_roles || [],
      allowed_users: allowed_users || [],
      denied_roles: denied_roles || []
    });

    res.json({ success: true, message: `Permissions de la commande /${command_name} mises à jour avec succès.` });
  } catch (err) {
    console.error('Erreur POST /api/config/command-permissions:', err);
    res.status(500).json({ error: err.message });
  }
});

// API SYSTÈME DE QUÊTES & MISSIONS
app.get('/api/config/quests', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const { getQuests } = require('./database/db');
    const quests = getQuests(guildId);
    const parsedQuests = quests.map(q => {
      let channels = [];
      try { channels = JSON.parse(q.channel_ids || '[]'); } catch (e) {}
      return {
        ...q,
        channel_ids: channels
      };
    });
    res.json(parsedQuests);
  } catch (err) {
    console.error('Erreur GET /api/config/quests:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/quests/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const { addQuest } = require('./database/db');
    addQuest(guildId, req.body);
    res.json({ success: true, message: 'Quête ajoutée avec succès !' });
  } catch (err) {
    console.error('Erreur POST /api/config/quests/add:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/quests/update', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const { id, ...data } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID de quête manquant' });

    const { updateQuest } = require('./database/db');
    updateQuest(id, data);
    res.json({ success: true, message: 'Quête mise à jour avec succès !' });
  } catch (err) {
    console.error('Erreur POST /api/config/quests/update:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/quests/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID de quête manquant' });

    const { deleteQuest } = require('./database/db');
    deleteQuest(id);
    res.json({ success: true, message: 'Quête supprimée avec succès !' });
  } catch (err) {
    console.error('Erreur POST /api/config/quests/delete:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/autoroles-on-role/sync', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { db } = require('./database/db');
    const triggerRoles = db.prepare('SELECT trigger_role_id, target_role_id FROM autoroles_on_role WHERE guild_id = ?').all(guildId);
    if (triggerRoles.length === 0) {
      return res.json({ success: true, syncCount: 0, errorCount: 0, message: "Aucune liaison configurée" });
    }

    const members = await guild.members.fetch();
    const botMember = guild.members.me;
    let syncCount = 0;
    let errorCount = 0;

    for (const member of members.values()) {
      if (member.user.bot) continue;

      for (const rule of triggerRoles) {
        if (member.roles.cache.has(rule.trigger_role_id)) {
          if (!member.roles.cache.has(rule.target_role_id)) {
            const targetRole = guild.roles.cache.get(rule.target_role_id);
            if (targetRole && targetRole.position < botMember.roles.highest.position) {
              try {
                await member.roles.add(rule.target_role_id);
                syncCount++;
              } catch (e) {
                errorCount++;
              }
            }
          }
        }
      }
    }

    res.json({ success: true, syncCount, errorCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- SYSTEM DE COMPTAGE (COUNTING) ---

app.post('/api/config/counting/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { channel_id, mode, start_number, emoji_success, emoji_error, emoji_highscore, emoji_chance } = req.body || {};
    if (!channel_id || !mode) return res.status(400).json({ error: 'Informations incomplètes' });

    const num = start_number !== undefined ? parseFloat(start_number) : 0;
    const { addCountingChannel } = require('./database/db');
    addCountingChannel(
      guildId, 
      channel_id, 
      mode, 
      num, 
      emoji_success || '✅', 
      emoji_error || '❌', 
      emoji_highscore || '🏆', 
      emoji_chance || '🍀'
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/counting/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { channel_id } = req.body || {};
    if (!channel_id) return res.status(400).json({ error: 'ID requis' });

    deleteCountingChannel(guildId, channel_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINTS ANNONCES & PRÉSENTATIONS DANS LES SALONS ---

app.post('/api/config/announce-features', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const { channel_id } = req.body || {};
    if (!channel_id) return res.status(400).json({ error: 'Salon de destination requis' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });

    const channel = guild.channels.cache.get(channel_id);
    if (!channel) return res.status(404).json({ error: 'Salon introuvable' });

    const embed = new EmbedBuilder()
      .setTitle(`✨ 👑 ${guild.name.toUpperCase()} — PRÉSENTATION DES FONCTIONNALITÉS EXCLUSIVES 👑 ✨`)
      .setDescription(
        `Bienvenue sur le serveur **${guild.name}** ! Voici un guide complet des fonctionnalités et systèmes exclusifs mis à votre disposition par notre bot :\n\n` +
        `🍷 **1. Économie, Banque & Karma Séducteur**\n` +
        `• Gagnez des pièces et du Karma en écrivant dans les salons et avec \`/work\`, \`/crime\`, \`/daily\`.\n` +
        `• Économisez à la \`/banque\` et débloquez jusqu'à **-20% de réduction** automatique en boutique grâce à votre Karma.\n\n` +
        `👑 **2. Suites Privées VIP Temporaires**\n` +
        `• Louez votre propre havre de paix personnalisé pendant 24h, 7 jours ou 1 mois via \`/boutique\`.\n` +
        `• Un salon textuel et un salon vocal privés sont créés automatiquement avec un panneau de contrôle pour inviter ou exclure des membres.\n\n` +
        `💋 **3. Boutique & Cadeaux d'Intimité (IA)**\n` +
        `• Catalogue d'objets sensuels, BDSM, sexy et réconfortants dans \`/boutique\`.\n` +
        `• Offrez des cadeaux à d'autres membres : l'IA génère un **message d'offrande torride et unique** dans le salon !\n` +
        `• Gerez et utilisez vos objets depuis votre \`/inventaire\` privé.\n\n` +
        `🎲 **4. Action ou Vérité Adultes (NSFW)**\n` +
        `• Lancez \`/action-verite\` (Niveaux Soft, Hard, Extrême, Couple) avec des questions et défis osés inédits.\n` +
        `• Utilisez des commandes d'action (\`/calin\`, \`/embrasser\`, \`/fesser\`, \`/caresser\`, etc.) générées par l'IA et accompagnées de GIFs.\n\n` +
        `⚖️ **5. Tribunal & Système de Jugement**\n` +
        `• Ouvrez des procès avec \`/tribunal create\` : rôles attribués (Juge, Avocat, Accusé) et salon fermé après délibération.\n\n` +
        `🔢 **6. Salons de Comptage & Jokers de Sauvegarde**\n` +
        `• Participez aux salons de comptage (modes Normal, Inversé, Mathématique) et utilisez la \`🍀 Chance de Comptage\` pour sauver les erreurs !\n\n` +
        `📜 **7. Système de Quêtes & Missions**\n` +
        `• Accomplissez des missions hebdomadaires et montez en niveau pour débloquer des rôles et bonus d'XP.`
      )
      .setColor('#E74C3C');

    const iconUrl = guild.iconURL({ dynamic: true });
    if (iconUrl) {
      embed.setThumbnail(iconUrl);
      embed.setFooter({ text: '💋 B&G Elite • Système d\'Animation & Privilèges VIP', iconURL: iconUrl });
    } else {
      embed.setFooter({ text: '💋 B&G Elite • Système d\'Animation & Privilèges VIP' });
    }
    embed.setTimestamp();

    await channel.send({ embeds: [embed] });
    res.json({ success: true, message: 'Embed de présentation des fonctionnalités envoyé avec succès !' });
  } catch (error) {
    console.error('Erreur announce-features:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/announce-commands', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    const { channel_id } = req.body || {};
    if (!channel_id) return res.status(400).json({ error: 'Salon de destination requis' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });

    const channel = guild.channels.cache.get(channel_id);
    if (!channel) return res.status(404).json({ error: 'Salon introuvable' });

    const iconUrl = guild.iconURL({ dynamic: true });

    // 1. EMBED COMMANDES PUBLIQUES (POUR TOUS LES MEMBRES)
    const embedPublic = new EmbedBuilder()
      .setTitle(`📜 🤖 CATALOGUE DES COMMANDES — ACCESSIBLES À TOUS 🤖 📜`)
      .setDescription(`Retrouvez ci-dessous l'ensemble des commandes et actions interactives disponibles pour tous les membres sur **${guild.name}** :`)
      .addFields(
        { 
          name: '💰 Économie, Banque, Boutique & Inventaire', 
          value: '`/solde` — Solde portefeuille & compte bancaire\n`/deposer` — Déposer des pièces à la banque\n`/retirer` — Retirer des pièces de la banque\n`/travailler` — Travailler pour gagner des pièces & karma\n`/daily` — Prime quotidienne gratuite\n`/pecher` — Attraper des poissons et des pièces\n`/crime` — Tenter un crime osé pour gagner gros\n`/voler` — Tenter de voler des pièces à un autre membre\n`/donner` — Transférer des pièces à un membre\n`/karma` — Consulter son Karma & réductions boutique\n`/quetes` — Missions & quêtes du serveur\n`/boutique` — Catalogue VIP & Louer des Suites Privées\n`/inventaire` — Sac à dos (Utiliser, Offrir, Jeter)',
          inline: false 
        },
        { 
          name: '🤝 Actions SFW & Amicales', 
          value: '`/gifle` • `/patpat` • `/batailleoreiller` • `/chatouiller` • `/cuisiner` • `/danser` • `/reconforter` • `/reveiller` • `/rose` • `/vin` • `/attrape` • `/dormir` • `/douche` • `/reanimer` • `/oups`',
          inline: false 
        },
        { 
          name: '🍷 Actions RP Adulte, Torrides & Sensuelles (NSFW)', 
          value: '`/calin` • `/embrasser` • `/caresser` • `/flirter` • `/seduire` • `/lit` • `/branler` • `/doigter` • `/fuck` • `/sodo` • `/sucer` • `/orgasme` • `/orgie` • `/deshabiller` • `/lecher` • `/masser` • `/mordre` • `/mouiller` • `/touche` • `/69` • `/collier` • `/laisse` • `/ordonner` • `/punir` • `/tirercheveux` • `/tromper` • `/agenouiller`',
          inline: false 
        },
        { 
          name: '🎮 Mini-Jeux, Fun & Confessions', 
          value: '`/action-verite` — Partie Action ou Vérité (Soft, Hard, Extrême, Couple)\n`/confesser` — Envoyer une confession anonyme\n`/mot-cache` — Jeu du mot ou de la phrase mystère\n`/uno` — Jouer au UNO interactif avec cartes animées\n`/star` — Voir la star élue de la semaine et le classement\n`/lovecalc` — Calculer la compatibilité amoureuse\n`/proche` — Trouver le membre géographiquement le plus proche\n`/mapville` — Définir votre ville/localisation sur la carte des membres',
          inline: false 
        },
        { 
          name: '⚙️ Profil, Niveaux & Accès', 
          value: '`/niveau` (ou `/level`) — Carte XP, Niveau & Rang actuel\n`/classement` — Classement général XP du serveur\n`/dashboard` — Lien d\'accès au panneau Web',
          inline: false 
        }
      )
      .setColor('#5865F2');

    if (iconUrl) {
      embedPublic.setThumbnail(iconUrl);
      embedPublic.setFooter({ text: '🌐 Commandes Publiques • B&G Elite', iconURL: iconUrl });
    } else {
      embedPublic.setFooter({ text: '🌐 Commandes Publiques • B&G Elite' });
    }
    embedPublic.setTimestamp();

    // 2. EMBED COMMANDES ADMINS & MODÉRATION (STAFF)
    const embedStaff = new EmbedBuilder()
      .setTitle(`🛡️ ⚖️ COMMANDES D'ADMINISTRATION & MODÉRATION STAFF ⚖️ 🛡️`)
      .setDescription(`Guide réservé à l'équipe de modération et d'administration du serveur **${guild.name}** :`)
      .addFields(
        { 
          name: '⚖️ Tribunal Discord & Procès', 
          value: '`/tribunal create` — Ouvrir un procès (Salon dédié, Rôles Juge, Avocat, Accusé)\n`/tribunal verdict` — Rendre le jugement final et appliquer la sentence\n`/tribunal close` — Clore et archiver la session de procès',
          inline: false 
        },
        { 
          name: '🛡️ Sécurité, Sanctions & Quarantaine', 
          value: '`/quarantaine` — Placer / Retirer un membre de quarantaine anti-raid\n`/clear` — Purge rapide de messages dans un salon\n`/warn` — Ajouter / Retirer / Voir les avertissements d\'un membre\n`/timeout` — Mettre en sourdine / Rendre la parole\n`/kick` — Expulser un membre du serveur\n`/ban` — Bannir / Débannir un membre\n`/massban` — Bannissement groupé d\'utilisateurs\n`/masskick` — Expulsion groupée d\'utilisateurs',
          inline: false 
        },
        { 
          name: '🛠️ Outils & Gestion du Bot', 
          value: '`/ajoute` — Ajouter des pièces, du karma ou de l\'XP (Admin)\n`/sync-autoroles` — Synchroniser les rôles réaction rétroactivement\n`/drop-argent` — Largage de pièces dans le salon\n`/drop-karma` — Largage de karma dans le salon\n`/drop-xp` — Largage d\'XP dans le salon\n`Clic droit > Ajouter Émoji` — Ajouter un émoji sur le serveur depuis un message',
          inline: false 
        }
      )
      .setColor('#E74C3C');

    if (iconUrl) {
      embedStaff.setThumbnail(iconUrl);
      embedStaff.setFooter({ text: '🛡️ Commandes Modération & Staff • B&G Elite', iconURL: iconUrl });
    } else {
      embedStaff.setFooter({ text: '🛡️ Commandes Modération & Staff • B&G Elite' });
    }
    embedStaff.setTimestamp();

    await channel.send({ embeds: [embedPublic, embedStaff] });
    res.json({ success: true, message: 'Embeds des commandes publiques et modération envoyés avec succès !' });
  } catch (error) {
    console.error('Erreur announce-commands:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- CARTE DES MEMBRES (MAP LOCATIONS) ---

app.get('/api/config/map-locations', async (req, res) => {
  try {
    const guildId = (req.query && req.query.guild) || (req.query && req.query.guildId) || (req.session && req.session.selectedGuild);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const locations = db.prepare('SELECT * FROM member_locations WHERE guild_id = ?').all(guildId);
    
    const guild = client.guilds.cache.get(guildId);
    if (guild && locations.length > 0) {
      const userIds = locations.map(loc => loc.user_id);
      await guild.members.fetch({ user: userIds }).catch(() => null);
    }

    const formatted = locations.map(loc => {
      const member = guild ? guild.members.cache.get(loc.user_id) : null;
      return {
        ...loc,
        username: member ? (member.displayName || member.user.username) : `Utilisateur (${loc.user_id})`,
        avatar: member ? member.user.displayAvatarURL({ dynamic: true }) : 'https://cdn.discordapp.com/embed/avatars/0.png'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/map-locations/delete', async (req, res) => {
  try {
    const guildId = (req.body && req.body.guild) || (req.body && req.body.guildId) || (req.session && req.session.selectedGuild);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });

    if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });

    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'ID requis' });

    // Si l'utilisateur supprime sa propre localisation, on autorise directement.
    // Sinon, on vérifie qu'il dispose des droits d'administrateur.
    if (req.session.user.id !== user_id) {
      const member = await guild.members.fetch(req.session.user.id).catch(() => null);
      if (!member || (!member.permissions.has(PermissionFlagsBits.Administrator) && guild.ownerId !== req.session.user.id)) {
        return res.status(403).json({ error: 'Permission refusée (Administrateur requis pour supprimer la position des autres)' });
      }
    }

    db.prepare('DELETE FROM member_locations WHERE guild_id = ? AND user_id = ?').run(guildId, user_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/map-image', async (req, res) => {
  try {
    const { pt } = req.query;
    if (!pt) return res.status(400).send('Missing pt parameter');

    const yandexUrl = `https://static-maps.yandex.ru/1.x/?l=map&size=600,450&pt=${pt}`;
    
    const response = await fetch(yandexUrl);
    if (!response.ok) {
      return res.status(response.status).send('Error fetching map from provider');
    }

    res.setHeader('Content-Type', 'image/png');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error in /api/map-image:', error);
    res.status(500).send('Internal Server Error');
  }
});

// --- CONFIGURATION DU KARMA & RÉCOMPENSES ---

app.get('/api/config/karma', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const config = getKarmaConfig(guildId);
    res.json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/karma', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { 
      is_active, 
      announce_rewards, 
      threshold_1, 
      xp_mult_1, 
      discount_1, 
      threshold_2, 
      xp_mult_2, 
      discount_2, 
      threshold_3, 
      xp_mult_3, 
      discount_3 
    } = req.body || {};

    updateKarmaConfig(guildId, {
      is_active: is_active ? 1 : 0,
      announce_rewards: announce_rewards ? 1 : 0,
      threshold_1: parseInt(threshold_1) || 20,
      xp_mult_1: parseFloat(xp_mult_1) || 1.2,
      discount_1: parseFloat(discount_1) || 5,
      threshold_2: parseInt(threshold_2) || 50,
      xp_mult_2: parseFloat(xp_mult_2) || 1.5,
      discount_2: parseFloat(discount_2) || 10,
      threshold_3: parseInt(threshold_3) || 100,
      xp_mult_3: parseFloat(xp_mult_3) || 2.0,
      discount_3: parseFloat(discount_3) || 20
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- CONFIGURATION DES FORUMS ILLIMITÉS ---

app.get('/api/config/unlimited-forums', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const channels = getUnlimitedForums(guildId);
    res.json({ channels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/unlimited-forums', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { channels } = req.body || {};
    if (!Array.isArray(channels)) return res.status(400).json({ error: 'Channels must be an array' });

    updateUnlimitedForums(guildId, channels);
    
    // Déclencher le scan pour réouvrir sur-le-champ les fils archivés
    const { scanAndReopenAllUnlimitedForums } = require('./utils/forums');
    scanAndReopenAllUnlimitedForums(client).catch(console.error);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- CONFIGURATION DE L'AUTO-THREAD ---

app.get('/api/config/autothread', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const channels = getAutoThreadChannels(guildId);
    res.json({ channels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/autothread', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { channels } = req.body || {};
    if (!Array.isArray(channels)) return res.status(400).json({ error: 'Channels must be an array' });

    updateAutoThreadChannels(guildId, channels);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- CONFIGURATION D'ACTION OU VÉRITÉ ---

app.get('/api/config/action-verite', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const items = getActionVeriteItems(guildId);
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/action-verite/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { type, category, content } = req.body || {};
    if (!type || !category || !content) return res.status(400).json({ error: 'Missing fields' });

    addActionVeriteItem(guildId, type, category, content.trim());
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/action-verite/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID requis' });

    deleteActionVeriteItem(guildId, id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config/action-verite/channels', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const config = getActionVeriteConfig(guildId);
    res.json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/action-verite/channels', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { sfw_channel_id, nsfw_channel_id } = req.body || {};

    updateActionVeriteConfig(guildId, {
      sfw_channel_id: sfw_channel_id || null,
      nsfw_channel_id: nsfw_channel_id || null
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- CONFIGURATION DU SYSTÈME DE TICKETS ---

app.get('/api/config/tickets', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const panels = getTicketPanels(guildId);
    const options = getTicketOptions(guildId);
    res.json({ panels, options });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/tickets/panel/add', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { title, description, color, thumbnail, selector_type, channel_id, image_url, allowed_options } = req.body || {};

    const result = addTicketPanel(guildId, {
      title: title || '🎫 Support / Tickets',
      description: description || '',
      color: color || '#5865F2',
      thumbnail: thumbnail ? 1 : 0,
      selector_type: selector_type || 'select',
      channel_id: channel_id || null,
      image_url: image_url || null,
      allowed_options: allowed_options || []
    });

    const panelId = result.lastInsertRowid;

    if (channel_id) {
      const { sendOrUpdateTicketPanel } = require('./utils/tickets');
      const sendRes = await sendOrUpdateTicketPanel(panelId, client);
      if (!sendRes.success) {
        return res.json({ success: true, panelId, warning: sendRes.error });
      }
    }

    res.json({ success: true, panelId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/tickets/panel/update', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { id, title, description, color, thumbnail, selector_type, channel_id, image_url, allowed_options } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing panel ID' });

    updateTicketPanelById(id, {
      title: title || '🎫 Support / Tickets',
      description: description || '',
      color: color || '#5865F2',
      thumbnail: thumbnail ? 1 : 0,
      selector_type: selector_type || 'select',
      channel_id: channel_id || null,
      image_url: image_url || null,
      allowed_options: allowed_options || []
    });

    if (channel_id) {
      const { sendOrUpdateTicketPanel } = require('./utils/tickets');
      const sendRes = await sendOrUpdateTicketPanel(id, client, true);
      if (!sendRes.success) {
        return res.json({ success: true, warning: sendRes.error });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour forcer le renvoi de l'embed principal d'un panel de tickets dans le salon
app.post('/api/config/tickets/panel/resend', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID de panel requis' });

    const { sendOrUpdateTicketPanel } = require('./utils/tickets');
    const sendRes = await sendOrUpdateTicketPanel(id, client, true);

    if (!sendRes.success) {
      return res.status(400).json({ error: sendRes.error });
    }

    res.json({ success: true, message: 'Embed principal renvoyé avec succès dans le salon !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de réactualisation & resynchronisation globale des salons et panels d'embeds
app.post('/api/config/sync-channels', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { sendOrUpdateTicketPanel } = require('./utils/tickets');
    const { getTicketPanels } = require('./database/db');
    const panels = getTicketPanels(guildId);

    let resendCount = 0;
    for (const p of panels) {
      if (p.channel_id) {
        const result = await sendOrUpdateTicketPanel(p.id, client, true);
        if (result.success) resendCount++;
      }
    }

    res.json({ success: true, message: `Resynchronisation effectuée ! ${resendCount} panel(s) d'embeds renvoyé(s) à neuf dans vos salons.` });
  } catch (error) {
    console.error('Erreur /api/config/sync-channels:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/tickets/panel/delete', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing panel ID' });

    const panel = getTicketPanelById(id);
    if (panel && panel.channel_id && panel.message_id) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const channel = await guild.channels.fetch(panel.channel_id).catch(() => null);
        if (channel) {
          const msg = await channel.messages.fetch(panel.message_id).catch(() => null);
          if (msg) await msg.delete().catch(() => null);
        }
      }
    }

    deleteTicketPanel(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- CONFIGURATION MULTI-CLÉS ET PROVIDERS IA (GROQ & GEMINI) ---

app.get('/api/config/ai', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const keys = getAiKeys();
    const config = getAiConfig(guildId);
    res.json({ keys, config });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/ai/keys/add', (req, res) => {
  try {
    const { provider, category, api_key, label } = req.body || {};
    if (!provider || !api_key) {
      return res.status(400).json({ error: 'Fournisseur et Clé API requis' });
    }

    addAiKey(provider, category || 'all', api_key, label);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/ai/keys/update', (req, res) => {
  try {
    const { id, provider, category, api_key, label } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID de clé manquant' });

    const updates = {};
    if (provider) updates.provider = provider;
    if (category) updates.category = category;
    if (label !== undefined) updates.label = label;
    if (api_key) updates.api_key = api_key.trim();

    updateAiKey(id, updates);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/ai/keys/toggle', (req, res) => {
  try {
    const { id, is_active } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID de clé manquant' });

    updateAiKey(id, { is_active: is_active ? 1 : 0 });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- API ROLE BOOSTERS ---

app.get('/api/config/role-boosters', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { getRoleBoosters } = require('./database/db');
    const boosters = getRoleBoosters(guildId);
    res.json(boosters);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config/role-boosters/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { role_id, xp_multiplier, karma_multiplier, money_multiplier } = req.body || {};
    if (!role_id) return res.status(400).json({ error: 'Rôle requis' });

    const { addOrUpdateRoleBooster } = require('./database/db');
    addOrUpdateRoleBooster(guildId, role_id, xp_multiplier, karma_multiplier, money_multiplier);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config/role-boosters/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { role_id } = req.body || {};
    if (!role_id) return res.status(400).json({ error: 'Rôle requis' });

    const { deleteRoleBooster } = require('./database/db');
    deleteRoleBooster(guildId, role_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- API INVITE TRACKER ---

app.get('/api/config/invites', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { getInviteConfig, getInviteLeaderboard } = require('./database/db');
    const config = getInviteConfig(guildId);
    const leaderboard = getInviteLeaderboard(guildId, 20);
    res.json({ config, leaderboard });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config/invites', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { log_channel_id, enabled } = req.body || {};
    const { updateInviteConfig } = require('./database/db');
    updateInviteConfig(guildId, log_channel_id, enabled);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config/ai/keys/delete', (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID de clé manquant' });

    deleteAiKey(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/ai/keys/test', async (req, res) => {
  try {
    const { provider, api_key } = req.body || {};
    if (!provider || !api_key) {
      return res.status(400).json({ error: 'Fournisseur et Clé API requis' });
    }

    const { testAiKey } = require('./utils/aiManager');
    const result = await testAiKey(provider, api_key);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/ai/config/update', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { preferred_provider, groq_text_model, groq_vision_model, groq_server_model, gemini_model } = req.body || {};

    updateAiConfig(guildId, {
      preferred_provider: preferred_provider || 'auto',
      groq_text_model: groq_text_model || 'llama-3.3-70b-versatile',
      groq_vision_model: groq_vision_model || 'llama-3.2-11b-vision-preview',
      groq_server_model: groq_server_model || 'llama-3.3-70b-versatile',
      gemini_model: gemini_model || 'gemini-2.0-flash'
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les configurations de gains pour toutes les actions
app.get('/api/config/action-rewards', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const fs = require('fs');
    const path = require('path');
    const actionsDir = path.join(__dirname, 'commands/actions');
    const actionFiles = fs.existsSync(actionsDir) ? fs.readdirSync(actionsDir).filter(f => f.endsWith('.js')) : [];
    const actionNames = actionFiles.map(f => f.replace('.js', ''));

    const { getActionReward } = require('./database/db');
    const rewards = actionNames.map(name => getActionReward(guildId, name));

    res.json(rewards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour les gains d'une action
app.post('/api/config/action-rewards', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { action_name, min_money, max_money, min_karma, max_karma } = req.body || {};
    if (!action_name) return res.status(400).json({ error: 'Nom de l\'action requis' });

    const { updateActionReward } = require('./database/db');
    updateActionReward(guildId, action_name, {
      min_money: parseInt(min_money) || 0,
      max_money: parseInt(max_money) || 0,
      min_karma: parseInt(min_karma) || 0,
      max_karma: parseInt(max_karma) || 0
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/tickets/options/add', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { id, label, value, emoji, button_style, category_id, required_role_id, support_roles, ping_users, description, member_roles_add, member_roles_remove, certify_roles_add, certify_roles_remove, show_member_button, show_certify_button, require_age_verification, min_age_required, age_verified_role_id, age_verification_log_channel } = req.body || {};
    if (!label || !value) return res.status(400).json({ error: 'Libellé et valeur requis' });

    const optionData = {
      label,
      value: value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      emoji: emoji || null,
      button_style: button_style || 'Primary',
      category_id: category_id || null,
      required_role_id: required_role_id || null,
      support_roles: Array.isArray(support_roles) ? support_roles : [],
      ping_users: Array.isArray(ping_users) ? ping_users : [],
      description: description || null,
      member_roles_add: Array.isArray(member_roles_add) ? member_roles_add : [],
      member_roles_remove: Array.isArray(member_roles_remove) ? member_roles_remove : [],
      certify_roles_add: Array.isArray(certify_roles_add) ? certify_roles_add : [],
      certify_roles_remove: Array.isArray(certify_roles_remove) ? certify_roles_remove : [],
      show_member_button: (show_member_button === true || show_member_button === 1 || show_member_button === 'true') ? 1 : 0,
      show_certify_button: (show_certify_button === true || show_certify_button === 1 || show_certify_button === 'true') ? 1 : 0,
      require_age_verification: (require_age_verification === true || require_age_verification === 1 || require_age_verification === 'true') ? 1 : 0,
      min_age_required: parseInt(min_age_required) || 18,
      age_verified_role_id: age_verified_role_id || null,
      age_verification_log_channel: age_verification_log_channel || null
    };

    if (id) {
      const { updateTicketOption } = require('./database/db');
      updateTicketOption(guildId, id, optionData);
    } else {
      addTicketOption(guildId, optionData);
    }

    // Mettre à jour les panels existants s'ils sont déjà envoyés
    const panels = getTicketPanels(guildId);
    for (const p of panels) {
      if (p.channel_id) {
        const { sendOrUpdateTicketPanel } = require('./utils/tickets');
        await sendOrUpdateTicketPanel(p.id, client, true).catch(console.error);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/tickets/options/delete', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID requis' });

    deleteTicketOption(guildId, id);

    // Mettre à jour les panels existants
    const panels = getTicketPanels(guildId);
    for (const p of panels) {
      if (p.channel_id) {
        const { sendOrUpdateTicketPanel } = require('./utils/tickets');
        await sendOrUpdateTicketPanel(p.id, client, true).catch(console.error);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTES WEBAPP VÉRIFICATION D'ÂGE ---

app.get('/api/verify-age/session', (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'Jeton de vérification manquant' });

    const { getAgeVerificationSession } = require('./database/db');
    const session = getAgeVerificationSession(token);
    if (!session) return res.status(404).json({ error: 'Session de vérification introuvable ou expirée' });

    res.json({
      id: session.id,
      guild_id: session.guild_id,
      user_id: session.user_id,
      min_age: session.min_age || 18,
      status: session.status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/verify-age.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/verify-age.html'));
});

app.get('/verify-age', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/verify-age.html'));
});

app.post('/api/verify-age/process', async (req, res) => {
  try {
    const { token, method, image, birthDate } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Jeton de vérification requis' });
    if (!method || !['facial', 'document'].includes(method)) return res.status(400).json({ error: 'Méthode de vérification invalide' });

    const { getAgeVerificationSession, completeAgeVerification, db } = require('./database/db');
    const session = getAgeVerificationSession(token);
    if (!session) return res.status(404).json({ error: 'Session introuvable ou expirée' });
    if (session.status === 'verified') return res.status(400).json({ error: 'Vérification déjà effectuée' });

    const minAge = session.min_age || 18;
    if (!image || typeof image !== 'string' || image.length < 500) {
      return res.status(400).json({ error: 'Image invalide ou incomplète. Veuillez soumettre une photo nette.' });
    }

    const { analyzeAgeWithAi } = require('./utils/aiManager');
    const aiAnalysis = await analyzeAgeWithAi(image, method, minAge, birthDate);
    const estimatedAge = aiAnalysis.age;

    if (!aiAnalysis.isAdult || estimatedAge < minAge) {
      return res.status(400).json({ error: `Vérification non validée : Âge estimé ${estimatedAge} ans (Seuil requis : ${minAge} ans). ${aiAnalysis.reason}` });
    }

    const activeTicket = db.prepare('SELECT option_id FROM active_tickets WHERE channel_id = ?').get(session.channel_id);
    let roleIdToAssign = null;
    let logChannelId = null;
    if (activeTicket && activeTicket.option_id) {
      const opt = db.prepare('SELECT age_verified_role_id, age_verification_log_channel FROM ticket_options WHERE id = ?').get(activeTicket.option_id);
      if (opt) {
        if (opt.age_verified_role_id) roleIdToAssign = opt.age_verified_role_id;
        if (opt.age_verification_log_channel) logChannelId = opt.age_verification_log_channel;
      }
    }

    completeAgeVerification(token, method, estimatedAge);

    const botApiPort = process.env.BOT_API_PORT || 49605;
    await fetch(`http://127.0.0.1:${botApiPort}/bot/age-verification-completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guildId: session.guild_id,
        userId: session.user_id,
        channelId: session.channel_id,
        method,
        estimatedAge,
        roleIdToAssign,
        logChannelId
      })
    }).catch(() => null);

    res.json({ success: true, age: estimatedAge, message: 'Vérification d\'âge réussie ! Vous pouvez retourner sur Discord.' });
  } catch (err) {
    console.error('Erreur verify-age process:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/emojis', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    let emojisMap;
    try {
      emojisMap = await guild.emojis.fetch();
    } catch (e) {
      console.warn('Erreur guild.emojis.fetch(), fallback cache:', e.message);
      emojisMap = guild.emojis.cache;
    }

    const emojis = emojisMap.map(e => ({
      id: e.id,
      name: e.name,
      animated: e.animated,
      url: e.imageURL({ size: 64 }) || `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}`,
      identifier: `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`
    }));

    res.json(emojis);
  } catch (error) {
    console.error('Erreur GET /api/emojis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Thèmes par rôle
app.get('/api/config/role-themes', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { getRoleThemes } = require('./database/db');
    const themes = getRoleThemes(guildId);
    res.json(themes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/role-themes/add', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { role_id, theme_name } = req.body || {};
    if (!role_id || !theme_name) return res.status(400).json({ error: 'Rôle et Thème requis' });

    const { addRoleTheme } = require('./database/db');
    addRoleTheme(guildId, role_id, theme_name);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/role-themes/delete', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { role_id, theme_name } = req.body || {};
    if (!role_id) return res.status(400).json({ error: 'Rôle requis' });

    const { deleteRoleTheme } = require('./database/db');
    deleteRoleTheme(guildId, role_id, theme_name);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Assistant IA d'Administration (avec suivi de conversation par session)
app.post('/api/ai/chat', async (req, res) => {
  try {
    if (!req.session || !req.session.user || !req.session.user.id) {
      return res.status(401).json({ error: "Vous devez être connecté à Discord pour utiliser l'assistant IA." });
    }

    // Récupérer le guildId soit depuis la requête, soit depuis la session, soit le 1er serveur géré
    let guildId = req.body.guildId || req.session.selectedGuild;
    if (!guildId && req.session.user.guilds && req.session.user.guilds.length > 0) {
      guildId = req.session.user.guilds[0].id;
    }

    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné.' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur Discord non trouvé.' });

    // Sécurité : Vérification souple Administrateur / Propriétaire (compatibilité IP Publique & OAuth2)
    let isAuthorized = (guild.ownerId === req.session.user.id);
    if (!isAuthorized && req.session.user.guilds) {
      const gObj = req.session.user.guilds.find(g => g.id === guildId);
      if (gObj && (gObj.owner || (gObj.permissions & 0x8) === 0x8 || (gObj.permissions & 0x20) === 0x20)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const member = guild.members.cache.get(req.session.user.id) || await guild.members.fetch(req.session.user.id).catch(() => null);
      if (member && (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild))) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "L'assistant IA est accessible uniquement aux Administrateurs et au Propriétaire du serveur." });
    }

    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message requis' });

    // Initialiser et mettre à jour l'historique de conversation de l'IA pour cette session
    req.session.aiChatHistory = req.session.aiChatHistory || [];
    req.session.aiChatHistory.push({ role: 'user', content: message });

    // Limiter aux 12 derniers messages (6 échanges)
    if (req.session.aiChatHistory.length > 12) {
      req.session.aiChatHistory = req.session.aiChatHistory.slice(-12);
    }

    const { processAiCommand } = require('./utils/aiAssistant');
    const result = await processAiCommand(guildId, req.session.user.id, message, client, req.session.aiChatHistory);

    if (result && result.reply) {
      const cleanReplyForHistory = result.reply.replace(/\[ACTIONS_START\][\s\S]*?\[ACTIONS_END\]/g, '').trim();
      req.session.aiChatHistory.push({ role: 'assistant', content: cleanReplyForHistory });
    }

    res.json(result);
  } catch (error) {
    console.error('Erreur /api/ai/chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour réinitialiser la mémoire de conversation de l'IA
app.post('/api/ai/reset', (req, res) => {
  req.session.aiChatHistory = [];
  res.json({ success: true });
});

// Configuration des rappels de Bump
app.get('/api/config/bump', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { getBumpConfig } = require('./database/db');
    const config = getBumpConfig(guildId);
    res.json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/bump', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { reminder_channel, reminder_role } = req.body || {};
    const { updateBumpConfig } = require('./database/db');
    
    updateBumpConfig(guildId, reminder_channel, reminder_role);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINTS STAR DE LA SEMAINE ---
app.get('/api/star/config', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { getStarConfig } = require('./database/db');
    const config = getStarConfig(guildId);
    res.json(config);
  } catch (error) {
    console.error('Error getting star config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/star/config', (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { updateStarConfig } = require('./database/db');
    const updated = updateStarConfig(guildId, req.body);
    res.json({ success: true, config: updated });
  } catch (error) {
    console.error('Error updating star config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/star/leaderboard', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { getStarConfig, getStarWeeklyLeaderboard, getCurrentWeekIdentifier } = require('./database/db');
    const config = getStarConfig(guildId);
    const weekId = getCurrentWeekIdentifier();
    const rawLeaderboard = getStarWeeklyLeaderboard(guildId, weekId, 15);

    const botApiPort = process.env.BOT_API_PORT || 49605;
    const response = await fetch(`http://127.0.0.1:${botApiPort}/guilds/${guildId}/members`).catch(() => null);
    const members = response && response.ok ? await response.json() : [];
    const membersMap = new Map(members.map(m => [m.id, m]));

    const leaderboard = rawLeaderboard.map(r => {
      const m = membersMap.get(r.user_id);
      return {
        ...r,
        displayName: m ? m.displayName : `Membre (${r.user_id.substring(0, 6)}...)`,
        name: m ? m.name : r.user_id
      };
    });

    let currentStarMember = null;
    if (config.current_star_user_id) {
      const m = membersMap.get(config.current_star_user_id);
      currentStarMember = {
        userId: config.current_star_user_id,
        displayName: m ? m.displayName : config.current_star_user_id
      };
    }

    res.json({
      weekId,
      currentStar: currentStarMember,
      leaderboard
    });
  } catch (error) {
    console.error('Error getting star leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/star/force-election', async (req, res) => {
  try {
    const guildId = getReqGuildId(req);
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { runStarElection } = require('./utils/starManager');
    const result = await runStarElection(guild, true);

    if (!result) {
      return res.status(400).json({ error: 'Aucun membre n\'a encore accumulé de points cette semaine.' });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error forcing star election:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✓ Dashboard premium running on port ${PORT}`);
  
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json').then(r => r.json());
    if (ipRes && ipRes.ip) {
      console.log(`🔗 Lien d'accès externe (IP publique) : http://${ipRes.ip}:${PORT}`);
      console.log(`💡 Note : Pour que ce lien fonctionne depuis l'extérieur de votre réseau, vous devez rediriger le port ${PORT} vers l'IP locale de votre machine (192.168.1.133) dans la configuration de votre box internet.`);
    }
  } catch (err) {
    console.log('Impossible de récupérer automatiquement l\'IP publique (pas de connexion internet ou API inaccessible).');
  }
});
