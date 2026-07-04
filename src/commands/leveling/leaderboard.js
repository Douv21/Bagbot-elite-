const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Afficher le classement des membres les plus actifs'),
  async execute(interaction) {
    const guildId = interaction.guild.id;

    // Récupérer les 10 meilleurs joueurs par niveau puis par XP décroissant
    const topPlayers = db.prepare(`
      SELECT * FROM leveling 
      WHERE guild_id = ? 
      ORDER BY level DESC, xp DESC 
      LIMIT 10
    `).all(guildId);

    if (topPlayers.length === 0) {
      return interaction.reply({ content: 'Le classement est actuellement vide. Envoyez des messages pour commencer !', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 Classement du Serveur')
      .setColor('#F1C40F')
      .setTimestamp();

    let desc = '';
    for (let i = 0; i < topPlayers.length; i++) {
      const p = topPlayers[i];
      const user = await interaction.client.users.fetch(p.user_id).catch(() => null);
      const username = user ? user.username : `Utilisateur inconnu (${p.user_id})`;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**#${i + 1}**`;
      
      desc += `${medal} **${username}** — Niveau ${p.level} (${p.xp} XP)\n`;
    }

    embed.setDescription(desc);
    await interaction.reply({ embeds: [embed] });
  }
};
