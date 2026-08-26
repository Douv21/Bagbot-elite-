const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEconomy, updateEconomy, getCasinoConfig } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder().setContexts([0, 1, 2]).setIntegrationTypes([0, 1])
    .setName('casino')
    .setDescription('Jouer à des jeux de casino pour tenter de doubler votre mise')
    .setDMPermission(true)
    .addStringOption(option => 
      option.setName('jeu')
        .setDescription('Le jeu de casino auquel vous souhaitez jouer')
        .setRequired(true)
        .addChoices(
          { name: '🃏 Blackjack (21)', value: 'blackjack' },
          { name: '🎰 Machine à sous (Slots)', value: 'slots' },
          { name: '🎲 4-2-1 (Dés)', value: '421' },
          { name: '🎡 Roulette', value: 'roulette' },
          { name: '🎴 Vidéo Poker', value: 'poker' },
          { name: '🪙 Pile ou Face (Coinflip)', value: 'coinflip' }
        )
    )
    .addIntegerOption(option =>
      option.setName('mise')
        .setDescription('Montant de pièces à miser')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(option =>
      option.setName('choix_roulette')
        .setDescription('Pari pour la Roulette (Rouge, Noir, Pair, Impair, ou numéro 0-36)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const gameName = interaction.options.getString('jeu');
    const bet = interaction.options.getInteger('mise');
    const rouletteChoice = interaction.options.getString('choix_roulette');
    const guildId = interaction.guild ? interaction.guild.id : null;
    const userId = interaction.user.id;

    if (!guildId) {
      return interaction.reply({ content: '❌ Les jeux de casino sont uniquement disponibles sur un serveur.', ephemeral: true });
    }

    const config = getCasinoConfig(guildId, gameName);
    if (!config.is_enabled) {
      return interaction.reply({ content: `❌ Le jeu **${gameName}** a été désactivé par les administrateurs de ce serveur.`, ephemeral: true });
    }

    if (bet < config.min_bet) {
      return interaction.reply({ content: `❌ La mise minimale pour **${gameName}** est de **${config.min_bet} pièces**.`, ephemeral: true });
    }

    if (bet > config.max_bet) {
      return interaction.reply({ content: `❌ La mise maximale pour **${gameName}** est de **${config.max_bet} pièces**.`, ephemeral: true });
    }

    const economy = getEconomy(guildId, userId);
    if (economy.wallet < bet) {
      return interaction.reply({ content: `❌ Vous n'avez pas assez d'argent en poche ! Solde actuel : **${economy.wallet} pièces**.`, ephemeral: true });
    }

    // Déduire la mise immédiatement
    updateEconomy(guildId, userId, { wallet: economy.wallet - bet });

    // ROUTAGE VERS LE JEU SELECTIONNE
    if (gameName === 'slots') {
      await handleSlots(interaction, guildId, userId, bet, config);
    } else if (gameName === 'coinflip') {
      await handleCoinflip(interaction, guildId, userId, bet, config);
    } else if (gameName === '421') {
      await handle421(interaction, guildId, userId, bet, config);
    } else if (gameName === 'roulette') {
      await handleRoulette(interaction, guildId, userId, bet, config, rouletteChoice);
    } else if (gameName === 'poker') {
      await handlePoker(interaction, guildId, userId, bet, config);
    } else if (gameName === 'blackjack') {
      await handleBlackjack(interaction, guildId, userId, bet, config);
    }
  }
};

// ==========================================
// 🎰 MACHINE À SOUS (SLOTS)
// ==========================================
async function handleSlots(interaction, guildId, userId, bet, config) {
  await interaction.deferReply();

  const symbols = ['7️⃣', '💎', '🔔', '🍒', '🍋', '🍇', '🍉'];
  const winRate = config.win_rate || 35;
  const isWin = (Math.random() * 100) < winRate;

  let reel1, reel2, reel3;
  if (isWin) {
    const isJackpot = Math.random() < 0.2;
    if (isJackpot) {
      reel1 = reel2 = reel3 = '7️⃣';
    } else {
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      reel1 = reel2 = reel3 = sym;
    }
  } else {
    reel1 = symbols[Math.floor(Math.random() * symbols.length)];
    reel2 = symbols[Math.floor(Math.random() * symbols.length)];
    reel3 = symbols[Math.floor(Math.random() * symbols.length)];
    if (reel1 === reel2 && reel2 === reel3) {
      reel3 = symbols[(symbols.indexOf(reel3) + 1) % symbols.length];
    }
  }

  let multiplier = 0;
  if (reel1 === reel2 && reel2 === reel3) {
    multiplier = reel1 === '7️⃣' ? 10 : (reel1 === '💎' ? 5 : config.payout_multiplier || 3.0);
  } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
    multiplier = 1.5;
  }

  const winnings = Math.floor(bet * multiplier);
  const eco = getEconomy(guildId, userId);

  if (winnings > 0) {
    updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
  }

  const embed = new EmbedBuilder()
    .setTitle('🎰 Machine à Sous')
    .setDescription(`\n╔═════════════╗\n║  ${reel1}  │  ${reel2}  │  ${reel3}  ║\n╚═════════════╝\n`)
    .setColor(multiplier >= 3 ? 0xf1c40f : (multiplier > 0 ? 0x2ecc71 : 0xe74c3c))
    .addFields(
      { name: '💰 Mise', value: `${bet} pièces`, inline: true },
      { name: multiplier > 0 ? '🎉 Gains' : '❌ Résultat', value: multiplier > 0 ? `+${winnings} pièces (x${multiplier})` : `-${bet} pièces`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// ==========================================
// 🪙 PILE OU FACE (COINFLIP)
// ==========================================
async function handleCoinflip(interaction, guildId, userId, bet, config) {
  await interaction.deferReply();

  const winRate = config.win_rate || 50;
  const isWin = (Math.random() * 100) < winRate;
  const multiplier = config.payout_multiplier || 2.0;
  const winnings = Math.floor(bet * multiplier);
  const resultStr = isWin ? '🪙 Pile' : '🪙 Face';

  const eco = getEconomy(guildId, userId);
  if (isWin) {
    updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
  }

  const embed = new EmbedBuilder()
    .setTitle('🪙 Pile ou Face')
    .setDescription(`La pièce tourne dans les airs... et tombe sur **${resultStr}** !`)
    .setColor(isWin ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: '💰 Mise', value: `${bet} pièces`, inline: true },
      { name: isWin ? '🎉 Victoire !' : '❌ Défaite', value: isWin ? `+${winnings} pièces (x${multiplier})` : `-${bet} pièces`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// ==========================================
// 🎲 4-2-1 (DÉS)
// ==========================================
async function handle421(interaction, guildId, userId, bet, config) {
  await interaction.deferReply();

  const winRate = config.win_rate || 40;
  const isWin = (Math.random() * 100) < winRate;

  let d1, d2, d3;
  if (isWin) {
    const r = Math.random();
    if (r < 0.2) { d1 = 4; d2 = 2; d3 = 1; } // Grand 421
    else if (r < 0.5) { d1 = 1; d2 = 1; d3 = 1; } // Brelan d'as
    else { d1 = 6; d2 = 5; d3 = 4; } // Grande suite
  } else {
    d1 = Math.floor(Math.random() * 6) + 1;
    d2 = Math.floor(Math.random() * 6) + 1;
    d3 = Math.floor(Math.random() * 6) + 1;
  }

  const sorted = [d1, d2, d3].sort((a, b) => b - a);
  const code = sorted.join('');
  let multiplier = 0;
  let titleText = '🎲 Lancer de Dés 421';

  if (code === '421') {
    multiplier = 5.0;
    titleText = '🔥 GRAND 4-2-1 ! (Jackpot x5)';
  } else if (d1 === d2 && d2 === d3) {
    multiplier = 3.0;
    titleText = `🎉 Brelan de ${d1} (x3)`;
  } else if (code === '654' || code === '543' || code === '432' || code === '321') {
    multiplier = 2.0;
    titleText = '✨ Suite (x2)';
  } else if (isWin) {
    multiplier = config.payout_multiplier || 2.0;
    titleText = '✨ Gagné !';
  }

  const winnings = Math.floor(bet * multiplier);
  const eco = getEconomy(guildId, userId);

  if (winnings > 0) {
    updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
  }

  const embed = new EmbedBuilder()
    .setTitle(titleText)
    .setDescription(`\n🎲 Dés obtenus : **[ ${d1} ]  [ ${d2} ]  [ ${d3} ]**\n`)
    .setColor(multiplier > 0 ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: '💰 Mise', value: `${bet} pièces`, inline: true },
      { name: multiplier > 0 ? '🎉 Gains' : '❌ Perdu', value: multiplier > 0 ? `+${winnings} pièces` : `-${bet} pièces`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// ==========================================
// 🎡 ROULETTE
// ==========================================
async function handleRoulette(interaction, guildId, userId, bet, config, choice) {
  if (!choice) {
    const eco = getEconomy(guildId, userId);
    updateEconomy(guildId, userId, { wallet: eco.wallet + bet });
    return interaction.reply({ content: '❌ Pour la roulette, veuillez préciser l\'option `choix_roulette` (ex: `Rouge`, `Noir`, `Pair`, `Impair` ou un numéro `0` à `36`).', ephemeral: true });
  }

  await interaction.deferReply();

  const winRate = config.win_rate || 48;
  const isWin = (Math.random() * 100) < winRate;
  const choiceClean = choice.toLowerCase().trim();

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  let winningNum = Math.floor(Math.random() * 37);

  if (isWin) {
    if (choiceClean === 'rouge') winningNum = redNumbers[Math.floor(Math.random() * redNumbers.length)];
    else if (choiceClean === 'noir') {
      const blackNums = Array.from({length: 36}, (_, i) => i + 1).filter(n => !redNumbers.includes(n));
      winningNum = blackNums[Math.floor(Math.random() * blackNums.length)];
    } else if (choiceClean === 'pair') winningNum = 2 * (Math.floor(Math.random() * 18) + 1);
    else if (choiceClean === 'impair') winningNum = 2 * Math.floor(Math.random() * 18) + 1;
    else if (!isNaN(parseInt(choiceClean))) winningNum = Math.max(0, Math.min(36, parseInt(choiceClean)));
  }

  const isRed = redNumbers.includes(winningNum);
  const colorStr = winningNum === 0 ? '🟢 Vert (0)' : (isRed ? '🔴 Rouge' : '⚫ Noir');

  let multiplier = 0;
  if (!isNaN(parseInt(choiceClean)) && parseInt(choiceClean) === winningNum) {
    multiplier = 10.0;
  } else if (isWin) {
    multiplier = config.payout_multiplier || 2.0;
  }

  const winnings = Math.floor(bet * multiplier);
  const eco = getEconomy(guildId, userId);

  if (winnings > 0) {
    updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
  }

  const embed = new EmbedBuilder()
    .setTitle('🎡 Roulette de Casino')
    .setDescription(`La bille tourne et s'arrête sur le **${winningNum}** (${colorStr}) !`)
    .setColor(winnings > 0 ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: '🎯 Votre Pari', value: `${choice}`, inline: true },
      { name: '💰 Mise', value: `${bet} pièces`, inline: true },
      { name: winnings > 0 ? '🎉 Gains' : '❌ Perdu', value: winnings > 0 ? `+${winnings} pièces (x${multiplier})` : `-${bet} pièces`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// ==========================================
// 🎴 VIDÉO POKER
// ==========================================
async function handlePoker(interaction, guildId, userId, bet, config) {
  await interaction.deferReply();

  const winRate = config.win_rate || 42;
  const isWin = (Math.random() * 100) < winRate;

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  let hand = [];
  if (isWin) {
    hand = [
      `A${suits[0]}`, `K${suits[0]}`, `Q${suits[0]}`, `J${suits[0]}`, `10${suits[0]}`
    ];
  } else {
    for (let i = 0; i < 5; i++) {
      const s = suits[Math.floor(Math.random() * suits.length)];
      const r = ranks[Math.floor(Math.random() * ranks.length)];
      hand.push(`${r}${s}`);
    }
  }

  const multiplier = isWin ? (config.payout_multiplier || 2.5) : 0;
  const winnings = Math.floor(bet * multiplier);
  const eco = getEconomy(guildId, userId);

  if (winnings > 0) {
    updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
  }

  const embed = new EmbedBuilder()
    .setTitle('🎴 Vidéo Poker')
    .setDescription(`\n🃏 Main tirée : **[ ${hand.join(' ]  [ ')} ]**\n`)
    .setColor(isWin ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: '💰 Mise', value: `${bet} pièces`, inline: true },
      { name: isWin ? '🎉 Combinaison Gagnante !' : '❌ Rien au tirage', value: isWin ? `+${winnings} pièces (Quinte Flush)` : `-${bet} pièces`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// ==========================================
// 🃏 BLACKJACK (INTERACTIF)
// ==========================================
async function handleBlackjack(interaction, guildId, userId, bet, config) {
  await interaction.deferReply();

  const winRate = config.win_rate || 45;
  const isWin = (Math.random() * 100) < winRate;

  let playerCard1 = isWin ? 10 : Math.floor(Math.random() * 9) + 2;
  let playerCard2 = isWin ? 11 : Math.floor(Math.random() * 9) + 2;
  let dealerCard1 = Math.floor(Math.random() * 9) + 2;

  let playerScore = playerCard1 + playerCard2;
  let dealerScore = dealerCard1 + Math.floor(Math.random() * 9) + 2;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bj_hit_${userId}_${bet}`).setLabel('Carte 🃏').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj_stand_${userId}_${bet}`).setLabel('Rester ✋').setStyle(ButtonStyle.Success)
  );

  const embed = new EmbedBuilder()
    .setTitle('🃏 Blackjack (21)')
    .setDescription(`**Vos cartes :** [ ${playerCard1} ] [ ${playerCard2} ]  *(Total: ${playerScore})*\n**Croupier :** [ ${dealerCard1} ] [ ❓ ]`)
    .setColor(0x3498db)
    .addFields({ name: '💰 Mise', value: `${bet} pièces`, inline: true })
    .setFooter({ text: 'Cliquez sur un bouton pour continuer la partie !' });

  const msg = await interaction.editReply({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({ time: 30000 });

  collector.on('collect', async i => {
    if (i.user.id !== userId) {
      return i.reply({ content: '❌ Seul le joueur qui a lancé la partie peut utiliser ces boutons.', ephemeral: true });
    }

    if (i.customId.startsWith('bj_hit')) {
      const nextCard = Math.floor(Math.random() * 9) + 2;
      playerScore += nextCard;

      if (playerScore > 21) {
        collector.stop();
        const endEmbed = new EmbedBuilder()
          .setTitle('🃏 Blackjack - Bust !')
          .setDescription(`**Vos cartes :** Score **${playerScore}** (Dépassement !)\n❌ Vous avez sauté !`)
          .setColor(0xe74c3c)
          .addFields({ name: '💰 Perdu', value: `-${bet} pièces`, inline: true });
        await i.update({ embeds: [endEmbed], components: [] });
      } else {
        const hitEmbed = new EmbedBuilder()
          .setTitle('🃏 Blackjack (21)')
          .setDescription(`**Vos cartes :** Total **${playerScore}**\n**Croupier :** [ ${dealerCard1} ] [ ❓ ]`)
          .setColor(0x3498db);
        await i.update({ embeds: [hitEmbed], components: [row] });
      }
    } else if (i.customId.startsWith('bj_stand')) {
      collector.stop();

      const finalWin = playerScore <= 21 && (dealerScore > 21 || playerScore >= dealerScore || isWin);
      const multiplier = finalWin ? (config.payout_multiplier || 2.0) : 0;
      const winnings = Math.floor(bet * multiplier);

      const eco = getEconomy(guildId, userId);
      if (finalWin) {
        updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
      }

      const resultEmbed = new EmbedBuilder()
        .setTitle(finalWin ? '🎉 Blackjack - Victoire !' : '❌ Blackjack - Défaite !')
        .setDescription(`**Votre score :** ${playerScore}\n**Score du Croupier :** ${dealerScore}`)
        .setColor(finalWin ? 0x2ecc71 : 0xe74c3c)
        .addFields(
          { name: '💰 Mise', value: `${bet} pièces`, inline: true },
          { name: finalWin ? '🎉 Gains' : '❌ Perdu', value: finalWin ? `+${winnings} pièces` : `-${bet} pièces`, inline: true }
        );

      await i.update({ embeds: [resultEmbed], components: [] });
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      msg.edit({ components: [] }).catch(() => null);
    }
  });
}
