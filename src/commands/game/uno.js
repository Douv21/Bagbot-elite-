const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

// Mapping des emojis custom de cartes UNO (Application Emojis)
const EMOJI_MAP = {
  'uno_r0': '<:uno_r0:1433191075945779401>',
  'uno_r1': '<:uno_r1:1433191080567767062>',
  'uno_r2': '<:uno_r2:1433191085030641879>',
  'uno_r3': '<:uno_r3:1433191089107505315>',
  'uno_r4': '<:uno_r4:1433191093520040113>',
  'uno_r5': '<:uno_r5:1433191105091997696>',
  'uno_r6': '<:uno_r6:1433191109672177737>',
  'uno_r7': '<:uno_r7:1433191114504146945>',
  'uno_r8': '<:uno_r8:1433191118698319934>',
  'uno_r9': '<:uno_r9:1433191123299471443>',
  'uno_rskip': '<:uno_rskip:1433193235043319878>',
  'uno_rrev': '<:uno_rrev:1433194079927406663>',
  'uno_rp2': '<:uno_rp2:1433193252194095286>',
  'uno_b0': '<:uno_b0:1433191141376786577>',
  'uno_b1': '<:uno_b1:1433191146179264542>',
  'uno_b2': '<:uno_b2:1433191150436749439>',
  'uno_b3': '<:uno_b3:1433191154857279632>',
  'uno_b4': '<:uno_b4:1433191160167534774>',
  'uno_b5': '<:uno_b5:1433191165036859483>',
  'uno_b6': '<:uno_b6:1433191169285685362>',
  'uno_b7': '<:uno_b7:1433191174054613195>',
  'uno_b8': '<:uno_b8:1433191178676867124>',
  'uno_b9': '<:uno_b9:1433191183470825655>',
  'uno_bskip': '<:uno_bskip:1433193260691493085>',
  'uno_brev': '<:uno_brev:1433194088252838060>',
  'uno_bp2': '<:uno_bp2:1433193277284159651>',
  'uno_g0': '<:uno_g0:1433191202160640152>',
  'uno_g1': '<:uno_g1:1433191206363598939>',
  'uno_g2': '<:uno_g2:1433191211040116897>',
  'uno_g3': '<:uno_g3:1433191215565639830>',
  'uno_g4': '<:uno_g4:1433191220284493864>',
  'uno_g5': '<:uno_g5:1433191224751427595>',
  'uno_g6': '<:uno_g6:1433191229537124372>',
  'uno_g7': '<:uno_g7:1433191234104590518>',
  'uno_g8': '<:uno_g8:1433191238617534596>',
  'uno_g9': '<:uno_g9:1433191243822665749>',
  'uno_gskip': '<:uno_gskip:1433193285450465494>',
  'uno_grev': '<:uno_grev:1433194096327000167>',
  'uno_gp2': '<:uno_gp2:1433193303997808764>',
  'uno_y0': '<:uno_y0:1433191262227267696>',
  'uno_y1': '<:uno_y1:1433191266744664185>',
  'uno_y2': '<:uno_y2:1433191271219990598>',
  'uno_y3': '<:uno_y3:1433191275602907136>',
  'uno_y4': '<:uno_y4:1433191279696675040>',
  'uno_y5': '<:uno_y5:1433191284335575133>',
  'uno_y6': '<:uno_y6:1433191289620402267>',
  'uno_y7': '<:uno_y7:1433191294188126300>',
  'uno_y8': '<:uno_y8:1433191298747072644>',
  'uno_y9': '<:uno_y9:1433191303348359271>',
  'uno_yskip': '<:uno_yskip:1433193312336089108>',
  'uno_yrev': '<:uno_yrev:1433194105017733150>',
  'uno_yp2': '<:uno_yp2:1433193328903458937>',
  'uno_wild': '<:uno_wild:1433194845153005568>',
  'uno_wildp4': '<:uno_wildp4:1433194853495345263>',
};

// ­ƒÅå Fonction pour cr├®er l'embed de victoire
function createVictoryEmbed(winner, allPlayers) {
  const winEmbed = new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle("­ƒÄë VICTOIRE UNO ! ­ƒÄë")
    .setDescription(`**­ƒÅå ${winner.username} remporte la partie !**\n\nBravo pour cette victoire ! ­ƒÄè`)
    .addFields(
      {
        name: "­ƒæÑ Participants",
        value: allPlayers.map(p => {
          const icon = p.id === winner.id ? "­ƒÑç" : "­ƒÄ┤";
          return `${icon} ${p.username} - ${p.hand.length} carte(s)`;
        }).join("\n"),
        inline: false
      }
    )
    .setFooter({ text: "Merci ├á tous d'avoir particip├® ! ­ƒÆÖ" })
    .setTimestamp();
  
  return winEmbed;
}

// Fonction pour obtenir le chemin de l'image d'une carte
function getCardImagePath(card) {
  const color = card.chosenColor || card.color;
  const colorPrefix = { red: 'r', blue: 'b', green: 'g', yellow: 'y' };
  
  let filename = '';
  
  if (card.type === 'number') {
    filename = `uno_${colorPrefix[color]}${card.value}.png`;
  } else if (card.type === 'skip') {
    filename = `uno_${colorPrefix[color]}skip.png`;
  } else if (card.type === 'reverse') {
    filename = `uno_${colorPrefix[color]}rev.png`;
  } else if (card.type === 'draw2') {
    filename = `uno_${colorPrefix[color]}p2.png`;
  } else if (card.type === 'wild') {
    filename = 'uno_wild.png';
  } else if (card.type === 'wild_draw4') {
    filename = 'uno_wildp4.png';
  }
  
  return path.join(__dirname, '..', '..', 'uno-cards', filename);
}

// Fonction pour cr├®er une image composite de la main d'un joueur en ├®ventail
async function createHandImage(cards) {
  // Taille des cartes (r├®duite pour l'├®ventail)
  const cardWidth = 200;
  const cardHeight = 300;
  
  // Param├¿tres de l'├®ventail
  const numCards = cards.length;
  const maxAngle = Math.min(90, numCards * 12); // Maximum 90┬░ d'ouverture
  const angleStep = numCards > 1 ? maxAngle / (numCards - 1) : 0;
  const startAngle = -maxAngle / 2;
  
  // Rayon de l'arc (distance du centre aux cartes)
  const radius = 400;
  
  // Dimensions du canvas (assez grand pour contenir l'├®ventail)
  const canvasWidth = 1400;
  const canvasHeight = 700;
  
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  
  // Fond transparent/sombre
  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Point central de l'├®ventail (en bas au centre)
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight + 100;
  
  // Charger et dessiner chaque carte en ├®ventail
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cardPath = getCardImagePath(card);
    
    if (fs.existsSync(cardPath)) {
      const image = await loadImage(cardPath);
      
      // Calculer l'angle de cette carte
      const angle = (startAngle + i * angleStep) * Math.PI / 180;
      
      // Calculer la position de la carte
      const x = centerX + radius * Math.sin(angle);
      const y = centerY - radius * Math.cos(angle);
      
      // Sauvegarder l'├®tat du contexte
      ctx.save();
      
      // Se d├®placer au centre de la carte
      ctx.translate(x, y);
      
      // Rotation de la carte selon l'angle de l'├®ventail
      ctx.rotate(angle);
      
      // Dessiner la carte centr├®e
      ctx.drawImage(image, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
      
      // Dessiner le num├®ro de la carte
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Positionner le num├®ro en haut de la carte
      ctx.strokeText(`${i + 1}`, 0, -cardHeight / 2 + 35);
      ctx.fillText(`${i + 1}`, 0, -cardHeight / 2 + 35);
      
      // Restaurer l'├®tat du contexte
      ctx.restore();
    }
  }
  
  return canvas.toBuffer('image/png');
}

// Fonction pour obtenir l'emoji custom de carte UNO
function getCardVisual(card) {
  const color = card.chosenColor || card.color;
  const colorPrefix = { red: 'r', blue: 'b', green: 'g', yellow: 'y' };
  
  let emojiKey = '';
  
  if (card.type === 'number') {
    emojiKey = `uno_${colorPrefix[color]}${card.value}`;
  } else if (card.type === 'skip') {
    emojiKey = `uno_${colorPrefix[color]}skip`;
  } else if (card.type === 'reverse') {
    emojiKey = `uno_${colorPrefix[color]}rev`;
  } else if (card.type === 'draw2') {
    emojiKey = `uno_${colorPrefix[color]}p2`;
  } else if (card.type === 'wild') {
    emojiKey = 'uno_wild';
  } else if (card.type === 'wild_draw4') {
    emojiKey = 'uno_wildp4';
  }
  
  return EMOJI_MAP[emojiKey] || 'ÔØô';
}

// Stockage des parties en cours
const activeGames = new Map();


// ============================================================
// ­ƒñû ROBOT IA pour mode solo
// ============================================================
async function playBotTurn(game, message) {
  console.log(`[UNO BOT] ========== playBotTurn APPEL├ë ==========`);
  console.log(`[UNO BOT] isSoloMode: ${game.isSoloMode}`);
  
  // Attendre 2 secondes pour simuler la r├®flexion
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const botPlayer = game.players.find(p => p.id === 'UNO_BOT_AI');
  if (!botPlayer) {
    console.log(`[UNO BOT] ÔØî Bot player introuvable`);
    return;
  }
  
  const currentPlayer = game.getCurrentPlayer();
  console.log(`[UNO BOT] currentPlayer: ${currentPlayer.username} (${currentPlayer.id})`);
  
  if (currentPlayer.id !== 'UNO_BOT_AI') {
    console.log(`[UNO BOT] ÔØî Ce n'est pas le tour du bot (c'est ${currentPlayer.username})`);
    return;
  }
  
  console.log(`[UNO BOT] Ô£à C'est le tour du bot !`);
  console.log(`[UNO BOT] Tour du bot - Main: ${botPlayer.hand.length} cartes`);
  console.log(`[UNO BOT] draw2Count: ${game.draw2Count}, draw4Count: ${game.draw4Count}`);
  
  // Strat├®gie du bot: jouer la premi├¿re carte valide
  let cardPlayed = false;
  
  for (let i = 0; i < botPlayer.hand.length; i++) {
    const card = botPlayer.hand[i];
    const topCard = game.discardPile[game.discardPile.length - 1];
    
    // ­ƒåò NOUVELLES R├êGLES: V├®rifier les contraintes +2/+4
    // Si draw2Count > 0, seul +2 est autoris├®
    if (game.draw2Count > 0 && card.type !== 'draw2') {
      continue; // Cette carte n'est pas jouable
    }
    
    // Si draw4Count > 0, seul +4 est autoris├®
    if (game.draw4Count > 0 && card.type !== 'wild_draw4') {
      continue; // Cette carte n'est pas jouable
    }
    
    // V├®rifier si la carte peut ├¬tre jou├®e
    if (card.type === 'wild' || card.type === 'wild_draw4') {
      // Joker: choisir la couleur la plus pr├®sente dans la main
      const colors = { red: 0, blue: 0, green: 0, yellow: 0 };
      botPlayer.hand.forEach(c => {
        if (c.color && c.color !== 'wild') colors[c.color]++;
      });
      const bestColor = Object.keys(colors).reduce((a, b) => colors[a] > colors[b] ? a : b);
      
      console.log(`[UNO BOT] Tente de jouer ${card.type} ÔåÆ ${bestColor}`);
      const result = game.playCard('UNO_BOT_AI', i, bestColor);
      if (result.success) {
        cardPlayed = true;
        console.log(`[UNO BOT] Ô£à Joue ${game.getCardDisplay(card)} (joker ÔåÆ ${bestColor})`);
        
        // ­ƒÄ┤ Notifier la couleur choisie par le bot
        const botPlayer = game.players.find(p => p.id === 'UNO_BOT_AI');
        if (botPlayer) {
          await notifyColorChoice(game, message.channel, 'UNO_BOT_AI', botPlayer.username, bestColor);
        }
        
        if (result.winner) {
          activeGames.delete(game.channelId);
          const winEmbed = createVictoryEmbed(result.winner, game.players);
          
          // Supprimer tous les messages "Ma main" ouverts
          await closeAllHandMessages(game);
          
          // Mettre ├á jour le message principal et envoyer un nouveau message visible par tous
          await message.edit({ embeds: [winEmbed], components: [], files: [] });
          await message.channel.send({ embeds: [winEmbed] });
          
          return;
        }
        break;
      } else {
        console.log(`[UNO BOT] ÔØî ├ëchec: ${result.error}`);
      }
    } else if (card.color === topCard.color || 
               card.value === topCard.value || 
               card.type === topCard.type) {
      console.log(`[UNO BOT] Tente de jouer ${game.getCardDisplay(card)}`);
      const result = game.playCard('UNO_BOT_AI', i);
      if (result.success) {
        cardPlayed = true;
        console.log(`[UNO BOT] Ô£à Joue ${game.getCardDisplay(card)}`);
        
        if (result.winner) {
          activeGames.delete(game.channelId);
          const winEmbed = createVictoryEmbed(result.winner, game.players);
          
          // Supprimer tous les messages "Ma main" ouverts
          await closeAllHandMessages(game);
          
          // Mettre ├á jour le message principal et envoyer un nouveau message visible par tous
          await message.edit({ embeds: [winEmbed], components: [], files: [] });
          await message.channel.send({ embeds: [winEmbed] });
          
          return;
        }
        break;
      } else {
        console.log(`[UNO BOT] ÔØî ├ëchec: ${result.error}`);
      }
    }
  }
  
  // Si aucune carte n'a pu ├¬tre jou├®e, piocher
  if (!cardPlayed) {
    console.log(`[UNO BOT] Aucune carte jouable, pioche...`);
    // ­ƒåò Pioche s├®par├®e pour +2 et +4
    if (game.draw2Count > 0) {
      const drawnCards = [];
      for (let idx = 0; idx < game.draw2Count; idx++) {
        const card = game.drawCard(botPlayer);
        if (card) drawnCards.push(game.getCardDisplay(card));
      }
      console.log(`[UNO BOT] Pioche p├®nalit├® +2: ${game.draw2Count} carte(s) - ${drawnCards.join(' ')}`);
      game.draw2Count = 0;
      game.drawCount = 0;
    } else if (game.draw4Count > 0) {
      const drawnCards = [];
      for (let idx = 0; idx < game.draw4Count; idx++) {
        const card = game.drawCard(botPlayer);
        if (card) drawnCards.push(game.getCardDisplay(card));
      }
      console.log(`[UNO BOT] Pioche p├®nalit├® +4: ${game.draw4Count} carte(s) - ${drawnCards.join(' ')}`);
      game.draw4Count = 0;
      game.drawCount = 0;
      game.canChallengeDraw4 = false;
    } else {
      // Pioche normale (1 carte)
      const card = game.drawCard(botPlayer);
      console.log(`[UNO BOT] Pioche: ${game.getCardDisplay(card)}`);
    }
    game.nextPlayer();
  }
  
  // Mettre ├á jour l'affichage
  const { embed: gameEmbed, attachment } = game.createGameEmbed();
  const actionButtons = game.createActionButtons();
  await message.edit({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
  
  // ­ƒöä Mettre ├á jour tous les embeds "Ma main" apr├¿s que le bot ait jou├®
  const channel = message.channel;
  await game.updateAllPlayerHands(channel);
  
  // ­ƒÄ» Notifier le joueur actuel
  await notifyCurrentPlayer(game, channel);
  
  // Ô£à LOGIQUE UNIFI├ëE: Si c'est le tour du bot, le faire jouer (avec d├®lai pour l'UX)
  if (game.isSoloMode) {
    const nextPlayer = game.getCurrentPlayer();
    console.log(`[UNO BOT] V├®rification post-action: isSoloMode=${game.isSoloMode}, nextPlayer=${nextPlayer.username}`);
    if (nextPlayer && nextPlayer.id === 'UNO_BOT_AI') {
      console.log(`[UNO BOT] ÔÅ░ Le bot doit jouer, setTimeout dans 1 seconde`);
      // D├®lai de 1 seconde pour que le joueur puisse voir la mise ├á jour
      setTimeout(async () => {
        console.log(`[UNO BOT] ÔÅ░ setTimeout d├®clench├®, appel playBotTurn()`);
        try {
          await playBotTurn(game, message);
        } catch (err) {
          console.error(`[UNO BOT] ÔØî Erreur dans playBotTurn:`, err);
        }
      }, 1000);
    } else {
      console.log(`[UNO BOT] ÔÜ¬ Pas le tour du bot apr├¿s cette action`);
    }
  } else {
    console.log(`[UNO BOT] ÔÜ¬ Pas en mode solo`);
  }
}

// Ô£¿ Fonction helper pour notifier le joueur actuel
async function notifyCurrentPlayer(game, channel) {
  const currentPlayer = game.getCurrentPlayer();
  if (!currentPlayer || currentPlayer.id === 'UNO_BOT_AI') return;
  
  try {
    // Message visible par tous dans le canal (auto-suppression apr├¿s 5 secondes)
    const notifMsg = await channel.send({ 
      content: `­ƒÄ» <@${currentPlayer.id}> **C'est votre tour !** Cliquez sur ­ƒâÅ Ma main pour jouer.`,
      allowedMentions: { users: [currentPlayer.id] }
    });
    
    // Supprimer le message apr├¿s 5 secondes pour ne pas spam le canal
    setTimeout(() => notifMsg.delete().catch(() => {}), 5000);
  } catch (err) {
    console.log(`[UNO] Erreur notification joueur:`, err.message);
  }
}

// Ô£¿ Fonction helper pour notifier le choix de couleur
async function notifyColorChoice(game, channel, playerId, playerName, color) {
  const colorEmojis = {
    red: '­ƒö┤',
    blue: '­ƒöÁ',
    green: '­ƒƒó',
    yellow: '­ƒƒí'
  };
  
  const colorNames = {
    red: 'Rouge',
    blue: 'Bleu',
    green: 'Vert',
    yellow: 'Jaune'
  };
  
  try {
    const emoji = colorEmojis[color] || 'ÔÜ¬';
    const colorName = colorNames[color] || color;
    
    // Message visible par tous (auto-suppression apr├¿s 5 secondes)
    const notifMsg = await channel.send({ 
      content: `­ƒÄ┤ **${playerName}** a choisi ${emoji} **${colorName}** !`,
      allowedMentions: { users: [] } // Pas de mention
    });
    
    // Supprimer apr├¿s 5 secondes
    setTimeout(() => notifMsg.delete().catch(() => {}), 5000);
  } catch (err) {
    console.log(`[UNO] Erreur notification couleur:`, err.message);
  }
}

// Ô£¿ Fonction helper pour supprimer tous les messages "Ma main"
async function closeAllHandMessages(game) {
  console.log(`[UNO] Fermeture de ${game.playerHandMessages.size} messages "Ma main"...`);
  for (const [playerId, handMsg] of game.playerHandMessages) {
    try {
      await handMsg.delete().catch(() => {});
      console.log(`[UNO] Message "Ma main" supprim├® pour ${playerId}`);
    } catch (err) {
      console.log(`[UNO] Erreur suppression message main:`, err.message);
    }
  }
  game.playerHandMessages.clear();
  console.log(`[UNO] Tous les messages "Ma main" ferm├®s`);
}

class UnoGame {
  constructor(channelId, creatorId) {
    this.channelId = channelId;
    this.creatorId = creatorId;
    this.players = [];
    this.deck = [];
    this.discardPile = [];
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.started = false;
    this.drawCount = 0;
    this.draw2Count = 0; // ­ƒåò Compteur sp├®cifique pour +2
    this.draw4Count = 0; // ­ƒåò Compteur sp├®cifique pour +4
    this.lastDraw4Player = null; // ­ƒåò Qui a pos├® le dernier +4 (pour le d├®fi)
    this.canChallengeDraw4 = false; // ­ƒåò Le joueur suivant peut-il d├®fier le +4 ?
    this.lastDraw4WasLegal = true; // ­ƒåò Le dernier +4 ├®tait-il l├®gal ? (enregistr├® au moment du jeu)
    this.messageId = null;
    this.collector = null;
    // Ô£¿ NOUVEAU: GameId unique pour identifier cette partie (sans underscore pour ├®viter les conflits)
    this.gameId = `${channelId}${Date.now()}`.substring(0, 20); // Max 20 chars pour customId
    // ­ƒÄ┤ Stocker les messages "Ma main" en DM pour pouvoir les ├®diter
    this.playerHandMessages = new Map(); // userId => DM message
    // ­ƒÄë Tracker les d├®clarations UNO
    this.unoDeclarations = new Map(); // userId => true/false
    // ÔÅ▒´©Å Tracker les timeouts de v├®rification UNO (d├®lai de 3 sec)
    this.unoCheckTimeouts = new Map(); // userId => timeoutId
    // ­ƒÄ« Stocker les collectors pour pouvoir les arr├¬ter proprement
    this.activeCollectors = []; // Liste de tous les collectors actifs
  }

  addPlayer(userId, username) {
    if (this.started) return false;
    if (this.players.find(p => p.id === userId)) return false;
    if (this.players.length >= 10) return false;
    
    this.players.push({
      id: userId,
      username: username,
      hand: []
    });
    return true;
  }

  removePlayer(userId) {
    const index = this.players.findIndex(p => p.id === userId);
    if (index === -1) return false;
    
    this.players.splice(index, 1);
    
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
    }
    
    return true;
  }

  createDeck() {
    this.deck = [];
    const colors = ['red', 'blue', 'green', 'yellow'];
    
    for (const color of colors) {
      this.deck.push({ type: 'number', color, value: 0 });
      for (let i = 1; i <= 9; i++) {
        this.deck.push({ type: 'number', color, value: i });
        this.deck.push({ type: 'number', color, value: i });
      }
    }
    
    for (const color of colors) {
      for (let i = 0; i < 2; i++) {
        this.deck.push({ type: 'skip', color });
        this.deck.push({ type: 'reverse', color });
        this.deck.push({ type: 'draw2', color });
      }
    }
    
    for (let i = 0; i < 4; i++) {
      this.deck.push({ type: 'wild', color: null });
      this.deck.push({ type: 'wild_draw4', color: null });
    }
    
    this.shuffle(this.deck);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  dealCards() {
    for (const player of this.players) {
      player.hand = [];
      for (let i = 0; i < 7; i++) {
        player.hand.push(this.deck.pop());
      }
    }
    
    let startCard;
    do {
      startCard = this.deck.pop();
    } while (startCard.type !== 'number');
    
    this.discardPile.push(startCard);
  }

  drawCard(player) {
    if (this.deck.length === 0) {
      const topCard = this.discardPile.pop();
      this.deck = [...this.discardPile];
      this.shuffle(this.deck);
      this.discardPile = [topCard];
    }
    
    if (this.deck.length > 0) {
      const card = this.deck.pop();
      player.hand.push(card);
      return card;
    }
    return null;
  }

  canPlayCard(card, topCard) {
    if (card.type === 'wild' || card.type === 'wild_draw4') return true;
    if (card.color === topCard.color) return true;
    
    const topColor = topCard.chosenColor || topCard.color;
    if (card.color === topColor) return true;
    
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    if (card.type === topCard.type && card.type !== 'number') return true;
    
    return false;
  }

  playCard(playerId, cardIndex, chosenColor = null) {
    const player = this.players[this.currentPlayerIndex];
    if (player.id !== playerId) return { success: false, error: "Ce n est pas votre tour !" };
    
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return { success: false, error: "Carte invalide !" };
    }
    
    const card = player.hand[cardIndex];
    const topCard = this.discardPile[this.discardPile.length - 1];
    
    // ­ƒåò NOUVELLES R├êGLES: +2 et +4 s├®par├®s
    // Si draw2Count > 0, on ne peut jouer QUE un +2
    if (this.draw2Count > 0) {
      if (card.type !== 'draw2') {
        return { success: false, error: `Vous devez piocher ${this.draw2Count} carte(s) ou jouer un +2 !` };
      }
    }
    
    // Si draw4Count > 0, on ne peut jouer QUE un +4
    if (this.draw4Count > 0) {
      if (card.type !== 'wild_draw4') {
        return { success: false, error: `Vous devez piocher ${this.draw4Count} carte(s) ou jouer un +4 !` };
      }
    }
    
    if (!this.canPlayCard(card, topCard)) {
      return { success: false, error: "Cette carte ne peut pas etre jouee !" };
    }
    
    if ((card.type === 'wild' || card.type === 'wild_draw4') && !chosenColor) {
      return { success: false, error: "Vous devez choisir une couleur !", requireColor: true };
    }
    
    player.hand.splice(cardIndex, 1);
    
    if (chosenColor) {
      card.chosenColor = chosenColor;
    }
    
    this.discardPile.push(card);
    
    if (player.hand.length === 0) {
      return { success: true, winner: player };
    }
    
    // ­ƒÄë V├®rification UNO : si le joueur a exactement 1 carte
    if (player.hand.length === 1) {
      // ÔÅ▒´©Å NOUVEAU : Annuler l'ancien timeout s'il existe
      if (this.unoCheckTimeouts.has(playerId)) {
        clearTimeout(this.unoCheckTimeouts.get(playerId));
        this.unoCheckTimeouts.delete(playerId);
      }
      
      // ÔÅ▒´©Å NOUVEAU : Donner 3 secondes au joueur pour cliquer sur UNO
      if (!this.unoDeclarations.get(playerId)) {
        console.log(`[UNO] ${player.username} a 1 carte, d├®lai de 3 sec pour dire UNO`);
        const timeoutId = setTimeout(() => {
          // V├®rifier apr├¿s 3 secondes si le joueur a dit UNO
          if (!this.unoDeclarations.get(playerId) && player.hand.length === 1) {
            console.log(`[UNO] ${player.username} a oubli├® de dire UNO ! P├®nalit├® : +2 cartes`);
            this.drawCard(player);
            this.drawCard(player);
            // Notifier que le joueur a oubli├® (pour affichage)
            player.unoForgottenFlag = true;
          }
          this.unoCheckTimeouts.delete(playerId);
        }, 3000); // 3 secondes de d├®lai
        
        this.unoCheckTimeouts.set(playerId, timeoutId);
      }
    }
    
    let skipNext = false;
    
    switch (card.type) {
      case 'skip':
        skipNext = true;
        break;
      
      case 'reverse':
        this.direction *= -1; // Toujours inverser la direction
        if (this.players.length === 2) {
          // ├Ç 2 joueurs, reverse = skip : appeler nextPlayer une fois de plus pour revenir au m├¬me joueur
          skipNext = true;
        }
        // ├Ç 3+ joueurs, juste l'inversion de direction suffit
        break;
      
      case 'draw2':
        this.draw2Count += 2; // ­ƒåò Compteur s├®par├®
        this.drawCount = this.draw2Count; // Garder drawCount pour compatibilit├®
        // ÔÜá´©Å Ne PAS skip, le joueur suivant doit piocher ou jouer +2
        break;
      
      case 'wild_draw4':
        this.draw4Count += 4; // ­ƒåò Compteur s├®par├®
        this.drawCount = this.draw4Count; // Garder drawCount pour compatibilit├®
        this.lastDraw4Player = player; // ­ƒåò Sauvegarder qui a pos├® le +4
        this.canChallengeDraw4 = true; // ­ƒåò Le joueur suivant peut d├®fier
        
        // ­ƒåò CORRECTION CRITIQUE : V├®rifier MAINTENANT si le joueur avait une autre carte jouable
        // (avant que la carte +4 soit retir├®e de sa main)
        const cardBeforeDraw4 = this.discardPile[this.discardPile.length - 1]; // La carte qui ├®tait visible avant le +4
        this.lastDraw4WasLegal = !player.hand.some(c => {
          if (c.type === 'wild' || c.type === 'wild_draw4') return false; // Jokers ne comptent pas
          return this.canPlayCard(c, cardBeforeDraw4);
        });
        console.log(`[UNO] +4 jou├® par ${player.username}, l├®gal: ${this.lastDraw4WasLegal}`);
        // ÔÜá´©Å Ne PAS skip, le joueur suivant doit piocher, d├®fier, ou jouer +4
        break;
    }
    
    this.nextPlayer(skipNext);
    
    return { success: true };
  }
  
  // ­ƒåò Syst├¿me de d├®fi pour +4
  challengeDraw4(challengerId) {
    const challenger = this.players.find(p => p.id === challengerId);
    if (!challenger) return { success: false, error: "Joueur introuvable !" };
    if (!this.canChallengeDraw4) return { success: false, error: "Aucun +4 ├á d├®fier !" };
    if (this.getCurrentPlayer().id !== challengerId) return { success: false, error: "Ce n'est pas votre tour !" };
    
    const lastPlayer = this.lastDraw4Player;
    this.canChallengeDraw4 = false; // Le d├®fi est utilis├®
    
    // ­ƒåò CORRECTION CRITIQUE : Utiliser le flag enregistr├® au moment du jeu
    // (on ne peut pas v├®rifier la main actuelle car la carte +4 a d├®j├á ├®t├® retir├®e)
    const draw4WasIllegal = !this.lastDraw4WasLegal;
    console.log(`[UNO] D├®fi: +4 ├®tait ill├®gal = ${draw4WasIllegal}`);
    
    if (draw4WasIllegal) {
      // ­ƒÄë D├®fi R├ëUSSI ! Le joueur qui a pos├® le +4 triche
      console.log(`[UNO] D├®fi r├®ussi ! ${lastPlayer.username} avait une autre carte jouable`);
      // Le tricheur pioche 4 cartes
      for (let i = 0; i < 4; i++) {
        this.drawCard(lastPlayer);
      }
      // Le challenger ne pioche rien
      this.draw4Count = 0;
      this.drawCount = 0;
      return { success: true, challengeWon: true, cheater: lastPlayer };
    } else {
      // ÔØî D├®fi ├ëCHOU├ë ! Le +4 ├®tait l├®gal
      console.log(`[UNO] D├®fi ├®chou├® ! ${lastPlayer.username} n'avait pas d'autre carte`);
      // Le challenger pioche 6 cartes (4 du +4 + 2 de p├®nalit├®)
      for (let i = 0; i < 6; i++) {
        this.drawCard(challenger);
      }
      // R├®initialiser les compteurs
      this.draw4Count = 0;
      this.drawCount = 0;
      // Passer au joueur suivant
      this.nextPlayer(false);
      return { success: true, challengeWon: false, challenger };
    }
  }

  nextPlayer(skip = false) {
    this.currentPlayerIndex += this.direction;
    
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
    } else if (this.currentPlayerIndex < 0) {
      this.currentPlayerIndex = this.players.length - 1;
    }
    
    // Si skip ET pas de p├®nalit├® en cours, on passe encore au suivant
    if (skip && this.draw2Count === 0 && this.draw4Count === 0) {
      this.nextPlayer(false);
    }
    // Si draw2Count > 0 ou draw4Count > 0, on NE passe PAS au suivant : le joueur doit piocher ou d├®fier
  }

  getCardDisplay(card) {
    return getCardVisual(card);
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  getTopCard() {
    return this.discardPile[this.discardPile.length - 1];
  }

  createGameEmbed() {
    const topCard = this.getTopCard();
    const currentPlayer = this.getCurrentPlayer();
    
    // Liste des joueurs avec ic├┤nes de statut (style UnoOnDisc)
    const playersList = this.players.map((p, i) => {
      const isCurrentPlayer = i === this.currentPlayerIndex;
      const statusIcon = isCurrentPlayer ? "­ƒƒó" : "ÔÜ¬";
      const cardIcon = "­ƒÄ┤";
      const unoIcon = this.unoDeclarations.get(p.id) && p.hand.length === 1 ? " ­ƒÄë" : "";
      return `${statusIcon} **${p.username}**${unoIcon}\n${cardIcon} ├ù${p.hand.length} ${this.getCardDisplay(topCard)}`;
    }).join("\n\n");
    
    const cardImagePath = getCardImagePath(topCard);
    const attachment = new AttachmentBuilder(cardImagePath, { name: 'current_card.png' });
    
    // Message de tour avec mention
    let tourMessage = `├Ç <@${currentPlayer.id}> de jouer !`;
    if (this.drawCount > 0) {
      tourMessage += ` ÔÇó **Pioche: ${this.drawCount}**`;
    }
    
    const embed = new EmbedBuilder()
      .setColor("#57F287") // Vert Discord
      .setDescription(playersList + "\n\n" + tourMessage)
      .setThumbnail('attachment://current_card.png')
      .setFooter({ text: `Pioche: ${this.deck.length} cartes` });
    return { embed, attachment };
  }

  // Ô£¿ NOUVEAU: Boutons avec gameId + bouton UNO
  createActionButtons() {
    const buttons = [
      new ButtonBuilder()
        .setCustomId(`uno_${this.gameId}_hand`)
        .setLabel("­ƒâÅ Ma main")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`uno_${this.gameId}_draw`)
        .setLabel("­ƒÄ┤ Piocher")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`uno_${this.gameId}_uno`)
        .setLabel("­ƒÄë UNO !")
        .setStyle(ButtonStyle.Success)
    ];
    
    // ­ƒåò Ajouter le bouton D├®fi si un +4 vient d'├¬tre pos├®
    if (this.canChallengeDraw4) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`uno_${this.gameId}_challenge`)
          .setLabel("ÔÜö´©Å D├®fier")
          .setStyle(ButtonStyle.Danger)
      );
    } else {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`uno_${this.gameId}_quit`)
          .setLabel("­ƒÜ¬ Quitter")
          .setStyle(ButtonStyle.Danger)
      );
    }
    
    const row = new ActionRowBuilder().addComponents(...buttons);
    return row;
  }

  // ­ƒöä Mettre ├á jour tous les embeds "Ma main" ouverts
  async updateAllPlayerHands(channel) {
    console.log(`[UNO] ========== updateAllPlayerHands APPEL├ë ==========`);
    console.log(`[UNO] ${this.players.length} joueurs dans la partie`);
    console.log(`[UNO] ${this.playerHandMessages.size} messages "Ma main" ouverts`);
    
    const currentPlayer = this.getCurrentPlayer();
    const topCard = this.getTopCard();
    console.log(`[UNO] ├ëtat actuel: Carte=${this.getCardDisplay(topCard)}, Tour=${currentPlayer.username}`);
    
    for (const player of this.players) {
      const handMsg = this.playerHandMessages.get(player.id);
      if (!handMsg) {
        console.log(`[UNO]   ÔÜ¬ ${player.username}: pas de main ouverte`);
        continue; // Ce joueur n'a pas ouvert sa main
      }
      
      console.log(`[UNO]   ­ƒöä ${player.username}: mise ├á jour en cours...`);
      console.log(`[UNO]      Message ID: ${handMsg.id}, Channel: ${handMsg.channel.id}`);
      
      try {
        
        // Image de la carte actuelle pour le thumbnail
        const topCardImagePath = getCardImagePath(topCard);
        const topCardAttachment = new AttachmentBuilder(topCardImagePath, { name: 'current_card.png' });
        
        // Cr├®er l'image de la main
        const handImageBuffer = await createHandImage(player.hand);
        const handAttachment = new AttachmentBuilder(handImageBuffer, { name: 'hand.png' });
        
        // Liste des joueurs avec le joueur actuel mis en ├®vidence
        const playersList = this.players.map((p, i) => {
          const isCurrentPlayer = i === this.currentPlayerIndex;
          const statusIcon = isCurrentPlayer ? "­ƒƒó" : "ÔÜ¬";
          const cardIcon = "­ƒÄ┤";
          const unoIcon = this.unoDeclarations.get(p.id) ? " ­ƒÄë" : "";
          return `${statusIcon} **${p.username}** ${cardIcon} ├ù${p.hand.length}${unoIcon}`;
        }).join("\n");
        
        // Ajouter la carte actuelle dans la description
        let description = `**­ƒÄ┤ Carte actuelle:** ${this.getCardDisplay(topCard)}\n\n`;
        description += `**­ƒæÑ Joueurs**\n${playersList}`;
        
        if (player.id === currentPlayer.id && this.drawCount > 0) {
          description += `\n\nÔÜá´©Å **P├®nalit├®: ${this.drawCount} carte(s) ├á piocher**\nJouez +2 ou +4 pour cumuler !`;
        }
        
        description += `\n\n**­ƒÄ» Tour actuel:** <@${currentPlayer.id}>`;
        
        const sensIcon = this.direction === 1 ? "­ƒö¢" : "­ƒö╝";
        const gameInfo = `${sensIcon} Sens ${this.direction === 1 ? "Ôåô" : "Ôåæ"}  ÔÇó  ­ƒôÜ ${this.deck.length} cartes  ÔÇó  ${player.hand.length} carte(s) dans votre main`;
        
        const handEmbed = new EmbedBuilder()
          .setColor(player.id === currentPlayer.id ? "#57F287" : "#99AAB5")
          .setTitle(`­ƒÄ« UNO - Main de ${player.username}`)
          .setDescription(description)
          .setThumbnail('attachment://current_card.png')
          .setImage('attachment://hand.png')
          .setFooter({ text: gameInfo });
        
        // Recr├®er les boutons de cartes (d├®sactiv├®s si pas son tour)
        const isPlayerTurn = player.id === currentPlayer.id;
        const rows = [];
        for (let idx = 0; idx < Math.min(player.hand.length, 25); idx += 5) {
          const row = new ActionRowBuilder();
          for (let j = idx; j < Math.min(idx + 5, player.hand.length); j++) {
            const card = player.hand[j];
            const emoji = this.getCardDisplay(card);
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`uno_${this.gameId}_play_${j}`)
                .setLabel(`${j + 1}`)
                .setEmoji(emoji)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!isPlayerTurn) // ÔÜá´©Å D├®sactiver si pas son tour
            );
          }
          rows.push(row);
        }
        
        // Ajouter les boutons Piocher et UNO en derni├¿re ligne
        const actionRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`uno_${this.gameId}_draw`)
              .setLabel("­ƒÄ┤ Piocher")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(!isPlayerTurn), // ÔÜá´©Å D├®sactiver si pas son tour
            new ButtonBuilder()
              .setCustomId(`uno_${this.gameId}_uno`)
              .setLabel("­ƒÄë UNO !")
              .setStyle(ButtonStyle.Success)
              // UNO peut ├¬tre dit ├á tout moment, donc toujours activ├®
          );
        rows.push(actionRow);
        
        console.log(`[UNO]      Appel handMsg.edit()...`);
        const editResult = await handMsg.edit({
          embeds: [handEmbed],
          files: [topCardAttachment, handAttachment],
          components: rows
        });
        console.log(`[UNO]   Ô£à ${player.username}: mise ├á jour r├®ussie !`);
        console.log(`[UNO]      Message ├®dit├® ID: ${editResult.id}`);
      } catch (err) {
        console.error(`[UNO]   ÔØî ${player.username}: ERREUR lors de l'├®dition !`);
        console.error(`[UNO]      Code erreur: ${err.code}`);
        console.error(`[UNO]      Message: ${err.message}`);
        console.error(`[UNO]      Stack:`, err.stack);
        // Si le message n'existe plus, le retirer
        if (err.code === 10008 || err.code === 50007) {
          console.log(`[UNO]      Message supprim├® ou inaccessible, retrait de la map`);
          this.playerHandMessages.delete(player.id);
        }
      }
    }
    console.log(`[UNO] ========== updateAllPlayerHands TERMIN├ë ==========`);
  }
}

module.exports = {
  name: "uno",
  data: new SlashCommandBuilder()
    .setName("uno")
    .setDescription("Jouer au UNO avec de vraies cartes !"),

  async execute(interaction) {
    const channelId = interaction.channelId;
    
    if (activeGames.has(channelId)) {
      return interaction.reply({ content: "ÔØî Une partie est deja en cours !", ephemeral: true });
    }
    
    const game = new UnoGame(channelId, interaction.user.id);
    game.addPlayer(interaction.user.id, interaction.user.username);
    activeGames.set(channelId, game);
    
    const lobbyEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("­ƒÄ« Nouvelle Partie UNO")
      .setDescription(`${interaction.user.username} a cree une partie !\n\n**Cliquez sur "Rejoindre"**\n*Minimum 2 joueurs*`)
      .addFields({ name: "­ƒæÑ Joueurs (1/10)", value: `1´©ÅÔâú ${interaction.user.username}` })
      .setFooter({ text: "Le createur peut demarrer la partie" });
    
    // Ô£¿ NOUVEAU: Boutons avec gameId
    const lobbyButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`uno_${game.gameId}_join`).setLabel("Ô£à Rejoindre").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`uno_${game.gameId}_solo`).setLabel("­ƒñû Solo vs Robot").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`uno_${game.gameId}_start`).setLabel("­ƒÜÇ Demarrer").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`uno_${game.gameId}_cancel`).setLabel("ÔØî Annuler").setStyle(ButtonStyle.Danger)
      );
    
    const message = await interaction.reply({ embeds: [lobbyEmbed], components: [lobbyButtons], fetchReply: true });
    game.messageId = message.id;
    
    // Ô£¿ NOUVEAU: Channel Collector avec filtre par gameId
    const channel = interaction.channel;
    const collector = channel.createMessageComponentCollector({
      filter: i => i.customId.startsWith(`uno_${game.gameId}_`),
      time: 0 // Pas de timeout (arr├¬t manuel uniquement)
    });
    game.collector = collector;
    
    collector.on("collect", async i => {
      // Extraire l'action en retirant le pr├®fixe
      const action = i.customId.replace(`uno_${game.gameId}_`, '');
      
      if (action === "join") {
        const success = game.addPlayer(i.user.id, i.user.username);
        if (!success) {
          if (game.started) return i.reply({ content: "ÔØî Partie commencee !", ephemeral: true });
          if (game.players.find(p => p.id === i.user.id)) return i.reply({ content: "ÔØî Deja dans la partie !", ephemeral: true });
          return i.reply({ content: "ÔØî Partie pleine !", ephemeral: true });
        }
        const numbers = ["1´©ÅÔâú","2´©ÅÔâú","3´©ÅÔâú","4´©ÅÔâú","5´©ÅÔâú","6´©ÅÔâú","7´©ÅÔâú","8´©ÅÔâú","9´©ÅÔâú","­ƒöƒ"];
        const playerList = game.players.map((p, idx) => `${numbers[idx]} ${p.username}`).join("\n");
        lobbyEmbed.spliceFields(0, 1, { name: `­ƒæÑ Joueurs (${game.players.length}/10)`, value: playerList });
        await i.update({ embeds: [lobbyEmbed], components: [lobbyButtons] });
      } else if (action === "solo") {
        // Ô£à DEFER IMMEDIAT pour eviter timeout Discord
        if (!i.deferred && !i.replied) {
          await i.deferUpdate().catch(() => {});
        }

        // Mode Solo vs Robot
        game.addPlayer('UNO_BOT_AI', '­ƒñû Robot UNO');
        game.isSoloMode = true; // Marquer comme mode solo
        
        // D├®marrer automatiquement avec 2 joueurs (user + bot)
        game.started = true;
        game.createDeck();
        game.dealCards();
        const { embed: gameEmbed, attachment } = game.createGameEmbed();
        const actionButtons = game.createActionButtons();
        await i.editReply({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
        
        collector.stop();
        
        // Lancer le gameCollector pour le mode solo
        setupGameCollectorForSolo(channel, message, game, channelId);
      } else if (action === "start") {
        if (game.creatorId !== i.user.id) return i.reply({ content: "ÔØî Seul le createur peut demarrer !", ephemeral: true });
        if (game.players.length < 2) return i.reply({ content: "ÔØî Minimum 2 joueurs !", ephemeral: true });
        
        // Ô£à DEFER IMMEDIAT pour eviter timeout Discord
        if (!i.deferred && !i.replied) {
          await i.deferUpdate().catch(() => {});
        }
        
        game.started = true;
        game.createDeck();
        game.dealCards();
        const { embed: gameEmbed, attachment } = game.createGameEmbed();
        const actionButtons = game.createActionButtons();
        await i.editReply({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
        setupGameCollector(channel, message, game, channelId);
      } else if (action === "cancel") {
        if (game.creatorId !== i.user.id) return i.reply({ content: "ÔØî Seul le createur peut annuler !", ephemeral: true });
        await closeAllHandMessages(game);
        activeGames.delete(channelId);
        collector.stop();
        await i.update({ content: "­ƒøæ Partie annulee.", embeds: [], components: [] });
      }
    });
    
    collector.on("end", async () => {
      if (activeGames.has(channelId) && !activeGames.get(channelId).started) {
        const game = activeGames.get(channelId);
        if (game) await closeAllHandMessages(game);
        activeGames.delete(channelId);
      }
    });
  }
};


// Setup pour mode Solo vs Robot
function setupGameCollectorForSolo(channel, message, game, channelId) {
  // D'abord setup le collector normal
  setupGameCollector(channel, message, game, channelId);
  
  // Si c'est le tour du bot au d├®marrage, le faire jouer
  setTimeout(async () => {
    console.log(`[UNO BOT] V├®rification au d├®marrage: currentPlayerIndex=${game.currentPlayerIndex}`);
    console.log(`[UNO BOT] Joueurs: ${game.players.map((p, i) => `${i}:${p.username}`).join(', ')}`);
    
    const currentPlayer = game.getCurrentPlayer();
    console.log(`[UNO BOT] Tour de d├®marrage: ${currentPlayer.username} (${currentPlayer.id})`);
    
    if (currentPlayer && currentPlayer.id === 'UNO_BOT_AI') {
      console.log(`[UNO BOT] ÔÜá´©Å Le bot commence la partie, il joue`);
      await playBotTurn(game, message);
    } else {
      console.log(`[UNO BOT] Ô£à Le joueur humain commence la partie`);
    }
  }, 1000);
}

function setupGameCollector(channel, message, game, channelId) {
  // Ô£¿ NOUVEAU: Channel Collector avec filtre par gameId
  const gameCollector = channel.createMessageComponentCollector({
    filter: i => i.customId.startsWith(`uno_${game.gameId}_`),
    time: 0 // Pas de timeout pour parties longues
  });
  
  gameCollector.on("collect", async i => {
    const player = game.players.find(p => p.id === i.user.id);
    if (!player) return i.reply({ content: "ÔØî Pas dans la partie !", ephemeral: true });
    
    // Extraire l'action en retirant le pr├®fixe
    const action = i.customId.replace(`uno_${game.gameId}_`, '');
    
    if (action === "hand") {
      // Cr├®er l'image composite de la main
      const handImageBuffer = await createHandImage(player.hand);
      const handAttachment = new AttachmentBuilder(handImageBuffer, { name: 'hand.png' });
      
      // R├®cup├®rer les infos du jeu
      const currentPlayer = game.getCurrentPlayer();
      const topCard = game.getTopCard();
      
      // Image de la carte actuelle pour le thumbnail
      const topCardImagePath = getCardImagePath(topCard);
      const topCardAttachment = new AttachmentBuilder(topCardImagePath, { name: 'current_card.png' });
      
      // Liste des joueurs avec le joueur actuel mis en ├®vidence
      const playersList = game.players.map((p, idx) => {
        const isCurrentPlayer = idx === game.currentPlayerIndex;
        const statusIcon = isCurrentPlayer ? "­ƒƒó" : "ÔÜ¬";
        const cardIcon = "­ƒÄ┤";
        const unoIcon = game.unoDeclarations.get(p.id) ? " ­ƒÄë" : "";
        return `${statusIcon} **${p.username}** ${cardIcon} ├ù${p.hand.length}${unoIcon}`;
      }).join("\n");
      
      // Ajouter la carte actuelle dans la description
      let description = `**­ƒÄ┤ Carte actuelle:** ${game.getCardDisplay(topCard)}\n\n`;
      description += `**­ƒæÑ Joueurs**\n${playersList}`;
      
      if (player.id === currentPlayer.id && game.drawCount > 0) {
        description += `\n\nÔÜá´©Å **P├®nalit├®: ${game.drawCount} carte(s) ├á piocher**\nJouez +2 ou +4 pour cumuler !`;
      }
      
      description += `\n\n**­ƒÄ» Tour actuel:** <@${currentPlayer.id}>`;
      
      // Infos du jeu
      const sensIcon = game.direction === 1 ? "­ƒö¢" : "­ƒö╝";
      const gameInfo = `${sensIcon} Sens ${game.direction === 1 ? "Ôåô" : "Ôåæ"}  ÔÇó  ­ƒôÜ ${game.deck.length} cartes  ÔÇó  ${player.hand.length} carte(s) dans votre main`;
      
      const handEmbed = new EmbedBuilder()
        .setColor(player.id === currentPlayer.id ? "#57F287" : "#99AAB5")
        .setTitle(`­ƒÄ« UNO - Main de ${player.username}`)
        .setDescription(description)
        .setThumbnail('attachment://current_card.png')
        .setImage('attachment://hand.png')
        .setFooter({ text: gameInfo });
      
      // Ô£¿ Boutons de cartes (d├®sactiv├®s si pas son tour)
      const isPlayerTurn = player.id === currentPlayer.id;
      const rows = [];
      for (let idx = 0; idx < Math.min(player.hand.length, 25); idx += 5) {
        const row = new ActionRowBuilder();
        for (let j = idx; j < Math.min(idx + 5, player.hand.length); j++) {
          const card = player.hand[j];
          const emoji = game.getCardDisplay(card);
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`uno_${game.gameId}_play_${j}`)
              .setLabel(`${j + 1}`)
              .setEmoji(emoji)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(!isPlayerTurn) // ÔÜá´©Å D├®sactiver si pas son tour
          );
        }
        rows.push(row);
      }
      
      // Ajouter les boutons Piocher et UNO en derni├¿re ligne
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`uno_${game.gameId}_draw`)
            .setLabel("­ƒÄ┤ Piocher")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!isPlayerTurn), // ÔÜá´©Å D├®sactiver si pas son tour
          new ButtonBuilder()
            .setCustomId(`uno_${game.gameId}_uno`)
            .setLabel("­ƒÄë UNO !")
            .setStyle(ButtonStyle.Success)
            // UNO peut ├¬tre dit ├á tout moment, donc toujours activ├®
        );
      rows.push(actionRow);
      
      // Envoyer dans le canal (message direct, pas une reply, pour ├¬tre ├®ditable)
      console.log(`[UNO] Envoi message main pour ${player.username} dans le canal...`);
      const handMsg = await channel.send({ 
        content: `­ƒôï **Main de <@${player.id}>**`,
        embeds: [handEmbed], 
        files: [topCardAttachment, handAttachment], 
        components: rows
      });
      
      // ­ƒÄ┤ Stocker le message pour pouvoir l'├®diter
      game.playerHandMessages.set(player.id, handMsg);
      
      console.log(`[UNO] Ô£à Message main envoy├® pour ${player.username}`);
      
      // R├®pondre ├á l'interaction pour ├®viter "├ëchec de l'interaction"
      await i.reply({ content: `Ô£à Votre main a ├®t├® affich├®e !`, ephemeral: true });
      
      // Ô£¿ NOUVEAU: Channel Collector avec filtre par gameId
      const handCollector = channel.createMessageComponentCollector({
        filter: hi => hi.customId.startsWith(`uno_${game.gameId}_`) && hi.user.id === player.id,
        time: 0 // Pas de timeout pour parties longues
      });
      
      // Stocker le collector pour pouvoir l'arr├¬ter plus tard
      game.activeCollectors.push(handCollector);
      
      handCollector.on("collect", async handInteraction => {
        // G├®rer les boutons Piocher et UNO depuis l'embed "Ma main"
        if (handInteraction.customId === `uno_${game.gameId}_draw`) {
          // ÔÜí DEFER IMM├ëDIAT pour ├®viter timeout lors de la pioche
          try {
            if (!handInteraction.deferred && !handInteraction.replied) {
              await handInteraction.deferReply({ ephemeral: true });
            }
          } catch (err) {
            console.error(`[UNO DRAW HAND] Defer ├®chou├®:`, err.message);
            return; // Interaction expir├®e, ignorer
          }
          
          const currentPlayer = game.getCurrentPlayer();
          console.log(`[UNO DRAW HAND] Tentative de pioche par ${handInteraction.user.username} (${handInteraction.user.id})`);
          console.log(`[UNO DRAW HAND] currentPlayerIndex=${game.currentPlayerIndex}, currentPlayer=${currentPlayer.username} (${currentPlayer.id})`);
          console.log(`[UNO DRAW HAND] draw2Count=${game.draw2Count}, draw4Count=${game.draw4Count}`);
          
          if (currentPlayer.id !== handInteraction.user.id) {
            console.log(`[UNO DRAW HAND] ÔØî ERREUR: Ce n'est pas le tour de ${handInteraction.user.username}`);
            return handInteraction.editReply({ 
              content: `ÔØî **Pas votre tour !**\n\n­ƒÄ» C'est au tour de **${currentPlayer.username}**\nÔÅ│ Veuillez patienter...` 
            }).catch(() => {});
          }
          
          // ­ƒåò Pioche s├®par├®e pour +2 et +4
          if (game.draw2Count > 0) {
            const drawnCards = [];
            for (let idx = 0; idx < game.draw2Count; idx++) {
              const card = game.drawCard(player);
              if (card) drawnCards.push(game.getCardDisplay(card));
            }
            const cardsList = drawnCards.join(' ');
            game.draw2Count = 0;
            game.drawCount = 0;
            game.nextPlayer();
            await handInteraction.editReply({ content: `Ô£à Pioche de p├®nalit├® +2: ${drawnCards.length} carte(s) pioch├®es\n${cardsList}\n\nVous avez ${player.hand.length} cartes` }).catch(() => {});
          } else if (game.draw4Count > 0) {
            const drawnCards = [];
            for (let idx = 0; idx < game.draw4Count; idx++) {
              const card = game.drawCard(player);
              if (card) drawnCards.push(game.getCardDisplay(card));
            }
            const cardsList = drawnCards.join(' ');
            game.draw4Count = 0;
            game.drawCount = 0;
            game.canChallengeDraw4 = false;
            game.nextPlayer();
            console.log(`[UNO DRAW HAND] Ô£à Pioche +4 termin├®e, currentPlayerIndex=${game.currentPlayerIndex}`);
            await handInteraction.editReply({ content: `Ô£à Pioche de p├®nalit├® +4: ${drawnCards.length} carte(s) pioch├®es\n${cardsList}\n\nVous avez ${player.hand.length} cartes` }).catch(() => {});
          } else {
            // Pioche normale (1 carte)
            const card = game.drawCard(player);
            game.nextPlayer();
            await handInteraction.editReply({ content: `Ô£à Pioche: ${game.getCardDisplay(card)}\n\nVous avez ${player.hand.length} cartes` }).catch(() => {});
          }
          
          const { embed: gameEmbed, attachment } = game.createGameEmbed();
          const actionButtons = game.createActionButtons();
          await message.edit({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
          
          // ­ƒöä Mettre ├á jour tous les embeds "Ma main" ouverts
          await game.updateAllPlayerHands(channel);
          
          // ­ƒÄ» Notifier le joueur actuel
          await notifyCurrentPlayer(game, channel);
          
          // Ô£à CORRECTION CRITIQUE: V├®rifier si c'est le tour du bot en mode solo apr├¿s pioche
          if (game.isSoloMode) {
            const nextPlayer = game.getCurrentPlayer();
            console.log(`[UNO DRAW MAIN] Apr├¿s pioche: isSoloMode=${game.isSoloMode}, nextPlayer=${nextPlayer.username}`);
            if (nextPlayer && nextPlayer.id === 'UNO_BOT_AI') {
              console.log(`[UNO DRAW MAIN] ÔÅ░ Le bot doit jouer, setTimeout dans 1 seconde`);
              setTimeout(async () => {
                console.log(`[UNO DRAW MAIN] ÔÅ░ setTimeout d├®clench├®, appel playBotTurn()`);
                try {
                  await playBotTurn(game, message);
                } catch (err) {
                  console.error(`[UNO DRAW MAIN] ÔØî Erreur dans playBotTurn:`, err);
                }
              }, 1000);
            } else {
              console.log(`[UNO DRAW MAIN] ÔÜ¬ Pas le tour du bot apr├¿s pioche`);
            }
          }
          
          return;
        }
        
        if (handInteraction.customId === `uno_${game.gameId}_uno`) {
          // ÔÜí DEFER IMM├ëDIAT pour le bouton UNO
          try {
            if (!handInteraction.deferred && !handInteraction.replied) {
              await handInteraction.deferReply({ ephemeral: true });
            }
          } catch (err) {
            console.error(`[UNO UNO HAND] Defer ├®chou├®:`, err.message);
            return; // Interaction expir├®e, ignorer
          }
          
          // Dire UNO !
          if (player.hand.length === 1) {
            game.unoDeclarations.set(player.id, true);
            await handInteraction.editReply({ content: "­ƒÄë **UNO !** Vous avez d├®clar├® UNO avec 1 carte !" }).catch(() => {});
            
            // Mettre ├á jour l'embed principal pour afficher l'ic├┤ne UNO
            const { embed: gameEmbed, attachment } = game.createGameEmbed();
            const actionButtons = game.createActionButtons();
            await message.edit({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
            
            // ­ƒöä Mettre ├á jour tous les embeds "Ma main" ouverts
            await game.updateAllPlayerHands(channel);
            
            // ­ƒÄ» Notifier le joueur actuel (pas besoin ici, c'est juste dire UNO)
          } else {
            await handInteraction.editReply({ content: "ÔØî Vous ne pouvez dire UNO qu'avec exactement 1 carte !" }).catch(() => {});
          }
          return;
        }
        
        // Defer IMM├ëDIATEMENT pour ├®viter timeout (3 sec Discord)
        // V├®rifier que l'interaction n'a pas d├®j├á expir├®
        try {
          if (!handInteraction.deferred && !handInteraction.replied) {
            await handInteraction.deferReply({ ephemeral: true }).catch(err => {
              console.error('[UNO] Defer ├®chou├®:', err.message);
              throw err; // Relancer pour stopper le traitement
            });
          }
        } catch (err) {
          // Si le defer ├®choue (interaction expir├®e), ne pas continuer
          console.log(`[UNO] Interaction expir├®e, ignore l'action`);
          return;
        }
        
        if (handInteraction.customId.startsWith(`uno_${game.gameId}_play_`)) {
          const cardIndex = parseInt(handInteraction.customId.replace(`uno_${game.gameId}_play_`, ''));
          const currentPlayer = game.getCurrentPlayer();
          
          console.log(`[UNO PLAY] Tentative de jeu de carte par ${handInteraction.user.username} (${handInteraction.user.id})`);
          console.log(`[UNO PLAY] currentPlayerIndex=${game.currentPlayerIndex}, currentPlayer=${currentPlayer.username} (${currentPlayer.id})`);
          console.log(`[UNO PLAY] draw2Count=${game.draw2Count}, draw4Count=${game.draw4Count}`);
          
          if (currentPlayer.id !== handInteraction.user.id) {
            console.log(`[UNO PLAY] ÔØî ERREUR: Ce n'est pas le tour de ${handInteraction.user.username}`);
            return handInteraction.editReply({ 
              content: `ÔØî **Pas votre tour !**\n\n­ƒÄ» C'est au tour de **${currentPlayer.username}**\nÔÅ│ Veuillez patienter...` 
            }).catch(() => {});
          }
          
          const card = player.hand[cardIndex];
          if (!card) {
            console.log(`[UNO PLAY] ÔØî Carte invalide ├á l'index ${cardIndex}`);
            return handInteraction.editReply({ content: "ÔØî Carte invalide !" }).catch(() => {});
          }
          
          if (card && (card.type === "wild" || card.type === "wild_draw4")) {
            // Ô£¿ NOUVEAU: Boutons couleur avec gameId
            const colorRow = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder().setCustomId(`uno_${game.gameId}_color_${cardIndex}_red`).setLabel("­ƒö┤ Rouge").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`uno_${game.gameId}_color_${cardIndex}_blue`).setLabel("­ƒöÁ Bleu").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`uno_${game.gameId}_color_${cardIndex}_green`).setLabel("­ƒƒó Vert").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`uno_${game.gameId}_color_${cardIndex}_yellow`).setLabel("­ƒƒí Jaune").setStyle(ButtonStyle.Secondary)
              );
            await handInteraction.editReply({ content: `Joker ${game.getCardDisplay(card)}. Choisissez une couleur:`, components: [colorRow] });
            
            // Ô£¿ NOUVEAU: Channel Collector pour couleur avec filtre par gameId
            const colorCollector = channel.createMessageComponentCollector({
              filter: ci => ci.customId.startsWith(`uno_${game.gameId}_color_`) && ci.user.id === player.id,
              time: 120000 // 2 minutes suffisant pour choix de couleur
            });
            
            // Stocker le collector pour pouvoir l'arr├¬ter plus tard
            game.activeCollectors.push(colorCollector);
            
            colorCollector.on("collect", async colorInteraction => {
              if (colorInteraction.customId.startsWith(`uno_${game.gameId}_color_`)) {
                // ÔÜí DEFER IMM├ëDIAT pour le choix de couleur
                try {
                  if (!colorInteraction.deferred && !colorInteraction.replied) {
                    await colorInteraction.deferReply({ ephemeral: true });
                  }
                } catch (err) {
                  console.error(`[UNO COLOR] Defer ├®chou├®:`, err.message);
                  colorCollector.stop();
                  return;
                }
                
                // ÔÜá´©Å V├ëRIFICATION CRITIQUE : S'assurer que c'est toujours le tour du joueur
                const currentPlayer = game.getCurrentPlayer();
                if (currentPlayer.id !== colorInteraction.user.id) {
                  console.log(`[UNO COLOR] ÔØî ERREUR: Ce n'est plus le tour de ${colorInteraction.user.username}`);
                  colorCollector.stop();
                  return colorInteraction.editReply({ content: "ÔØî Ce n'est plus votre tour !" }).catch(() => {});
                }
                
                const parts = colorInteraction.customId.replace(`uno_${game.gameId}_color_`, '').split('_');
                const cardIdx = parseInt(parts[0]);
                const color = parts[1];
                
                console.log(`[UNO COLOR] ${colorInteraction.user.username} choisit ${color} pour carte index ${cardIdx}`);
                
                const result = game.playCard(colorInteraction.user.id, cardIdx, color);
                if (!result.success) {
                  console.log(`[UNO COLOR] ÔØî Erreur playCard: ${result.error}`);
                  colorCollector.stop();
                  return colorInteraction.editReply({ content: `ÔØî ${result.error}` }).catch(() => {});
                }
                
                // Arr├¬ter le collecteur de couleurs apr├¿s utilisation
                colorCollector.stop();
                
                // R├®initialiser la d├®claration UNO apr├¿s avoir jou├®
                game.unoDeclarations.set(player.id, false);
                
                // ÔÜí R├ëPONSE IMM├ëDIATE ├á l'interaction pour ├®viter "r├®fl├®chit" bloqu├®
                if (result.winner) {
                  await colorInteraction.editReply({ content: "­ƒÄë Victoire ! F├®licitations !", components: [] }).catch(() => {});
                } else if (player.hand.length === 1) {
                  await colorInteraction.editReply({ content: 'Ô£à Joker jou├® ! ­ƒÄ┤ Il vous reste 1 carte\n\nÔÅ▒´©Å Vous avez 3 secondes pour cliquer sur **UNO!**', components: [] }).catch(() => {});
                } else {
                  await colorInteraction.editReply({ content: 'Ô£à Joker jou├® !', components: [] }).catch(() => {});
                }
                
                // ­ƒÄ┤ Notifier la couleur choisie ├á tous les joueurs
                await notifyColorChoice(game, channel, colorInteraction.user.id, colorInteraction.user.username, color);
                
                if (result.winner) {
                  activeGames.delete(channelId);
                  // Arr├¬ter TOUS les collectors actifs
                  game.activeCollectors.forEach(c => c.stop());
                  gameCollector.stop();
                  const winEmbed = createVictoryEmbed(result.winner, game.players);
                  
                  // Supprimer tous les messages "Ma main" ouverts
                  await closeAllHandMessages(game);
                  
                  // Mettre ├á jour le message principal et envoyer un nouveau message visible par tous
                  await message.edit({ embeds: [winEmbed], components: [], files: [] });
                  await channel.send({ embeds: [winEmbed] });
                  
                  return;
                }
                
                // Mettre ├á jour l'embed principal
                const { embed: gameEmbed, attachment } = game.createGameEmbed();
                const actionButtons = game.createActionButtons();
                await message.edit({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
                
                // ­ƒöä Mettre ├á jour tous les embeds "Ma main" ouverts (y compris celui du joueur actuel)
                await game.updateAllPlayerHands(channel);
                
                // ­ƒÄ» Notifier le joueur actuel
                await notifyCurrentPlayer(game, channel);
                
                // Ô£à CORRECTION CRITIQUE: V├®rifier si c'est le tour du bot en mode solo
                if (game.isSoloMode) {
                  const nextPlayer = game.getCurrentPlayer();
                  console.log(`[UNO COLOR] Apr├¿s choix de couleur: isSoloMode=${game.isSoloMode}, nextPlayer=${nextPlayer.username}`);
                  if (nextPlayer && nextPlayer.id === 'UNO_BOT_AI') {
                    console.log(`[UNO COLOR] ÔÅ░ Le bot doit jouer, setTimeout dans 1 seconde`);
                    setTimeout(async () => {
                      console.log(`[UNO COLOR] ÔÅ░ setTimeout d├®clench├®, appel playBotTurn()`);
                      try {
                        await playBotTurn(game, message);
                      } catch (err) {
                        console.error(`[UNO COLOR] ÔØî Erreur dans playBotTurn:`, err);
                      }
                    }, 1000);
                  } else {
                    console.log(`[UNO COLOR] ÔÜ¬ Pas le tour du bot apr├¿s choix de couleur`);
                  }
                }
              }
            });
            
            return;
          }
          
          console.log(`[UNO PLAY] Appel playCard() pour carte index ${cardIndex}`);
          const result = game.playCard(handInteraction.user.id, cardIndex);
          console.log(`[UNO PLAY] R├®sultat playCard(): success=${result.success}, error=${result.error || 'none'}`);
          console.log(`[UNO PLAY] Apr├¿s playCard: currentPlayerIndex=${game.currentPlayerIndex}`);
          
          if (!result.success) {
            console.log(`[UNO PLAY] ÔØî Carte non jouable: ${result.error}`);
            return handInteraction.editReply({ content: `ÔØî ${result.error}` });
          }
          
          // R├®initialiser la d├®claration UNO apr├¿s avoir jou├®
          game.unoDeclarations.set(player.id, false);
          
          if (result.winner) {
            activeGames.delete(channelId);
            // Arr├¬ter TOUS les collectors actifs
            game.activeCollectors.forEach(c => c.stop());
            gameCollector.stop();
            const winEmbed = createVictoryEmbed(result.winner, game.players);
            
            // Supprimer tous les messages "Ma main" ouverts
            await closeAllHandMessages(game);
            
            // Envoyer confirmation ├®ph├®m├¿re
            await handInteraction.editReply({ content: "­ƒÄë Victoire ! F├®licitations !" });
            
            // Mettre ├á jour le message principal et envoyer un nouveau message visible par tous
            await message.edit({ embeds: [winEmbed], components: [], files: [] });
            await channel.send({ embeds: [winEmbed] });
            
            return;
          }
          
          // ÔÅ▒´©Å Message de confirmation (la p├®nalit├® UNO sera appliqu├®e apr├¿s 3 sec si non d├®clar├®)
          if (player.hand.length === 1) {
            await handInteraction.editReply({ content: 'Ô£à Carte jou├®e ! ­ƒÄ┤ Il vous reste 1 carte\n\nÔÅ▒´©Å Vous avez 3 secondes pour cliquer sur **UNO!**' });
          } else {
            await handInteraction.editReply({ content: 'Ô£à Carte jou├®e !' });
          }
          
          // Mettre ├á jour l'embed principal
          const { embed: gameEmbed, attachment } = game.createGameEmbed();
          const actionButtons = game.createActionButtons();
          await message.edit({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
          
          // ­ƒöä Mettre ├á jour tous les embeds "Ma main" ouverts
          await game.updateAllPlayerHands(channel);
          
          // ­ƒÄ» Notifier le joueur actuel
          await notifyCurrentPlayer(game, channel);
          
          // Ô£à CORRECTION CRITIQUE: V├®rifier si c'est le tour du bot en mode solo
          if (game.isSoloMode) {
            const nextPlayer = game.getCurrentPlayer();
            console.log(`[UNO PLAY CARD] Apr├¿s jeu de carte: isSoloMode=${game.isSoloMode}, nextPlayer=${nextPlayer.username}`);
            if (nextPlayer && nextPlayer.id === 'UNO_BOT_AI') {
              console.log(`[UNO PLAY CARD] ÔÅ░ Le bot doit jouer, setTimeout dans 1 seconde`);
              setTimeout(async () => {
                console.log(`[UNO PLAY CARD] ÔÅ░ setTimeout d├®clench├®, appel playBotTurn()`);
                try {
                  await playBotTurn(game, message);
                } catch (err) {
                  console.error(`[UNO PLAY CARD] ÔØî Erreur dans playBotTurn:`, err);
                }
              }, 1000);
            } else {
              console.log(`[UNO PLAY CARD] ÔÜ¬ Pas le tour du bot apr├¿s jeu de carte`);
            }
          }
          
          // User peut recliquer sur "Ma main" pour voir sa main mise ├á jour
        }
      });
      
    } else if (action === "draw") {
      // ÔÜí DEFER IMM├ëDIAT pour ├®viter timeout
      try {
        if (!i.deferred && !i.replied) {
          await i.deferReply({ ephemeral: true });
        }
      } catch (err) {
        console.error(`[UNO DRAW GAME] Defer ├®chou├®:`, err.message);
        return; // Interaction expir├®e, ignorer
      }
      
      const currentPlayer = game.getCurrentPlayer();
      if (currentPlayer.id !== i.user.id) {
        return i.editReply({ 
          content: `ÔØî **Pas votre tour !**\n\n­ƒÄ» C'est au tour de **${currentPlayer.username}**\nÔÅ│ Veuillez patienter...` 
        }).catch(() => {});
      }
      
      // ­ƒåò Pioche s├®par├®e pour +2 et +4
      if (game.draw2Count > 0) {
        // Pioche de p├®nalit├® +2
        const drawnCards = [];
        for (let idx = 0; idx < game.draw2Count; idx++) {
          const card = game.drawCard(player);
          if (card) drawnCards.push(game.getCardDisplay(card));
        }
        const cardsList = drawnCards.join(' ');
        game.draw2Count = 0;
        game.drawCount = 0;
        game.nextPlayer();
        await i.editReply({ content: `Ô£à Pioche de penalite +2: ${drawnCards.length} carte(s) piochees\n${cardsList}\n\nVous avez ${player.hand.length} cartes` }).catch(() => {});
      } else if (game.draw4Count > 0) {
        // Pioche de p├®nalit├® +4
        const drawnCards = [];
        for (let idx = 0; idx < game.draw4Count; idx++) {
          const card = game.drawCard(player);
          if (card) drawnCards.push(game.getCardDisplay(card));
        }
        const cardsList = drawnCards.join(' ');
        game.draw4Count = 0;
        game.drawCount = 0;
        game.canChallengeDraw4 = false; // Plus possible de d├®fier apr├¿s avoir pioch├®
        game.nextPlayer();
        await i.editReply({ content: `Ô£à Pioche de penalite +4: ${drawnCards.length} carte(s) piochees\n${cardsList}\n\nVous avez ${player.hand.length} cartes` }).catch(() => {});
      } else {
        // Pioche normale (1 carte)
        const card = game.drawCard(player);
        game.nextPlayer();
        await i.editReply({ content: `Ô£à Pioche: ${game.getCardDisplay(card)}\n\nVous avez ${player.hand.length} cartes` }).catch(() => {});
      }
      
      const { embed: gameEmbed, attachment } = game.createGameEmbed();
      const actionButtons = game.createActionButtons();
      await message.edit({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
      
      // ­ƒöä Mettre ├á jour tous les embeds "Ma main" ouverts
      await game.updateAllPlayerHands(channel);
      
      // ­ƒÄ» Notifier le joueur actuel
      await notifyCurrentPlayer(game, channel);
      
      // Ô£à CORRECTION CRITIQUE: V├®rifier si c'est le tour du bot en mode solo apr├¿s pioche
      if (game.isSoloMode) {
        const nextPlayer = game.getCurrentPlayer();
        console.log(`[UNO DRAW GAME] Apr├¿s pioche: isSoloMode=${game.isSoloMode}, nextPlayer=${nextPlayer.username}`);
        if (nextPlayer && nextPlayer.id === 'UNO_BOT_AI') {
          console.log(`[UNO DRAW GAME] ÔÅ░ Le bot doit jouer, setTimeout dans 1 seconde`);
          setTimeout(async () => {
            console.log(`[UNO DRAW GAME] ÔÅ░ setTimeout d├®clench├®, appel playBotTurn()`);
            try {
              await playBotTurn(game, message);
            } catch (err) {
              console.error(`[UNO DRAW GAME] ÔØî Erreur dans playBotTurn:`, err);
            }
          }, 1000);
        } else {
          console.log(`[UNO DRAW GAME] ÔÜ¬ Pas le tour du bot apr├¿s pioche`);
        }
      }
      
      } else if (action === "uno") {
      // ÔÜí DEFER IMM├ëDIAT pour ├®viter timeout
      try {
        if (!i.deferred && !i.replied) {
          await i.deferReply({ ephemeral: true });
        }
      } catch (err) {
        console.error(`[UNO UNO GAME] Defer ├®chou├®:`, err.message);
        return; // Interaction expir├®e, ignorer
      }
      
      // Dire UNO !
      if (player.hand.length === 1) {
        game.unoDeclarations.set(player.id, true);
        await i.editReply({ content: "­ƒÄë **UNO !** Vous avez d├®clar├® UNO avec 1 carte !" }).catch(() => {});
        
        // Mettre ├á jour l'embed principal pour afficher l'ic├┤ne UNO
        const { embed: gameEmbed, attachment } = game.createGameEmbed();
        const actionButtons = game.createActionButtons();
        await message.edit({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
        
        // ­ƒöä Mettre ├á jour tous les embeds "Ma main" ouverts
        await game.updateAllPlayerHands(channel);
        
        // ­ƒÄ» Notifier le joueur actuel (pas n├®cessaire ici, dire UNO ne change pas le tour)
      } else {
        await i.editReply({ content: "ÔØî Vous ne pouvez dire UNO qu'avec exactement 1 carte !" }).catch(() => {});
      }
      
    } else if (action === "challenge") {
      // ÔÜí DEFER IMM├ëDIAT pour ├®viter timeout
      try {
        if (!i.deferred && !i.replied) {
          await i.deferReply({ ephemeral: false });
        }
      } catch (err) {
        console.error(`[UNO CHALLENGE] Defer ├®chou├®:`, err.message);
        return; // Interaction expir├®e, ignorer
      }
      
      // ­ƒåò Syst├¿me de d├®fi pour +4
      const result = game.challengeDraw4(i.user.id);
      
      if (!result.success) {
        return i.editReply({ content: `ÔØî ${result.error}` }).catch(() => {});
      }
      
      if (result.challengeWon) {
        // D├®fi r├®ussi !
        await i.editReply({ content: `­ƒÄë **D├®fi r├®ussi !**\n\n<@${result.cheater.id}> avait une autre carte jouable !\n­ƒÆÑ ${result.cheater.username} pioche 4 cartes en p├®nalit├®.\nÔ£à Vous ne piochez rien !` }).catch(() => {});
      } else {
        // D├®fi ├®chou├®
        await i.editReply({ content: `ÔØî **D├®fi ├®chou├® !**\n\nLe +4 ├®tait l├®gal...\n­ƒÆÑ Vous piochez 6 cartes (4 + 2 de p├®nalit├®) !` }).catch(() => {});
      }
      
      // Mettre ├á jour l'affichage
      const { embed: gameEmbed, attachment } = game.createGameEmbed();
      const actionButtons = game.createActionButtons();
      await message.edit({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
      
      // ­ƒöä Mettre ├á jour tous les embeds "Ma main" ouverts
      await game.updateAllPlayerHands(channel);
      
      // ­ƒÄ» Notifier le joueur actuel
      await notifyCurrentPlayer(game, channel);
      
      // Ô£à CORRECTION CRITIQUE: V├®rifier si c'est le tour du bot en mode solo apr├¿s d├®fi
      if (game.isSoloMode) {
        const nextPlayer = game.getCurrentPlayer();
        console.log(`[UNO CHALLENGE] Apr├¿s d├®fi: isSoloMode=${game.isSoloMode}, nextPlayer=${nextPlayer.username}`);
        if (nextPlayer && nextPlayer.id === 'UNO_BOT_AI') {
          console.log(`[UNO CHALLENGE] ÔÅ░ Le bot doit jouer, setTimeout dans 1 seconde`);
          setTimeout(async () => {
            console.log(`[UNO CHALLENGE] ÔÅ░ setTimeout d├®clench├®, appel playBotTurn()`);
            try {
              await playBotTurn(game, message);
            } catch (err) {
              console.error(`[UNO CHALLENGE] ÔØî Erreur dans playBotTurn:`, err);
            }
          }, 1000);
        } else {
          console.log(`[UNO CHALLENGE] ÔÜ¬ Pas le tour du bot apr├¿s d├®fi`);
        }
      }
      
      } else if (action === "quit") {
      // Ô£à DEFER IMMEDIAT pour eviter timeout Discord
      try {
        if (!i.deferred && !i.replied) {
          await i.deferReply({ ephemeral: true });
        }
      } catch (err) {
        console.error(`[UNO QUIT] Defer ├®chou├®:`, err.message);
        // Si le defer ├®choue, essayer une simple reply
        try {
          await i.reply({ content: "­ƒøæ Impossible de quitter (interaction expir├®e)", ephemeral: true });
        } catch (e) {}
        return;
      }
      
      // En mode solo, arr├¬ter compl├¿tement le jeu
      if (game.isSoloMode) {
        await closeAllHandMessages(game);
        activeGames.delete(channelId);
        gameCollector.stop();
        game.activeCollectors.forEach(c => c.stop());
        await i.editReply({ content: "­ƒøæ Partie Solo annul├®e." });
        await message.edit({ content: "­ƒøæ Partie annul├®e.", embeds: [], components: [] });
        return;
      }
      
      // Mode multi-joueurs: retirer le joueur normalement
      // Supprimer le message "Ma main" de ce joueur
      const playerHandMsg = game.playerHandMessages.get(i.user.id);
      if (playerHandMsg) {
        try {
          await playerHandMsg.delete().catch(() => {});
        } catch (err) {}
        game.playerHandMessages.delete(i.user.id);
      }
      
      game.removePlayer(i.user.id);
      await i.editReply({ content: "Ô£à Vous avez quitt├®." });
      if (game.players.length === 0) {
        await closeAllHandMessages(game);
        activeGames.delete(channelId);
        gameCollector.stop();
        game.activeCollectors.forEach(c => c.stop());
        return message.edit({ content: "­ƒøæ Partie annulee (plus de joueurs).", embeds: [], components: [] });
      }
      const { embed: gameEmbed, attachment } = game.createGameEmbed();
      const actionButtons = game.createActionButtons();
      await message.edit({ embeds: [gameEmbed], files: [attachment], components: [actionButtons] });
      // Ô£à CORRECTION CRITIQUE: V├®rifier si c'est le tour du bot en mode solo apr├¿s quit
      if (game.isSoloMode) {
        const nextPlayer = game.getCurrentPlayer();
        console.log(`[UNO QUIT] Apr├¿s quit: isSoloMode=${game.isSoloMode}, nextPlayer=${nextPlayer.username}`);
        if (nextPlayer && nextPlayer.id === 'UNO_BOT_AI') {
          console.log(`[UNO QUIT] ÔÅ░ Le bot doit jouer, setTimeout dans 1 seconde`);
          setTimeout(async () => {
            console.log(`[UNO QUIT] ÔÅ░ setTimeout d├®clench├®, appel playBotTurn()`);
            try {
              await playBotTurn(game, message);
            } catch (err) {
              console.error(`[UNO QUIT] ÔØî Erreur dans playBotTurn:`, err);
            }
          }, 1000);
        } else {
          console.log(`[UNO QUIT] ÔÜ¬ Pas le tour du bot apr├¿s quit`);
        }
      }
    }
  });
  
  gameCollector.on("end", async () => {
    if (activeGames.has(channelId)) {
      const game = activeGames.get(channelId);
      if (game) await closeAllHandMessages(game);
      activeGames.delete(channelId);
    }
  });
}
