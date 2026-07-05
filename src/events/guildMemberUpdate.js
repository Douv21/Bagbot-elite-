const { EmbedBuilder } = require('discord.js');
const { db } = require('../database/db');
const { formatWelcomeLeaveMessage } = require('../utils/helpers');

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

          if (config.welcome_thumbnail) {
            embed.setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }));
          }

          if (config.welcome_image) {
            embed.setImage(config.welcome_image);
          }

          if (config.welcome_author_name) {
            embed.setAuthor({
              name: formatWelcomeLeaveMessage(config.welcome_author_name, newMember),
              iconURL: config.welcome_author_icon ? formatWelcomeLeaveMessage(config.welcome_author_icon, newMember) : null
            });
          }

          if (config.welcome_footer) {
            embed.setFooter({
              text: formatWelcomeLeaveMessage(config.welcome_footer, newMember)
            });
          }

          channel.send({ embeds: [embed] }).catch(console.error);
        }
      }
    }
  }
};
