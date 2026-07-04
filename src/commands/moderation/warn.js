const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Gérer les avertissements des membres')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Ajouter un avertissement à un membre')
        .addUserOption(option => option.setName('cible').setDescription('Le membre à avertir').setRequired(true))
        .addStringOption(option => option.setName('raison').setDescription('Raison de l\'avertissement').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Lister les avertissements d\'un membre')
        .addUserOption(option => option.setName('cible').setDescription('Le membre concerné').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Effacer tous les avertissements d\'un membre')
        .addUserOption(option => option.setName('cible').setDescription('Le membre concerné').setRequired(true))
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('cible');
    const guildId = interaction.guild.id;

    if (subcommand === 'add') {
      const reason = interaction.options.getString('raison');
      const timestamp = Math.floor(Date.now() / 1000);

      db.prepare('INSERT INTO warnings (guild_id, user_id, reason, moderator_id, timestamp) VALUES (?, ?, ?, ?, ?)')
        .run(guildId, target.id, reason, interaction.user.id, timestamp);

      const embed = new EmbedBuilder()
        .setTitle('⚠️ Avertissement donné')
        .setDescription(`**Cible :** <@${target.id}> (${target.tag})\n**Modérateur :** <@${interaction.user.id}>\n**Raison :** ${reason}`)
        .setColor('#FFA500')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      sendLog(interaction.guild, 'moderation', embed);
    } 
    
    else if (subcommand === 'list') {
      const warns = db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ?').all(guildId, target.id);

      if (warns.length === 0) {
        return interaction.reply({ content: `**${target.tag}** n'a aucun avertissement.`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ Avertissements de ${target.tag}`)
        .setColor('#FFA500')
        .setTimestamp();

      let description = '';
      warns.forEach((warn, index) => {
        description += `**#${index + 1}** - <t:${warn.timestamp}:R>\n**Raison :** ${warn.reason}\n**Par :** <@${warn.moderator_id}>\n\n`;
      });

      embed.setDescription(description);
      await interaction.reply({ embeds: [embed] });
    } 
    
    else if (subcommand === 'clear') {
      db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, target.id);

      const embed = new EmbedBuilder()
        .setTitle('🧹 Avertissements effacés')
        .setDescription(`Tous les avertissements de <@${target.id}> (${target.tag}) ont été supprimés par <@${interaction.user.id}>.`)
        .setColor('#3498DB')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      sendLog(interaction.guild, 'moderation', embed);
    }
  }
};
