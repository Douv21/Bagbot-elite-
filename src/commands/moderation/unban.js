const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/helpers');

module.exports = {
  name: 'unban',
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannir un membre du serveur par son ID ou son pseudo')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option => 
      option.setName('utilisateur')
        .setDescription('L\'ID Discord (ex: 123456789) ou le pseudo de l\'utilisateur banni')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('raison')
        .setDescription('Raison du débannissement')
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute(interaction) {
    const userInput = interaction.options.getString('utilisateur', true).trim();
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    await interaction.deferReply();

    try {
      const bans = await interaction.guild.bans.fetch().catch(() => null);
      if (!bans || bans.size === 0) {
        return interaction.editReply({ content: '❌ Aucun membre banni trouvé sur ce serveur.' });
      }

      // Chercher par ID d'abord, puis par tag ou username
      const bannedInfo = bans.find(b => 
        b.user.id === userInput || 
        b.user.tag.toLowerCase() === userInput.toLowerCase() || 
        b.user.username.toLowerCase() === userInput.toLowerCase()
      );

      if (!bannedInfo) {
        return interaction.editReply({ content: `❌ Aucun bannissement trouvé pour "${userInput}". Vérifiez l'ID ou le pseudo.` });
      }

      await interaction.guild.bans.remove(bannedInfo.user.id, reason);

      const embed = new EmbedBuilder()
        .setTitle('🔓 Débannissement (Unban)')
        .setDescription(`**Utilisateur débanni :** ${bannedInfo.user.tag} (<@${bannedInfo.user.id}>)\n**Modérateur :** <@${interaction.user.id}>\n**Raison :** ${reason}`)
        .setColor('#2ECC71')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Envoyer aux logs
      sendLog(interaction.guild, 'moderation', embed);
    } catch (error) {
      console.error('Erreur unban:', error);
      return interaction.editReply({ content: `❌ Impossible de débannir cet utilisateur : ${error.message}` });
    }
  }
};
