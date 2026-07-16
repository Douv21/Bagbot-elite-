const { getAutomodConfig, updateAutomodConfig, db, getCustomActionMessage, updateCustomActionMessage } = require('../database/db');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

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

  // 7. Personnaliser les messages d'actions
  if (msgLower.includes("personnalise le message") || msgLower.includes("personnaliser le message") || msgLower.includes("change le message de l'action")) {
    const matchAction = message.match(/(?:action|de|du)\s+([a-zA-Z0-9_-]+)/i);
    const matchText = message.match(/(?:par|avec|de)\s+["']([^"']+)["']/i);
    const isSelf = msgLower.includes("pour soi") || msgLower.includes("seul");

    if (matchAction && matchText) {
      const actionName = matchAction[1].toLowerCase();
      const text = matchText[1];
      const customMsg = getCustomActionMessage(guildId, actionName) || { self_message: null, target_message: null };

      if (isSelf) {
        customMsg.self_message = text;
      } else {
        customMsg.target_message = text;
      }

      updateCustomActionMessage(guildId, actionName, customMsg.self_message, customMsg.target_message);
      actions.push({ type: "update_action_message", action_name: actionName, self: isSelf, text });
      reply += `📝 Le message de l'action **${actionName}** (${isSelf ? 'pour soi' : 'pour autrui'}) a été configuré en : *"${text}"*. `;
    }
  }

  // 8. Modifier les permissions globales d'un rôle
  if (msgLower.includes("permission") && (msgLower.includes("donne") || msgLower.includes("active") || msgLower.includes("retire") || msgLower.includes("désactive"))) {
    const enable = !msgLower.includes("retire") && !msgLower.includes("désactive") && !msgLower.includes("desactive");
    const matchRole = message.match(/(?:rôle|role)\s+["']?([^"'\n]+)["']?/i);
    
    if (matchRole) {
      const role = findRole(matchRole[1]);
      if (role) {
        let permissionFlag = null;
        let permName = "";

        if (msgLower.includes("administrateur") || msgLower.includes("admin")) {
          permissionFlag = PermissionFlagsBits.Administrator;
          permName = "Administrateur";
        } else if (msgLower.includes("bannir") || msgLower.includes("ban")) {
          permissionFlag = PermissionFlagsBits.BanMembers;
          permName = "Bannir des membres";
        } else if (msgLower.includes("expulser") || msgLower.includes("kick")) {
          permissionFlag = PermissionFlagsBits.KickMembers;
          permName = "Expulser des membres";
        } else if (msgLower.includes("gérer les salons") || msgLower.includes("gerer les salons")) {
          permissionFlag = PermissionFlagsBits.ManageChannels;
          permName = "Gérer les salons";
        } else if (msgLower.includes("gérer les rôles") || msgLower.includes("gerer les roles")) {
          permissionFlag = PermissionFlagsBits.ManageRoles;
          permName = "Gérer les rôles";
        } else if (msgLower.includes("parler") || msgLower.includes("envoyer des messages")) {
          permissionFlag = PermissionFlagsBits.SendMessages;
          permName = "Envoyer des messages";
        }

        if (permissionFlag && role) {
          try {
            const currentPerms = role.permissions;
            const newPerms = enable ? currentPerms.add(permissionFlag) : currentPerms.remove(permissionFlag);
            await role.setPermissions(newPerms, 'Modifié via l\'Assistant IA');
            actions.push({ type: "set_role_global_permissions", role_id: role.id, permission: permName, enable });
            reply += `🛡️ La permission **${permName}** a été ${enable ? 'activée' : 'désactivée'} pour le rôle **${role.name}**. `;
          } catch (err) {
            reply += `❌ Impossible de modifier les permissions du rôle **${role.name}** (permissions du bot insuffisantes). `;
          }
        }
      }
    }
  }

  // 9. Créer un Embed
  if (msgLower.includes("embed") || msgLower.includes("message personnalisé")) {
    const matchSalon = message.match(/(?:salon|canal|dans)\s+["']?([^"'\s]+)["']?/i);
    const matchTitle = message.match(/(?:titre)\s+["']([^"']+)["']/i);
    const matchDesc = message.match(/(?:description|texte)\s+["']([^"']+)["']/i);

    if (matchSalon) {
      const channel = findChannel(matchSalon[1]);
      if (channel) {
        try {
          const title = matchTitle ? matchTitle[1] : 'Message';
          const description = matchDesc ? matchDesc[1] : '';

          const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor('#9b59b6')
            .setTimestamp();

          await channel.send({ embeds: [embed] });
          actions.push({ type: "send_embed", channel_id: channel.id, title, description });
          reply += `✉️ L'embed avec le titre **"${title}"** a été envoyé dans le salon **#${channel.name}**. `;
        } catch (err) {
          reply += `❌ Impossible d'envoyer l'embed dans **#${channel.name}**. `;
        }
      } else {
        reply += `❓ Salon **"${matchSalon[1]}"** introuvable. `;
      }
    }
  }

  // 10. Permissions du salon (accès)
  if (reply === "" && (msgLower.includes("accès au salon") || msgLower.includes("permissions du salon") || msgLower.includes("bloque le salon") || msgLower.includes("bloquer le salon") || msgLower.includes("debloque le salon") || msgLower.includes("débloquer le salon"))) {
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

  // Fallback / Conversation
  if (reply === "") {
    reply = "👋 Bonjour ! Je suis votre Assistant d'Administration intelligent.\nJe peux exécuter toutes vos commandes d'administration directement sans clé d'API. Essayez par exemple :\n- *\"active l'anti-link\"* ou *\"bloque les insultes\"*\n- *\"crée le rôle Staff\"*\n- *\"supprime le rôle Staff\"*\n- *\"donne la permission de bannir au rôle Staff\"*\n- *\"crée un embed dans #annonces avec le titre 'Hello' et la description 'Bienvenue'\"*\n- *\"personnalise le message de calin pour cible par 't'enlace très fort'\"*";
  }

  return { reply, actions };
}

module.exports = { processAiCommand };
