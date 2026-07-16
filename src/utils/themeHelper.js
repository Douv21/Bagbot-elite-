const { db } = require('../database/db');

function getMemberCardTheme(guild, member) {
  if (!guild || !member) return 'holographique';

  try {
    // Récupérer les configurations de thèmes par rôle pour ce serveur
    const roleThemes = db.prepare('SELECT role_id, theme_name FROM role_themes WHERE guild_id = ?').all(guild.id);
    
    if (roleThemes && roleThemes.length > 0) {
      // Filtrer les rôles que possède le membre
      const memberRoleIds = member.roles.cache.map(r => r.id);
      const matchingThemes = roleThemes.filter(rt => memberRoleIds.includes(rt.role_id));

      if (matchingThemes.length > 0) {
        // Trouver le rôle le plus élevé (position) parmi ceux qui ont un thème configuré
        const matchingRoleIds = matchingThemes.map(mt => mt.role_id);
        const highestMatchingRole = member.roles.cache
          .filter(role => matchingRoleIds.includes(role.id))
          .sort((a, b) => b.position - a.position)
          .first();

        if (highestMatchingRole) {
          const matched = matchingThemes.find(mt => mt.role_id === highestMatchingRole.id);
          if (matched) return matched.theme_name;
        }
      }
    }
  } catch (err) {
    console.error('Erreur getMemberCardTheme:', err);
  }

  // Fallback sur holographique
  return 'holographique';
}

module.exports = { getMemberCardTheme };
