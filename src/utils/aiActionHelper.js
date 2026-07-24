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

module.exports = { generateAiActionPhrase, generateSensualText };
