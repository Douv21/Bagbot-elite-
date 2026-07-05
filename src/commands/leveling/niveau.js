const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeveling, getEconomy, db } = require('../../database/db');
const genCard = require('../../carte/holographique');

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
    const economy = getEconomy(guildId, targetUser.id);
    
    // Formule exponentielle de Bagbot-lite : 100 * 1.2^lvl
    const xpRequired = Math.max(1, Math.round(100 * Math.pow(1.2, Math.max(0, leveling.level))));
    const xpLeft = Math.max(0, xpRequired - leveling.xp);
    const pct = Math.min(100, Math.round((leveling.xp / xpRequired) * 100));

    // Rechercher le rôle de récompense actuel
    let roleRewardInfo = '';
    let roleRewardName = '';
    if (interaction.guild) {
      const reward = db.prepare('SELECT role_id FROM level_rewards WHERE guild_id = ? AND level <= ? ORDER BY level DESC LIMIT 1')
        .get(guildId, leveling.level);
      if (reward) {
        const role = interaction.guild.roles.cache.get(reward.role_id);
        if (role) {
          roleRewardInfo = `<@&${reward.role_id}>`;
          roleRewardName = role.name;
        }
      }
    }

    const cardData = {
      level:        leveling.level,
      xp:           leveling.xp,
      required:     xpRequired,
      messages:     0,
      voiceMinutes: 0,
      streak:       0,
      karma:        economy.karma,
      roleName:     roleRewardName || 'AUCUN'
    };

    const member = interaction.guild 
      ? (interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null))
      : { user: targetUser };

    const ALL_THEMES = ['holographique','gaming','love','sensuel','cosmos','nature','dark','gold','argent','bleu','rose'];
    const theme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];

    if (member) {
      const card = await genCard(member, cardData, theme);
      if (card) {
        const mention = targetUser.id !== interaction.user.id ? `<@${targetUser.id}>` : null;
        return interaction.editReply({
          content: mention,
          files: [card],
          allowedMentions: mention ? { users: [targetUser.id] } : { parse: [] }
        });
      }
    }

    // Fallback embed si la génération de la carte échoue
    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle(`✨ Niveau de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '📈 Niveau', value: `**${leveling.level}**`, inline: true },
        { name: '⚡ XP Actuel', value: `${leveling.xp.toLocaleString('fr-FR')} / ${xpRequired.toLocaleString('fr-FR')} XP (${pct}%)`, inline: true },
        { name: '⬆️ Prochain Niveau', value: `${xpLeft.toLocaleString('fr-FR')} XP restants`, inline: true },
        { name: '🎖️ Rôle de Niveau', value: roleRewardInfo || 'Aucun rôle de récompense', inline: true }
      )
      .setTimestamp();

    if (!interaction.guild) {
      embed.setFooter({ text: '💬 Message Privé (Niveau local en MP)' });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
