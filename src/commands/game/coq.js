const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db, getEconomy, updateEconomy, getCasinoConfig, getActionGifs } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('combat-coq')
    .setDescription('Organiser un combat de coqs acharné dans l\'arène')
    .addIntegerOption(option =>
      option.setName('mise')
        .setDescription('Montant de pièces à miser sur votre coq')
        .setRequired(true)
        .setMinValue(1)
    )
    .addUserOption(option =>
      option.setName('adversaire')
        .setDescription('Un autre membre possédant un Coq (optionnel)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('mise');
    const opponent = interaction.options.getUser('adversaire');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const config = getCasinoConfig(guildId, 'coq');
    if (!config.is_enabled) {
      return interaction.reply({ content: '❌ Les combats de coqs ont été désactivés sur ce serveur.', ephemeral: true });
    }

    if (bet < config.min_bet) {
      return interaction.reply({ content: `❌ La mise minimale pour un combat de coqs est de **${config.min_bet} pièces**.`, ephemeral: true });
    }

    if (bet > config.max_bet) {
      return interaction.reply({ content: `❌ La mise maximale pour un combat de coqs est de **${config.max_bet} pièces**.`, ephemeral: true });
    }

    // VÉRIFICATION DE LA POSSESSION D'UN COQ DANS L'INVENTAIRE
    const userCoq = db.prepare("SELECT quantity FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name LIKE '%Coq%'").get(guildId, userId);
    if (!userCoq || userCoq.quantity <= 0) {
      const shopItem = db.prepare("SELECT price FROM shop WHERE guild_id = ? AND item_name LIKE '%Coq%'").get(guildId);
      const priceStr = shopItem ? ` (${shopItem.price} pièces)` : '';
      return interaction.reply({
        content: `❌ **Vous ne possédez aucun Coq de Combat !**\n🛒 Rendez-vous dans la **\`/boutique\`** pour en acheter un${priceStr} avant de pouvoir entrer dans l'arène !`,
        ephemeral: true
      });
    }

    const economy = getEconomy(guildId, userId);
    if (economy.wallet < bet) {
      return interaction.reply({ content: `❌ Vous n'avez pas assez de pièces en poche pour miser ! Solde : **${economy.wallet} pièces**.`, ephemeral: true });
    }

    if (opponent) {
      if (opponent.id === userId) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas combattre contre vous-même !', ephemeral: true });
      }
      if (opponent.bot) {
        return interaction.reply({ content: '❌ Les bots ne possèdent pas de coqs de combat !', ephemeral: true });
      }

      const oppCoq = db.prepare("SELECT quantity FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name LIKE '%Coq%'").get(guildId, opponent.id);
      if (!oppCoq || oppCoq.quantity <= 0) {
        return interaction.reply({ content: `❌ <@${opponent.id}> ne possède aucun Coq de Combat dans son inventaire !`, ephemeral: true });
      }

      const oppEconomy = getEconomy(guildId, opponent.id);
      if (oppEconomy.wallet < bet) {
        return interaction.reply({ content: `❌ <@${opponent.id}> n'a pas assez de pièces en poche pour suivre votre mise de **${bet} pièces**.`, ephemeral: true });
      }
    }

    await interaction.deferReply();

    // Déduire la mise du joueur principal
    updateEconomy(guildId, userId, { wallet: economy.wallet - bet });
    if (opponent) {
      const oppEconomy = getEconomy(guildId, opponent.id);
      updateEconomy(guildId, opponent.id, { wallet: oppEconomy.wallet - bet });
    }

    const winRate = config.win_rate || 50;
    const isWin = (Math.random() * 100) < winRate;
    const multiplier = config.payout_multiplier || 2.0;

    // Noms mythiques de coqs
    const coqNamesUser = ['🐓 Éclair de Feu', '🐓 Le Phénix', '🐓 Bec d\'Acier', '🐓 Raptor Cinglant', '🐓 Plume Sanglante'];
    const coqNamesOpp = ['🐓 Ergot de Fer', '🐓 L\'Ombre Noire', '🐓 Le Titan', '🐓 Le Vengeur', '🐓 Griffes d\'Or'];

    const myCoqName = coqNamesUser[Math.floor(Math.random() * coqNamesUser.length)];
    const oppCoqName = coqNamesOpp[Math.floor(Math.random() * coqNamesOpp.length)];
    const opponentName = opponent ? opponent.displayName || opponent.username : 'Coq Sauvage de l\'Arène';

    const rounds = [
      `⚔️ **Round 1 :** Les deux coqs sautent dans l'arène sous les cris de la foule ! **${myCoqName}** assène un coup de bec puissant !`,
      `⚔️ **Round 2 :** **${oppCoqName}** réplique avec une volée d'ergots acérés ! La poussière et les plumes volent dans l'air !`,
      `⚔️ **Final :** Dans un ultime duel d'agilité, l'un des coqs prend définitivement le dessus !`
    ];

    const totalPot = opponent ? bet * 2 : Math.floor(bet * multiplier);
    let resultTitle = '';
    let resultDesc = '';
    let color = 0x000000;

    if (isWin) {
      resultTitle = '🏆 VICTOIRE DANS L\'ARÈNE !';
      resultDesc = `**${myCoqName}** (Coq de <@${userId}>) terrasse **${oppCoqName}** (${opponentName}) !\n\n🎉 Vous remportez la somme de **💰 +${totalPot} pièces** !`;
      color = 0x2ecc71;

      // Ajouter les gains au vainqueur
      const currentEco = getEconomy(guildId, userId);
      updateEconomy(guildId, userId, { wallet: currentEco.wallet + totalPot, karma: currentEco.karma + 2 });
    } else {
      resultTitle = '💀 DÉFAITE DANS L\'ARÈNE !';
      if (opponent) {
        resultDesc = `**${oppCoqName}** (Coq de <@${opponent.id}>) à mis **${myCoqName}** K.O !\n\n👑 <@${opponent.id}> remporte la totalité de la mise : **💰 +${totalPot} pièces** !`;
        const oppEco = getEconomy(guildId, opponent.id);
        updateEconomy(guildId, opponent.id, { wallet: oppEco.wallet + totalPot, karma: oppEco.karma + 2 });
      } else {
        resultDesc = `**${myCoqName}** a été terrassé par le **${oppCoqName}** !\n\n❌ Vous perdez votre mise de **💰 ${bet} pièces**.`;
      }
      color = 0xe74c3c;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🐓 COMBAT DE COQS DE COMPÉTITION`)
      .setDescription(`\n🥊 **Duel :** ${myCoqName}  *VS*  ${oppCoqName}\n\n${rounds.join('\n\n')}\n\n━━━━━━━━━━━━━━━━━━━━\n### ${resultTitle}\n${resultDesc}`)
      .setColor(color)
      .setFooter({ text: 'Arena Cockfight System • Bagbot Elite' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
