const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
  getStarConfig,
  getStarWeeklyLeaderboard,
  getUserStarWeeklyPoints,
  getCurrentWeekIdentifier
} = require('../../database/db');
const { runStarElection } = require('../../utils/starManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('star')
    .setDescription('Gestion et classement du système Star de la Semaine')
    .addSubcommand(sub =>
      sub
        .setName('classement')
        .setDescription('Afficher le classement hebdomadaire actuel de la Star de la Semaine')
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Afficher la Star actuelle et vos points de la semaine')
    )
    .addSubcommand(sub =>
      sub
        .setName('elire')
        .setDescription('Forcer l\'élection immédiate de la Star de la Semaine (Administrateur)')
    ),
  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const subcommand = interaction.options.getSubcommand();
    const config = getStarConfig(guildId);

    if (config.is_active !== 1 && subcommand !== 'elire') {
      return interaction.reply({
        content: '⚠️ Le système **Star de la Semaine** n\'est pas activé sur ce serveur.',
        ephemeral: true
      });
    }

    const weekId = getCurrentWeekIdentifier();

    if (subcommand === 'classement') {
      await interaction.deferReply();
      const leaderboard = getStarWeeklyLeaderboard(guildId, weekId, 10);

      if (!leaderboard || leaderboard.length === 0) {
        return interaction.editReply({
          content: '⭐ Aucun participant n\'a encore accumulé de points cette semaine ! Soyez le premier en envoyant un message.'
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`⭐ Classement Star de la Semaine (${weekId})`)
        .setDescription('Voici le Top 10 des membres cumulant le plus de points cette semaine :')
        .setColor('#F1C40F')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTimestamp();

      let desc = '';
      const medals = ['🥇', '🥈', '🥉'];

      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const member = await guild.members.fetch(entry.user_id).catch(() => null);
        const name = member ? member.displayName : `<@${entry.user_id}>`;
        const prefix = medals[i] || `**#${i + 1}**`;

        desc += `${prefix} **${name}** — **${entry.points} pts** *(Normal: ${entry.normal_count}, NSFW: ${entry.nsfw_count}, Selfie: ${entry.selfie_count}, Nude: ${entry.nude_count})*\n`;
      }

      embed.setDescription(desc);
      return interaction.editReply({ embeds: [embed] });
    }

    else if (subcommand === 'info') {
      await interaction.deferReply();
      const userPoints = getUserStarWeeklyPoints(guildId, interaction.user.id, weekId);
      const points = userPoints ? userPoints.points : 0;

      let currentStarText = 'Aucune Star actuellement.';
      if (config.current_star_user_id) {
        const starMember = await guild.members.fetch(config.current_star_user_id).catch(() => null);
        currentStarText = starMember ? `<@${starMember.id}> (${starMember.displayName})` : `<@${config.current_star_user_id}>`;
      }

      const roleObj = config.star_role_id ? guild.roles.cache.get(config.star_role_id) : null;
      const roleText = roleObj ? `<@&${roleObj.id}>` : 'Aucun rôle configuré';

      const daysName = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const electionDayStr = daysName[config.election_day ?? 0] || 'Dimanche';
      const electionHourStr = `${config.election_hour ?? 23}h00`;

      const embed = new EmbedBuilder()
        .setTitle('⭐ Informations — Star de la Semaine')
        .setColor('#F1C40F')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🌟 Star Actuelle du Serveur', value: currentStarText, inline: false },
          { name: '👤 Vos Points cette Semaine', value: `**${points} points**`, inline: true },
          { name: '🎖️ Rôle Récompense', value: roleText, inline: true },
          { name: '📅 Prochaine Élection', value: `Chaque **${electionDayStr}** à **${electionHourStr}**`, inline: false },
          { name: '📊 Barème des Points', value: `💬 Message normal: **${config.points_normal} pt**\n🔥 Message NSFW: **${config.points_nsfw} pts**\n📸 Selfie/Outfit (média): **${config.points_selfie} pts**\n🔞 Nude/Tease (média): **${config.points_nude} pts**`, inline: false }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    else if (subcommand === 'elire') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: '❌ Vous devez être Administrateur pour forcer l\'élection de la Star.',
          ephemeral: true
        });
      }

      await interaction.deferReply();
      const result = await runStarElection(guild, true);

      if (!result) {
        return interaction.editReply({
          content: '❌ Impossible d\'élire la Star : Aucun membre n\'a accumulé de points cette semaine.'
        });
      }

      return interaction.editReply({
        content: `✅ **Élection effectuée !** Félicitations à <@${result.winnerUserId}> qui devient la Star de la Semaine avec **${result.points} points** ! 🌟`
      });
    }
  }
};
