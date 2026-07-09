const { getUnlimitedForums } = require('../database/db');

async function scanAndReopenAllUnlimitedForums(client) {
  console.log('[Forums Illimités] Lancement du scan de réouverture des salons...');
  
  for (const [guildId, guild] of client.guilds.cache) {
    const unlimitedChannels = getUnlimitedForums(guildId);
    if (!unlimitedChannels || unlimitedChannels.length === 0) continue;
    
    for (const channelId of unlimitedChannels) {
      try {
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) continue;
        
        // 15 = GuildForum
        if (channel.type !== 15) continue;
        
        // Récupérer les threads archivés (actifs et inactifs)
        const archived = await channel.threads.fetchArchived({ type: 'public' }).catch(() => null);
        if (archived && archived.threads) {
          for (const [_, thread] of archived.threads) {
            if (thread.archived) {
              await thread.setArchived(false, 'Garder le forum ouvert en illimité (Scan)');
              console.log(`[Forums Illimités] Thread réouvert : #${thread.name} dans #${channel.name}`);
              // Attendre 1 seconde pour éviter le rate-limit
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      } catch (err) {
        console.error(`[Forums Illimités] Erreur lors du scan du salon ${channelId} :`, err);
      }
    }
  }
  console.log('[Forums Illimités] Fin du scan des salons.');
}

module.exports = { scanAndReopenAllUnlimitedForums };
