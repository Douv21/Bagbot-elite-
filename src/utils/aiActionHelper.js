const { getMemberGender } = require('./genderHelper');

async function generateAiActionPhrase(actionName, actionDescription, authorMember, targetMember) {
  const author = getMemberGender(authorMember);
  const target = targetMember ? getMemberGender(targetMember) : { gender: 'homme', pronoun: 'il' };

  const authorName = authorMember ? authorMember.displayName : 'Auteur';
  const targetName = targetMember ? targetMember.displayName : 'Cible';

  const systemPrompt = `Tu es un bot Discord. Génère une seule phrase courte, très sensuelle, suggestive et torride en français pour l'action "${actionName}" (description: ${actionDescription}) où ${authorName} fait cette action sur ${targetName}.
Le ton doit être intime, passionné et torride.
Le genre de ${authorName} est ${author.gender} (pronom: ${author.pronoun}) et le genre de ${targetName} est ${target.gender} (pronom: ${target.pronoun}).
Fais des accords de genre parfaits. Ne mets aucun guillemet ni ponctuation superflue. Réponds uniquement par la phrase générée, sans aucune autre explication ni politesse.`;

  // Étape 1 : Essayer via un appel GET direct (extrêmement rapide, évite le parsing JSON et l'encapsulation HTTP)
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(systemPrompt)}?model=llama`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000) // Très rapide : 4s max
    });

    if (response.ok) {
      const text = await response.text();
      const cleanText = text.trim().replace(/^["']|["']$/g, '');
      if (cleanText && cleanText.length > 5 && !cleanText.toLowerCase().includes('erreur') && !cleanText.toLowerCase().includes('pollinations')) {
        return cleanText;
      }
    }
  } catch (err) {
    console.warn('GET AI direct failed, attempting fallback POST...', err.message);
  }

  // Étape 2 : Si le GET échoue, faire un appel POST de secours (plus lourd)
  try {
    const response = await fetch('https://text.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: systemPrompt }],
        model: 'llama'
      }),
      signal: AbortSignal.timeout(5000) // 5s max
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices[0].message.content;
      const cleanText = text.trim().replace(/^["']|["']$/g, '');
      if (cleanText && cleanText.length > 5 && !cleanText.toLowerCase().includes('erreur') && !cleanText.toLowerCase().includes('pollinations')) {
        return cleanText;
      }
    }
  } catch (err) {
    console.error('Erreur finale génération phrase IA (POST Fallback):', err.message);
  }

  return null;
}

async function generateSensualText(instruction, lengthLimit = 300) {
  const systemPrompt = `Tu es un bot d'animation Discord pour un serveur communautaire adulte/NSFW de séduction et d'amour.
Génère un court message (maximum ${lengthLimit} caractères) en français suivant cette consigne : "${instruction}".
Le ton doit être extrêmement sensuel, suggestif, complice et torride, parfaitement adapté à un serveur NSFW haut de gamme.
Ne mets aucun guillemet ni ponctuation superflue autour du message. Réponds uniquement par la phrase générée, sans aucune autre explication ni politesse.`;

  // Étape 1 : Essayer via un appel GET direct (extrêmement rapide et stable)
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(systemPrompt)}?model=llama`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000) // 4s max
    });

    if (response.ok) {
      const text = await response.text();
      const cleanText = text.trim().replace(/^["']|["']$/g, '');
      if (cleanText && cleanText.length > 5 && !cleanText.toLowerCase().includes('erreur') && !cleanText.toLowerCase().includes('pollinations')) {
        return cleanText;
      }
    }
  } catch (err) {
    console.warn('GET AI generic failed, trying fallback POST...', err.message);
  }

  // Étape 2 : Si le GET échoue, faire un appel POST de secours
  try {
    const response = await fetch('https://text.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: systemPrompt }],
        model: 'llama'
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices[0].message.content;
      const cleanText = text.trim().replace(/^["']|["']$/g, '');
      if (cleanText && cleanText.length > 5 && !cleanText.toLowerCase().includes('erreur') && !cleanText.toLowerCase().includes('pollinations')) {
        return cleanText;
      }
    }
  } catch (err) {
    console.error('Erreur finale génération texte sensuel IA (POST Fallback):', err.message);
  }

  return null;
}

module.exports = { generateAiActionPhrase, generateSensualText };
