const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprimer un nombre de messages dans le salon')
    .addIntegerOption(option => option.setName('nombre').setDescription('Nombre de messages à supprimer (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const amount = interaction.options.getInteger('nombre');

    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setTitle('🧹 Nettoyage')
        .setDescription(`**Salon :** <#${interaction.channel.id}>\n**Messages supprimés :** ${deleted.size}\n**Modérateur :** <@${interaction.user.id}>`)
        .setColor('#3498DB')
        .setTimestamp();

      await interaction.editReply({ content: `${deleted.size} messages ont été supprimés.` });

      // Envoyer aux logs
      sendLog(interaction.guild, 'moderation', embed);
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'Une erreur s\'est produite. Il se peut que certains messages datent de plus de 14 jours (limitation de Discord).' });
    }
  }
};
