const { getMemberGender } = require('./genderHelper');

async function generateAiActionPhrase(actionName, actionDescription, authorMember, targetMember) {
  try {
    const author = getMemberGender(authorMember);
    const target = targetMember ? getMemberGender(targetMember) : { gender: 'homme', pronoun: 'il' };

    const authorName = authorMember ? authorMember.displayName : 'Auteur';
    const targetName = targetMember ? targetMember.displayName : 'Cible';

    // Construire un prompt ultra direct et précis
    const systemPrompt = `Tu es un bot Discord. Génère une seule phrase courte, très sensuelle, suggestive et torride en français pour l'action "${actionName}" (description: ${actionDescription}) où ${authorName} fait cette action sur ${targetName}.
Le ton doit être intime, passionné et torride.
Le genre de ${authorName} est ${author.gender} (pronom: ${author.pronoun}) et le genre de ${targetName} est ${target.gender} (pronom: ${target.pronoun}).
Fais des accords de genre parfaits. Ne mets aucun guillemet ni ponctuation superflue. Réponds uniquement par la phrase générée, sans aucune autre explication ni politesse.`;

    const response = await fetch('https://text.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: systemPrompt }],
        model: 'openai'
      }),
      signal: AbortSignal.timeout(4500) // 4.5 secondes max
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices[0].message.content;
      const cleanText = text.trim().replace(/^["']|["']$/g, '');
      // Vérifier que la réponse ne contient pas de message d'erreur ou d'échec du service
      if (cleanText && cleanText.length > 5 && !cleanText.toLowerCase().includes('erreur') && !cleanText.toLowerCase().includes('pollinations')) {
        return cleanText;
      }
    }
  } catch (err) {
    console.error('Erreur génération phrase IA:', err);
  }
  return null;
}

module.exports = { generateAiActionPhrase };
