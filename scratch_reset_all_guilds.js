const { REST, Routes } = require('discord.js');
const { db } = require('./src/database/db');
require('dotenv').config();

async function run() {
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      console.error('DISCORD_TOKEN absent');
      process.exit(1);
    }
    const rest = new REST({ version: '10' }).setToken(token);

    // Supprimer les enregistrements vides en base
    db.prepare('DELETE FROM server_bot_profile WHERE custom_logo_url IS NULL AND custom_name IS NULL').run();

    const configuredRows = db.prepare('SELECT guild_id, custom_logo_url FROM server_bot_profile').all() || [];
    const configuredMap = new Map();
    configuredRows.forEach(r => {
      if (r.custom_logo_url) configuredMap.set(r.guild_id, r.custom_logo_url);
    });

    console.log('Récupération de la liste des serveurs Discord...');
    const guilds = await rest.get(Routes.userGuilds());
    console.log(`Nombre de serveurs trouvés: ${guilds.length}`);

    for (const g of guilds) {
      if (!configuredMap.has(g.id)) {
        console.log(`[Restauration Avatar Dev Portal] Serveur: ${g.name} (${g.id})`);
        await rest.patch(Routes.guildMember(g.id, '@me'), { body: { avatar: null } })
          .then(() => console.log(`  -> Succès pour ${g.name}`))
          .catch(e => console.error(`  -> Erreur pour ${g.name}:`, e.message));
      } else {
        console.log(`[Profil Personnalisé Conservé] Serveur: ${g.name} (${g.id})`);
      }
    }
    console.log('Synchronisation terminée avec succès !');
    process.exit(0);
  } catch (err) {
    console.error('Erreur globale script:', err.message);
    process.exit(1);
  }
}

run();
