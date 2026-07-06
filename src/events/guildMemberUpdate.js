const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { db } = require('../database/db');
const { formatWelcomeLeaveMessage } = require('../utils/helpers');
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
            } else {
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
              }
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
  }
};
