const { getAutomodConfig, updateAutomodConfig, db, getCustomActionMessage, updateCustomActionMessage } = require('../database/db');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

async function processAiCommand(guildId, userId, message, client) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return { reply: "❌ Erreur : Serveur introuvable." };
  }

  // Obtenir la liste des membres, rôles et salons pour le contexte de l'IA
  const membersContext = guild.members.cache.map(m => `- ${m.displayName} (ID: ${m.id}, Username: ${m.user.username})`).join('\n').slice(0, 1500);
  const rolesContext = guild.roles.cache.map(r => `- ${r.name} (ID: ${r.id})`).join('\n').slice(0, 1000);
  const channelsContext = guild.channels.cache.filter(c => c.isTextBased()).map(c => `- #${c.name} (ID: ${c.id})`).join('\n').slice(0, 1000);

  const systemPrompt = `Tu es l'assistant d'administration intelligent du bot Discord B&G Elite.
Tu peux exécuter des actions d'administration sur le serveur Discord "${guild.name}" en renvoyant des instructions structurées en JSON à la fin de ta réponse.

Voici la liste des membres actuels du serveur (associe le nom saisi par l'utilisateur à l'ID correct) :
${membersContext}

Voici la liste des rôles actuels :
${rolesContext}

Voici la liste des salons textuels :
${channelsContext}

Voici les actions d'administration possibles (tu dois les formuler sous forme d'un tableau JSON d'objets, exemple: [{"type": "create_role", "name": "VIP"}]):
1. {"type": "update_automod", "anti_link": 0/1, "anti_spam": 0/1, "anti_massmention": 0/1, "anti_badwords": 0/1, "spam_max_msgs": nombre, "massmention_limit": nombre, "badwords_list": "mot1,mot2"}
2. {"type": "create_role", "name": "Nom du rôle", "color": "code hex ou rouge/bleu/vert...", "permissions": ["BanMembers", "KickMembers", "Administrator", "ManageRoles", "ManageChannels", "ManageMessages"]}
3. {"type": "delete_role", "role_id": "ID du rôle"}
4. {"type": "add_member_role", "member_id": "ID du membre", "role_id": "ID du rôle"}
5. {"type": "remove_member_role", "member_id": "ID du membre", "role_id": "ID du rôle"}
6. {"type": "timeout_member", "member_id": "ID du membre", "duration": minutes}
7. {"type": "kick_member", "member_id": "ID du membre"}
8. {"type": "ban_member", "member_id": "ID du membre"}
9. {"type": "send_embed", "channel_id": "ID du salon", "title": "Titre", "description": "Texte"}
10. {"type": "update_action_message", "action_name": "calin/caresser/sodo...", "self": true/false, "text": "Le message avec balises de genre {A}, {T}, {A:e}, {T:e}, {A:pronom}, {T:pronom} etc."}

Analyse la demande de l'utilisateur. Réponds-lui de manière courtoise, chaleureuse, sensuelle (si approprié) et naturelle en français.
Si la demande nécessite une ou plusieurs actions d'administration ci-dessus, inclus à la fin de ta réponse le tableau d'actions au format JSON.
Important : Si tu décides de générer des actions JSON, écris-les sous la forme exacte suivante :
[ACTIONS_START]
[
  ...
]
[ACTIONS_END]
Pour que le script puisse les parser automatiquement.`;

  try {
    const apiPrompt = `${systemPrompt}\n\nUtilisateur: ${message}\nAssistant:`;
    const response = await fetch('https://text.pollinations.ai/' + encodeURIComponent(apiPrompt) + '?model=openai', {
      signal: AbortSignal.timeout(9000) // 9 secondes max
    });

    if (!response.ok) {
      throw new Error(`Erreur d'appel API AI (Status: ${response.status})`);
    }

    const fullReply = await response.text();

    // Extraire les actions JSON s'il y en a
    let reply = fullReply;
    let actions = [];

    const startIndex = fullReply.indexOf('[ACTIONS_START]');
    const endIndex = fullReply.indexOf('[ACTIONS_END]');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonStr = fullReply.substring(startIndex + '[ACTIONS_START]'.length, endIndex).trim();
      reply = fullReply.substring(0, startIndex).trim();
      try {
        actions = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Erreur parsing actions JSON:', e, jsonStr);
      }
    }

    // Exécuter les actions
    const executedActions = [];
    for (const action of actions) {
      try {
        if (action.type === 'update_automod') {
          const configUpdate = {};
          if (action.anti_link !== undefined) configUpdate.anti_link = action.anti_link;
          if (action.anti_spam !== undefined) configUpdate.anti_spam = action.anti_spam;
          if (action.anti_massmention !== undefined) configUpdate.anti_massmention = action.anti_massmention;
          if (action.anti_badwords !== undefined) configUpdate.anti_badwords = action.anti_badwords;
          if (action.spam_max_msgs !== undefined) configUpdate.spam_max_msgs = action.spam_max_msgs;
          if (action.massmention_limit !== undefined) configUpdate.massmention_limit = action.massmention_limit;
          if (action.badwords_list !== undefined) configUpdate.badwords_list = action.badwords_list;
          
          updateAutomodConfig(guildId, configUpdate);
          executedActions.push({ type: 'update_automod' });
        }

        else if (action.type === 'create_role') {
          let color = null;
          if (action.color) {
            const colors = { rouge: '#ff0000', bleu: '#3498db', vert: '#2ecc71', jaune: '#f1c40f', rose: '#e91e63', violet: '#9b59b6', orange: '#e67e22', noir: '#000000', gris: '#95a5a6' };
            color = colors[action.color.toLowerCase()] || (action.color.startsWith('#') ? action.color : null);
          }

          const permissions = [];
          if (action.permissions) {
            action.permissions.forEach(perm => {
              if (PermissionFlagsBits[perm]) permissions.push(PermissionFlagsBits[perm]);
            });
          }

          const newRole = await guild.roles.create({
            name: action.name,
            color: color || undefined,
            permissions: permissions.length > 0 ? permissions : undefined,
            reason: 'Créé via l\'Assistant IA Dashboard'
          });
          executedActions.push({ type: 'create_role', name: newRole.name, id: newRole.id });
        }

        else if (action.type === 'delete_role') {
          const role = guild.roles.cache.get(action.role_id);
          if (role) {
            await role.delete('Supprimé via l\'Assistant IA Dashboard');
            executedActions.push({ type: 'delete_role' });
          }
        }

        else if (action.type === 'add_member_role') {
          const member = await guild.members.fetch(action.member_id).catch(() => null);
          const role = guild.roles.cache.get(action.role_id);
          if (member && role) {
            await member.roles.add(role);
            executedActions.push({ type: 'add_member_role' });
          }
        }

        else if (action.type === 'remove_member_role') {
          const member = await guild.members.fetch(action.member_id).catch(() => null);
          const role = guild.roles.cache.get(action.role_id);
          if (member && role) {
            await member.roles.remove(role);
            executedActions.push({ type: 'remove_member_role' });
          }
        }

        else if (action.type === 'timeout_member') {
          const member = await guild.members.fetch(action.member_id).catch(() => null);
          if (member) {
            await member.timeout(action.duration * 60 * 1000, 'Exclu temporairement via l\'Assistant IA');
            executedActions.push({ type: 'timeout_member' });
          }
        }

        else if (action.type === 'kick_member') {
          const member = await guild.members.fetch(action.member_id).catch(() => null);
          if (member) {
            await member.kick('Expulsé via l\'Assistant IA');
            executedActions.push({ type: 'kick_member' });
          }
        }

        else if (action.type === 'ban_member') {
          const member = await guild.members.fetch(action.member_id).catch(() => null);
          if (member) {
            await member.ban({ reason: 'Banni via l\'Assistant IA' });
            executedActions.push({ type: 'ban_member' });
          }
        }

        else if (action.type === 'send_embed') {
          const channel = guild.channels.cache.get(action.channel_id);
          if (channel) {
            const embed = new EmbedBuilder()
              .setTitle(action.title || 'Message')
              .setDescription(action.description || '')
              .setColor('#9b59b6')
              .setTimestamp();
            await channel.send({ embeds: [embed] });
            executedActions.push({ type: 'send_embed' });
          }
        }

        else if (action.type === 'update_action_message') {
          const customMsg = getCustomActionMessage(guildId, action.action_name) || { self_message: null, target_message: null };
          if (action.self) {
            customMsg.self_message = action.text;
          } else {
            customMsg.target_message = action.text;
          }
          updateCustomActionMessage(guildId, action.action_name, customMsg.self_message, customMsg.target_message);
          executedActions.push({ type: 'update_action_message' });
        }
      } catch (err) {
        console.error('Erreur execution action IA:', action, err);
        reply += `\n⚠️ *Erreur lors de l'exécution de l'action ${action.type || ''} : ${err.message}*`;
      }
    }

    return { reply, actions: executedActions };
  } catch (error) {
    console.error('Erreur IA complète:', error);
    return { reply: `❌ Une erreur est survenue lors de la communication avec l'IA : ${error.message}` };
  }
}

module.exports = { processAiCommand };
