const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre du serveur')
    .addUserOption(option => option.setName('cible').setDescription('Le membre à bannir').setRequired(true))
    .addStringOption(option => option.setName('raison').setDescription('Raison du bannissement').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('cible');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) {
      return interaction.reply({ content: 'Utilisateur introuvable.', ephemeral: true });
    }

    if (!target.bannable) {
      return interaction.reply({ content: 'Je ne peux pas bannir ce membre (rôle supérieur ou permissions manquantes).', ephemeral: true });
    }

    await target.ban({ reason });

    const embed = new EmbedBuilder()
      .setTitle('🔨 Bannissement')
      .setDescription(`**Membre banni :** ${target.user.tag} (<@${target.id}>)\n**Modérateur :** <@${interaction.user.id}>\n**Raison :** ${reason}`)
      .setColor('#FF0000')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Envoyer aux logs
    sendLog(interaction.guild, 'moderation', embed);
  }
};
