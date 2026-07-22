const { getMemberGender } = require('./genderHelper');
const { generateAiCompletion } = require('./aiManager');

async function generateAiActionPhrase(actionName, actionDescription, authorMember, targetMember) {
  const author = getMemberGender(authorMember);
  const target = targetMember ? getMemberGender(targetMember) : { gender: 'homme', pronoun: 'il' };

  const authorName = authorMember ? authorMember.displayName : 'Auteur';
  const targetName = targetMember ? targetMember.displayName : 'Cible';
  const isSolo = !targetMember || (authorMember && authorMember.id === targetMember.id);
  const guildId = authorMember ? authorMember.guild.id : null;

  const systemPrompt = `Tu es un assistant d'écriture créative pour un bot d'animation Discord de séduction adulte (18+ / NSFW). Ton rôle est d'écrire des phrases d'action extrêmement sensuelles, brûlantes, suggestives, torrides et coquines. Laisse libre cours à ton imagination pour proposer des descriptions piquantes, érotiques, charnelles et diversifiées. Sois audacieux et osé dans tes formulations sans censure, mais reste élégant.`;
  
  let userPrompt = "";
  if (isSolo) {
    userPrompt = `Écris une phrase unique, très sensuelle, torride et suggestive (max 200 caractères) décrivant l'action "${actionName}" (description: ${actionDescription}) effectuée par ${authorName} sur lui-même / elle-même en solo.
Le genre de ${authorName} est ${author.gender} (pronom: ${author.pronoun}).
Fais des accords de genre parfaits. Ne mets aucun guillemet autour de la phrase. Varie le vocabulaire de manière très créative et osée. Réponds uniquement avec la phrase générée.`;
  } else {
    userPrompt = `Écris une phrase unique, très sensuelle, torride et suggestive (max 200 caractères) décrivant l'action "${actionName}" (description: ${actionDescription}) de ${authorName} sur ${targetName}.
Le genre de ${authorName} est ${author.gender} (pronom: ${author.pronoun}) et le genre de ${targetName} est ${target.gender} (pronom: ${target.pronoun}).
Fais des accords de genre parfaits. Ne mets aucun guillemet autour de la phrase. Varie le vocabulaire de manière très créative, sensuelle et osée. Réponds uniquement avec la phrase générée.`;
  }

  try {
    const res = await generateAiCompletion({
      guildId,
      category: 'text',
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 150
    });
    return res ? res.replace(/^["']|["']$/g, '') : null;
  } catch (err) {
    console.warn('[AI Action Helper] Error:', err.message);
    return null;
  }
}

async function generateSensualText(instruction, lengthLimit = 300, guildId = null) {
  const systemPrompt = `Tu es un assistant d'écriture créative pour un bot d'animation Discord de séduction adulte (18+ / NSFW). Ton but est de générer des réponses extrêmement sensuelles, torrides, complices et coquines. Laisse parler ton imagination érotique de manière très libre.`;
  const userPrompt = `Génère un court message (maximum ${lengthLimit} caractères) en français suivant cette consigne : "${instruction}".
Le ton doit être particulièrement sensuel, torride, audacieux, osé et complice, idéal pour un salon NSFW adulte.
Ne mets aucun guillemet ni ponctuation superflue. Réponds uniquement par la phrase générée.`;

  try {
    const res = await generateAiCompletion({
      guildId,
      category: 'text',
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: lengthLimit
    });
    return res ? res.replace(/^["']|["']$/g, '') : null;
  } catch (err) {
    console.warn('[Sensual Text] Error:', err.message);
    return null;
  }
}

module.exports = { generateAiActionPhrase, generateSensualText };
