require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');
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
  updateActionVeriteConfig
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

// Middleware Session
const isHttps = process.env.HTTPS_PROXY === 'true';
app.use(session({
  secret: process.env.SESSION_SECRET || 'bagbot-elite-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: isHttps,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isHttps ? 'none' : 'lax',
    httpOnly: true
  },
  name: 'bagbot-elite.sid'
}));

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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

// Route de connexion Discord OAuth2
app.get('/login', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(getRedirectUri(req));
  const scope = encodeURIComponent('identify guilds guilds.members.read');
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`);
});

// Callback Discord OAuth2
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect('/?error=no_code');
  }

  const redirectUri = getRedirectUri(req);

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
      throw new Error(tokenData.error);
    }

    // Récupérer les infos utilisateur
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const userData = await userResponse.json();

    // Récupérer les serveurs de l'utilisateur
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const guildsData = await guildsResponse.json();

    // Sauvegarder en session
    req.session.user = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
      accessToken: tokenData.access_token,
      guilds: guildsData
    };

    req.session.save((err) => {
      if (err) {
        console.error('Erreur sauvegarde session:', err);
        return res.redirect('/?error=session_error');
      }
      res.redirect('/');
    });
  } catch (error) {
    console.error('Erreur OAuth2:', error);
    res.redirect('/?error=oauth_failed');
  }
});

// Déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// API pour obtenir l'utilisateur connecté
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json({ 
      authenticated: true, 
      user: {
        id: req.session.user.id,
        username: req.session.user.username,
        avatar: req.session.user.avatar,
        guilds: req.session.user.guilds
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// API pour obtenir les serveurs (filtrés)
app.get('/api/guilds', async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.guilds) {
      return res.json([]);
    }

    const userGuilds = req.session.user.guilds;
    const filteredGuilds = [];

    // Récupérer les serveurs où le bot est présent via l'API locale du bot
    const botApiPort = process.env.BOT_API_PORT || 49602;
    const botGuildsResponse = await fetch(`http://127.0.0.1:${botApiPort}/guilds`).catch(() => null);

    let botGuilds = [];
    if (botGuildsResponse && botGuildsResponse.ok) {
      botGuilds = await botGuildsResponse.json();
    }

    const botGuildIds = new Set(botGuilds.map(g => g.id));

    // Filtrer les serveurs
    for (const guild of userGuilds) {
      if (!botGuildIds.has(guild.id)) continue;

      const permissions = parseInt(guild.permissions, 16);
      
      // Administrateur (0x8) ou Gérer le serveur (0x20) ou Propriétaire
      const hasPermissions = guild.owner || (permissions & 0x8) || (permissions & 0x20);

      if (hasPermissions) {
        filteredGuilds.push(guild);
      }
    }
    res.json(filteredGuilds);
  } catch (error) {
    console.error('Error filtering guilds:', error);
    res.json([]);
  }
});

// API pour sélectionner un serveur
app.post('/api/select-guild', (req, res) => {
  const { guildId } = req.body;
  if (req.session.user) {
    req.session.selectedGuild = guildId;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
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
    if (!req.session.user || !req.session.selectedGuild) {
      return res.json([]);
    }
    const botApiPort = process.env.BOT_API_PORT || 49602;
    const response = await fetch(`http://127.0.0.1:${botApiPort}/guilds/${req.session.selectedGuild}/channels`).catch(() => null);
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
    if (!req.session.user || !req.session.selectedGuild) {
      return res.json([]);
    }
    const botApiPort = process.env.BOT_API_PORT || 49602;
    const response = await fetch(`http://127.0.0.1:${botApiPort}/guilds/${req.session.selectedGuild}/roles`).catch(() => null);
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

// Obtenir les informations du bot (nom et avatar réel)
app.get('/api/bot/info', async (req, res) => {
  try {
    const botApiPort = process.env.BOT_API_PORT || 49602;
    const response = await fetch(`http://127.0.0.1:${botApiPort}/bot/info`).catch(() => null);
    if (response && response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      res.json({ username: 'Bagbot Elite', avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });
    }
  } catch (error) {
    res.json({ username: 'Bagbot Elite', avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });
  }
});

// Changer l'avatar du bot globalement
app.post('/api/bot/avatar', async (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { avatar_url } = req.body;

    // Enregistrer l'avatar personnalisé dans welcome_leave pour cette guilde
    let wl = db.prepare('SELECT * FROM welcome_leave WHERE guild_id = ?').get(guildId);
    if (!wl) {
      db.prepare('INSERT INTO welcome_leave (guild_id, custom_bot_avatar) VALUES (?, ?)').run(guildId, avatar_url);
    } else {
      db.prepare('UPDATE welcome_leave SET custom_bot_avatar = ? WHERE guild_id = ?').run(avatar_url, guildId);
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
    const guildId = req.session.selectedGuild;
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

    res.json({
      welcome_leave: welcomeLeave,
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
      counting_channels: countingChannels
    });
  } catch (error) {
    console.error('Erreur chargement config:', error);
    res.status(500).json({ error: 'Erreur chargement' });
  }
});

// 2. Sauvegarder Bienvenue & Départ
app.post('/api/config/welcome-leave', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const {
      welcome_channel, leave_channel, welcome_title, welcome_desc,
      welcome_color, welcome_thumbnail, welcome_image, welcome_author_name, welcome_author_icon, welcome_footer, welcome_role_filter,
      leave_title, leave_desc, leave_color, leave_thumbnail, leave_image, leave_author_name, leave_author_icon, leave_footer
    } = req.body;

    db.prepare(`
      INSERT OR REPLACE INTO welcome_leave (
        guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc,
        welcome_color, welcome_thumbnail, welcome_image, welcome_author_name, welcome_author_icon, welcome_footer, welcome_role_filter,
        leave_title, leave_desc, leave_color, leave_thumbnail, leave_image, leave_author_name, leave_author_icon, leave_footer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

// 3. Sauvegarder Confessions
app.post('/api/config/confessions', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { channels } = req.body; // Un tableau de { channel_id, confession_name, use_thread }
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'Un tableau de salons est requis.' });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM confessions WHERE guild_id = ?').run(guildId);
      const stmt = db.prepare(`
        INSERT INTO confessions (guild_id, channel_id, confession_name, use_thread)
        VALUES (?, ?, ?, ?)
      `);
      for (const ch of channels) {
        if (ch.channel_id) {
          stmt.run(guildId, ch.channel_id, ch.confession_name || 'Confession Anonyme', ch.use_thread ? 1 : 0);
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { role_id, channel_id } = req.body;

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

// 5. Sauvegarder Logs d'activité
app.post('/api/config/logs', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { channel_id, events } = req.body;

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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { item_name, price, description, role_id } = req.body;
    if (!item_name || !price) {
      return res.status(400).json({ error: 'Nom et prix requis' });
    }

    db.prepare(`
      INSERT OR REPLACE INTO shop (guild_id, item_name, price, description, role_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(guildId, item_name, price, description || '', role_id || null);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Supprimer un objet de la Boutique
app.post('/api/config/shop/delete', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { item_name } = req.body;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { item_name, price } = req.body;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { level, role_id } = req.body;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { level } = req.body;

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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { 
      xp_min, xp_max, 
      karma_min, karma_max, 
      money_min, money_max, 
      nsfw_xp_reward, nsfw_money_reward, 
      announce_channel, announce_msg 
    } = req.body;

    db.prepare(`
      INSERT OR REPLACE INTO leveling_config (
        guild_id, xp_min, xp_max, 
        karma_min, karma_max, 
        money_min, money_max, 
        nsfw_xp_reward, nsfw_money_reward, 
        announce_channel, announce_msg
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      announce_msg || 'Bravo {user} ! Tu passes au niveau {level} !'
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    db.prepare('UPDATE leveling SET nsfw_messages = 0 WHERE guild_id = ?').run(guildId);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 11. Sauvegarder la configuration du jeu Mot Caché
app.post('/api/config/game', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { secret_phrase, reward_money, reward_xp, reward_role_id, is_active, reset_progress, appearance_chance } = req.body;

    const phraseUpper = (secret_phrase || '').toUpperCase();

    db.prepare(`
      INSERT OR REPLACE INTO game_config (guild_id, secret_phrase, reward_money, reward_xp, reward_role_id, is_active, appearance_chance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      phraseUpper,
      reward_money !== undefined ? parseInt(reward_money) : 0,
      reward_xp !== undefined ? parseInt(reward_xp) : 0,
      reward_role_id || null,
      is_active ? 1 : 0,
      appearance_chance !== undefined ? parseFloat(appearance_chance) : 15
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
    const guildId = req.session.selectedGuild;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { action_name, gif_url } = req.body;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requis' });

    deleteActionGif(guildId, id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 14. Sauvegarder la configuration d'automodération
app.post('/api/config/automod', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const {
      anti_link, anti_spam, anti_massmention, anti_badwords,
      bypass_roles, badwords_list, spam_max_msgs, massmention_limit
    } = req.body;

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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { channel_id, title, description, color, thumbnail, image_url, options, type = 'buttons', mode = 'normal', existing_message_id = null } = req.body;
    if (!channel_id) return res.status(400).json({ error: 'ID du salon requis' });

    // 1. Communiquer avec l'API locale du bot pour envoyer ou éditer le message
    const botApiPort = process.env.BOT_API_PORT || 49602;
    const botResponse = await fetch(`http://127.0.0.1:${botApiPort}/bot/send-autorole`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guildId,
        channelId: channel_id,
        title: existing_message_id ? '(Message Existant)' : title,
        description: existing_message_id ? '(Pas d\'embed)' : description,
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
      existing_message_id ? '(Message Existant)' : title, 
      existing_message_id ? '(Pas d\'embed)' : description, 
      color, 
      thumbnail ? 1 : 0, 
      image_url,
      type,
      mode
    );
    
    if (options && options.length > 0) {
      for (const opt of options) {
        addAutoroleOption(messageId, opt.role_id, opt.label, opt.emoji, opt.style || 'PRIMARY');
      }
    }

    res.json({ success: true, messageId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Supprimer un embed d'auto-rôle
app.post('/api/config/autorole-embeds/delete', async (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { message_id, channel_id } = req.body;
    if (!message_id) return res.status(400).json({ error: 'ID de message requis' });

    // 1. Essayer de supprimer le message sur Discord
    const botApiPort = process.env.BOT_API_PORT || 49602;
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

// Auto-rôles à l'arrivée
app.post('/api/config/autoroles-on-join/add', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { role_id } = req.body;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { role_id } = req.body;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { trigger_role_id, target_role_id } = req.body;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { trigger_role_id, target_role_id } = req.body;
    if (!trigger_role_id || !target_role_id) return res.status(400).json({ error: 'Rôles requis' });

    deleteAutoroleOnRole(guildId, trigger_role_id, target_role_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- SYSTEM DE COMPTAGE (COUNTING) ---

app.post('/api/config/counting/add', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { channel_id, mode, start_number } = req.body;
    if (!channel_id || !mode) return res.status(400).json({ error: 'Informations incomplètes' });

    const num = start_number !== undefined ? parseFloat(start_number) : 0;
    addCountingChannel(guildId, channel_id, mode, num);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/counting/delete', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });
    const { channel_id } = req.body;
    if (!channel_id) return res.status(400).json({ error: 'ID requis' });

    deleteCountingChannel(guildId, channel_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- CARTE DES MEMBRES (MAP LOCATIONS) ---

app.get('/api/config/map-locations', async (req, res) => {
  try {
    const guildId = req.query.guild || req.session.selectedGuild;
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
        username: member ? member.user.username : `Utilisateur (${loc.user_id})`,
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
    const guildId = req.body.guild || req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });

    if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });

    const { user_id } = req.body;
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
    const guildId = req.session.selectedGuild;
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
    const guildId = req.session.selectedGuild;
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
    } = req.body;

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
    const guildId = req.session.selectedGuild;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { channels } = req.body;
    if (!Array.isArray(channels)) return res.status(400).json({ error: 'Channels must be an array' });

    updateUnlimitedForums(guildId, channels);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- CONFIGURATION D'ACTION OU VÉRITÉ ---

app.get('/api/config/action-verite', (req, res) => {
  try {
    const guildId = req.session.selectedGuild;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { type, category, content } = req.body;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { id } = req.body;
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
    const guildId = req.session.selectedGuild;
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
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'No guild selected' });

    const { sfw_channel_id, nsfw_channel_id } = req.body;

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
