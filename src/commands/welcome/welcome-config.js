const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome-config')
    .setDescription('Configurer les messages de bienvenue et de départ')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-welcome')
        .setDescription('Configurer le message de bienvenue')
        .addChannelOption(option => option.setName('salon').setDescription('Salon de bienvenue').setRequired(true))
        .addStringOption(option => option.setName('titre').setDescription('Titre de l\'embed').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Description de l\'embed (variables : {user.mention}, {user}, {server}, {memberCount})').setRequired(true))
        .addStringOption(option => option.setName('couleur').setDescription('Couleur de l\'embed en code HEX (ex: #00FF00)').setRequired(false))
        .addBooleanOption(option => option.setName('avatar').setDescription('Afficher la photo de l\'utilisateur dans le coin de l\'embed').setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-leave')
        .setDescription('Configurer le message de départ')
        .addChannelOption(option => option.setName('salon').setDescription('Salon de départ').setRequired(true))
        .addStringOption(option => option.setName('titre').setDescription('Titre de l\'embed').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Description de l\'embed (variables : {user}, {server}, {memberCount})').setRequired(true))
        .addStringOption(option => option.setName('couleur').setDescription('Couleur de l\'embed en code HEX (ex: #FF0000)').setRequired(false))
        .addBooleanOption(option => option.setName('avatar').setDescription('Afficher la photo de l\'utilisateur dans le coin de l\'embed').setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('Voir la configuration actuelle')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // Assurer l'existence d'une ligne pour la guilde
    const exists = db.prepare('SELECT guild_id FROM welcome_leave WHERE guild_id = ?').get(guildId);
    if (!exists) {
      db.prepare('INSERT INTO welcome_leave (guild_id) VALUES (?)').run(guildId);
    }

    if (subcommand === 'set-welcome') {
      const channel = interaction.options.getChannel('salon');
      const title = interaction.options.getString('titre');
      const description = interaction.options.getString('description');
      const color = interaction.options.getString('couleur') || '#00FF00';
      const avatar = interaction.options.getBoolean('avatar') !== false ? 1 : 0;

      db.prepare(`
        UPDATE welcome_leave 
        SET welcome_channel = ?, welcome_title = ?, welcome_desc = ?, welcome_color = ?, welcome_thumbnail = ?
        WHERE guild_id = ?
      `).run(channel.id, title, description, color, avatar, guildId);

      await interaction.reply({ content: '✅ Le système de bienvenue a été configuré avec succès !', ephemeral: true });
    } 
    
    else if (subcommand === 'set-leave') {
      const channel = interaction.options.getChannel('salon');
      const title = interaction.options.getString('titre');
      const description = interaction.options.getString('description');
      const color = interaction.options.getString('couleur') || '#FF0000';
      const avatar = interaction.options.getBoolean('avatar') !== false ? 1 : 0;

      db.prepare(`
        UPDATE welcome_leave 
        SET leave_channel = ?, leave_title = ?, leave_desc = ?, leave_color = ?, leave_thumbnail = ?
        WHERE guild_id = ?
      `).run(channel.id, title, description, color, avatar, guildId);

      await interaction.reply({ content: '✅ Le système de départ a été configuré avec succès !', ephemeral: true });
    } 
    
    else if (subcommand === 'view') {
      const config = db.prepare('SELECT * FROM welcome_leave WHERE guild_id = ?').get(guildId);

      if (!config) {
        return interaction.reply({ content: '❌ Aucune configuration de bienvenue/départ trouvée pour ce serveur.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Configuration Bienvenue & Départ')
        .setColor('#3498DB')
        .setTimestamp()
        .addFields(
          {
            name: '📥 Bienvenue',
            value: config.welcome_channel 
              ? `**Salon :** <#${config.welcome_channel}>\n**Titre :** ${config.welcome_title}\n**Couleur :** ${config.welcome_color}\n**Avatar :** ${config.welcome_thumbnail ? 'Oui' : 'Non'}\n**Message :**\n${config.welcome_desc}`
              : 'Non configuré'
          },
          {
            name: '📤 Départ',
            value: config.leave_channel 
              ? `**Salon :** <#${config.leave_channel}>\n**Titre :** ${config.leave_title}\n**Couleur :** ${config.leave_color}\n**Avatar :** ${config.leave_thumbnail ? 'Oui' : 'Non'}\n**Message :**\n${config.leave_desc}`
              : 'Non configuré'
          }
        );

      await interaction.reply({ embeds: [embed] });
    }
  }
};
