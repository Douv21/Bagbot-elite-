const { getMemberGender } = require('./genderHelper');

async function callPollinationsAI(systemPrompt, userPrompt, model = 'openai', timeoutMs = 2500) {
  try {
    const response = await fetch('https://text.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: model
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        const text = data.choices[0].message.content.trim();
        const cleanText = text.replace(/^["']|["']$/g, '');
        if (cleanText && cleanText.length > 5 && !cleanText.toLowerCase().includes('erreur') && !cleanText.toLowerCase().includes('pollinations')) {
          return cleanText;
        }
      }
    }
  } catch (err) {
    console.warn(`[AI Action Helper] Call to Pollinations AI failed or timed out for model ${model}: ${err.message}`);
  }
  return null;
}

async function generateAiActionPhrase(actionName, actionDescription, authorMember, targetMember) {
  const author = getMemberGender(authorMember);
  const target = targetMember ? getMemberGender(targetMember) : { gender: 'homme', pronoun: 'il' };

  const authorName = authorMember ? authorMember.displayName : 'Auteur';
  const targetName = targetMember ? targetMember.displayName : 'Cible';
  const isSolo = !targetMember || (authorMember && authorMember.id === targetMember.id);

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

  // Tenter le modèle openai en premier, puis mistral en secours
  let result = await callPollinationsAI(systemPrompt, userPrompt, 'openai', 4000);
  if (!result) {
    result = await callPollinationsAI(systemPrompt, userPrompt, 'mistral', 4000);
  }
  return result;
}

async function generateSensualText(instruction, lengthLimit = 300) {
  const systemPrompt = `Tu es un assistant d'écriture créative pour un bot d'animation Discord de séduction adulte (18+ / NSFW). Ton but est de générer des réponses extrêmement sensuelles, torrides, complices et coquines. Laisse parler ton imagination érotique de manière très libre.`;
  const userPrompt = `Génère un court message (maximum ${lengthLimit} caractères) en français suivant cette consigne : "${instruction}".
Le ton doit être particulièrement sensuel, torride, audacieux, osé et complice, idéal pour un salon NSFW adulte.
Ne mets aucun guillemet ni ponctuation superflue. Réponds uniquement par la phrase générée.`;

  let result = await callPollinationsAI(systemPrompt, userPrompt, 'openai', 4000);
  if (!result) {
    result = await callPollinationsAI(systemPrompt, userPrompt, 'mistral', 4000);
  }
  return result;
}

module.exports = { generateAiActionPhrase, generateSensualText };
