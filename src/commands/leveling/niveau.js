const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeveling, getLevelingConfig, db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('niveau')
    .setDescription("Afficher votre niveau et votre progression d'XP")
    .addUserOption(option => option.setName('membre').setDescription('Le membre à consulter (optionnel)').setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild ? interaction.guild.id : 'DM';

    const leveling = getLeveling(guildId, targetUser.id);
    const lvlConfig = getLevelingConfig(guildId);
    const xpBase = lvlConfig.xp_base ?? 120;
    const xpFactor = lvlConfig.xp_factor ?? 1.35;

    const xpRequired = Math.max(1, Math.round(xpBase * Math.pow(xpFactor, Math.max(0, leveling.level))));
    const xpLeft = Math.max(0, xpRequired - leveling.xp);
    const pct = Math.min(100, Math.round((leveling.xp / xpRequired) * 100));

    let roleRewardInfo = '';
    if (interaction.guild) {
      const reward = db.prepare('SELECT role_id FROM level_rewards WHERE guild_id = ? AND level <= ? ORDER BY level DESC LIMIT 1')
        .get(guildId, leveling.level);
      if (reward) {
        const role = interaction.guild.roles.cache.get(reward.role_id);
        if (role) {
          roleRewardInfo = `<@&${reward.role_id}>`;
        }
      }
    }

    const member = interaction.guild 
      ? (interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null))
      : null;
    const targetName = member ? member.displayName : targetUser.username;

    // Barre de progression textuelle Discord
    const filledBlocks = Math.round((pct / 100) * 10);
    const progressBar = '▰'.repeat(filledBlocks) + '▱'.repeat(10 - filledBlocks);

    const embed = new EmbedBuilder()
      .setColor('#D4AF37')
      .setTitle(`✨ Progression & Niveau — ${targetName}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '📊 Niveau', value: `**Niveau ${leveling.level}**`, inline: true },
        { name: '⚡ Expérience (XP)', value: `**${leveling.xp.toLocaleString('fr-FR')}** / ${xpRequired.toLocaleString('fr-FR')} XP`, inline: true },
        { name: '⬆️ Prochain Niveau', value: `${xpLeft.toLocaleString('fr-FR')} XP restants`, inline: true },
        { name: '📈 Progression', value: `${progressBar} **${pct}%**`, inline: false },
        { name: '🎖️ Rôle de Récompense', value: roleRewardInfo || 'Aucun rôle débloqué', inline: true },
        { name: '💬 Messages envoyés', value: `${(leveling.total_messages || 0).toLocaleString('fr-FR')}`, inline: true },
        { name: '🎙️ Temps en Vocal', value: `${leveling.voice_minutes || 0} minutes`, inline: true }
      )
      .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Niveau local en MP)' });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
