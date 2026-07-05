const { EmbedBuilder } = require('discord.js');
const { db } = require('../database/db');
const { formatWelcomeLeaveMessage, sendLog } = require('../utils/helpers');

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

        if (config.leave_thumbnail) {
          embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
        }

        if (config.leave_image) {
          embed.setImage(config.leave_image);
        }

        if (config.leave_author_name) {
          embed.setAuthor({
            name: formatWelcomeLeaveMessage(config.leave_author_name, member),
            iconURL: config.leave_author_icon ? formatWelcomeLeaveMessage(config.leave_author_icon, member) : null
          });
        }

        if (config.leave_footer) {
          embed.setFooter({
            text: formatWelcomeLeaveMessage(config.leave_footer, member)
          });
        }

        channel.send({ embeds: [embed] }).catch(console.error);
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
