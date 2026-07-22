// Déterminer le genre et pronom d'un membre exclusivement via ses rôles Discord
function getMemberGender(member) {
  if (!member) return { gender: 'homme', pronoun: 'il' };

  // Scanner les rôles Discord du membre
  const roles = (member.roles && member.roles.cache) ? member.roles.cache.map(r => r.name.toLowerCase().trim()) : [];
  
  // 1. Détection des rôles Femme / Elle
  const femaleKeywords = ['femme', 'fille', 'girl', 'fem', 'féminin', 'female', 'mme', 'madame', 'she', 'her', 'elle', '♀'];
  const hasFemaleRole = roles.some(roleName => {
    const words = roleName.split(/[\s/\\_-]+/);
    return femaleKeywords.some(kw => words.includes(kw) || roleName === kw);
  });

  if (hasFemaleRole) {
    return { gender: 'femme', pronoun: 'elle' };
  }

  // 2. Détection des rôles Homme / Il
  const maleKeywords = ['homme', 'garçon', 'boy', 'masc', 'masculin', 'male', 'mr', 'monsieur', 'he', 'him', 'il', '♂'];
  const hasMaleRole = roles.some(roleName => {
    const words = roleName.split(/[\s/\\_-]+/);
    return maleKeywords.some(kw => words.includes(kw) || roleName === kw);
  });

  if (hasMaleRole) {
    return { gender: 'homme', pronoun: 'il' };
  }

  // 3. Par défaut si aucun rôle n'apparaît : homme / il
  return { gender: 'homme', pronoun: 'il' };
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
  formatGenderMessage
};
