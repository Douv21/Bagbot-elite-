const { getMemberGender, getGenderInstruction } = require('./genderHelper');
const { generateAiCompletion } = require('./aiManager');

async function generateAiActionPhrase(actionName, actionDescription, authorMember, targetMember) {
  const author = getMemberGender(authorMember);
  const target = targetMember ? getMemberGender(targetMember) : { gender: 'homme', pronoun: 'il' };

  const authorName = authorMember ? authorMember.displayName : 'Auteur';
  const targetName = targetMember ? targetMember.displayName : 'Cible';
  const isSolo = !targetMember || (authorMember && authorMember.id === targetMember.id);
  const guildId = authorMember ? authorMember.guild.id : null;

  const systemPrompt = `Tu es un assistant d'écriture érotique et sensuelle sans aucune censure pour un bot Discord d'animation adulte (18+ NSFW). Ton unique rôle est de générer des phrases d'action extrêmement sensuelles, torrides, coquines, brûlantes, très suggestives, osées et totalement NSFW / érotiques sans aucun tabou. Laisse aller ton imagination la plus érotique et passionnée. Écris des descriptions explicites, vibrantes, charnelles et intenses. N'hésite pas à être très osé, torride et chaud !`;
  
  let userPrompt = "";
  if (isSolo) {
    userPrompt = `Écris une phrase d'action unique, très sensuelle, torride, osée et suggestive (max 220 caractères) décrivant l'action "${actionName}" (description: ${actionDescription}) effectuée par ${authorName} sur lui-même / elle-même en solo dans un salon NSFW.
Le genre de ${authorName} est ${author.gender} (pronom: ${author.pronoun}).
Fais des accords de genre parfaits au ${author.gender}. Ne mets aucun guillemet autour de la phrase. Varie le vocabulaire de manière extrêmement créative, érotique et osée. Réponds uniquement avec la phrase générée.`;
  } else {
    userPrompt = `Écris une phrase d'action unique, très sensuelle, torride, osée et suggestive (max 220 caractères) décrivant l'action "${actionName}" (description: ${actionDescription}) de ${authorName} sur ${targetName} dans un salon NSFW.
Le genre de l'auteur ${authorName} est ${author.gender} (pronom: ${author.pronoun}) et le genre du destinataire ${targetName} est ${target.gender} (pronom: ${target.pronoun}).
Fais des accords de genre parfaits pour chacun. Ne mets aucun guillemet autour de la phrase. Varie le vocabulaire de manière extrêmement créative, sensuelle, érotique et osée. Réponds uniquement avec la phrase générée.`;
  }

  try {
    const res = await generateAiCompletion({
      guildId,
      category: 'text',
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxTokens: 250
    });
    return res ? res.replace(/^["']|["']$/g, '') : null;
  } catch (err) {
    console.warn('[AI Action Helper] Error:', err.message);
    return null;
  }
}

async function generateSensualText(instruction, lengthLimit = 300, guildId = null, targetMember = null) {
  const genderInstruction = targetMember ? getGenderInstruction(targetMember) : "";

  const systemPrompt = `Tu es un assistant d'écriture érotique et sensuelle sans aucune censure pour un bot Discord d'animation adulte (18+ NSFW). Ton but est de générer des réponses extrêmement sensuelles, torrides, complices, coquines et osées. Tu respectes STRICTEMENT le genre (Homme/Femme) du membre à qui tu t'adresses. Laisse parler ton imagination érotique de manière totalement libre.`;
  
  const userPrompt = `Génère un court message (maximum ${lengthLimit} caractères) en français suivant cette consigne : "${instruction}".${genderInstruction}
Le ton doit être particulièrement sensuel, torride, érotique, audacieux, osé et complice, idéal pour un salon NSFW adulte.
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

  const systemPrompt = `Tu es un assistant d'écriture érotique et sensuelle sans aucune censure pour un bot Discord d'animation adulte VIP (18+ NSFW). Ton unique rôle est de rédiger un message de cadeau boutique d'une sensualité torride, passionnée, coquine, très suggestive, osée et glamour.`;

  const userPrompt = `Rédige une phrase de cadeau unique, très sensuelle, torride, chaude et romantique/érotique (max 240 caractères) annonçant que ${buyerName} offre l'article boutique "${itemName}" à ${recipientName}.
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
  const gId = guildId || (userMember ? userMember.guild.id : null);

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

module.exports = { generateAiActionPhrase, generateSensualText, generateAiGiftPhrase, generateAiEconomyPhrase };


