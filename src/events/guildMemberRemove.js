const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { db } = require('../database/db');
const { formatWelcomeLeaveMessage, sendLog } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const guildId = member.guild.id;

    // --- SYSTÈME DE DÉPART ---
    const config = db.prepare('SELECT * FROM welcome_leave WHERE guild_id = ?').get(guildId);
    if (config && config.leave_channel) {
      const channel = member.guild.channels.cache.get(config.leave_channel);
      if (channel) {
        const title = formatWelcomeLeaveMessage(config.leave_title || 'Départ', member);
        const desc = formatWelcomeLeaveMessage(config.leave_desc || '{user.tag} a quitté le serveur.', member);
        const color = config.leave_color || '#FF0000';

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(desc)
          .setColor(color)
          .setTimestamp();

        const files = [];

        if (config.leave_thumbnail) {
          embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
        }

        if (config.leave_image) {
          if (config.leave_image.startsWith('/uploads/')) {
            const absPath = path.join(__dirname, '../../public', config.leave_image);
            if (fs.existsSync(absPath)) {
              const name = path.basename(config.leave_image);
              files.push(new AttachmentBuilder(absPath, { name }));
              embed.setImage(`attachment://${name}`);
            }
          } else if (config.leave_image.startsWith('http://') || config.leave_image.startsWith('https://')) {
            embed.setImage(config.leave_image);
          }
        }

        let authorIcon = config.leave_author_icon;
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

        if (config.leave_author_name) {
          embed.setAuthor({
            name: formatWelcomeLeaveMessage(config.leave_author_name, member),
            iconURL: authorIcon ? formatWelcomeLeaveMessage(authorIcon, member) : null
          });
        }

        if (config.leave_footer) {
          embed.setFooter({
            text: formatWelcomeLeaveMessage(config.leave_footer, member)
          });
        }

        channel.send({ embeds: [embed], files }).catch(console.error);
      }
    }

    // --- LOG DE DÉPART ---
    const logEmbed = new EmbedBuilder()
      .setTitle('📤 Départ de Membre')
      .setDescription(`**Utilisateur :** ${member.user.tag} (<@${member.id}>)\n**ID :** ${member.id}\n**Rôles possédés :** ${member.roles.cache.map(r => r.name).filter(name => name !== '@everyone').join(', ') || 'Aucun'}`)
      .setColor('#FF0000')
      .setTimestamp();
    
    sendLog(member.guild, 'memberRemove', logEmbed);
  }
};
