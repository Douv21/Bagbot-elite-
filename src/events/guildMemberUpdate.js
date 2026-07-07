const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { db } = require('../database/db');
const { formatWelcomeLeaveMessage, sendLog } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    const guildId = newMember.guild.id;

    // --- SYSTÈME DE BIENVENUE SUR RÔLE ---
    const config = db.prepare('SELECT * FROM welcome_leave WHERE guild_id = ?').get(guildId);
    if (config && config.welcome_channel && config.welcome_role_filter) {
      const roleId = config.welcome_role_filter;
      
      // Vérifier si le membre vient d'obtenir le rôle requis
      const hadRole = oldMember.roles.cache.has(roleId);
      const hasRole = newMember.roles.cache.has(roleId);

      if (!hadRole && hasRole) {
        const channel = newMember.guild.channels.cache.get(config.welcome_channel);
        if (channel) {
          const title = formatWelcomeLeaveMessage(config.welcome_title || 'Bienvenue !', newMember);
          const desc = formatWelcomeLeaveMessage(config.welcome_desc || 'Bienvenue {user.mention} sur le serveur !', newMember);
          const color = config.welcome_color || '#00FF00';

          const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(color)
            .setTimestamp();

          const files = [];

          if (config.welcome_thumbnail) {
            embed.setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }));
          }

          if (config.welcome_image) {
            if (config.welcome_image.startsWith('/uploads/')) {
              const absPath = path.join(__dirname, '../../public', config.welcome_image);
              if (fs.existsSync(absPath)) {
                const name = path.basename(config.welcome_image);
                files.push(new AttachmentBuilder(absPath, { name }));
                embed.setImage(`attachment://${name}`);
              }
            } else if (config.welcome_image.startsWith('http://') || config.welcome_image.startsWith('https://')) {
              embed.setImage(config.welcome_image);
            }
          }

          let authorIcon = config.welcome_author_icon;
          if (authorIcon) {
            if (authorIcon.startsWith('/uploads/')) {
              const absPath = path.join(__dirname, '../../public', authorIcon);
              if (fs.existsSync(absPath)) {
                const name = 'author_' + path.basename(authorIcon);
                files.push(new AttachmentBuilder(absPath, { name }));
                authorIcon = `attachment://${name}`;
              } else {
                authorIcon = null;
              }
            } else if (!authorIcon.startsWith('http://') && !authorIcon.startsWith('https://')) {
              authorIcon = null;
            }
          }

          if (config.welcome_author_name) {
            embed.setAuthor({
              name: formatWelcomeLeaveMessage(config.welcome_author_name, newMember),
              iconURL: authorIcon ? formatWelcomeLeaveMessage(authorIcon, newMember) : null
            });
          }

          if (config.welcome_footer) {
            embed.setFooter({
              text: formatWelcomeLeaveMessage(config.welcome_footer, newMember)
            });
          }

          channel.send({ embeds: [embed], files }).catch(console.error);
        }
      }
    }

    // --- SYSTÈME D'AUTO-RÔLE SUR OBTENTION DE RÔLE ---
    try {
      const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
      if (addedRoles.size > 0) {
        console.log(`[Auto-Rôle] Rôles ajoutés pour ${newMember.user.tag}:`, addedRoles.map(r => r.name).join(', '));
        const triggerRoles = db.prepare('SELECT trigger_role_id, target_role_id FROM autoroles_on_role WHERE guild_id = ?').all(guildId);
        console.log(`[Auto-Rôle] Règles d'obtention trouvées pour ce serveur :`, triggerRoles.length);
        
        if (triggerRoles.length > 0) {
          const botMember = newMember.guild.members.me;
          for (const role of addedRoles.values()) {
            const matches = triggerRoles.filter(t => t.trigger_role_id === role.id);
            for (const match of matches) {
              console.log(`[Auto-Rôle] Match trouvé ! Rôle déclencheur : ${role.name}. Attribution du rôle cible...`);
              const targetRole = newMember.guild.roles.cache.get(match.target_role_id);
              if (targetRole) {
                if (newMember.roles.cache.has(targetRole.id)) {
                  console.log(`[Auto-Rôle] Le membre possède déjà le rôle cible : ${targetRole.name}`);
                  continue;
                }
                if (targetRole.position >= botMember.roles.highest.position) {
                  console.log(`[Auto-Rôle] Impossible d'attribuer le rôle ${targetRole.name} car il est plus élevé ou égal à mon rôle le plus haut.`);
                  continue;
                }
                
                await newMember.roles.add(targetRole.id)
                  .then(() => console.log(`[Auto-Rôle] Rôle ${targetRole.name} attribué avec succès à ${newMember.user.tag}`))
                  .catch(err => console.error(`[Auto-Rôle] Erreur lors de l'ajout du rôle ${targetRole.name} :`, err));
              } else {
                console.log(`[Auto-Rôle] Rôle cible introuvable dans le cache du serveur pour l'ID : ${match.target_role_id}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Erreur attribution auto-rôle sur obtention:', err);
    }

    // --- LOGS COMPLETS DE MEMBRE (ROLES & PSEUDOS) ---
    // Log changement de pseudo / nickname
    if (oldMember.nickname !== newMember.nickname) {
      const oldNick = oldMember.nickname || 'Aucun';
      const newNick = newMember.nickname || 'Aucun';
      const embed = new EmbedBuilder()
        .setTitle('✍️ Modification de Pseudo')
        .setDescription(`**Membre :** ${newMember.user.tag} (<@${newMember.id}>)\n**Ancien pseudo :** \`${oldNick}\`\n**Nouveau pseudo :** \`${newNick}\``)
        .setColor('#3498DB')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
      sendLog(newMember.guild, 'memberUpdate', embed, { isBot: newMember.user.bot });
    }

    // Log attribution / retrait de rôles
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    if (oldRoles.size !== newRoles.size) {
      const added = newRoles.filter(role => !oldRoles.has(role.id));
      const removed = oldRoles.filter(role => !newRoles.has(role.id));

      if (added.size > 0) {
        const embed = new EmbedBuilder()
          .setTitle('🛡️ Rôle Attribué')
          .setDescription(`**Membre :** ${newMember.user.tag} (<@${newMember.id}>)\n**Rôle(s) ajouté(s) :** ${added.map(r => `<@&${r.id}>`).join(', ')}`)
          .setColor('#2ECC71')
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();
        sendLog(newMember.guild, 'memberUpdate', embed, { isBot: newMember.user.bot });
      }

      if (removed.size > 0) {
        const embed = new EmbedBuilder()
          .setTitle('🛡️ Rôle Retiré')
          .setDescription(`**Membre :** ${newMember.user.tag} (<@${newMember.id}>)\n**Rôle(s) retiré(s) :** ${removed.map(r => `<@&${r.id}>`).join(', ')}`)
          .setColor('#E74C3C')
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();
        sendLog(newMember.guild, 'memberUpdate', embed, { isBot: newMember.user.bot });
      }
    }
  }
};
