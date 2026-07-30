const { EmbedBuilder, AttachmentBuilder, AuditLogEvent } = require('discord.js');
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

          channel.send({ content: `<@${newMember.id}>`, embeds: [embed], files }).catch(console.error);
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

    // --- SYSTÈME D'ANNONCE ET DE REMERCIEMENT POUR LES BOOSTS DE SERVEUR ---
    const wasBoosting = Boolean(oldMember.premiumSince);
    const isBoosting = Boolean(newMember.premiumSince);

    if (!wasBoosting && isBoosting) {
      console.log(`[Boost] 🚀 ${newMember.user.tag} vient de booster le serveur !`);
      try {
        const { getBoostConfig, getEconomy, updateEconomy } = require('../database/db');
        const boostConf = getBoostConfig(guildId);

        if (boostConf && boostConf.enabled !== 0 && boostConf.channel_id) {
          const channel = newMember.guild.channels.cache.get(boostConf.channel_id);
          if (channel) {
            const { generateAiBoostPhrase } = require('../utils/aiActionHelper');
            const aiBoostText = await generateAiBoostPhrase(newMember, guildId);

            let msgText = boostConf.message || '🎉 Un grand MERCI à {user.mention} d\'avoir boosté **{server}** ! Grâce à toi, le serveur gagne en puissance ! 💖';
            msgText = msgText
              .replace(/{user}/g, newMember.user.tag)
              .replace(/{user\.mention}/g, `<@${newMember.id}>`)
              .replace(/{user\.name}/g, newMember.user.username)
              .replace(/{server}/g, newMember.guild.name)
              .replace(/{boosts\.count}/g, `${newMember.guild.premiumSubscriptionCount || 1}`)
              .replace(/{boosts\.level}/g, `${newMember.guild.premiumTier || 0}`);

            let titleText = boostConf.title || '🚀 Nouveau Boost de Serveur !';
            titleText = titleText
              .replace(/{user}/g, newMember.user.tag)
              .replace(/{server}/g, newMember.guild.name);

            const finalDesc = aiBoostText ? `${aiBoostText}\n\n${msgText}` : msgText;

            const boostEmbed = new EmbedBuilder()
              .setAuthor({ 
                name: `🌟 NOUVEAU BOOSTER NITRO — ${newMember.user.displayName}`, 
                iconURL: newMember.user.displayAvatarURL({ dynamic: true }) 
              })
              .setTitle(titleText)
              .setDescription(finalDesc)
              .setColor(boostConf.color || '#F47FFF')
              .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
              .addFields(
                { name: '💎 Niveau du Serveur', value: `Niveau **${newMember.guild.premiumTier}** (${newMember.guild.premiumSubscriptionCount || 1} Boosts)`, inline: true },
                { name: '🚀 Membre VIP', value: `<@${newMember.id}>`, inline: true }
              )
              .setFooter({ 
                text: `${newMember.guild.name} • Remerciements Nitro VIP`, 
                iconURL: newMember.guild.iconURL({ dynamic: true }) || undefined 
              })
              .setTimestamp();

            if (boostConf.image_url) {
              boostEmbed.setImage(boostConf.image_url);
            }

            const rewardMoney = parseInt(boostConf.reward_money) || 0;
            const rewardKarma = parseInt(boostConf.reward_karma) || 0;
            if (rewardMoney > 0 || rewardKarma > 0) {
              const currentEco = getEconomy(guildId, newMember.id);
              updateEconomy(guildId, newMember.id, {
                wallet: (currentEco.wallet || 0) + rewardMoney,
                karma: (currentEco.karma || 0) + rewardKarma
              });

              boostEmbed.addFields({
                name: '🎁 Récompense VIP accordée',
                value: `+**${rewardMoney}** 🪙 pièces & +**${rewardKarma}** ✨ Karma versés sur le compte de <@${newMember.id}> !`,
                inline: false
              });
            }

            channel.send({ content: `<@${newMember.id}>`, embeds: [boostEmbed] }).catch(console.error);

            const logEmbed = new EmbedBuilder()
              .setTitle('🚀 Nouveau Boost Réceptionné')
              .setDescription(`**Booster :** ${newMember.user.tag} (<@${newMember.id}>)\n**Niveau du serveur :** Niveau ${newMember.guild.premiumTier} (${newMember.guild.premiumSubscriptionCount} boosts)`)
              .setColor('#F47FFF')
              .setTimestamp();
            sendLog(newMember.guild, 'memberUpdate', logEmbed);
          }
        }
      } catch (err) {
        console.error('Erreur traitement boost serveur:', err);
      }
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

    // Log timeout (exclusion temporaire)
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;

    if (oldTimeout !== newTimeout) {
      const isMuted = newTimeout && newTimeout > Date.now();
      
      let moderator = 'Inconnu';
      let reason = 'Aucune raison fournie';
      try {
        const fetchedLogs = await newMember.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MemberUpdate,
        });
        const updateLog = fetchedLogs.entries.first();
        if (updateLog && updateLog.target.id === newMember.id) {
          const disabledChange = updateLog.changes.find(c => c.key === 'communication_disabled_until');
          if (disabledChange) {
            moderator = `<@${updateLog.executor.id}> (${updateLog.executor.tag})`;
            reason = updateLog.reason || 'Aucune raison fournie';
          }
        }
      } catch (e) {
        console.error(e);
      }

      if (isMuted) {
        const embed = new EmbedBuilder()
          .setTitle('🔇 Membre Exclu Temporairement (Timeout)')
          .setDescription(`**Membre :** ${newMember.user.tag} (<@${newMember.id}>)\n**Modérateur :** ${moderator}\n**Exclu jusqu'à :** <t:${Math.floor(newTimeout / 1000)}:F> (<t:${Math.floor(newTimeout / 1000)}:R>)\n**Raison :** ${reason}`)
          .setColor('#E67E22')
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();
        sendLog(newMember.guild, 'moderation', embed, { isBot: newMember.user.bot });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('🔊 Exclusion Temporaire Retirée')
          .setDescription(`**Membre :** ${newMember.user.tag} (<@${newMember.id}>)\n**Modérateur :** ${moderator}\n**Raison :** Timeout expiré ou retiré manuellement.`)
          .setColor('#2ECC71')
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();
        sendLog(newMember.guild, 'moderation', embed, { isBot: newMember.user.bot });
      }
    }
  }
};
