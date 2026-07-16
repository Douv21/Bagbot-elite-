const { getAutomodConfig, updateAutomodConfig, db } = require('../database/db');

async function processAiCommand(guildId, userId, message, client) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return { reply: "❌ Erreur : Serveur introuvable." };
  }

  // Vérifier la clé API
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    // Mode IA Réelle (Gemini)
    try {
      const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));
      const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type }));
      const automod = getAutomodConfig(guildId);

      const systemPrompt = `
You are the AI administrator assistant of the Bagbot Elite Discord bot.
Your goal is to parse the user's natural language request and translate it into database updates or Discord API actions.
The current guild contains the following roles:
${JSON.stringify(roles)}
The current guild contains the following channels:
${JSON.stringify(channels)}
Current automod config:
${JSON.stringify(automod)}

You must output a JSON object containing:
1. "reply": A friendly message in French explaining what you have done.
2. "actions": An array of action objects to execute.

Available actions you can return in the "actions" array:
- { "type": "create_role", "name": "ROLE_NAME", "color": "HEX_CODE" }
- { "type": "delete_role", "role_id": "ROLE_ID" }
- { "type": "set_role_permission", "role_id": "ROLE_ID", "channel_id": "CHANNEL_ID", "allow_view": true/false, "allow_send": true/false }
- { "type": "update_automod", "anti_link": 0/1, "anti_spam": 0/1, "anti_badwords": 0/1 }
- { "type": "add_badword", "word": "WORD" }
- { "type": "remove_badword", "word": "WORD" }

If the request is not related to bot configuration or Discord administration, return an action of type "none" and a polite reply.
Always reply in French.
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser request: "${message}"`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Réponse vide de Gemini");
      }

      const parsed = JSON.parse(text);
      const executedActions = [];

      if (parsed.actions && parsed.actions.length > 0) {
        for (const action of parsed.actions) {
          const success = await executeSingleAction(guild, action);
          if (success) {
            executedActions.push(action);
          }
        }
      }

      return {
        reply: parsed.reply || "Commande exécutée avec succès.",
        actions: executedActions
      };

    } catch (e) {
      console.error("Erreur Gemini AI :", e);
      // Fallback sur le parser local en cas d'erreur de clé ou d'API
    }
  }

  // --- PARSER LOCAL INTELLIGENT (FALLBACK / MOCK) ---
  const msgLower = message.toLowerCase();
  const actions = [];
  let reply = "";

  // 1. anti-link
  if (msgLower.includes("anti-link") || msgLower.includes("anti link") || msgLower.includes("bloque les liens") || msgLower.includes("bloquer les liens")) {
    const enable = !msgLower.includes("désactive") && !msgLower.includes("desactive") && !msgLower.includes("retire") && !msgLower.includes("enleve");
    updateAutomodConfig(guildId, { anti_link: enable ? 1 : 0 });
    actions.push({ type: "update_automod", anti_link: enable ? 1 : 0 });
    reply += `✅ L'anti-link a été ${enable ? 'activé' : 'désactivé'} avec succès. `;
  }

  // 2. anti-spam
  if (msgLower.includes("anti-spam") || msgLower.includes("anti spam") || msgLower.includes("bloque le spam") || msgLower.includes("bloquer le spam")) {
    const enable = !msgLower.includes("désactive") && !msgLower.includes("desactive") && !msgLower.includes("retire") && !msgLower.includes("enleve");
    updateAutomodConfig(guildId, { anti_spam: enable ? 1 : 0 });
    actions.push({ type: "update_automod", anti_spam: enable ? 1 : 0 });
    reply += `✅ L'anti-spam a été ${enable ? 'activé' : 'désactivé'} avec succès. `;
  }

  // 3. anti-badwords
  if (msgLower.includes("anti-badwords") || msgLower.includes("anti badwords") || msgLower.includes("bloque les insultes") || msgLower.includes("bloquer les insultes") || msgLower.includes("bloque les gros mots")) {
    const enable = !msgLower.includes("désactive") && !msgLower.includes("desactive") && !msgLower.includes("retire") && !msgLower.includes("enleve");
    updateAutomodConfig(guildId, { anti_badwords: enable ? 1 : 0 });
    actions.push({ type: "update_automod", anti_badwords: enable ? 1 : 0 });
    reply += `✅ L'anti-badwords a été ${enable ? 'activé' : 'désactivé'} avec succès. `;
  }

  // 4. badwords list
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
        reply += `🚫 Le mot **"${word}"** a été ajouté à la liste des mots interdits. `;
      }
    }
  }

  // 5. create role
  if (msgLower.includes("crée le rôle") || msgLower.includes("creer le role") || msgLower.includes("crée un rôle") || msgLower.includes("creer un role")) {
    const match = message.match(/(?:rôle|role)\s+["']?([^"'\n]+)["']?/i);
    if (match && match[1]) {
      const roleName = match[1];
      try {
        const newRole = await guild.roles.create({
          name: roleName,
          reason: 'Créé via l\'Assistant IA Dashboard'
        });
        actions.push({ type: "create_role", name: roleName, id: newRole.id });
        reply += `👑 Le rôle **"${roleName}"** a été créé avec succès. `;
      } catch (err) {
        reply += `❌ Impossible de créer le rôle **"${roleName}"** (vérifiez mes permissions). `;
      }
    }
  }

  // 6. delete role
  if (msgLower.includes("supprime le rôle") || msgLower.includes("supprimer le role") || msgLower.includes("supprime le role")) {
    const match = message.match(/(?:rôle|role)\s+["']?([^"'\n]+)["']?/i);
    if (match && match[1]) {
      const roleNameOrId = match[1];
      const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleNameOrId.toLowerCase() || r.id === roleNameOrId);
      if (role) {
        try {
          await role.delete('Supprimé via l\'Assistant IA Dashboard');
          actions.push({ type: "delete_role", name: role.name, id: role.id });
          reply += `🗑️ Le rôle **"${role.name}"** a été supprimé. `;
        } catch (err) {
          reply += `❌ Impossible de supprimer le rôle **"${role.name}"**. `;
        }
      } else {
        reply += `❓ Rôle **"${roleNameOrId}"** introuvable sur le serveur. `;
      }
    }
  }

  if (reply === "") {
    reply = "👋 Bonjour ! Je suis votre Assistant IA d'Administration.\nPour débloquer la puissance totale de l'intelligence artificielle générative capable de comprendre n'importe quelle consigne, veuillez ajouter la variable d'environnement `GEMINI_API_KEY` dans votre fichier `.env` sur le serveur Debian.\n\nEn attendant, je peux exécuter des commandes locales simples :\n- *\"bloque les liens\"*\n- *\"bloque le spam\"*\n- *\"bloque les insultes\"*\n- *\"interdit le mot grosmot\"*\n- *\"crée le rôle VIP\"*\n- *\"supprime le rôle VIP\"*";
  }

  return { reply, actions };
}

async function executeSingleAction(guild, action) {
  try {
    switch (action.type) {
      case 'create_role':
        await guild.roles.create({
          name: action.name,
          color: action.color || null,
          reason: 'Assistant IA Dashboard'
        });
        return true;
      case 'delete_role':
        const roleToDelete = guild.roles.cache.get(action.role_id);
        if (roleToDelete) {
          await roleToDelete.delete('Assistant IA Dashboard');
          return true;
        }
        return false;
      case 'set_role_permission':
        const rolePerm = guild.roles.cache.get(action.role_id);
        const channelPerm = guild.channels.cache.get(action.channel_id);
        if (rolePerm && channelPerm) {
          const overrides = {};
          if (action.allow_view !== undefined) {
            overrides.ViewChannel = action.allow_view;
          }
          if (action.allow_send !== undefined) {
            overrides.SendMessages = action.allow_send;
          }
          await channelPerm.permissionOverwrites.edit(rolePerm, overrides, { reason: 'Assistant IA Dashboard' });
          return true;
        }
        return false;
      case 'update_automod':
        const data = {};
        if (action.anti_link !== undefined) data.anti_link = action.anti_link;
        if (action.anti_spam !== undefined) data.anti_spam = action.anti_spam;
        if (action.anti_badwords !== undefined) data.anti_badwords = action.anti_badwords;
        updateAutomodConfig(guild.id, data);
        return true;
      case 'add_badword':
        const configAdd = getAutomodConfig(guild.id);
        let wordsAdd = configAdd.badwords_list ? configAdd.badwords_list.split(',').map(w => w.trim()) : [];
        if (!wordsAdd.includes(action.word.toLowerCase())) {
          wordsAdd.push(action.word.toLowerCase());
          updateAutomodConfig(guild.id, { badwords_list: wordsAdd.join(',') });
        }
        return true;
      case 'remove_badword':
        const configRem = getAutomodConfig(guild.id);
        let wordsRem = configRem.badwords_list ? configRem.badwords_list.split(',').map(w => w.trim()) : [];
        wordsRem = wordsRem.filter(w => w !== action.word.toLowerCase());
        updateAutomodConfig(guild.id, { badwords_list: wordsRem.join(',') });
        return true;
    }
  } catch (err) {
    console.error(`Erreur d'exécution d'action IA (${action.type}) :`, err);
  }
  return false;
}

module.exports = { processAiCommand };
