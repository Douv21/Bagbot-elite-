const { SlashCommandBuilder } = require('discord.js');
const { db, getEconomy, updateEconomy } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('acheter')
    .setDescription('Acheter un article dans la boutique')
    .addStringOption(option => option.setName('nom').setDescription('Nom exact de l\'article').setRequired(true)),
  async execute(interaction) {
    const itemName = interaction.options.getString('nom');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Récupérer l'article de la boutique
    const item = db.prepare('SELECT * FROM shop WHERE guild_id = ? AND item_name = ?').get(guildId, itemName);

    if (!item) {
      return interaction.reply({ content: `❌ L'article **${itemName}** n'existe pas dans la boutique. Utilisez \`/shop\` pour voir les articles disponibles.`, ephemeral: true });
    }

    // Récupérer l'économie de l'utilisateur
    const economy = getEconomy(guildId, userId);

    if (economy.wallet < item.price) {
      return interaction.reply({ content: `❌ Vous n'avez pas assez d'argent en poche. Cet article coûte **${item.price}** pièces, et vous n'en avez que **${economy.wallet}**.`, ephemeral: true });
    }

    // Retirer l'argent
    updateEconomy(guildId, userId, {
      wallet: economy.wallet - item.price
    });

    // Ajouter à l'inventaire
    const invItem = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, item.item_name);

    if (invItem) {
      db.prepare('UPDATE inventory SET quantity = quantity + 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?')
        .run(guildId, userId, item.item_name);
    } else {
      db.prepare('INSERT INTO inventory (guild_id, user_id, item_name, quantity) VALUES (?, ?, ?, 1)')
        .run(guildId, userId, item.item_name);
    }

    // Si l'objet donne un rôle, l'attribuer
    let roleGiven = '';
    if (item.role_id) {
      const role = interaction.guild.roles.cache.get(item.role_id);
      if (role) {
        const member = interaction.guild.members.cache.get(userId);
        if (member) {
          try {
            await member.roles.add(role);
            roleGiven = ` et le rôle <@&${item.role_id}> vous a été attribué !`;
          } catch (e) {
            console.error(e);
            roleGiven = `, mais je n'ai pas pu vous attribuer le rôle (vérifiez mes permissions).`;
          }
        }
      }
    }

    await interaction.reply({ content: `🎉 Vous avez acheté **${item.item_name}** pour **${item.price}** pièces${roleGiven} !` });
  }
};
