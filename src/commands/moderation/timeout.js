const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Exclure temporairement (timeout) un membre')
    .addUserOption(option => option.setName('cible').setDescription('Le membre à exclure temporairement').setRequired(true))
    .addIntegerOption(option => option.setName('duree').setDescription('Durée en minutes').setRequired(true))
    .addStringOption(option => option.setName('raison').setDescription('Raison du timeout').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('cible');
    const duration = interaction.options.getInteger('duree');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) {
      return interaction.reply({ content: 'Utilisateur introuvable.', ephemeral: true });
    }

    if (!target.moderatable) {
      return interaction.reply({ content: 'Je ne peux pas exclure temporairement ce membre (rôle supérieur ou permissions manquantes).', ephemeral: true });
    }

    // timeout() prend des millisecondes. duration * 60 * 1000
    await target.timeout(duration * 60 * 1000, reason);

    const embed = new EmbedBuilder()
      .setTitle('⏱️ Exclusion Temporaire (Timeout)')
      .setDescription(`**Membre restreint :** ${target.user.tag} (<@${target.id}>)\n**Modérateur :** <@${interaction.user.id}>\n**Durée :** ${duration} minute(s)\n**Raison :** ${reason}`)
      .setColor('#FFA500')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Envoyer aux logs
    sendLog(interaction.guild, 'moderation', embed);
  }
};
