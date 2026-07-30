const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  name: 'untimeout',
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Retirer l\'exclusion temporaire (timeout) d\'un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => 
      option.setName('cible')
        .setDescription('Le membre dont vous voulez lever le timeout')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('raison')
        .setDescription('Raison de la levée de l\'exclusion')
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute(interaction) {
    const target = interaction.options.getMember('cible');
    const reason = interaction.options.getString('raison') || 'Levée de l\'exclusion temporaire';

    if (!target) {
      return interaction.reply({ content: '❌ Membre introuvable sur le serveur.', ephemeral: true });
    }

    if (!target.isCommunicationDisabled()) {
      return interaction.reply({ content: `❌ **${target.user.tag}** n'est pas actuellement sous exclusion temporaire.`, ephemeral: true });
    }

    if (!target.moderatable) {
      return interaction.reply({ content: '❌ Je ne peux pas modifier l\'état de ce membre (rôle supérieur ou permissions insuffisantes).', ephemeral: true });
    }

    // Retirer le timeout (passer null)
    await target.timeout(null, reason);

    const embed = new EmbedBuilder()
      .setTitle('🔊 Fin d\'Exclusion Temporaire (Untimeout)')
      .setDescription(`**Membre rétabli :** ${target.user.tag} (<@${target.id}>)\n**Modérateur :** <@${interaction.user.id}>\n**Raison :** ${reason}`)
      .setColor('#2ECC71')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Envoyer aux logs
    sendLog(interaction.guild, 'moderation', embed);
  }
};
