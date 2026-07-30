const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quarantaine')
    .setDescription('Mettre ou retirer un membre de la quarantaine')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Placer un membre en quarantaine')
        .addUserOption(option => option.setName('cible').setDescription('Le membre à isoler').setRequired(true))
        .addStringOption(option => option.setName('raison').setDescription('Raison de la quarantaine').setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Libérer un membre de la quarantaine')
        .addUserOption(option => option.setName('cible').setDescription('Le membre à libérer').setRequired(true))
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getMember('cible');
    const guildId = interaction.guild.id;

    if (!target) {
      return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    }

    const config = db.prepare('SELECT * FROM quarantine_config WHERE guild_id = ?').get(guildId);
    if (!config || !config.role_id) {
      return interaction.reply({ content: '❌ Le système de quarantaine n\'est pas encore configuré sur ce serveur. Utilisez `/quarantine-config`.', ephemeral: true });
    }

    const qRole = interaction.guild.roles.cache.get(config.role_id);
    if (!qRole) {
      return interaction.reply({ content: '❌ Le rôle de quarantaine configuré n\'existe plus sur le serveur.', ephemeral: true });
    }

    if (subcommand === 'add') {
      const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

      if (target.roles.cache.has(qRole.id)) {
        return interaction.reply({ content: '❌ Ce membre est déjà en quarantaine.', ephemeral: true });
      }

      // Conserver les anciens rôles
      const oldRoleIds = target.roles.cache
        .filter(r => r.id !== interaction.guild.id && r.id !== qRole.id)
        .map(r => r.id);

      db.prepare('INSERT OR REPLACE INTO quarantined_users (guild_id, user_id, old_roles) VALUES (?, ?, ?)')
        .run(guildId, target.id, JSON.stringify(oldRoleIds));

      // Retirer les rôles
      for (const roleId of oldRoleIds) {
        const r = interaction.guild.roles.cache.get(roleId);
        if (r && r.editable) {
          await target.roles.remove(r).catch(console.error);
        }
      }

      // Ajouter le rôle de quarantaine
      await target.roles.add(qRole);

      const embed = new EmbedBuilder()
        .setTitle('☣️ Quarantaine Activée')
        .setDescription(`**Membre isolé :** <@${target.id}> (${target.user.tag})\n**Modérateur :** <@${interaction.user.id}>\n**Raison :** ${reason}`)
        .setColor('#E74C3C')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      sendLog(interaction.guild, 'moderation', embed);

      // Envoyer un message dans le salon de quarantaine pour le confiner
      if (config.channel_id) {
        const qChannel = interaction.guild.channels.cache.get(config.channel_id);
        if (qChannel) {
          qChannel.send({
            content: `☣️ <@${target.id}>, vous avez été mis en quarantaine pour la raison suivante : **${reason}**. Veuillez patienter ici qu'un modérateur examine votre situation.`
          }).catch(console.error);
        }
      }
    } 
    
    else if (subcommand === 'remove') {
      if (!target.roles.cache.has(qRole.id)) {
        return interaction.reply({ content: '❌ Ce membre n\'est pas en quarantaine.', ephemeral: true });
      }

      // Retirer le rôle de quarantaine
      await target.roles.remove(qRole).catch(console.error);

      // Récupérer et restaurer les anciens rôles
      const record = db.prepare('SELECT old_roles FROM quarantined_users WHERE guild_id = ? AND user_id = ?').get(guildId, target.id);

      if (record && record.old_roles) {
        const roleIds = JSON.parse(record.old_roles);
        for (const roleId of roleIds) {
          const r = interaction.guild.roles.cache.get(roleId);
          if (r && r.editable) {
            await target.roles.add(r).catch(console.error);
          }
        }
      }

      db.prepare('DELETE FROM quarantined_users WHERE guild_id = ? AND user_id = ?').run(guildId, target.id);

      const embed = new EmbedBuilder()
        .setTitle('🕊️ Quarantaine Levée')
        .setDescription(`**Membre libéré :** <@${target.id}> (${target.user.tag})\n**Modérateur :** <@${interaction.user.id}>`)
        .setColor('#2ECC71')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      sendLog(interaction.guild, 'moderation', embed);
    }
  }
};
