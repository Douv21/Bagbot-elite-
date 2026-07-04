const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quarantine-config')
    .setDescription('Configurer le système de quarantaine')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(option => option.setName('role').setDescription('Le rôle à attribuer aux membres en quarantaine').setRequired(true))
    .addChannelOption(option => option.setName('salon').setDescription('Le salon d\'alerte et d\'explications de la quarantaine').setRequired(true)),
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const channel = interaction.options.getChannel('salon');
    const guildId = interaction.guild.id;

    db.prepare('INSERT OR REPLACE INTO quarantine_config (guild_id, role_id, channel_id) VALUES (?, ?, ?)')
      .run(guildId, role.id, channel.id);

    await interaction.reply({ content: `✅ Le système de quarantaine a été configuré :\n- **Rôle :** <@&${role.id}>\n- **Salon :** <#${channel.id}>`, ephemeral: true });
  }
};
