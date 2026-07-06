/**
 * Évalue une expression mathématique simple contenant uniquement +, -, *, /, (, ) et des nombres de manière sécurisée (sans eval).
 * Retourne le résultat numérique, ou null si l'expression est invalide ou contient des caractères non autorisés.
 */
function evaluateMath(expression) {
  // Supprime tous les espaces
  const str = expression.replace(/\s+/g, '');
  
  // Regex de sécurité : seuls les chiffres, points décimaux et +, -, *, /, (, ) sont autorisés
  if (!/^[0-9+\-*/().]+$/.test(str)) {
    return null;
  }
  
  let pos = 0;
  
  function peek() {
    return str[pos] || null;
  }
  
  function consume() {
    return str[pos++] || null;
  }
  
  function parseExpression() {
    let result = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const nextTerm = parseTerm();
      if (op === '+') {
        result += nextTerm;
      } else {
        result -= nextTerm;
      }
    }
    return result;
  }
  
  function parseTerm() {
    let result = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const nextFactor = parseFactor();
      if (op === '*') {
        result *= nextFactor;
      } else {
        if (nextFactor === 0) throw new Error('Division by zero');
        result /= nextFactor;
      }
    }
    return result;
  }
  
  function parseFactor() {
    const next = peek();
    if (next === '(') {
      consume(); // consume '('
      const result = parseExpression();
      if (consume() !== ')') {
        throw new Error('Mismatched parenthesis');
      }
      return result;
    }
    
    if (next === '-' || next === '+') {
      const sign = consume() === '-' ? -1 : 1;
      return sign * parseFactor();
    }
    
    // Parse a number
    let numStr = '';
    while (peek() !== null && /[0-9.]/.test(peek())) {
      numStr += consume();
    }
    
    if (numStr === '') {
      throw new Error('Expected number');
    }
    
    const value = parseFloat(numStr);
    if (isNaN(value)) {
      throw new Error('Invalid number');
    }
    return value;
  }
  
  try {
    const finalValue = parseExpression();
    if (pos < str.length) {
      return null; // Il reste des caractères non analysés
    }
    return finalValue;
  } catch (e) {
    return null;
  }
}

module.exports = { evaluateMath };
