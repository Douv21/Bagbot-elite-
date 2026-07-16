const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');
const { addXP } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajouter')
    .setDescription('Ajouter de l\'argent, de l\'XP ou du Karma à un membre (Staff)')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type de ressource à ajouter')
        .setRequired(true)
        .addChoices(
          { name: '💰 Argent', value: 'argent' },
          { name: '✨ Karma', value: 'karma' },
          { name: '⭐ XP', value: 'xp' }
        ))
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Membre ciblé')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantite')
        .setDescription('Quantité à ajouter')
        .setRequired(true)
        .setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const type = interaction.options.getString('type', true);
    const targetUser = interaction.options.getUser('cible', true);
    const quantite = interaction.options.getInteger('quantite', true);
    const guildId = interaction.guild.id;

    if (targetUser.bot) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas attribuer de ressources à un bot.', ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❌ Membre introuvable sur ce serveur.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (type === 'argent') {
      const eco = getEconomy(guildId, targetUser.id);
      updateEconomy(guildId, targetUser.id, {
        wallet: eco.wallet + quantite
      });
      embed.setTitle('💰 Ajout d\'argent')
        .setDescription(`Ajout de **💰 ${quantite} pièces** à <@${targetUser.id}> !`);
    } else if (type === 'karma') {
      const eco = getEconomy(guildId, targetUser.id);
      updateEconomy(guildId, targetUser.id, {
        karma: eco.karma + quantite
      });
      embed.setTitle('✨ Ajout de Karma')
        .setDescription(`Ajout de **✨ ${quantite} Karma** à <@${targetUser.id}> !`);
    } else if (type === 'xp') {
      await addXP(interaction.guild, member, quantite, interaction.channel);
      embed.setTitle('⭐ Ajout d\'XP')
        .setDescription(`Ajout de **⭐ ${quantite} XP** à <@${targetUser.id}> !`);
    }

    return interaction.reply({ embeds: [embed] });
  }
};
