const { createCanvas } = require('@napi-rs/canvas');

// Palette de couleurs officielles UNO
const COLOR_HEX = {
  red: '#E74C3C',
  blue: '#3498DB',
  green: '#2ECC71',
  yellow: '#F1C40F',
  wild: '#2C3E50',
  dark: '#1E272C'
};

const COLOR_NAMES = {
  red: 'Rouge',
  blue: 'Bleu',
  green: 'Vert',
  yellow: 'Jaune',
  wild: 'Joker'
};

const COLOR_EMOJIS = {
  red: '🔴',
  blue: '💙',
  green: '🟢',
  yellow: '🟡',
  wild: '🖤'
};

/**
 * Dessine une carte UNO individuelle sur le Canvas aux coordonnées (x, y)
 */
function drawUnoCard(ctx, x, y, width, height, card, options = {}) {
  const { isSelected = false, isPlayable = true } = options;
  const radius = Math.floor(width * 0.12);

  ctx.save();
  ctx.translate(x, y);

  // Ombre portée sous la carte
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  // Bordure extérieure blanche
  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, radius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Réinitialisation ombre
  ctx.shadowColor = 'transparent';

  // Couleur intérieure de la carte
  const cardColor = card.chosenColor || card.color || 'wild';
  const innerMargin = Math.floor(width * 0.07);
  const innerWidth = width - innerMargin * 2;
  const innerHeight = height - innerMargin * 2;

  ctx.beginPath();
  ctx.roundRect(
    -width / 2 + innerMargin,
    -height / 2 + innerMargin,
    innerWidth,
    innerHeight,
    radius * 0.7
  );

  if (cardColor === 'wild' && !card.chosenColor) {
    // Dégradé à 4 couleurs pour le Joker non choisi
    const grad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
    grad.addColorStop(0, '#E74C3C');
    grad.addColorStop(0.33, '#3498DB');
    grad.addColorStop(0.66, '#2ECC71');
    grad.addColorStop(1, '#F1C40F');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = COLOR_HEX[cardColor] || COLOR_HEX.dark;
  }
  ctx.fill();

  // Oval central blanc incliné (style classique des cartes UNO)
  ctx.save();
  ctx.rotate(-0.35); // ~20° d'inclinaison
  ctx.beginPath();
  ctx.ellipse(0, 0, innerWidth * 0.42, innerHeight * 0.35, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // Texte / Symbole au centre
  let label = '';
  if (card.type === 'number') {
    label = String(card.value);
  } else if (card.type === 'skip') {
    label = '🚫';
  } else if (card.type === 'reverse') {
    label = '⇄';
  } else if (card.type === 'draw2') {
    label = '+2';
  } else if (card.type === 'wild') {
    label = '🌈';
  } else if (card.type === 'wild_draw4') {
    label = '+4';
  }

  // Symbole central
  ctx.fillStyle = (cardColor === 'wild' && !card.chosenColor) ? '#1E272C' : (COLOR_HEX[cardColor] || '#1E272C');
  ctx.font = `bold ${Math.floor(height * 0.30)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);

  // Coins de la carte (Haut gauche)
  ctx.font = `bold ${Math.floor(height * 0.14)}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, -width / 2 + innerMargin + 4, -height / 2 + innerMargin + 4);

  // Coin inférieur droit (Retourné)
  ctx.save();
  ctx.rotate(Math.PI);
  ctx.fillText(label, -width / 2 + innerMargin + 4, -height / 2 + innerMargin + 4);
  ctx.restore();

  // Masque sombre si la carte n'est pas jouable
  if (!isPlayable) {
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, radius);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.50)';
    ctx.fill();
  }

  // Surbrillance dorée si sélectionnée
  if (isSelected) {
    ctx.beginPath();
    ctx.roundRect(-width / 2 - 3, -height / 2 - 3, width + 6, height + 6, radius + 2);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Rendu Canvas du Plateau de Jeu Principal UNO (800x450 px)
 */
function renderGameBoardCanvas(game) {
  const width = 800;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Dégradé de fond sombre néon
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 500);
  bgGrad.addColorStop(0, '#1E2436');
  bgGrad.addColorStop(1, '#0C0E14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Lignes de grille subtiles
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }

  // --- TALON DE PIOCHE (À gauche) ---
  const deckX = 180;
  const deckY = 210;
  const cardW = 130;
  const cardH = 190;

  for (let i = 4; i >= 0; i--) {
    ctx.save();
    ctx.translate(deckX - i * 2, deckY - i * 2);
    ctx.beginPath();
    ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    ctx.fillStyle = '#2C3E50';
    ctx.fill();
    ctx.strokeStyle = '#34495E';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#E74C3C';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UNO', 0, 0);
    ctx.restore();
  }

  // Badge du nombre de cartes en pioche
  ctx.beginPath();
  ctx.arc(deckX + 45, deckY + 75, 22, 0, 2 * Math.PI);
  ctx.fillStyle = '#3498DB';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(game.deck.length), deckX + 45, deckY + 75);

  // --- CARTE AU SOMMET DE LA DÉFOSSE (Au centre) ---
  const topCard = game.getTopCard();
  const discardX = 400;
  const discardY = 210;

  if (topCard) {
    drawUnoCard(ctx, discardX, discardY, 140, 210, topCard);
  }

  // --- PANNEAU DE DROITE : SENS & DÉTAILS ---
  const infoX = 620;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SENS DU JEU', infoX, 70);

  ctx.font = '32px sans-serif';
  ctx.fillText(game.direction === 1 ? '➡️ Horaire' : '⬅️ Anti-horaire', infoX, 110);

  if (topCard) {
    const activeColor = topCard.chosenColor || topCard.color;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('COULEUR ACTIVE', infoX, 170);

    ctx.beginPath();
    ctx.arc(infoX, 205, 26, 0, 2 * Math.PI);
    ctx.fillStyle = COLOR_HEX[activeColor] || '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(COLOR_NAMES[activeColor] || activeColor, infoX, 248);
  }

  if (game.penaltyStack > 0) {
    ctx.fillStyle = '#E74C3C';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`⚡ Pénalité : +${game.penaltyStack} !`, infoX, 305);
  }

  // --- BANDEAU INFÉRIEUR : JOUEUR DU TOUR ---
  const currentPlayer = game.getCurrentPlayer();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, height - 60, width, 60);

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, height - 60, width, 60);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const playerText = currentPlayer
    ? `🎯 C'est au tour de ${currentPlayer.username} (${currentPlayer.hand.length} carte${currentPlayer.hand.length > 1 ? 's' : ''})`
    : 'Partie terminée';
  ctx.fillText(playerText, width / 2, height - 30);

  return canvas.toBuffer('image/png');
}

/**
 * Rendu Canvas de la main d'un joueur en rangée (800x260 px)
 */
function renderPlayerHandCanvas(hand, topCard, penaltyStack = 0) {
  const width = 800;
  const height = 260;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#141722';
  ctx.fillRect(0, 0, width, height);

  const numCards = hand.length;
  if (numCards === 0) {
    ctx.fillStyle = '#8E9297';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Vous n\'avez aucune carte en main !', width / 2, height / 2);
    return canvas.toBuffer('image/png');
  }

  const cardW = 95;
  const cardH = 142;
  const spacing = Math.min(62, (width - 90) / Math.max(1, numCards));
  const startX = (width - ((numCards - 1) * spacing + cardW)) / 2 + cardW / 2;

  hand.forEach((card, idx) => {
    const x = startX + idx * spacing;
    const y = height / 2 + 10;

    const isPlayable = isCardPlayable(card, topCard, penaltyStack);
    drawUnoCard(ctx, x, y, cardW, cardH, card, { isPlayable });

    ctx.fillStyle = isPlayable ? '#FFD700' : '#8E9297';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${idx + 1}`, x, y - cardH / 2 - 12);
  });

  return canvas.toBuffer('image/png');
}

/**
 * Vérifie si une carte est jouable selon les règles officielles du UNO
 */
function isCardPlayable(card, topCard, penaltyStack = 0) {
  if (!topCard) return true;

  // Si pénalité cumulée active (+2 ou +4)
  if (penaltyStack > 0) {
    if (topCard.type === 'draw2') return card.type === 'draw2';
    if (topCard.type === 'wild_draw4') return card.type === 'wild_draw4';
  }

  const activeColor = topCard.chosenColor || topCard.color;

  // Jokers toujours jouables
  if (card.type === 'wild' || card.type === 'wild_draw4') return true;

  // Même couleur
  if (card.color === activeColor) return true;

  // Même valeur numérique
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;

  // Même symbole d'action (Passe, Inversion, +2)
  if (card.type !== 'number' && card.type === topCard.type) return true;

  return false;
}

module.exports = {
  COLOR_HEX,
  COLOR_NAMES,
  COLOR_EMOJIS,
  drawUnoCard,
  renderGameBoardCanvas,
  renderPlayerHandCanvas,
  isCardPlayable
};
