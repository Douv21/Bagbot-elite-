const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massban')
    .setDescription('Bannir plusieurs membres en masse via IDs, mentions, rôles ou sans rôles')
    .addStringOption(option => option.setName('membres').setDescription('IDs ou Mentions des membres séparés par des espaces').setRequired(false))
    .addRoleOption(option => option.setName('role').setDescription('Bannir tous les membres ayant ce rôle').setRequired(false))
    .addBooleanOption(option => option.setName('sans_role').setDescription('Bannir tous les membres n\'ayant aucun rôle (uniquement @everyone)').setRequired(false))
    .addStringOption(option => option.setName('raison').setDescription('Raison commune du bannissement').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const listStr = interaction.options.getString('membres');
    const targetRole = interaction.options.getRole('role');
    const noRoleOnly = interaction.options.getBoolean('sans_role');
    const reason = interaction.options.getString('raison') || 'Mass ban par modérateur';

    if (!listStr && !targetRole && !noRoleOnly) {
      return interaction.reply({ content: 'Veuillez spécifier au moins une option : liste de membres, un rôle ou l\'option sans_role.', ephemeral: true });
    }

    await interaction.deferReply();

    let targets = [];

    // 1. Manuel
    if (listStr) {
      const idRegex = /\d{17,20}/g;
      const matches = listStr.match(idRegex);
      if (matches) {
        targets.push(...matches);
      }
    }

    // Récupérer les membres du serveur
    await interaction.guild.members.fetch();

    // 2. Par rôle
    if (targetRole) {
      const roleMembers = targetRole.members
        .filter(m => m.id !== interaction.user.id && m.id !== interaction.client.user.id && m.id !== interaction.guild.ownerId && !m.user.bot)
        .map(m => m.id);
      targets.push(...roleMembers);
    }

    // 3. Sans rôle
    if (noRoleOnly === true) {
      const noRoleMembers = interaction.guild.members.cache
        .filter(m => m.roles.cache.size === 1 && m.id !== interaction.user.id && m.id !== interaction.client.user.id && m.id !== interaction.guild.ownerId && !m.user.bot)
        .map(m => m.id);
      targets.push(...noRoleMembers);
    }

    const targetIds = [...new Set(targets)];

    if (targetIds.length === 0) {
      return interaction.editReply({ content: 'Aucun utilisateur ciblé trouvé pour le bannissement.' });
    }

    const success = [];
    const failed = [];

    for (const userId of targetIds) {
      try {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) {
          if (member.id === interaction.user.id || member.id === interaction.client.user.id || member.id === interaction.guild.ownerId) {
            failed.push(`<@${userId}> (Protection modérateur/bot/propriétaire)`);
            continue;
          }
          if (!member.bannable) {
            failed.push(`<@${userId}> (Non bannissable)`);
            continue;
          }
          await member.ban({ reason });
          success.push(`<@${userId}>`);
        } else {
          await interaction.guild.bans.create(userId, { reason });
          success.push(`<@${userId}> (Banni par ID)`);
        }
      } catch (err) {
        failed.push(`<@${userId}> (Erreur: ${err.message})`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🔨 Mass Bannissement')
      .setColor('#FF0000')
      .setDescription(`**Modérateur :** <@${interaction.user.id}>\n**Raison :** ${reason}`)
      .addFields(
        { name: `Succès (${success.length})`, value: success.length > 0 ? success.join('\n').slice(0, 1024) : 'Aucun' },
        { name: `Échecs (${failed.length})`, value: failed.length > 0 ? failed.join('\n').slice(0, 1024) : 'Aucun' }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    sendLog(interaction.guild, 'moderation', embed);
  }
};
