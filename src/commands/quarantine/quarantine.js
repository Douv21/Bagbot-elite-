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
      const botMember = interaction.guild.members.me;

      if (target.roles.cache.has(qRole.id)) {
        return interaction.reply({ content: '❌ Ce membre est déjà en quarantaine.', ephemeral: true });
      }

      // 1. Récupérer tous les rôles actuels du membre (hors @everyone)
      const currentRoles = target.roles.cache.filter(r => r.id !== interaction.guild.id);

      // 2. Séparer les rôles retirables des rôles inamovibles (gérés / supérieurs au rôle du bot)
      const removableRoles = currentRoles.filter(r => 
        r.id !== qRole.id && 
        !r.managed && 
        r.position < botMember.roles.highest.position
      );

      const unremovableRoles = currentRoles.filter(r => 
        r.id !== qRole.id && 
        (r.managed || r.position >= botMember.roles.highest.position)
      );

      // 3. Sauvegarder les anciens rôles si pas déjà en base
      const existingRecord = db.prepare('SELECT old_roles FROM quarantined_users WHERE guild_id = ? AND user_id = ?').get(guildId, target.id);
      let savedRoleIds = [];
      if (existingRecord && existingRecord.old_roles) {
        try {
          savedRoleIds = JSON.parse(existingRecord.old_roles) || [];
        } catch (_) {}
      }

      if (savedRoleIds.length === 0) {
        savedRoleIds = removableRoles.map(r => r.id);
        db.prepare('INSERT OR REPLACE INTO quarantined_users (guild_id, user_id, old_roles) VALUES (?, ?, ?)')
          .run(guildId, target.id, JSON.stringify(savedRoleIds));
      }

      // 4. Conserver le rôle Quarantaine + les rôles inamovibles (managed / au-dessus du bot)
      const targetRoleIds = Array.from(new Set([qRole.id, ...unremovableRoles.map(r => r.id)]));

      try {
        await target.roles.set(targetRoleIds);
      } catch (err) {
        // En cas d'échec du set global, retirer les rôles un par un
        for (const [rId, r] of removableRoles) {
          await target.roles.remove(r).catch(() => null);
        }
        await target.roles.add(qRole.id).catch(console.error);
      }

      let warningMsg = '';
      if (unremovableRoles.size > 0) {
        const list = unremovableRoles.map(r => `\`${r.name}\``).join(', ');
        warningMsg = `\n⚠️ **Note :** Les rôles suivants n'ont pas pu être retirés (gérés par Discord ou au-dessus de mon rôle) : ${list}`;
      }

      const embed = new EmbedBuilder()
        .setTitle('☣️ Quarantaine Activée')
        .setDescription(`**Membre isolé :** <@${target.id}> (${target.user.tag})\n**Modérateur :** <@${interaction.user.id}>\n**Raison :** ${reason}${warningMsg}`)
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
      const botMember = interaction.guild.members.me;

      if (!target.roles.cache.has(qRole.id)) {
        return interaction.reply({ content: '❌ Ce membre n\'est pas en quarantaine.', ephemeral: true });
      }

      // 1. Récupérer les rôles sauvegardés en BDD
      const record = db.prepare('SELECT old_roles FROM quarantined_users WHERE guild_id = ? AND user_id = ?').get(guildId, target.id);
      let oldRoleIds = [];
      if (record && record.old_roles) {
        try {
          oldRoleIds = JSON.parse(record.old_roles) || [];
        } catch (e) {
          console.error('Erreur parse old_roles quarantaine:', e);
        }
      }

      // 2. Filtrer les rôles valides existants toujours sur le serveur
      const validOldRoles = oldRoleIds
        .map(id => interaction.guild.roles.cache.get(id))
        .filter(r => r && r.id !== qRole.id);

      // 3. Obtenir les rôles actuels hors rôle de quarantaine
      const currentRolesExceptQ = target.roles.cache
        .filter(r => r.id !== interaction.guild.id && r.id !== qRole.id);

      // 4. Fusionner rôles actuels + anciens rôles restaurés
      const finalRoleIds = Array.from(new Set([
        ...currentRolesExceptQ.map(r => r.id),
        ...validOldRoles.map(r => r.id)
      ]));

      const unrestoredRoles = [];
      try {
        await target.roles.set(finalRoleIds);
      } catch (err) {
        // En cas d'échec du set global, retirer le rôle quarantaine et réattribuer un par un
        await target.roles.remove(qRole.id).catch(() => null);

        for (const r of validOldRoles) {
          if (!r.managed && r.position < botMember.roles.highest.position) {
            await target.roles.add(r.id).catch(() => {
              unrestoredRoles.push(r.name);
            });
          } else if (!r.managed) {
            unrestoredRoles.push(r.name);
          }
        }
      }

      // Nettoyer la base de données
      db.prepare('DELETE FROM quarantined_users WHERE guild_id = ? AND user_id = ?').run(guildId, target.id);

      let noteMsg = '';
      if (unrestoredRoles.length > 0) {
        noteMsg = `\n⚠️ **Note :** Certains rôles n'ont pas pu être restaurés (permissions insuffisantes ou rôle plus haut que le bot) : ${unrestoredRoles.map(n => `\`${n}\``).join(', ')}`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🕊️ Quarantaine Levée')
        .setDescription(`**Membre libéré :** <@${target.id}> (${target.user.tag})\n**Modérateur :** <@${interaction.user.id}>${noteMsg}`)
        .setColor('#2ECC71')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      sendLog(interaction.guild, 'moderation', embed);
    }
  }
};
