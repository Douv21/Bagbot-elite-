const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('action')
    .setDescription('Effectuer une action interactive avec un membre')
    .addSubcommand(subcommand =>
      subcommand
        .setName('danser')
        .setDescription('Danser joyeusement')
        .addUserOption(option => option.setName('membre').setDescription('Le membre avec qui danser').setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('flirter')
        .setDescription('Flirter avec charme')
        .addUserOption(option => option.setName('membre').setDescription('Le membre à charmer').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('embrasser')
        .setDescription('Faire un bisou affectueux')
        .addUserOption(option => option.setName('membre').setDescription('Le membre à embrasser').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('caliner')
        .setDescription('Faire un gros câlin chaleureux')
        .addUserOption(option => option.setName('membre').setDescription('Le membre à câliner').setRequired(true))
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('membre');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Récupérer l'économie pour mettre à jour le karma
    const economy = getEconomy(guildId, userId);

    let title = '';
    let description = '';
    let color = '#E91E63'; // Rose par défaut pour l'affection
    let karmaChange = 0;
    let coinsChange = 0;

    if (subcommand === 'danser') {
      karmaChange = 1;
      if (target) {
        if (target.id === userId) {
          description = `🕺 <@${userId}> danse tout seul dans son coin. C'est mignon mais un peu triste !`;
        } else {
          description = `💃 <@${userId}> invite <@${target.id}> à danser ! Ils enflamment la piste de danse ! 🎶`;
        }
      } else {
        description = `🕺 <@${userId}> se lance dans une danse effrénée ! Quel rythme !`;
      }
      title = '🎶 Danse !';
      color = '#3498DB';
    } 
    
    else if (subcommand === 'flirter') {
      if (target.id === userId) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas flirter avec vous-même ! Vous êtes déjà parfait ?', ephemeral: true });
      }

      karmaChange = 1;
      // 30% de chance d'obtenir un petit pourboire (5-15 pièces) de la cible charmée
      const success = Math.random() < 0.3;
      
      if (success) {
        coinsChange = Math.floor(Math.random() * 11) + 5; // 5 à 15 pièces
        description = `🌹 <@${userId}> chuchote des mots doux à <@${target.id}>. Flirt réussi ! <@${target.id}> rougit tellement qu'elle/il laisse tomber **💰 ${coinsChange} pièces** au sol !`;
      } else {
        description = `😏 <@${userId}> tente un regard charmeur à <@${target.id}>. C'est électrique dans l'air !`;
      }
      title = '❤️ Flirt !';
    } 
    
    else if (subcommand === 'embrasser') {
      if (target.id === userId) {
        return interaction.reply({ content: '❌ Embrasser son reflet dans le miroir ? Non, choisissez quelqu\'un d\'autre.', ephemeral: true });
      }
      karmaChange = 2;
      description = `💋 <@${userId}> fait un tendre bisou sur la joue de <@${target.id}>. C'est adorable !`;
      title = '😘 Bisou !';
    } 
    
    else if (subcommand === 'caliner') {
      if (target.id === userId) {
        description = `🤗 <@${userId}> se fait un câlin à lui-même. Vous méritez tout l'amour du monde !`;
      } else {
        karmaChange = 2;
        description = `🤗 <@${userId}> prend <@${target.id}> chaleureusement dans ses bras. Tout le monde aime les câlins !`;
      }
      title = '🧸 Câlin !';
      color = '#2ECC71';
    }

    // Appliquer les changements d'économie/karma
    updateEconomy(guildId, userId, {
      wallet: economy.wallet + coinsChange,
      karma: economy.karma + karmaChange
    });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (karmaChange > 0 || coinsChange > 0) {
      let footerText = `Gains : ✨ +${karmaChange} Karma`;
      if (coinsChange > 0) footerText += ` | 💰 +${coinsChange} Pièces`;
      embed.setFooter({ text: footerText });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
