const { getAutomodConfig, updateAutomodConfig, db } = require('../database/db');

async function processAiCommand(guildId, userId, message, client) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return { reply: "❌ Erreur : Serveur introuvable." };
  }

  const msgLower = message.toLowerCase();
  const actions = [];
  let reply = "";

  // Helper pour trouver un rôle par son nom (insensible à la casse)
  const findRole = (name) => {
    const clean = name.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/^@/, '');
    return guild.roles.cache.find(r => r.name.toLowerCase() === clean || r.id === clean);
  };

  // Helper pour trouver un salon par son nom
  const findChannel = (name) => {
    const clean = name.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/^#/, '');
    return guild.channels.cache.find(c => c.name.toLowerCase() === clean || c.id === clean);
  };

  // 1. Anti-link
  if (msgLower.includes("anti-link") || msgLower.includes("anti link") || msgLower.includes("bloque les liens") || msgLower.includes("bloquer les liens") || msgLower.includes("bloque les url")) {
    const enable = !msgLower.includes("désactive") && !msgLower.includes("desactive") && !msgLower.includes("retire") && !msgLower.includes("enleve");
    updateAutomodConfig(guildId, { anti_link: enable ? 1 : 0 });
    actions.push({ type: "update_automod", anti_link: enable ? 1 : 0 });
    reply += `✅ L'anti-link a été ${enable ? 'activé' : 'désactivé'} avec succès. `;
  }

  // 2. Anti-spam
  if (msgLower.includes("anti-spam") || msgLower.includes("anti spam") || msgLower.includes("bloque le spam") || msgLower.includes("bloquer le spam")) {
    const enable = !msgLower.includes("désactive") && !msgLower.includes("desactive") && !msgLower.includes("retire") && !msgLower.includes("enleve");
    updateAutomodConfig(guildId, { anti_spam: enable ? 1 : 0 });
    actions.push({ type: "update_automod", anti_spam: enable ? 1 : 0 });
    reply += `✅ L'anti-spam a été ${enable ? 'activé' : 'désactivé'} avec succès. `;
  }

  // 3. Anti-badwords
  if (msgLower.includes("anti-badwords") || msgLower.includes("anti badwords") || msgLower.includes("bloque les insultes") || msgLower.includes("bloquer les insultes") || msgLower.includes("bloque les gros mots")) {
    const enable = !msgLower.includes("désactive") && !msgLower.includes("desactive") && !msgLower.includes("retire") && !msgLower.includes("enleve");
    updateAutomodConfig(guildId, { anti_badwords: enable ? 1 : 0 });
    actions.push({ type: "update_automod", anti_badwords: enable ? 1 : 0 });
    reply += `✅ L'anti-badwords a été ${enable ? 'activé' : 'désactivé'} avec succès. `;
  }

  // 4. Mots interdits
  if (msgLower.includes("interdit le mot") || msgLower.includes("interdire le mot") || msgLower.includes("bloque le mot") || msgLower.includes("bloquer le mot") || msgLower.includes("ajoute le mot")) {
    const match = message.match(/(?:mot|mots)\s+["']?([a-zA-Z0-9_À-ÿ-]+)["']?/i);
    if (match && match[1]) {
      const word = match[1].toLowerCase();
      const config = getAutomodConfig(guildId);
      let words = config.badwords_list ? config.badwords_list.split(',').map(w => w.trim()) : [];
      if (!words.includes(word)) {
        words.push(word);
        updateAutomodConfig(guildId, { badwords_list: words.join(',') });
        actions.push({ type: "add_badword", word });
        reply += `🚫 Le mot **"${word}"** a été ajouté aux mots interdits. `;
      }
    }
  }

  // 5. Créer un rôle
  if (msgLower.includes("crée le rôle") || msgLower.includes("creer le role") || msgLower.includes("crée un rôle") || msgLower.includes("creer un role")) {
    const match = message.match(/(?:rôle|role)\s+["']?([^"'\n]+)["']?/i);
    if (match && match[1]) {
      const roleName = match[1].trim();
      try {
        const newRole = await guild.roles.create({
          name: roleName,
          reason: 'Créé via l\'Assistant IA Dashboard'
        });
        actions.push({ type: "create_role", name: roleName, id: newRole.id });
        reply += `👑 Le rôle **"${roleName}"** a été créé avec succès. `;
      } catch (err) {
        reply += `❌ Impossible de créer le rôle **"${roleName}"** (permissions insuffisantes). `;
      }
    }
  }

  // 6. Supprimer un rôle
  if (msgLower.includes("supprime le rôle") || msgLower.includes("supprimer le role") || msgLower.includes("supprime le role")) {
    const match = message.match(/(?:rôle|role)\s+["']?([^"'\n]+)["']?/i);
    if (match && match[1]) {
      const roleNameOrId = match[1].trim();
      const role = findRole(roleNameOrId);
      if (role) {
        try {
          await role.delete('Supprimé via l\'Assistant IA Dashboard');
          actions.push({ type: "delete_role", name: role.name, id: role.id });
          reply += `🗑️ Le rôle **"${role.name}"** a été supprimé. `;
        } catch (err) {
          reply += `❌ Impossible de supprimer le rôle **"${role.name}"**. `;
        }
      } else {
        reply += `❓ Rôle **"${roleNameOrId}"** introuvable. `;
      }
    }
  }

  // 7. Permissions du salon (accès)
  if (msgLower.includes("accès au salon") || msgLower.includes("permissions du salon") || msgLower.includes("bloque le salon") || msgLower.includes("bloquer le salon") || msgLower.includes("debloque le salon") || msgLower.includes("débloquer le salon")) {
    const isBlock = msgLower.includes("bloque") || msgLower.includes("interdit") || msgLower.includes("retire") || msgLower.includes("enleve");
    
    const matchSalon = message.match(/(?:salon|canal)\s+["']?([^"'\s]+)["']?/i);
    const matchRole = message.match(/(?:rôle|role)\s+["']?([^"'\n]+)["']?/i);
    
    if (matchSalon && matchRole) {
      const channel = findChannel(matchSalon[1]);
      const role = findRole(matchRole[1]);
      
      if (channel && role) {
        try {
          const overrides = {
            ViewChannel: !isBlock,
            SendMessages: !isBlock
          };
          await channel.permissionOverwrites.edit(role, overrides, { reason: 'Assistant IA Dashboard' });
          actions.push({ type: "set_role_permission", role_id: role.id, channel_id: channel.id, allow_view: !isBlock, allow_send: !isBlock });
          reply += `🔒 Le salon **#${channel.name}** a été ${isBlock ? 'bloqué' : 'débloqué'} pour le rôle **${role.name}**. `;
        } catch (err) {
          reply += `❌ Impossible de modifier les permissions du salon **#${channel.name}**. `;
        }
      } else {
        if (!channel) reply += `❓ Salon **"${matchSalon[1]}"** introuvable. `;
        if (!role) reply += `❓ Rôle **"${matchRole[1]}"** introuvable. `;
      }
    }
  }

  // 8. Rôle support ticket
  if ((msgLower.includes("support des tickets") || msgLower.includes("support du ticket")) && (msgLower.includes("ajoute") || msgLower.includes("mettre"))) {
    const matchRole = message.match(/(?:rôle|role)\s+["']?([^"'\n]+)["']?/i);
    if (matchRole) {
      const role = findRole(matchRole[1]);
      if (role) {
        // Ajouter le rôle de support
        const options = db.prepare('SELECT * FROM ticket_options WHERE guild_id = ?').all(guildId);
        for (const opt of options) {
          let supportRoles = [];
          try {
            supportRoles = JSON.parse(opt.support_roles || '[]');
          } catch (e) {}
          if (!supportRoles.includes(role.id)) {
            supportRoles.push(role.id);
            db.prepare('UPDATE ticket_options SET support_roles = ? WHERE guild_id = ? AND id = ?')
              .run(JSON.stringify(supportRoles), guildId, opt.id);
          }
        }
        actions.push({ type: "set_ticket_support_roles", role_ids: [role.id] });
        reply += `🎫 Le rôle **${role.name}** a été configuré en tant que rôle de support pour tous les tickets. `;
      } else {
        reply += `❓ Rôle **"${matchRole[1]}"** introuvable. `;
      }
    }
  }

  // 9. Rôle à ping tickets
  if ((msgLower.includes("ping") || msgLower.includes("mentionne")) && msgLower.includes("ticket")) {
    const matchRole = message.match(/(?:rôle|role)\s+["']?([^"'\n]+)["']?/i);
    if (matchRole) {
      const role = findRole(matchRole[1]);
      if (role) {
        const options = db.prepare('SELECT * FROM ticket_options WHERE guild_id = ?').all(guildId);
        for (const opt of options) {
          let pingRoles = [];
          try {
            pingRoles = JSON.parse(opt.ping_users || '[]');
          } catch (e) {}
          if (!pingRoles.includes(role.id)) {
            pingRoles.push(role.id);
            db.prepare('UPDATE ticket_options SET ping_users = ? WHERE guild_id = ? AND id = ?')
              .run(JSON.stringify(pingRoles), guildId, opt.id);
          }
        }
        actions.push({ type: "set_ticket_ping_roles", role_ids: [role.id] });
        reply += `🔔 Le rôle **${role.name}** sera pingé à la création des tickets. `;
      } else {
        reply += `❓ Rôle **"${matchRole[1]}"** introuvable. `;
      }
    }
  }

  // Fallback / Conversation
  if (reply === "") {
    if (msgLower.includes("bonjour") || msgLower.includes("salut") || msgLower.includes("hello")) {
      reply = "👋 Bonjour ! Je suis votre assistant d'administration intelligent. Comment puis-je vous aider aujourd'hui ?";
    } else if (msgLower.includes("qui es-tu") || msgLower.includes("qui es tu")) {
      reply = "🤖 Je suis l'Assistant IA d'administration de Bagbot Elite. Je peux configurer votre serveur de manière totalement autonome sans aucune clé d'API !";
    } else {
      reply = "👋 Bonjour ! Je suis votre Assistant d'Administration intelligent.\nJe peux exécuter toutes vos commandes d'administration directement sans clé d'API. Essayez par exemple :\n- *\"active l'anti-link\"* ou *\"bloque les insultes\"*\n- *\"crée le rôle Staff\"*\n- *\"supprime le rôle Staff\"*\n- *\"bloque le salon #general pour le rôle @Membres\"*\n- *\"ajoute le rôle @Modérateur au support des tickets\"*\n- *\"ping le rôle @Support à l'ouverture de tickets\"*";
    }
  }

  return { reply, actions };
}

module.exports = { processAiCommand };
