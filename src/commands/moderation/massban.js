const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massban')
    .setDescription('Bannir plusieurs membres en masse via IDs ou mentions')
    .addStringOption(option => option.setName('membres').setDescription('IDs ou Mentions des membres séparés par des espaces').setRequired(true))
    .addStringOption(option => option.setName('raison').setDescription('Raison commune du bannissement').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const listStr = interaction.options.getString('membres');
    const reason = interaction.options.getString('raison') || 'Mass ban par modérateur';

    // Regex pour choper tous les IDs ou mentions (qui contiennent des chiffres de 17-20 caractères)
    const idRegex = /\d{17,20}/g;
    const matches = listStr.match(idRegex);

    if (!matches || matches.length === 0) {
      return interaction.reply({ content: 'Aucun ID d\'utilisateur ou mention valide trouvé.', ephemeral: true });
    }

    const targetIds = [...new Set(matches)]; // Supprime les doublons
    await interaction.deferReply();

    const success = [];
    const failed = [];

    for (const userId of targetIds) {
      try {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) {
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
