const { EmbedBuilder } = require('discord.js');
const { db } = require('../database/db');
const { formatWelcomeLeaveMessage, sendLog } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const guildId = member.guild.id;

    // --- SYSTÈME DE BIENVENUE ---
    const config = db.prepare('SELECT * FROM welcome_leave WHERE guild_id = ?').get(guildId);
    if (config && config.welcome_channel) {
      const channel = member.guild.channels.cache.get(config.welcome_channel);
      if (channel) {
        const title = formatWelcomeLeaveMessage(config.welcome_title || 'Bienvenue !', member);
        const desc = formatWelcomeLeaveMessage(config.welcome_desc || 'Bienvenue {user.mention} sur le serveur !', member);
        const color = config.welcome_color || '#00FF00';

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(desc)
          .setColor(color)
          .setTimestamp();

        if (config.welcome_thumbnail) {
          embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
        }

        if (config.welcome_image) {
          embed.setImage(config.welcome_image);
        }

        if (config.welcome_author_name) {
          embed.setAuthor({
            name: formatWelcomeLeaveMessage(config.welcome_author_name, member),
            iconURL: config.welcome_author_icon ? formatWelcomeLeaveMessage(config.welcome_author_icon, member) : null
          });
        }

        if (config.welcome_footer) {
          embed.setFooter({
            text: formatWelcomeLeaveMessage(config.welcome_footer, member)
          });
        }

        channel.send({ embeds: [embed] }).catch(console.error);
      }
    }

    // --- SYSTÈME DE QUARANTAINE ---
    // Vérifier si l'utilisateur était déjà en quarantaine avant sa déconnexion
    const isQuarantined = db.prepare('SELECT * FROM quarantined_users WHERE guild_id = ? AND user_id = ?').get(guildId, member.id);
    const quarantineConfig = db.prepare('SELECT * FROM quarantine_config WHERE guild_id = ?').get(guildId);

    if (isQuarantined && quarantineConfig && quarantineConfig.role_id) {
      const role = member.guild.roles.cache.get(quarantineConfig.role_id);
      if (role) {
        // Retirer tous ses autres rôles actuels et lui remettre le rôle de quarantaine
        const memberRoles = member.roles.cache.filter(r => r.id !== member.guild.id);
        
        // Enlever les rôles actuels
        for (const [id, r] of memberRoles) {
          await member.roles.remove(r).catch(() => {});
        }

        // Ajouter le rôle de quarantaine
        await member.roles.add(role).catch(console.error);

        // Envoyer une notification dans le salon de quarantaine
        if (quarantineConfig.channel_id) {
          const qChannel = member.guild.channels.cache.get(quarantineConfig.channel_id);
          if (qChannel) {
            qChannel.send({
              content: `⚠️ **Alerte Quarantaine** : <@${member.id}> (${member.user.tag}) est revenu sur le serveur et a été remis automatiquement en quarantaine.`
            }).catch(console.error);
          }
        }
      }
    }

    // --- LOG D'ARRIVÉE ---
    const logEmbed = new EmbedBuilder()
      .setTitle('📥 Nouveau Membre')
      .setDescription(`**Utilisateur :** <@${member.id}> (${member.user.tag})\n**ID :** ${member.id}\n**Création du compte :** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`)
      .setColor('#00FF00')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
    
    sendLog(member.guild, 'memberAdd', logEmbed);
  }
};
