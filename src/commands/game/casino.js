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
// 🎰 MACHINE À SOUS (SLOTS INTERACTIFS)
// ==========================================
async function handleSlots(interaction, guildId, userId, initialBet, config) {
  await interaction.deferReply();

  const playSpin = async (iCtx, currentBet) => {
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

    const winnings = Math.floor(currentBet * multiplier);
    const eco = getEconomy(guildId, userId);

    if (winnings > 0) {
      updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
    }

    const canPlayAgain = eco.wallet >= currentBet;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`slots_again_${userId}`).setLabel(`🎰 Rejouer (${currentBet}🪙)`).setStyle(ButtonStyle.Primary).setDisabled(!canPlayAgain)
    );

    const embed = new EmbedBuilder()
      .setTitle('🎰 Machine à Sous Casino')
      .setDescription(`\n╔═════════════════╗\n║   ${reel1}  │  ${reel2}  │  ${reel3}   ║\n╚═════════════════╝\n`)
      .setColor(multiplier >= 3 ? 0xf1c40f : (multiplier > 0 ? 0x2ecc71 : 0xe74c3c))
      .addFields(
        { name: '💰 Mise', value: `${currentBet} pièces`, inline: true },
        { name: multiplier > 0 ? '🎉 Gains' : '❌ Résultat', value: multiplier > 0 ? `+${winnings} pièces (x${multiplier})` : `-${currentBet} pièces`, inline: true }
      )
      .setTimestamp();

    let targetMsg;
    if (iCtx.isButton && iCtx.isButton()) {
      targetMsg = await iCtx.update({ embeds: [embed], components: [row], fetchReply: true });
    } else {
      targetMsg = await iCtx.editReply({ embeds: [embed], components: [row] });
    }

    const collector = targetMsg.createMessageComponentCollector({ time: 30000 });
    collector.on('collect', async btnInt => {
      if (btnInt.user.id !== userId) {
        return btnInt.reply({ content: '❌ Seul le joueur d\'origine peut rejouer.', ephemeral: true });
      }
      collector.stop();

      const latestEco = getEconomy(guildId, userId);
      if (latestEco.wallet < currentBet) {
        return btnInt.reply({ content: '❌ Vous n\'avez pas assez de pièces en poche pour rejouer !', ephemeral: true });
      }

      updateEconomy(guildId, userId, { wallet: latestEco.wallet - currentBet });
      await playSpin(btnInt, currentBet);
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        targetMsg.edit({ components: [] }).catch(() => null);
      }
    });
  };

  await playSpin(interaction, initialBet);
}

// ==========================================
// 🪙 PILE OU FACE (INTERACTIF + QUITTE OU DOUBLE)
// ==========================================
async function handleCoinflip(interaction, guildId, userId, initialBet, config) {
  await interaction.deferReply();

  const startCoinflip = async (iCtx, choice, currentBet) => {
    const winRate = config.win_rate || 50;
    const isWin = (Math.random() * 100) < winRate;
    const multiplier = config.payout_multiplier || 2.0;
    const winnings = Math.floor(currentBet * multiplier);
    const actualResult = isWin ? choice : (choice === 'pile' ? 'face' : 'pile');
    const resultStr = actualResult === 'pile' ? '🪙 Pile' : '🪙 Face';

    const eco = getEconomy(guildId, userId);
    if (isWin) {
      updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
    }

    let row = new ActionRowBuilder();
    if (isWin) {
      row.addComponents(
        new ButtonBuilder().setCustomId(`cf_double_${userId}`).setLabel(`🔥 Quitte ou Double (${winnings}🪙)`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`cf_cashout_${userId}`).setLabel('💰 Récupérer les gains').setStyle(ButtonStyle.Secondary)
      );
    }

    const embed = new EmbedBuilder()
      .setTitle('🪙 Pile ou Face')
      .setDescription(`La pièce tourne... et s'arrête sur **${resultStr}** !`)
      .setColor(isWin ? 0x2ecc71 : 0xe74c3c)
      .addFields(
        { name: '🎯 Votre Choix', value: choice === 'pile' ? '🪙 Pile' : '🪙 Face', inline: true },
        { name: '💰 Mise en Jeu', value: `${currentBet} pièces`, inline: true },
        { name: isWin ? '🎉 Gains !' : '❌ Défaite', value: isWin ? `+${winnings} pièces (x${multiplier})` : `-${currentBet} pièces`, inline: true }
      )
      .setTimestamp();

    const components = isWin ? [row] : [];
    let targetMsg;
    if (iCtx.isButton && iCtx.isButton()) {
      targetMsg = await iCtx.update({ embeds: [embed], components, fetchReply: true });
    } else {
      targetMsg = await iCtx.editReply({ embeds: [embed], components });
    }

    if (isWin) {
      const collector = targetMsg.createMessageComponentCollector({ time: 30000 });
      collector.on('collect', async btnInt => {
        if (btnInt.user.id !== userId) {
          return btnInt.reply({ content: '❌ Seul le joueur d\'origine peut interagir.', ephemeral: true });
        }
        collector.stop();

        if (btnInt.customId.startsWith('cf_double')) {
          // Re-bet the entire winnings!
          const latestEco = getEconomy(guildId, userId);
          updateEconomy(guildId, userId, { wallet: latestEco.wallet - winnings });
          await startCoinflip(btnInt, choice, winnings);
        } else if (btnInt.customId.startsWith('cf_cashout')) {
          const endEmbed = EmbedBuilder.from(embed).setFooter({ text: '💰 Gains récupérés avec succès !' });
          await btnInt.update({ embeds: [endEmbed], components: [] });
        }
      });
    }
  };

  // Ask Choice via interactive Buttons
  const choiceRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cf_pick_pile_${userId}`).setLabel('🪙 Pile').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`cf_pick_face_${userId}`).setLabel('🪙 Face').setStyle(ButtonStyle.Secondary)
  );

  const initEmbed = new EmbedBuilder()
    .setTitle('🪙 Pile ou Face - Faites votre choix !')
    .setDescription('Choisissez **Pile** ou **Face** pour lancer la pièce !')
    .setColor(0x3498db)
    .addFields({ name: '💰 Mise', value: `${initialBet} pièces`, inline: true });

  const msg = await interaction.editReply({ embeds: [initEmbed], components: [choiceRow] });
  const choiceCollector = msg.createMessageComponentCollector({ time: 30000 });

  choiceCollector.on('collect', async btnInt => {
    if (btnInt.user.id !== userId) {
      return btnInt.reply({ content: '❌ Seul le joueur d\'origine peut choisir.', ephemeral: true });
    }
    choiceCollector.stop();
    const chosenSide = btnInt.customId.includes('pile') ? 'pile' : 'face';
    await startCoinflip(btnInt, chosenSide, initialBet);
  });
}

// ==========================================
// 🎲 4-2-1 (INTERACTIF AVEC RE-LANCERS)
// ==========================================
async function handle421(interaction, guildId, userId, bet, config) {
  await interaction.deferReply();

  let dice = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
  let holds = [false, false, false];
  let rollsLeft = 2;

  const getDiceButtons = (done = false) => {
    if (done) return [];
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`421_hold_0_${userId}`)
        .setLabel(`Dé 1 [${dice[0]}] ${holds[0] ? '🔒' : '🎲'}`)
        .setStyle(holds[0] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`421_hold_1_${userId}`)
        .setLabel(`Dé 2 [${dice[1]}] ${holds[1] ? '🔒' : '🎲'}`)
        .setStyle(holds[1] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`421_hold_2_${userId}`)
        .setLabel(`Dé 3 [${dice[2]}] ${holds[2] ? '🔒' : '🎲'}`)
        .setStyle(holds[2] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`421_reroll_${userId}`)
        .setLabel(`Relancer 🎲 (${rollsLeft} restant${rollsLeft > 1 ? 's' : ''})`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`421_stand_${userId}`)
        .setLabel('Valider ✋')
        .setStyle(ButtonStyle.Danger)
    );
    return [row];
  };

  const evalCombination = (dArray) => {
    const sorted = [...dArray].sort((a, b) => b - a);
    const code = sorted.join('');

    if (code === '421') return { name: '🔥 GRAND 4-2-1 ! (Jackpot x5)', mult: 5.0 };
    if (dArray[0] === dArray[1] && dArray[1] === dArray[2]) {
      if (dArray[0] === 1) return { name: '💥 Brelan d\'As ! (x4)', mult: 4.0 };
      return { name: `🎉 Brelan de ${dArray[0]} (x3)`, mult: 3.0 };
    }
    if (code === '654' || code === '543' || code === '432' || code === '321') return { name: '✨ Grande Suite (x2)', mult: 2.0 };
    if (code === '221') return { name: '❌ Nénette (2-2-1) ! Perdu !', mult: 0 };
    return { name: '🎲 Lancer de Dés', mult: (config.win_rate && Math.random() * 100 < config.win_rate) ? 1.5 : 0 };
  };

  const buildEmbed = (statusMsg = '') => {
    const sortedStr = [...dice].sort((a, b) => b - a).join('  ');
    const embed = new EmbedBuilder()
      .setTitle('🎲 Jeu du 4-2-1')
      .setDescription(
        `**Vos dés :** [ ${dice[0]} ]  [ ${dice[1]} ]  [ ${dice[2]} ]  *(Triés: **${sortedStr}**)*\n\n` +
        (statusMsg ? `*${statusMsg}*` : `*Cliquez sur les dés pour les bloquer 🔒 ou débloquer 🎲, puis relancez (${rollsLeft} essais restants).*`)
      )
      .setColor(0x3498db)
      .addFields({ name: '💰 Mise', value: `${bet} pièces`, inline: true });
    return embed;
  };

  const msg = await interaction.editReply({ embeds: [buildEmbed()], components: getDiceButtons(false) });
  const collector = msg.createMessageComponentCollector({ time: 60000 });

  const finishGame = async (iCtx) => {
    collector.stop();
    const result = evalCombination(dice);
    const winnings = Math.floor(bet * result.mult);
    const eco = getEconomy(guildId, userId);

    if (winnings > 0) {
      updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
    }

    const endEmbed = new EmbedBuilder()
      .setTitle(result.name)
      .setDescription(`**Dés finaux :** [ ${dice[0]} ]  [ ${dice[1]} ]  [ ${dice[2]} ]`)
      .setColor(result.mult > 0 ? 0x2ecc71 : 0xe74c3c)
      .addFields(
        { name: '💰 Mise', value: `${bet} pièces`, inline: true },
        { name: result.mult > 0 ? '🎉 Gains' : '❌ Perdu', value: result.mult > 0 ? `+${winnings} pièces (x${result.mult})` : `-${bet} pièces`, inline: true }
      )
      .setTimestamp();

    if (iCtx.isButton && iCtx.isButton()) {
      await iCtx.update({ embeds: [endEmbed], components: [] });
    } else {
      await interaction.editReply({ embeds: [endEmbed], components: [] });
    }
  };

  collector.on('collect', async iCtx => {
    if (iCtx.user.id !== userId) {
      return iCtx.reply({ content: '❌ Seul le joueur d\'origine peut interagir.', ephemeral: true });
    }

    if (iCtx.customId.startsWith('421_hold_')) {
      const idx = parseInt(iCtx.customId.split('_')[2], 10);
      holds[idx] = !holds[idx];
      await iCtx.update({ embeds: [buildEmbed()], components: getDiceButtons(false) });
    } else if (iCtx.customId.startsWith('421_reroll')) {
      if (rollsLeft > 0) {
        rollsLeft--;
        for (let k = 0; k < 3; k++) {
          if (!holds[k]) {
            dice[k] = Math.floor(Math.random() * 6) + 1;
          }
        }
        if (rollsLeft === 0) {
          await finishGame(iCtx);
        } else {
          await iCtx.update({ embeds: [buildEmbed()], components: getDiceButtons(false) });
        }
      }
    } else if (iCtx.customId.startsWith('421_stand')) {
      await finishGame(iCtx);
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      finishGame(interaction).catch(() => null);
    }
  });
}

// ==========================================
// 🎡 ROULETTE (INTERACTIVE & TAPIS DE JEU)
// ==========================================
async function handleRoulette(interaction, guildId, userId, bet, config, choice) {
  await interaction.deferReply();

  const startRouletteSpin = async (iCtx, userChoice) => {
    const winRate = config.win_rate || 48;
    const isWin = (Math.random() * 100) < winRate;
    const choiceClean = userChoice.toLowerCase().trim();

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
      .setDescription(`\n🎡 La bille a tourné sur la roulette et s'est arrêtée sur **${winningNum}** (${colorStr}) !\n`)
      .setColor(winnings > 0 ? 0x2ecc71 : 0xe74c3c)
      .addFields(
        { name: '🎯 Pari Placé', value: `${userChoice.toUpperCase()}`, inline: true },
        { name: '💰 Mise', value: `${bet} pièces`, inline: true },
        { name: winnings > 0 ? '🎉 Gains' : '❌ Perdu', value: winnings > 0 ? `+${winnings} pièces (x${multiplier})` : `-${bet} pièces`, inline: true }
      )
      .setTimestamp();

    if (iCtx.isButton && iCtx.isButton()) {
      await iCtx.update({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ embeds: [embed], components: [] });
    }
  };

  if (choice) {
    await startRouletteSpin(interaction, choice);
  } else {
    // Interactive Betting Row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`roul_rouge_${userId}`).setLabel('🔴 Rouge').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`roul_noir_${userId}`).setLabel('⚫ Noir').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`roul_pair_${userId}`).setLabel('⚖️ Pair').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`roul_impair_${userId}`).setLabel('⚡ Impair').setStyle(ButtonStyle.Primary)
    );

    const initEmbed = new EmbedBuilder()
      .setTitle('🎡 Table de Roulette - Placez votre Pari !')
      .setDescription('Choisissez sur quelle couleur ou parité miser pour cette partie :')
      .setColor(0x3498db)
      .addFields({ name: '💰 Mise', value: `${bet} pièces`, inline: true });

    const msg = await interaction.editReply({ embeds: [initEmbed], components: [row] });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async btnInt => {
      if (btnInt.user.id !== userId) {
        return btnInt.reply({ content: '❌ Seul le joueur d\'origine peut miser.', ephemeral: true });
      }
      collector.stop();
      const pickedChoice = btnInt.customId.split('_')[1];
      await startRouletteSpin(btnInt, pickedChoice);
    });
  }
}

// ==========================================
// 🎴 VIDÉO POKER (JACKS OR BETTER INTERACTIF)
// ==========================================
function evaluatePokerHand(hand) {
  const ranksOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const rankIndices = hand.map(c => ranksOrder.indexOf(c.rank)).sort((a, b) => a - b);
  const suits = hand.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  if (new Set(rankIndices).size === 5) {
    if (rankIndices[4] - rankIndices[0] === 4) {
      isStraight = true;
    } else if (rankIndices[0] === 0 && rankIndices[1] === 1 && rankIndices[2] === 2 && rankIndices[3] === 3 && rankIndices[4] === 12) {
      isStraight = true;
    }
  }

  const counts = {};
  rankIndices.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const valCounts = Object.values(counts).sort((a, b) => b - a);

  if (isFlush && isStraight) {
    if (rankIndices[0] === 8) return { name: '🔥 Quinte Flush Royale ! (x10)', mult: 10.0 };
    return { name: '✨ Quinte Flush ! (x7)', mult: 7.0 };
  }
  if (valCounts[0] === 4) return { name: '💎 Carré (Four of a Kind) ! (x5)', mult: 5.0 };
  if (valCounts[0] === 3 && valCounts[1] === 2) return { name: '🏠 Full House ! (x4)', mult: 4.0 };
  if (isFlush) return { name: '🎨 Couleur (Flush) ! (x3)', mult: 3.0 };
  if (isStraight) return { name: '📏 Quinte (Straight) ! (x2.5)', mult: 2.5 };
  if (valCounts[0] === 3) return { name: '☘️ Brelan (Three of a Kind) ! (x2)', mult: 2.0 };
  if (valCounts[0] === 2 && valCounts[1] === 2) return { name: '👥 Double Paire ! (x1.5)', mult: 1.5 };
  if (valCounts[0] === 2) {
    const pairRankIndex = parseInt(Object.keys(counts).find(r => counts[r] === 2), 10);
    if (pairRankIndex >= 9) return { name: '🃏 Paire de Valets ou Mieux ! (x1)', mult: 1.0 };
  }
  return { name: '❌ Aucune combinaison', mult: 0 };
}

async function handlePoker(interaction, guildId, userId, bet, config) {
  await interaction.deferReply();

  const deck = createDeck();
  let hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
  let holds = [false, false, false, false, false];

  const getActionRows = (done = false) => {
    if (done) return [];
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`poker_hold_0_${userId}`).setLabel(`C1 ${holds[0] ? '🔒 Garder' : '❌ Échanger'}`).setStyle(holds[0] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`poker_hold_1_${userId}`).setLabel(`C2 ${holds[1] ? '🔒 Garder' : '❌ Échanger'}`).setStyle(holds[1] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`poker_hold_2_${userId}`).setLabel(`C3 ${holds[2] ? '🔒 Garder' : '❌ Échanger'}`).setStyle(holds[2] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`poker_hold_3_${userId}`).setLabel(`C4 ${holds[3] ? '🔒 Garder' : '❌ Échanger'}`).setStyle(holds[3] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`poker_hold_4_${userId}`).setLabel(`C5 ${holds[4] ? '🔒 Garder' : '❌ Échanger'}`).setStyle(holds[4] ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`poker_draw_${userId}`).setLabel('🎴 Tirer / Échanger les cartes').setStyle(ButtonStyle.Primary)
    );
    return [row1, row2];
  };

  const buildEmbed = (statusStr = '') => {
    const handDisplay = hand.map((c, idx) => `\`[ ${c.rank}${c.suit} ]\` ${holds[idx] ? '🔒' : ''}`).join('   ');
    const embed = new EmbedBuilder()
      .setTitle('🎴 Vidéo Poker - Jacks or Better')
      .setDescription(
        `**Votre main :**\n${handDisplay}\n\n` +
        (statusStr ? `*${statusStr}*` : '*Cliquez sur les cartes pour les garder (🔒) ou échanger (❌), puis validez avec Tirer !*')
      )
      .setColor(0x3498db)
      .addFields({ name: '💰 Mise', value: `${bet} pièces`, inline: true });
    return embed;
  };

  const msg = await interaction.editReply({ embeds: [buildEmbed()], components: getActionRows(false) });
  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async iCtx => {
    if (iCtx.user.id !== userId) {
      return iCtx.reply({ content: '❌ Seul le joueur d\'origine peut interagir.', ephemeral: true });
    }

    if (iCtx.customId.startsWith('poker_hold_')) {
      const idx = parseInt(iCtx.customId.split('_')[2], 10);
      holds[idx] = !holds[idx];
      await iCtx.update({ embeds: [buildEmbed()], components: getActionRows(false) });
    } else if (iCtx.customId.startsWith('poker_draw')) {
      collector.stop();

      // Replace non-held cards
      for (let k = 0; k < 5; k++) {
        if (!holds[k]) {
          hand[k] = deck.pop();
        }
      }

      const result = evaluatePokerHand(hand);
      const winnings = Math.floor(bet * result.mult);
      const eco = getEconomy(guildId, userId);

      if (winnings > 0) {
        updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
      }

      const finalHandDisplay = hand.map(c => `\`[ ${c.rank}${c.suit} ]\``).join('   ');
      const endEmbed = new EmbedBuilder()
        .setTitle(result.name)
        .setDescription(`**Main finale :**\n${finalHandDisplay}`)
        .setColor(result.mult > 0 ? 0x2ecc71 : 0xe74c3c)
        .addFields(
          { name: '💰 Mise', value: `${bet} pièces`, inline: true },
          { name: result.mult > 0 ? '🎉 Gains' : '❌ Perdu', value: result.mult > 0 ? `+${winnings} pièces (x${result.mult})` : `-${bet} pièces`, inline: true }
        )
        .setTimestamp();

      await iCtx.update({ embeds: [endEmbed], components: [] });
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      msg.edit({ components: [] }).catch(() => null);
    }
  });
}

// ==========================================
// 🃏 BLACKJACK (REALISTE - CASINO PRO)
// ==========================================
function createDeck() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = [
    { name: '2', value: 2 }, { name: '3', value: 3 }, { name: '4', value: 4 },
    { name: '5', value: 5 }, { name: '6', value: 6 }, { name: '7', value: 7 },
    { name: '8', value: 8 }, { name: '9', value: 9 }, { name: '10', value: 10 },
    { name: 'J', value: 10 }, { name: 'Q', value: 10 }, { name: 'K', value: 10 },
    { name: 'A', value: 11 }
  ];
  const deck = [];
  for (const s of suits) {
    for (const r of ranks) {
      deck.push({ rank: r.name, suit: s, value: r.value });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHandScore(hand) {
  let score = 0;
  let aces = 0;
  hand.forEach(card => {
    score += card.value;
    if (card.rank === 'A') aces++;
  });
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function formatHand(hand) {
  return hand.map(c => `\`${c.rank}${c.suit}\``).join('  ');
}

async function handleBlackjack(interaction, guildId, userId, initialBet, config) {
  await interaction.deferReply();

  let currentBet = initialBet;
  const deck = createDeck();

  const playerHand = [deck.pop(), deck.pop()];
  const dealerHand = [deck.pop(), deck.pop()];

  let playerScore = calculateHandScore(playerHand);
  let dealerScore = calculateHandScore(dealerHand);

  const eco = getEconomy(guildId, userId);
  const canDouble = eco.wallet >= initialBet;

  // Verification Blackjack Naturel au premier tour (21 en 2 cartes)
  const isPlayerBlackjack = playerScore === 21;
  const isDealerBlackjack = dealerScore === 21;

  if (isPlayerBlackjack || isDealerBlackjack) {
    let title = '';
    let color = 0x2ecc71;
    let winnings = 0;

    if (isPlayerBlackjack && isDealerBlackjack) {
      title = '🤝 Égalité ! Double Blackjack Naturel !';
      color = 0xf39c12;
      winnings = currentBet;
      updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
    } else if (isPlayerBlackjack) {
      title = '🔥 BLACKJACK NATUREL ! (Victoire 3:2)';
      color = 0x2ecc71;
      const mult = config.payout_multiplier ? (config.payout_multiplier * 1.25) : 2.5;
      winnings = Math.floor(currentBet * mult);
      updateEconomy(guildId, userId, { wallet: eco.wallet + winnings });
    } else {
      title = '❌ Le Croupier a un Blackjack Naturel !';
      color = 0xe74c3c;
      winnings = 0;
    }

    const bjEmbed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        `**Vos cartes :** ${formatHand(playerHand)} *(Score: **${playerScore}**)*\n` +
        `**Croupier :** ${formatHand(dealerHand)} *(Score: **${dealerScore}**)*`
      )
      .setColor(color)
      .addFields(
        { name: '💰 Mise', value: `${currentBet} pièces`, inline: true },
        { name: winnings > 0 ? (winnings === currentBet ? '🤝 Remboursé' : '🎉 Gains') : '❌ Perdu', value: winnings > 0 ? `+${winnings} pièces` : `-${currentBet} pièces`, inline: true }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [bjEmbed] });
  }

  const getActionRow = (allowDouble = true) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${userId}`).setLabel('Tirer 🃏').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand_${userId}`).setLabel('Rester ✋').setStyle(ButtonStyle.Success)
    );
    if (allowDouble) {
      row.addComponents(
        new ButtonBuilder().setCustomId(`bj_double_${userId}`).setLabel(`Doubler 💰 (${initialBet}🪙)`).setStyle(ButtonStyle.Secondary).setDisabled(!canDouble)
      );
    }
    return row;
  };

  const buildGameStateEmbed = (hideDealer = true, statusMessage = '') => {
    const pScore = calculateHandScore(playerHand);
    const dDisplay = hideDealer 
      ? `${formatHand([dealerHand[0]])}  \`❓\``
      : formatHand(dealerHand);
    const dScore = hideDealer ? '?' : calculateHandScore(dealerHand);

    const embed = new EmbedBuilder()
      .setTitle('🃏 Table de Blackjack (21)')
      .setDescription(
        `**Votre main :** ${formatHand(playerHand)}  *(Score: **${pScore}**)*\n` +
        `**Main du Croupier :** ${dDisplay}  *(Score: **${dScore}**)*\n\n` +
        (statusMessage ? `*${statusMessage}*` : '👇 *Choisissez votre action ci-dessous :*')
      )
      .setColor(pScore > 21 ? 0xe74c3c : (hideDealer ? 0x3498db : 0x2ecc71))
      .addFields({ name: '💰 Mise en jeu', value: `**${currentBet} pièces**`, inline: true })
      .setTimestamp();
    return embed;
  };

  const msg = await interaction.editReply({ embeds: [buildGameStateEmbed(true)], components: [getActionRow(canDouble)] });

  const collector = msg.createMessageComponentCollector({ time: 60000 });
  let turnOver = false;

  collector.on('collect', async i => {
    if (i.user.id !== userId) {
      return i.reply({ content: '❌ Seul le joueur qui a lancé la partie peut utiliser ces boutons.', ephemeral: true });
    }

    if (i.customId.startsWith('bj_hit')) {
      playerHand.push(deck.pop());
      const pScore = calculateHandScore(playerHand);

      if (pScore > 21) {
        turnOver = true;
        collector.stop();

        const bustEmbed = new EmbedBuilder()
          .setTitle('💥 Bust ! (Dépassement de 21)')
          .setDescription(
            `**Votre main :** ${formatHand(playerHand)}  *(Score: **${pScore}** - Sauté !)*\n` +
            `**Main du Croupier :** ${formatHand([dealerHand[0]])}  \`❓\`\n\n` +
            `❌ Vous avez dépassé 21 et perdu votre mise.`
          )
          .setColor(0xe74c3c)
          .addFields({ name: '💰 Perte', value: `-${currentBet} pièces`, inline: true })
          .setTimestamp();

        return i.update({ embeds: [bustEmbed], components: [] });
      } else if (pScore === 21) {
        turnOver = true;
        collector.stop();
        await resolveDealerTurn(i, guildId, userId, currentBet, playerHand, dealerHand, deck, config);
      } else {
        await i.update({ embeds: [buildGameStateEmbed(true)], components: [getActionRow(false)] });
      }
    } else if (i.customId.startsWith('bj_double')) {
      turnOver = true;
      collector.stop();

      const latestEco = getEconomy(guildId, userId);
      if (latestEco.wallet < initialBet) {
        return i.reply({ content: '❌ Solde insuffisant pour doubler la mise !', ephemeral: true });
      }

      updateEconomy(guildId, userId, { wallet: latestEco.wallet - initialBet });
      currentBet = initialBet * 2;

      playerHand.push(deck.pop());
      const pScore = calculateHandScore(playerHand);

      if (pScore > 21) {
        const bustEmbed = new EmbedBuilder()
          .setTitle('💥 Bust sur Double Mise !')
          .setDescription(
            `**Votre main :** ${formatHand(playerHand)}  *(Score: **${pScore}** - Sauté !)*\n` +
            `**Main du Croupier :** ${formatHand([dealerHand[0]])}  \`❓\`\n\n` +
            `❌ Vous avez tiré votre carte de doublement et dépassé 21.`
          )
          .setColor(0xe74c3c)
          .addFields({ name: '💰 Perte Doublée', value: `-${currentBet} pièces`, inline: true })
          .setTimestamp();

        return i.update({ embeds: [bustEmbed], components: [] });
      } else {
        await resolveDealerTurn(i, guildId, userId, currentBet, playerHand, dealerHand, deck, config);
      }
    } else if (i.customId.startsWith('bj_stand')) {
      turnOver = true;
      collector.stop();
      await resolveDealerTurn(i, guildId, userId, currentBet, playerHand, dealerHand, deck, config);
    }
  });

  collector.on('end', (collected, reason) => {
    if (!turnOver && reason === 'time') {
      msg.edit({ components: [] }).catch(() => null);
    }
  });
}

async function resolveDealerTurn(interaction, guildId, userId, bet, playerHand, dealerHand, deck, config) {
  let pScore = calculateHandScore(playerHand);
  let dScore = calculateHandScore(dealerHand);

  // Le croupier tire des cartes jusqu'à atteindre au moins 17 (Règle officielle du Casino)
  while (dScore < 17) {
    dealerHand.push(deck.pop());
    dScore = calculateHandScore(dealerHand);
  }

  let finalTitle = '';
  let finalColor = 0x2ecc71;
  let winnings = 0;
  const mult = config.payout_multiplier || 2.0;

  if (dScore > 21) {
    finalTitle = '🎉 Croupier Bust ! Victoire !';
    finalColor = 0x2ecc71;
    winnings = Math.floor(bet * mult);
  } else if (pScore > dScore) {
    finalTitle = '🎉 Victoire ! Vous battez le Croupier !';
    finalColor = 0x2ecc71;
    winnings = Math.floor(bet * mult);
  } else if (pScore === dScore) {
    finalTitle = '🤝 Égalité (Push) !';
    finalColor = 0xf39c12;
    winnings = bet;
  } else {
    finalTitle = '❌ Défaite ! Le Croupier l\'emporte.';
    finalColor = 0xe74c3c;
    winnings = 0;
  }

  if (winnings > 0) {
    const currentEco = getEconomy(guildId, userId);
    updateEconomy(guildId, userId, { wallet: currentEco.wallet + winnings });
  }

  const resultEmbed = new EmbedBuilder()
    .setTitle(finalTitle)
    .setDescription(
      `**Votre main :** ${formatHand(playerHand)}  *(Score: **${pScore}**)*\n` +
      `**Main du Croupier :** ${formatHand(dealerHand)}  *(Score: **${dScore}**)*`
    )
    .setColor(finalColor)
    .addFields(
      { name: '💰 Mise', value: `${bet} pièces`, inline: true },
      { name: winnings > 0 ? (winnings === bet ? '🤝 Remboursé' : '🎉 Gains') : '❌ Perdu', value: winnings > 0 ? `+${winnings} pièces` : `-${bet} pièces`, inline: true }
    )
    .setTimestamp();

  await interaction.update({ embeds: [resultEmbed], components: [] });
}
