const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Affiche le lien d\'accès au Dashboard premium de Bagbot Elite')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let ip = '82.65.75.176';
    try {
      const res = await fetch('https://api.ipify.org?format=json').then(r => r.json());
      if (res && res.ip) {
        ip = res.ip;
      }
    } catch (e) {
      console.error('Erreur récupération IP dans /dashboard:', e);
    }

    const dashPort = process.env.PORT || process.env.DASHBOARD_PORT || 49601;
    const dashboardUrl = process.env.PUBLIC_URL || process.env.DASHBOARD_PUBLIC_URL || `http://${ip}:${dashPort}`;

    const embed = new EmbedBuilder()
      .setTitle('👑 Bagbot Elite - Dashboard')
      .setDescription('Cliquez sur le bouton ci-dessous pour accéder au panel de configuration premium de votre bot.')
      .setColor('#5865F2')
      .addFields(
        { name: '🌐 Lien d\'accès', value: `[Ouvrir le Dashboard](${dashboardUrl})` },
        { name: '💡 Note', value: 'Ce lien est accessible depuis n\'importe où grâce à votre redirection de port.' }
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Accéder au Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(dashboardUrl)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }
};
