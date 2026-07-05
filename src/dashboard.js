require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { db } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 49601;

// Trust proxy (pour HTTPS/Nginx)
app.set('trust proxy', 1);

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

// Route de connexion Discord OAuth2
app.get('/login', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_CALLBACK_URL || `http://192.168.1.133:49601/callback`);
  const scope = encodeURIComponent('identify guilds guilds.members.read');
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`);
});

// Callback Discord OAuth2
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect('/?error=no_code');
  }

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
        redirect_uri: process.env.DISCORD_CALLBACK_URL || `http://192.168.1.133:49601/callback`,
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
        leave_title: '👋 Au revoir',
        leave_desc: 'Au revoir {user} !',
        leave_color: '#FF0000',
        leave_thumbnail: 1
      };
    }

    // Confessions
    const confessions = db.prepare('SELECT channel_id FROM confessions WHERE guild_id = ?').all(guildId);
    const confessionChannel = confessions.length > 0 ? confessions[0].channel_id : null;

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
        announce_channel: 'current',
        announce_msg: 'Bravo {user} ! Tu passes au niveau {level} !'
      };
    }

    res.json({
      welcome_leave: welcomeLeave,
      confession: { channel_id: confessionChannel },
      quarantine: quarantine,
      logs: logs,
      shop: shopItems,
      level_rewards: levelRewards,
      leveling_config: levelingConfig
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
      welcome_color, welcome_thumbnail, leave_title, leave_desc,
      leave_color, leave_thumbnail
    } = req.body;

    db.prepare(`
      INSERT OR REPLACE INTO welcome_leave (
        guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc,
        welcome_color, welcome_thumbnail, leave_title, leave_desc,
        leave_color, leave_thumbnail
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId, welcome_channel || null, leave_channel || null, welcome_title || '', welcome_desc || '',
      welcome_color || '#00FF00', welcome_thumbnail ? 1 : 0, leave_title || '', leave_desc || '',
      leave_color || '#FF0000', leave_thumbnail ? 1 : 0
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

    const { channel_id } = req.body;

    db.prepare('DELETE FROM confessions WHERE guild_id = ?').run(guildId);
    if (channel_id) {
      db.prepare('INSERT INTO confessions (guild_id, channel_id) VALUES (?, ?)').run(guildId, channel_id);
    }

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

    db.prepare('DELETE FROM shop WHERE guild_id = ? AND item_name = ?').run(guildId, item_name);
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

    const { xp_min, xp_max, announce_channel, announce_msg } = req.body;

    db.prepare(`
      INSERT OR REPLACE INTO leveling_config (guild_id, xp_min, xp_max, announce_channel, announce_msg)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      guildId,
      xp_min !== undefined ? parseInt(xp_min) : 15,
      xp_max !== undefined ? parseInt(xp_max) : 25,
      announce_channel || 'current',
      announce_msg || 'Bravo {user} ! Tu passes au niveau {level} !'
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Dashboard premium running on port ${PORT}`);
});
