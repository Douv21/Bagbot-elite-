const { getUnlimitedForums } = require('../database/db');

module.exports = {
  name: 'threadUpdate',
  async execute(oldThread, newThread) {
    // Si le thread vient d'être archivé
    if (!oldThread.archived && newThread.archived) {
      const guildId = newThread.guild.id;
      const parentId = newThread.parentId; // ID du salon Forum parent
      if (!parentId) return;

      // Récupérer la liste des forums à garder ouverts en illimité
      const unlimitedChannels = getUnlimitedForums(guildId);
      
      if (unlimitedChannels.includes(parentId)) {
        try {
          // Désarchiver le thread immédiatement
          await newThread.setArchived(false, 'Garder le forum ouvert en illimité');
        } catch (error) {
          console.error(`Impossible de désarchiver le thread ${newThread.id} (${newThread.name}) :`, error);
        }
      }
    }
  }
};
