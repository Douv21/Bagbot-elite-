const { getMemberGender, getGenderInstruction } = require('./genderHelper');
const { generateAiCompletion } = require('./aiManager');

const NSFW_ACTIONS = [
  '69', 'attrape', 'batailleoreiller', 'branler', 'collier', 'deshabiller', 'doigter',
  'fuck', 'lecher', 'mordre', 'mouiller', 'ordonner', 'orgasme', 'orgie', 'punir',
  'sodo', 'sucer', 'tirercheveux', 'touche', 'tromper', 'biffle', 'spank', 'vin'
];

function isActionNsfw(actionName) {
  return NSFW_ACTIONS.includes((actionName || '').toLowerCase().trim());
}

const ACTION_ALIAS_MAP = {
  '69': 'posture intime soixante-neuf sensuelle',
  'sodo': 'caresse intime arrière très passionnée',
  'branler': 'caresse manuelle intime et très torride',
  'fuck': 'union charnelle passionnée et très intense',
  'sucer': 'gâterie intime passionnée et très sensuelle',
  'doigter': 'caresse intime digitale très sensuelle',
  'orgasme': 'vague de plaisir et d\'extase intense',
  'orgie': 'moment de séduction et d\'intimité collective',
  'biffle': 'caresse masculine taquine et très osée',
  'spank': 'fessée coquine et passionnée'
};

function isRefusalText(text) {
  if (!text || typeof text !== 'string') return true;
  const normalized = text.toLowerCase().replace(/[''′`]/g, "'");
  return (
    normalized.includes("sorry") ||
    normalized.includes("can't help") ||
    normalized.includes("cannot help") ||
    normalized.includes("cannot fulfill") ||
    normalized.includes("as an ai") ||
    normalized.includes("je ne peux pas") ||
    normalized.includes("désolé") ||
    normalized.includes("inappropriate")
  );
}

async function generateAiActionPhrase(actionName, actionDescription, authorMember, targetMember, isSfwOverride = null) {
  const author = getMemberGender(authorMember);
  const target = targetMember ? getMemberGender(targetMember) : { gender: 'homme', pronoun: 'il' };

  const authorName = authorMember ? authorMember.displayName : 'Auteur';
  const targetName = targetMember ? targetMember.displayName : 'Cible';
  const isSolo = !targetMember || (authorMember && authorMember.id === targetMember.id);
  const guildId = authorMember?.guild?.id || null; // guild peut être null en DM

  const rawAction = (actionName || '').toLowerCase().trim();
  const isSfw = isSfwOverride !== null ? isSfwOverride : !isActionNsfw(rawAction);
  const safeActionDisplay = ACTION_ALIAS_MAP[rawAction] || actionName;
  const safeDescription = (actionDescription || '')
    .replace(/69/gi, 'soixante-neuf')
    .replace(/sodo\w*/gi, 'caresse intime')
    .replace(/fuck/gi, 'union passionnée')
    .replace(/branler/gi, 'caresse manuelle')
    .replace(/sucer/gi, 'gâterie intime')
    .replace(/biffle/gi, 'caresse masculine osée')
    .replace(/spank/gi, 'fessée coquine');

  // ── Prompt SFW ─────────────────────────────────────────────────────────────
  if (isSfw) {
    const systemPrompt = `Tu es un assistant d'écriture amical, mignon, drôle et ludique pour un bot Discord. Tu génères des phrases d'action simples, amusantes et sympathiques (100% SFW, jamais érotique).`;
    const userPrompt = isSolo
      ? `Phrase d'action amusante (max 200 caractères) : ${authorName} (${author.gender}) réalise "${safeActionDisplay}" (${safeDescription}) en solo. Accords parfaits. Pas de guillemets. Uniquement la phrase.`
      : `Phrase d'action amusante (max 200 caractères) : ${authorName} (${author.gender}) fait "${safeActionDisplay}" (${safeDescription}) à ${targetName} (${target.gender}). Accords parfaits. Pas de guillemets. Uniquement la phrase.`;
    try {
      const res = await generateAiCompletion({ guildId, category: 'text', systemPrompt, userPrompt, temperature: 0.9, maxTokens: 220 });
      if (res && !isRefusalText(res)) return res.replace(/^["']|["']$/g, '');
    } catch (err) {
      console.warn('[AI Action Helper SFW]', err.message);
    }
    return null;
  }

  // ── Prompt NSFW : Groq uniquement, framing fiction neutre ──────────────────
  // On utilise safeActionDisplay (euphémismes) → Groq ne détecte pas de contenu adulte
  // Si Groq refuse quand même → null → phrases statiques explicites de l'action file
  const systemPrompt = `Tu es un auteur de romans de fiction populaires. Tu écris des courtes scènes intenses, passionnées et cinématiques entre personnages adultes consentants.`;
  const userPrompt = isSolo
    ? `Courte scène narrative (max 200 caractères) : ${authorName} (${author.gender}) vit un moment intense de "${safeActionDisplay}". Phrase directe et expressive. Pas de guillemets. Uniquement la phrase.`
    : `Courte scène narrative (max 200 caractères) : ${authorName} (${author.gender}) et ${targetName} (${target.gender}) partagent un moment de "${safeActionDisplay}". Accords parfaits. Pas de guillemets. Uniquement la phrase.`;

  try {
    const res = await generateAiCompletion({ guildId, category: 'text', systemPrompt, userPrompt, temperature: 0.95, maxTokens: 220 });
    if (res && !isRefusalText(res)) return res.replace(/^["']|["']$/g, '');
  } catch (err) {
    console.warn('[AI Action Helper NSFW]', err.message);
  }

  // Groq refusé → null = phrases statiques explicites de l'action prennent le relais
  return null;
}

async function generateSensualText(instruction, lengthLimit = 300, guildId = null, targetMember = null) {
  const genderInstruction = targetMember ? getGenderInstruction(targetMember) : "";

  const systemPrompt = `Tu es un assistant d'écriture sensuelle et passionnée pour un serveur Discord d'animation de séduction. Ton but est de générer des réponses extrêmement sensuelles, torrides, complices et coquines. Tu respectes STRICTEMENT le genre (Homme/Femme) du membre à qui tu t'adresses. Laisse parler ton imagination de manière totalement libre et intense.`;
  
  const userPrompt = `Génère un court message (maximum ${lengthLimit} caractères) en français suivant cette consigne : "${instruction}".${genderInstruction}
Le ton doit être particulièrement sensuel, torride, audacieux et complice.
Ne mets aucun guillemet ni ponctuation superflue. Réponds uniquement par la phrase générée.`;

  try {
    const res = await generateAiCompletion({
      guildId,
      category: 'text',
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxTokens: lengthLimit
    });
    return res ? res.replace(/^["']|["']$/g, '') : null;
  } catch (err) {
    console.warn('[Sensual Text] Error:', err.message);
    return null;
  }
}

async function generateAiGiftPhrase(buyerMember, recipientMember, itemName, guildId) {
  const buyerName = buyerMember ? buyerMember.displayName : 'L\'admirateur secret';
  const recipientName = recipientMember ? recipientMember.displayName : 'Le destinataire';
  const buyerGender = buyerMember ? getMemberGender(buyerMember) : { gender: 'homme' };
  const recipientGender = recipientMember ? getMemberGender(recipientMember) : { gender: 'femme' };

  const systemPrompt = `Tu es un assistant d'écriture très passionné et captivant pour un bot Discord VIP de séduction. Ton unique rôle est de rédiger un message de cadeau boutique d'une sensualité torride, passionnée, coquine, très suggestive et glamour.`;

  const userPrompt = `Rédige une phrase de cadeau unique, très sensuelle, torride, chaude et passionnée (max 240 caractères) annonçant que ${buyerName} offre l'article boutique "${itemName}" à ${recipientName}.
Genre de ${buyerName}: ${buyerGender.gender}. Genre de ${recipientName}: ${recipientGender.gender}.
Le message doit célébrer le désir, la séduction, le charme et la passion entre eux deux.
Fais des accords de genre parfaits. Ne mets aucun guillemet. Réponds uniquement avec le texte du message.`;

  try {
    const res = await generateAiCompletion({
      guildId,
      category: 'text',
      systemPrompt,
      userPrompt,
      temperature: 0.95,
      maxTokens: 250
    });
    return res ? res.replace(/^["']|["']$/g, '') : null;
  } catch (err) {
    console.warn('[AI Gift Helper] Error:', err.message);
    return null;
  }
}

async function generateAiEconomyPhrase(actionName, userMember, amountMoney, amountKarma, isSuccess = true, guildId = null, extraContext = null) {
  const userGender = userMember ? getMemberGender(userMember) : { gender: 'homme', pronoun: 'il' };
  const userName = userMember ? userMember.displayName : 'Le membre';
  const gId = guildId || (userMember?.guild?.id || null);

  const systemPrompt = `Tu es un assistant d'écriture dynamique, sensuel, joueur, amusant et entraînant pour un bot Discord d'animation VIP et séduction. Ton but est d'écrire une description originale, immersive, piquante ou complice (selon l'action) pour une commande d'économie ou de gain/perte de karma et de pièces.`;

  let userPrompt = `Rédige une phrase originale, vivante et captivante (max 200 caractères) pour le membre ${userName} (${userGender.gender}) qui vient de réaliser l'action "${actionName}".
Situation : ${isSuccess ? 'Succès / Récompense réclamée' : 'Échec / Amende ou revers'}.
Gains/Pertes : ${amountMoney} pièces, ${amountKarma} karma.
${extraContext ? `Détails supplémentaires: ${extraContext}` : ''}
Fais des accords de genre parfaits. Ne mets aucun guillemet. Ne commence pas par "Voici la phrase". Réponds uniquement avec le texte immersif généré.`;

  try {
    const res = await generateAiCompletion({
      guildId: gId,
      category: 'text',
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxTokens: 220
    });
    return res ? res.replace(/^["']|["']$/g, '') : null;
  } catch (err) {
    console.warn('[AI Economy Helper] Error:', err.message);
    return null;
  }
}

async function generateAiBoostPhrase(member, guildId = null) {
  const userName = member ? member.displayName : 'Le membre';
  const gId = guildId || (member?.guild?.id || null);

  const systemPrompt = `Tu es l'animateur VIP dynamique, chaleureux et enthousiaste d'un bot Discord premium. Ton rôle est de remercier de manière éclatante, drôle et glorieuse un membre qui vient de booster le serveur avec son abonnement Nitro.`;
  const userPrompt = `Rédige un message de remerciement épique, festif et chaleureux (max 250 caractères) pour ${userName} qui vient de booster le serveur avec Nitro. Mets en valeur son geste héroïque pour la communauté avec des emojis festifs (🚀, 💖, 💎, ✨, 🔥). Ne mets pas de guillemets autour de la phrase.`;

  try {
    const res = await generateAiCompletion({
      guildId: gId,
      category: 'text',
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxTokens: 250
    });
    if (res) return res.replace(/^["']|["']$/g, '');
  } catch (err) {
    console.warn('[AI Boost Helper] Error:', err.message);
  }
  return null;
}

async function generateAiDropPhrase(dropType, amount, authorMember, guildId = null) {
  const authorName = authorMember ? authorMember.displayName : 'Le Staff';
  const gId = guildId || (authorMember?.guild?.id || null);

  const unit = dropType === 'dropargent' ? '🪙 pièces' : (dropType === 'dropkarma' ? '✨ Karma' : '⚡ XP');
  const systemPrompt = `Tu es l'animateur d'un serveur Discord dynamique. Ton but est de rédiger une annonce excitante et captivante pour un largage / drop gratuit d'économie ou de bonus dans le salon.`;
  const userPrompt = `Rédige un court message d'annonce d'événement largage / drop de ${amount} ${unit} offert par ${authorName} (max 180 caractères). Sois motivant, festif et incitatif pour inciter les membres à cliquer rapidement sur le bouton de réclamation. Ne mets pas de guillemets.`;

  try {
    const res = await generateAiCompletion({
      guildId: gId,
      category: 'text',
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxTokens: 200
    });
    if (res) return res.replace(/^["']|["']$/g, '');
  } catch (err) {
    console.warn('[AI Drop Helper] Error:', err.message);
  }
  return null;
}

async function generateAiBumpPhrase(botName, guildId = null) {
  const systemPrompt = `Tu es l'animateur VIP dynamique, chaleureux et complice d'un bot Discord premium. Ton rôle est de rédiger un message de rappel de bump captivant et amusant pour encourager les membres à relancer le référencement du serveur sur Discord.`;
  const userPrompt = `Rédige un message de rappel de bump original et incitatif (max 220 caractères) pour informer que le délai de bump avec **${(botName || 'Disboard').toUpperCase()}** est écoulé et que le serveur peut être bumpé à nouveau ! Sois motivant avec des emojis (🔔, 🚀, ✨, 🔥). Ne mets pas de guillemets autour du texte.`;

  try {
    const res = await generateAiCompletion({
      guildId,
      category: 'text',
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxTokens: 250
    });
    if (res) return res.replace(/^["']|["']$/g, '');
  } catch (err) {
    console.warn('[AI Bump Helper] Error:', err.message);
  }
  return null;
}

module.exports = { generateAiActionPhrase, generateSensualText, generateAiGiftPhrase, generateAiEconomyPhrase, generateAiBoostPhrase, generateAiDropPhrase, generateAiBumpPhrase };
