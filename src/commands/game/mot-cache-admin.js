const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mot-cache-admin')
    .setDescription('Administrer le jeu du mot caché (Staff uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Lancer une nouvelle partie')
        .addStringOption(option => option.setName('phrase').setDescription('Le mot ou la phrase secrète à faire deviner').setRequired(true))
        .addIntegerOption(option => option.setName('argent').setDescription('Récompense en pièces (optionnel)').setRequired(false).setMinValue(1))
        .addIntegerOption(option => option.setName('xp').setDescription('Récompense en points d\'XP (optionnel)').setRequired(false).setMinValue(1))
        .addRoleOption(option => option.setName('role').setDescription('Rôle spécial en récompense (optionnel)').setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('Arrêter le jeu en cours')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'setup') {
      const phrase = interaction.options.getString('phrase').toUpperCase();
      const rewardMoney = interaction.options.getInteger('argent') || 0;
      const rewardXp = interaction.options.getInteger('xp') || 0;
      const rewardRole = interaction.options.getRole('role');

      // Vérifier si la phrase contient des lettres
      if (!/[A-Z]/.test(phrase)) {
        return interaction.reply({ content: '❌ La phrase secrète doit contenir au moins une lettre alphabétique.', ephemeral: true });
      }

      // Enregistrer la configuration du jeu
      db.prepare(`
        INSERT OR REPLACE INTO game_config (guild_id, secret_phrase, reward_money, reward_xp, reward_role_id, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(guildId, phrase, rewardMoney, rewardXp, rewardRole ? rewardRole.id : null);

      // Réinitialiser les lettres trouvées par tous les utilisateurs de la guilde
      db.prepare('DELETE FROM user_letters WHERE guild_id = ?').run(guildId);

      // Préparer l'affichage masqué (avec symboles affichés et lettres masquées)
      let display = '';
      for (let i = 0; i < phrase.length; i++) {
        const char = phrase[i];
        if (/[A-Z]/.test(char)) {
          display += '\\_ ';
        } else {
          display += `${char} `;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('🎮 Nouveau Jeu du Mot Caché !')
        .setDescription(`Le staff a configuré un mot/phrase mystère !\n\n**À deviner :**\n\`${display.trim()}\`\n\nParlez dans les salons textuels pour débloquer des lettres au hasard !\nUtilisez \`/mot-cache statut\` pour voir votre avancement et \`/mot-cache deviner <proposition>\` pour proposer une réponse.`)
        .setColor('#F1C40F')
        .setTimestamp();

      let rewardText = '';
      if (rewardMoney > 0) rewardText += `💰 **${rewardMoney}** pièces\n`;
      if (rewardXp > 0) rewardText += `⚡ **${rewardXp}** XP\n`;
      if (rewardRole) rewardText += `🎭 Rôle <@&${rewardRole.id}>\n`;

      if (rewardText) {
        embed.addFields({ name: '🏆 Récompenses pour le vainqueur', value: rewardText });
      }

      await interaction.reply({ content: '✅ Le jeu a été lancé avec succès !', ephemeral: true });
      await interaction.channel.send({ embeds: [embed] });
    } 
    
    else if (subcommand === 'stop') {
      const result = db.prepare('UPDATE game_config SET is_active = 0 WHERE guild_id = ?').run(guildId);

      if (result.changes === 0) {
        return interaction.reply({ content: '❌ Aucun jeu n\'est actuellement configuré sur ce serveur.', ephemeral: true });
      }

      await interaction.reply({ content: '🛑 Le jeu en cours a été arrêté. Les récompenses et la phrase ont été désactivées.' });
    }
  }
};
