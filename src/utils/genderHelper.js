// Déterminer le genre et pronom d'un membre exclusivement via ses rôles Discord
function getMemberGender(member) {
  if (!member) return { gender: 'homme', pronoun: 'il', title: 'roi/prince' };

  // Scanner les rôles Discord du membre en ignorant les rôles séparateurs (ex: --- RÔLES ---)
  let roles = [];
  if (member.roles && member.roles.cache) {
    roles = member.roles.cache
      .map(r => r.name.toLowerCase().trim())
      .filter(r => !/^[=\-\s*_~|#+]+$/.test(r) && !r.includes('---') && !r.includes('==='));
  }

  // 1. Détection des rôles Femme / Elle
  const femaleKeywords = [
    'femme', 'femmes', 'fille', 'filles', 'girl', 'girls', 'fem', 'féminin', 'female',
    'mme', 'madame', 'she', 'her', 'elle', '♀', 'déesse', 'reine', 'princesse', 'lady', 'ladies',
    'woman', 'women', 'chérie', 'séductrice', 'bambina'
  ];

  const hasFemaleRole = roles.some(roleName => {
    const words = roleName.split(/[\s/\\_,-]+/);
    return femaleKeywords.some(kw => words.includes(kw) || roleName === kw);
  });

  if (hasFemaleRole) {
    return { gender: 'femme', pronoun: 'elle', title: 'reine/déesse' };
  }

  // 2. Détection des rôles Homme / Il
  const maleKeywords = [
    'homme', 'hommes', 'garçon', 'garçons', 'boy', 'boys', 'masc', 'masculin', 'male',
    'mr', 'monsieur', 'he', 'him', 'il', '♂', 'dieu', 'roi', 'prince', 'lord', 'man', 'men',
    'chéri', 'séducteur', 'bambino'
  ];

  const hasMaleRole = roles.some(roleName => {
    const words = roleName.split(/[\s/\\_,-]+/);
    return maleKeywords.some(kw => words.includes(kw) || roleName === kw);
  });

  if (hasMaleRole) {
    return { gender: 'homme', pronoun: 'il', title: 'roi/prince' };
  }

  // 3. Par défaut si aucun rôle de genre explicite n'apparaît
  return { gender: 'homme', pronoun: 'il', title: 'roi/prince' };
}

/**
 * Génère un bloc de consigne stricte de genre à injecter dans les prompts IA
 */
function getGenderInstruction(member) {
  if (!member) return "";
  const g = getMemberGender(member);
  const name = member.displayName || member.user?.username || 'le membre';
  
  if (g.gender === 'femme') {
    return `\n\n📌 ACCORDS DE GENRE OBLIGATOIRES : Le membre destinataire <@${member.id}> (${name}) est une FEMME (pronom "elle"). Tu DOIS impérativement accorder tous les adjectifs et participes passés au FÉMININ (ex: chère, envoûtante, ravissante, séduite, heureuse, sublime, reine, princesse, déesse). Il est STRICTEMENT INTERDIT de lui parler au masculin ou d'utiliser des pronoms masculins !`;
  } else {
    return `\n\n📌 ACCORDS DE GENRE OBLIGATOIRES : Le membre destinataire <@${member.id}> (${name}) est un HOMME (pronom "il"). Tu DOIS impérativement accorder tous les adjectifs et participes passés au MASCULIN (ex: cher, envoûtant, ravissant, séduit, heureux, sublime, roi, prince, dieu).`;
  }
}

// Formater un message avec les tags de genre
function formatGenderMessage(template, authorMember, targetMember) {
  if (!template) return '';

  const author = getMemberGender(authorMember);
  const target = targetMember ? getMemberGender(targetMember) : { gender: 'homme', pronoun: 'il' };

  let formatted = template
    .replace(/{A}/g, authorMember ? authorMember.displayName : 'Auteur')
    .replace(/{T}/g, targetMember ? targetMember.displayName : 'Cible');

  // Remplacements pour l'auteur (A)
  formatted = formatted
    .replace(/{A:e}/g, author.gender === 'femme' ? 'e' : '')
    .replace(/{A:pronom}/g, author.pronoun)
    .replace(/{A:le\/la}/g, author.gender === 'femme' ? 'la' : 'le')
    .replace(/{A:un\/une}/g, author.gender === 'femme' ? 'une' : 'un')
    .replace(/{A:il\/elle}/g, author.pronoun === 'elle' ? 'elle' : 'il')
    .replace(/{A:lui\/elle}/g, author.gender === 'femme' ? 'elle' : 'lui');

  // Remplacements pour la cible (T)
  formatted = formatted
    .replace(/{T:e}/g, target.gender === 'femme' ? 'e' : '')
    .replace(/{T:pronom}/g, target.pronoun)
    .replace(/{T:le\/la}/g, target.gender === 'femme' ? 'la' : 'le')
    .replace(/{T:un\/une}/g, target.gender === 'femme' ? 'une' : 'un')
    .replace(/{T:il\/elle}/g, target.pronoun === 'elle' ? 'elle' : 'il')
    .replace(/{T:lui\/elle}/g, target.gender === 'femme' ? 'elle' : 'lui');

  return formatted;
}

module.exports = {
  getMemberGender,
  getGenderInstruction,
  formatGenderMessage
};
