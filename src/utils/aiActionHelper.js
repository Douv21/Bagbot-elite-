const { getMemberGender } = require('./genderHelper');

async function generateAiActionPhrase(actionName, actionDescription, authorMember, targetMember) {
  const author = getMemberGender(authorMember);
  const target = targetMember ? getMemberGender(targetMember) : { gender: 'homme', pronoun: 'il' };

  const authorName = authorMember ? authorMember.displayName : 'Auteur';
  const targetName = targetMember ? targetMember.displayName : 'Cible';

  const systemPrompt = `Tu es un bot Discord. Génère une seule phrase courte, très sensuelle, suggestive et torride en français pour l'action "${actionName}" (description: ${actionDescription}) où ${authorName} fait cette action sur ${targetName}.
Le ton doit être intime, passionné et torride.
Le genre de ${authorName} est ${author.gender} (pronom: ${author.pronoun}) et le genre of ${targetName} is ${target.gender} (pronom: ${target.pronoun}).
Fais des accords de genre parfaits. Ne mets aucun guillemet ni ponctuation superflue. Réponds uniquement par la phrase générée, sans aucune autre explication ni politesse.`;

  // Étape unique : Appel GET direct ultra-rapide (timeout 1.5s pour éviter tout ralentissement du bot)
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(systemPrompt)}?model=openai`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1500) // 1.5 seconde maximum
    });

    if (response.ok) {
      const text = await response.text();
      const cleanText = text.trim().replace(/^["']|["']$/g, '');
      if (cleanText && cleanText.length > 5 && !cleanText.toLowerCase().includes('erreur') && !cleanText.toLowerCase().includes('pollinations')) {
        return cleanText;
      }
    }
  } catch (err) {
    console.warn(`GET AI direct failed or timed out (1.5s): ${err.message}. Using instant local fallback.`);
  }

  return null;
}

async function generateSensualText(instruction, lengthLimit = 300) {
  const systemPrompt = `Tu es un bot d'animation Discord pour un serveur communautaire adulte/NSFW de séduction et d'amour.
Génère un court message (maximum ${lengthLimit} caractères) en français suivant cette consigne : "${instruction}".
Le ton doit être extrêmement sensuel, suggestif, complice et torride, parfaitement adapté à un serveur NSFW haut de gamme.
Ne mets aucun guillemet ni ponctuation superflue autour du message. Réponds uniquement par la phrase générée, sans aucune autre explication ni politesse.`;

  // Étape unique : Appel GET direct ultra-rapide (timeout 1.5s)
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(systemPrompt)}?model=openai`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1500) // 1.5 seconde maximum
    });

    if (response.ok) {
      const text = await response.text();
      const cleanText = text.trim().replace(/^["']|["']$/g, '');
      if (cleanText && cleanText.length > 5 && !cleanText.toLowerCase().includes('erreur') && !cleanText.toLowerCase().includes('pollinations')) {
        return cleanText;
      }
    }
  } catch (err) {
    console.warn(`GET AI generic failed or timed out (1.5s): ${err.message}. Using instant local fallback.`);
  }

  return null;
}

module.exports = { generateAiActionPhrase, generateSensualText };
