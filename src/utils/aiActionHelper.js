const { getMemberGender } = require('./genderHelper');

async function generateAiActionPhrase(actionName, actionDescription, authorMember, targetMember) {
  try {
    const author = getMemberGender(authorMember);
    const target = targetMember ? getMemberGender(targetMember) : { gender: 'homme', pronoun: 'il' };

    const authorName = authorMember ? authorMember.displayName : 'Auteur';
    const targetName = targetMember ? targetMember.displayName : 'Cible';

    // Construire un prompt ultra direct et précis
    const systemPrompt = `Tu es un bot Discord. Génère une seule phrase courte, vivante, sensuelle et drôle en français pour l'action "${actionName}" (description: ${actionDescription}) où ${authorName} fait cette action sur ${targetName}.
Le genre de ${authorName} est ${author.gender} (pronom: ${author.pronoun}) et le genre de ${targetName} est ${target.gender} (pronom: ${target.pronoun}).
Fais des accords de genre parfaits. Ne mets aucun guillemet ni ponctuation superflue. Réponds uniquement par la phrase générée, sans aucune autre explication ni politesse.`;

    const response = await fetch('https://text.pollinations.ai/' + encodeURIComponent(systemPrompt), {
      signal: AbortSignal.timeout(2500) // 2.5 secondes max pour éviter d'attendre trop longtemps
    });

    if (response.ok) {
      const text = await response.text();
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
