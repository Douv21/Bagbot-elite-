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

  const systemPrompt = `Tu es un bot d'animation de serveur Discord de séduction adulte. Ton but est de générer une seule phrase courte, sensuelle, suggestive et torride en français pour décrire une action.`;
  const userPrompt = `Génère une seule phrase courte (max 200 caractères), suggestive et torride en français pour l'action "${actionName}" (description: ${actionDescription}) où ${authorName} fait cette action sur ${targetName}.
Le genre de ${authorName} est ${author.gender} (pronom: ${author.pronoun}) et le genre de ${targetName} est ${target.gender} (pronom: ${target.pronoun}).
Fais des accords de genre parfaits. Ne mets aucun guillemet ni ponctuation superflue. Réponds uniquement par la phrase générée, sans aucune autre explication ni politesse.`;

  // Tenter le modèle openai en premier, puis mistral en secours
  let result = await callPollinationsAI(systemPrompt, userPrompt, 'openai', 2000);
  if (!result) {
    result = await callPollinationsAI(systemPrompt, userPrompt, 'mistral', 2000);
  }
  return result;
}

async function generateSensualText(instruction, lengthLimit = 300) {
  const systemPrompt = `Tu es un bot d'animation Discord pour un serveur communautaire adulte/NSFW de séduction et d'amour.`;
  const userPrompt = `Génère un court message (maximum ${lengthLimit} caractères) en français suivant cette consigne : "${instruction}".
Le ton doit être extrêmement sensuel, suggestif, complice et torride, parfaitement adapté à un serveur NSFW haut de gamme.
Ne mets aucun guillemet ni ponctuation superflue autour du message. Réponds uniquement par la phrase générée, sans aucune autre explication ni politesse.`;

  let result = await callPollinationsAI(systemPrompt, userPrompt, 'openai', 2000);
  if (!result) {
    result = await callPollinationsAI(systemPrompt, userPrompt, 'mistral', 2000);
  }
  return result;
}

module.exports = { generateAiActionPhrase, generateSensualText };
