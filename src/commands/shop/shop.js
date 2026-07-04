const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Afficher la boutique du serveur'),
  async execute(interaction) {
    const guildId = interaction.guild.id;

    const items = db.prepare('SELECT * FROM shop WHERE guild_id = ?').all(guildId);

    if (items.length === 0) {
      return interaction.reply({ content: '🛒 La boutique est actuellement vide.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Boutique du Serveur')
      .setDescription('Voici les articles disponibles à l\'achat. Utilisez `/acheter <nom>` pour acquérir un objet.')
      .setColor('#F1C40F')
      .setTimestamp();

    items.forEach(item => {
      let roleInfo = item.role_id ? `\n*Donne le rôle :* <@&${item.role_id}>` : '';
      embed.addFields({
        name: `🔹 ${item.item_name} — 💰 ${item.price} pièces`,
        value: `${item.description}${roleInfo}`
      });
    });

    await interaction.reply({ embeds: [embed] });
  }
};
