const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 49602;

// Serveur API Bot pour proxy
const BOT_API_URL = 'http://127.0.0.1:49605';
const DASHBOARD1_URL = 'http://82.65.75.176:49601';

// Base de données
const db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'));

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public2')));
app.use('/public2/uploads', express.static(path.join(__dirname, '../public2/uploads')));

// Session avec MemoryStore (par défaut)
app.use(session({
    secret: 'bagbot-elite-super-secret-key-2',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 semaine
    }
}));

// Upload avec Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public2/uploads/'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});
const upload = multer({ storage });

// --- AUTHENTIFICATION ---

// Redirection vers le D1 pour OAuth
app.get('/login', (req, res) => {
    res.redirect(`${DASHBOARD1_URL}/login?port=49602`);
});

// Partage de session / info user
app.get('/api/user', async (req, res) => {
    // Si on a l'user en session locale
    if (req.session.user) {
        return res.json(req.session.user);
    }

    // Sinon, on tente de récupérer via le D1 avec les cookies
    try {
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) return res.status(401).json({ error: 'Non authentifié' });

        const d1Res = await fetch(`${DASHBOARD1_URL}/api/user`, {
            headers: { cookie: cookieHeader }
        });

        if (d1Res.ok) {
            const userData = await d1Res.json();
            req.session.user = userData;
            return res.json(userData);
        } else {
            return res.status(401).json({ error: 'Non authentifié' });
        }
    } catch (e) {
        console.error('Erreur partage user:', e);
        return res.status(500).json({ error: 'Erreur interne' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Sélection de guilde
app.post('/api/select-guild', (req, res) => {
    const { guildId } = req.body;
    if (guildId) {
        req.session.selectedGuild = guildId;
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Guild ID manquant' });
    }
});

// --- PROXIES VERS API DU BOT ---

const proxyToBot = async (req, res, path) => {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur sélectionné' });

    try {
        const response = await fetch(`${BOT_API_URL}${path}?guildId=${guildId}`);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error(`Erreur proxy ${path}:`, e);
        res.status(500).json({ error: 'Erreur communication bot' });
    }
};

app.get('/api/guilds', (req, res) => {
    // Proxy simplifié pour les guildes de l'utilisateur
    res.json([]); // A implémenter si besoin via D1 ou bot api
});

app.get('/api/channels', (req, res) => proxyToBot(req, res, '/api/channels'));
app.get('/api/roles', (req, res) => proxyToBot(req, res, '/api/roles'));
app.get('/api/emojis', (req, res) => proxyToBot(req, res, '/api/emojis'));
app.get('/api/members', (req, res) => proxyToBot(req, res, '/api/members'));
app.get('/api/bot/info', async (req, res) => {
    try {
        const response = await fetch(`${BOT_API_URL}/api/bot/info`);
        const data = await response.json();
        res.json(data);
    } catch(e) {
        res.status(500).json({ error: 'Erreur proxy' });
    }
});

// --- API CONFIGURATION SQLITE ---

app.get('/api/config', (req, res) => {
    const guildId = req.session.selectedGuild;
    if (!guildId) return res.status(400).json({ error: 'Aucun serveur' });
    
    // Simplification pour le code à générer : renvoie juste un objet vide ou mock.
    // L'implémentation complète nécessiterait de requêter chaque table (welcome_leave, leveling_config, etc.)
    res.json({ guildId });
});

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (req.file) {
        res.json({ url: `/public2/uploads/${req.file.filename}` });
    } else {
        res.status(400).json({ error: 'Upload échoué' });
    }
});

// Démarrage serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Dashboard 2] En écoute sur le port ${PORT}`);
});
