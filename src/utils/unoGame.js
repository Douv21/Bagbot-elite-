const { isCardPlayable, COLOR_NAMES, COLOR_EMOJIS } = require('./unoCanvas');

class UnoGame {
  constructor({ id, channelId, creatorId, mode = 'multi', variant = 'stack' }) {
    this.id = id;
    this.channelId = channelId;
    this.creatorId = creatorId;
    this.mode = mode; // 'solo' or 'multi'
    this.variant = variant; // 'classic', 'stack', '7-0'
    this.status = 'lobby'; // 'lobby', 'in_progress', 'finished'

    this.players = [];
    this.deck = [];
    this.discardPile = [];
    this.currentPlayerIndex = 0;
    this.direction = 1; // 1 = sens horaire, -1 = sens anti-horaire
    this.penaltyStack = 0; // Cumul de cartes à piocher (+2, +4)
    this.drawnThisTurn = false;

    this.unoDeclarations = new Set(); // IDs des joueurs ayant déclaré UNO
    this.winner = null;
    this.lastActionMessage = '';
  }

  /**
   * Génère et mélange le paquet complet de 108 cartes UNO
   */
  createDeck() {
    const deck = [];
    const colors = ['red', 'blue', 'green', 'yellow'];

    colors.forEach(color => {
      // Une seule carte '0' par couleur
      deck.push({ color, type: 'number', value: 0 });

      // Deux cartes de '1' à '9' par couleur
      for (let i = 1; i <= 9; i++) {
        deck.push({ color, type: 'number', value: i });
        deck.push({ color, type: 'number', value: i });
      }

      // Cartes d'action (2 par couleur)
      for (let i = 0; i < 2; i++) {
        deck.push({ color, type: 'skip' });
        deck.push({ color, type: 'reverse' });
        deck.push({ color, type: 'draw2' });
      }
    });

    // Cartes Jokers (4 Wild et 4 Wild +4)
    for (let i = 0; i < 4; i++) {
      deck.push({ color: 'wild', type: 'wild' });
      deck.push({ color: 'wild', type: 'wild_draw4' });
    }

    // Mélange de Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.deck = deck;
  }

  /**
   * Pioche une carte dans le paquet (avec re-mélange de la défausse si besoin)
   */
  popCard() {
    if (this.deck.length === 0) {
      if (this.discardPile.length <= 1) return null;
      // Garder la carte du sommet et mélanger le reste
      const top = this.discardPile.pop();
      const newDeck = this.discardPile.map(c => ({ ...c, chosenColor: undefined }));
      this.discardPile = [top];

      for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
      }
      this.deck = newDeck;
    }
    return this.deck.pop();
  }

  /**
   * Ajoute un joueur dans la partie
   */
  addPlayer(userId, username, isBot = false) {
    if (this.status !== 'lobby') return { success: false, error: 'La partie a déjà commencé.' };
    if (this.players.find(p => p.id === userId)) return { success: false, error: 'Vous êtes déjà dans la partie.' };
    if (this.players.length >= 10) return { success: false, error: 'La partie est complète (10 joueurs max).' };

    this.players.push({
      id: userId,
      username,
      isBot,
      hand: []
    });

    return { success: true };
  }

  /**
   * Retire un joueur de la partie
   */
  removePlayer(userId) {
    const idx = this.players.findIndex(p => p.id === userId);
    if (idx === -1) return false;

    const player = this.players[idx];

    // Remettre ses cartes dans le paquet si en cours
    if (this.status === 'in_progress') {
      this.deck.push(...player.hand);
    }

    this.players.splice(idx, 1);

    if (this.players.length < 2 && this.status === 'in_progress') {
      this.status = 'finished';
      this.winner = this.players[0] || null;
    } else if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
    }

    return true;
  }

  /**
   * Lance la partie
   */
  start() {
    if (this.status !== 'lobby') return { success: false, error: 'La partie est déjà lancée.' };

    // Si mode Solo, ajouter le Bot UNO si besoin
    if (this.mode === 'solo' && this.players.length === 1) {
      this.addPlayer('UNO_BOT_AI', '🤖 Bot UNO', true);
    }

    if (this.players.length < 2) {
      return { success: false, error: 'Il faut au moins 2 joueurs pour démarrer le UNO.' };
    }

    this.createDeck();

    // Distribuer 7 cartes à chaque joueur
    for (let i = 0; i < 7; i++) {
      this.players.forEach(p => {
        const c = this.popCard();
        if (c) p.hand.push(c);
      });
    }

    // Tirer la première carte du paquet pour la défausse (carte non-joker)
    let firstCard = this.popCard();
    while (firstCard && (firstCard.type === 'wild' || firstCard.type === 'wild_draw4')) {
      this.deck.unshift(firstCard);
      firstCard = this.popCard();
    }

    this.discardPile.push(firstCard || { color: 'red', type: 'number', value: 7 });
    this.status = 'in_progress';
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.penaltyStack = 0;
    this.drawnThisTurn = false;

    this.lastActionMessage = `🎮 La partie commence ! Première carte : ${this.getCardDisplay(this.getTopCard())}`;
    return { success: true };
  }

  getTopCard() {
    return this.discardPile[this.discardPile.length - 1] || null;
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex] || null;
  }

  nextTurn() {
    this.drawnThisTurn = false;
    this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
  }

  /**
   * Renvoie le format texte joliment mis en forme d'une carte (ex: 🔴 Rouge 7)
   */
  getCardDisplay(card) {
    if (!card) return 'Aucune';
    const colorKey = card.chosenColor || card.color;
    const emoji = COLOR_EMOJIS[colorKey] || '❓';
    const colorName = COLOR_NAMES[colorKey] || colorKey;

    if (card.type === 'number') return `${emoji} ${colorName} **${card.value}**`;
    if (card.type === 'skip') return `${emoji} ${colorName} **Passe** 🚫`;
    if (card.type === 'reverse') return `${emoji} ${colorName} **Inversion** ⇄`;
    if (card.type === 'draw2') return `${emoji} ${colorName} **+2** ⚡`;
    if (card.type === 'wild') return `🖤 **Joker** 🌈${card.chosenColor ? ` (${COLOR_NAMES[card.chosenColor]})` : ''}`;
    if (card.type === 'wild_draw4') return `🖤 **Joker +4** 💣${card.chosenColor ? ` (${COLOR_NAMES[card.chosenColor]})` : ''}`;
    return 'Carte inconnue';
  }

  /**
   * Joue une carte par son index dans la main d'un joueur
   */
  playCard(userId, cardIndex, chosenColor = null, targetSwapUserId = null) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== userId) {
      return { success: false, error: "Ce n'est pas votre tour !" };
    }

    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return { success: false, error: "Carte invalide." };
    }

    const card = player.hand[cardIndex];
    const topCard = this.getTopCard();

    if (!isCardPlayable(card, topCard, this.penaltyStack)) {
      return { success: false, error: "Vous ne pouvez pas jouer cette carte !" };
    }

    // Si carte Joker, exiger la couleur choisie
    if ((card.type === 'wild' || card.type === 'wild_draw4') && !chosenColor) {
      return { success: false, error: "Veuillez choisir une couleur pour le Joker." };
    }

    // Retirer la carte de la main
    player.hand.splice(cardIndex, 1);

    if (chosenColor) {
      card.chosenColor = chosenColor;
    }

    this.discardPile.push(card);
    let actionNotice = `**${player.username}** a joué ${this.getCardDisplay(card)}.`;

    // Retirer l'éventuelle déclaration UNO préalable
    if (player.hand.length !== 1) {
      this.unoDeclarations.delete(userId);
    }

    // --- VERIFICATION VICTOIRE ---
    if (player.hand.length === 0) {
      this.status = 'finished';
      this.winner = player;
      this.lastActionMessage = `🏆 **${player.username}** a joué sa dernière carte et **REMPORTE LA PARTIE DE UNO !** 🎉`;
      return { success: true, winner: player };
    }

    // --- AFFECTATION DES EFFETS DE CARTES ---
    if (card.type === 'skip') {
      this.nextTurn(); // Saute le prochain joueur
      actionNotice += ` 🚫 Tour passé !`;
    } else if (card.type === 'reverse') {
      if (this.variant === 'reverse') {
        this.direction *= -1;
        this.nextTurn();
        const victim = this.getCurrentPlayer();
        const c = this.popCard();
        if (c) victim.hand.push(c);
        actionNotice += ` 🔄 **Reverse Extreme !** Sens inversé et <@${victim.id}> pioche 1 carte !`;
      } else if (this.players.length === 2) {
        this.nextTurn(); // À 2 joueurs, Inversion agit comme un Passe
        actionNotice += ` ⇄ Sens du jeu inversé !`;
      } else {
        this.direction *= -1;
        actionNotice += ` ⇄ Sens du jeu inversé !`;
      }
    } else if (card.type === 'draw2') {
      if (this.variant === 'stack' || this.variant === 'spicy') {
        const drawAdd = this.variant === 'spicy' ? 3 : 2;
        this.penaltyStack += drawAdd;
        actionNotice += ` ⚡ Cumul de +${drawAdd} (Total : +${this.penaltyStack}) !`;
      } else {
        this.nextTurn();
        const victim = this.getCurrentPlayer();
        for (let i = 0; i < 2; i++) {
          const c = this.popCard();
          if (c) victim.hand.push(c);
        }
        actionNotice += ` ⚡ <@${victim.id}> pioche 2 cartes et passe son tour !`;
      }
    } else if (card.type === 'wild_draw4') {
      if (this.variant === 'stack' || this.variant === 'spicy') {
        const drawAdd = this.variant === 'spicy' ? 6 : 4;
        this.penaltyStack += drawAdd;
        actionNotice += ` 💣 Cumul de +${drawAdd} (Total : +${this.penaltyStack}) ! Couleur : **${COLOR_NAMES[chosenColor]}**`;
      } else {
        this.nextTurn();
        const victim = this.getCurrentPlayer();
        for (let i = 0; i < 4; i++) {
          const c = this.popCard();
          if (c) victim.hand.push(c);
        }
        actionNotice += ` 💣 <@${victim.id}> pioche 4 cartes et passe son tour ! Couleur : **${COLOR_NAMES[chosenColor]}**`;
      }
    } else if (card.type === 'number' && card.value === 7 && this.variant === '7-0' && targetSwapUserId) {
      const targetPlayer = this.players.find(p => p.id === targetSwapUserId);
      if (targetPlayer && targetPlayer.id !== userId) {
        const temp = player.hand;
        player.hand = targetPlayer.hand;
        targetPlayer.hand = temp;
        actionNotice += ` 🔄 **7 Joué !** ${player.username} échange sa main avec **${targetPlayer.username}** !`;
      }
    } else if (card.type === 'number' && card.value === 0 && this.variant === '7-0') {
      // Rotation de toutes les mains
      const hands = this.players.map(p => p.hand);
      if (this.direction === 1) {
        hands.unshift(hands.pop());
      } else {
        hands.push(hands.shift());
      }
      this.players.forEach((p, i) => {
        p.hand = hands[i];
      });
      actionNotice += ` 🌀 **0 Joué !** Toutes les mains tournent !`;
    }

    this.lastActionMessage = actionNotice;
    this.nextTurn();
    return { success: true };
  }

  /**
   * Pioche une ou plusieurs cartes
   */
  drawCard(userId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== userId) {
      return { success: false, error: "Ce n'est pas votre tour !" };
    }

    // Cas de pénalité cumulée (+2/+4)
    if (this.penaltyStack > 0) {
      const count = this.penaltyStack;
      const drawn = [];
      for (let i = 0; i < count; i++) {
        const c = this.popCard();
        if (c) {
          player.hand.push(c);
          drawn.push(c);
        }
      }
      this.penaltyStack = 0;
      this.lastActionMessage = `📥 **${player.username}** n'a pas pu contrer et pioche **${count} cartes** de pénalité !`;
      this.nextTurn();
      return { success: true, count, drawn };
    }

    // Pioche normale
    if (this.drawnThisTurn) {
      // Si déjà pioché ce tour, passer son tour
      this.lastActionMessage = `⏩ **${player.username}** passe son tour.`;
      this.nextTurn();
      return { success: true, passed: true };
    }

    const drawCount = this.variant === 'spicy' ? 2 : 1;
    const drawnCards = [];
    for (let i = 0; i < drawCount; i++) {
      const c = this.popCard();
      if (c) {
        player.hand.push(c);
        drawnCards.push(c);
      }
    }
    this.drawnThisTurn = true;
    this.lastActionMessage = `📥 **${player.username}** a pioché ${drawCount > 1 ? `**${drawCount} cartes** (Nuit Sulfureuse)` : 'une carte'}.`;

    return { success: true, card: drawnCards[0] };
  }

  /**
   * Déclarer UNO !
   */
  declareUno(userId) {
    const player = this.players.find(p => p.id === userId);
    if (!player) return { success: false, error: 'Vous ne jouez pas dans cette partie.' };

    if (player.hand.length === 1) {
      this.unoDeclarations.add(userId);
      this.lastActionMessage = `🔴 **${player.username} DIT UNO !** Plus qu'une seule carte ! 😱`;
      return { success: true };
    } else {
      return { success: false, error: "Vous n'avez pas 1 seule carte en main !" };
    }
  }

  /**
   * Contrer un joueur qui a oublié de dire UNO !
   */
  counterUno(callerUserId) {
    const caller = this.players.find(p => p.id === callerUserId);
    if (!caller) return { success: false, error: 'Vous ne jouez pas dans cette partie.' };

    // Trouver un joueur avec 1 carte qui n'a pas déclaré UNO
    const caughtPlayer = this.players.find(p => p.hand.length === 1 && !this.unoDeclarations.has(p.id));

    if (caughtPlayer) {
      for (let i = 0; i < 2; i++) {
        const c = this.popCard();
        if (c) caughtPlayer.hand.push(c);
      }
      this.lastActionMessage = `📢 **${caller.username} A CONTRÉ UNO !** <@${caughtPlayer.id}> a oublié de dire UNO et pioche **2 cartes** de pénalité ! 💥`;
      return { success: true, caughtPlayer };
    } else {
      return { success: false, error: "Aucun joueur n'a oublié de dire UNO !" };
    }
  }

  /**
   * IA Bot UNO : effectue le tour automatiquement
   */
  botPlay() {
    const bot = this.getCurrentPlayer();
    if (!bot || !bot.isBot || this.status !== 'in_progress') return null;

    const topCard = this.getTopCard();
    let playedIndex = -1;

    // Trouver les cartes jouables
    const playableIndices = [];
    bot.hand.forEach((card, idx) => {
      if (isCardPlayable(card, topCard, this.penaltyStack)) {
        playableIndices.push(idx);
      }
    });

    if (playableIndices.length > 0) {
      // Prioriser les cartes d'action / pénalité
      const actionIndex = playableIndices.find(idx => {
        const t = bot.hand[idx].type;
        return t === 'draw2' || t === 'wild_draw4' || t === 'skip' || t === 'reverse';
      });

      playedIndex = actionIndex !== undefined ? actionIndex : playableIndices[0];
      const cardToPlay = bot.hand[playedIndex];

      // Si Joker, choisir la couleur la plus représentée dans sa main
      let chosenColor = null;
      if (cardToPlay.type === 'wild' || cardToPlay.type === 'wild_draw4') {
        const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
        bot.hand.forEach(c => {
          if (c.color && c.color !== 'wild') colorCounts[c.color]++;
        });
        chosenColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
      }

      // Si bot a 1 carte restante après avoir joué, déclarer automatiquement UNO
      if (bot.hand.length === 2) {
        this.declareUno(bot.id);
      }

      return this.playCard(bot.id, playedIndex, chosenColor);
    } else {
      // Si aucune carte jouable, piocher
      const drawRes = this.drawCard(bot.id);
      if (drawRes.success && !drawRes.passed && bot.hand.length > 0) {
        // Re-tester la carte piochée
        const lastIdx = bot.hand.length - 1;
        const lastCard = bot.hand[lastIdx];
        if (isCardPlayable(lastCard, this.getTopCard(), this.penaltyStack)) {
          let chosenColor = null;
          if (lastCard.type === 'wild' || lastCard.type === 'wild_draw4') {
            chosenColor = 'red';
          }
          return this.playCard(bot.id, lastIdx, chosenColor);
        }
      }
      return drawRes;
    }
  }
}

module.exports = {
  UnoGame
};
