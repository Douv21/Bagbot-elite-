const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeveling, db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('niveau')
    .setDescription("Afficher votre niveau et votre progression d'XP")
    .addUserOption(option => option.setName('membre').setDescription('Le membre à consulter (optionnel)').setRequired(false)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild ? interaction.guild.id : 'DM';

    const leveling = getLeveling(guildId, targetUser.id);
    
    // Formule exponentielle de Bagbot-lite : 100 * 1.2^lvl
    const xpRequired = Math.max(1, Math.round(100 * Math.pow(1.2, Math.max(0, leveling.level))));
    const xpLeft = Math.max(0, xpRequired - leveling.xp);
    const pct = Math.min(100, Math.round((leveling.xp / xpRequired) * 100));

    // Rechercher le rôle de récompense actuel
    let roleRewardInfo = 'Aucun rôle de récompense';
    if (interaction.guild) {
      const reward = db.prepare('SELECT role_id FROM level_rewards WHERE guild_id = ? AND level <= ? ORDER BY level DESC LIMIT 1')
        .get(guildId, leveling.level);
      if (reward) {
        roleRewardInfo = `<@&${reward.role_id}>`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle(`✨ Niveau de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '📈 Niveau', value: `**${leveling.level}**`, inline: true },
        { name: '⚡ XP Actuel', value: `${leveling.xp.toLocaleString('fr-FR')} / ${xpRequired.toLocaleString('fr-FR')} XP (${pct}%)`, inline: true },
        { name: '⬆️ Prochain Niveau', value: `${xpLeft.toLocaleString('fr-FR')} XP restants`, inline: true },
        { name: '🎖️ Rôle de Niveau', value: roleRewardInfo, inline: true }
      )
      .setTimestamp();

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Niveau local en MP)' });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
