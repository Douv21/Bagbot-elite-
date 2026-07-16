const { getUserGender } = require('../database/db');

// Déterminer le genre et pronom d'un membre
function getMemberGender(member) {
  if (!member) return { gender: 'homme', pronoun: 'il' };

  // 1. Essayer de récupérer depuis la base de données
  const dbGender = getUserGender(member.id);
  if (dbGender) {
    return {
      gender: dbGender.gender,
      pronoun: dbGender.pronoun || (dbGender.gender === 'femme' ? 'elle' : 'il')
    };
  }

  // 2. Sinon, scanner les rôles du membre
  const roles = member.roles.cache.map(r => r.name.toLowerCase());
  
  const femaleKeywords = ['femme', 'fille', 'girl', 'fem', 'féminin', 'female', 'mme', 'madame', 'she', 'her'];
  const maleKeywords = ['homme', 'garçon', 'boy', 'masc', 'masculin', 'male', 'mr', 'monsieur', 'he', 'him'];

  const hasFemaleRole = roles.some(roleName => femaleKeywords.some(kw => roleName.includes(kw)));
  if (hasFemaleRole) {
    return { gender: 'femme', pronoun: 'elle' };
  }

  const hasMaleRole = roles.some(roleName => maleKeywords.some(kw => roleName.includes(kw)));
  if (hasMaleRole) {
    return { gender: 'homme', pronoun: 'il' };
  }

  // 3. Par défaut : homme / il
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
