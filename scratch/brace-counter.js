const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '../public/script.js'), 'utf8');

let curlyCount = 0;
let parenCount = 0;
let line = 1;
let col = 1;

const curlyStack = [];
const parenStack = [];

// Skip comments and string literals to prevent false positives
let inSingleLineComment = false;
let inMultiLineComment = false;
let inString = false;
let stringChar = '';

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  const nextChar = content[i + 1];

  if (inSingleLineComment) {
    if (char === '\n') {
      inSingleLineComment = false;
      line++;
      col = 1;
    } else {
      col++;
    }
    continue;
  }

  if (inMultiLineComment) {
    if (char === '*' && nextChar === '/') {
      inMultiLineComment = false;
      i++;
      col += 2;
    } else if (char === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
    continue;
  }

  if (inString) {
    if (char === stringChar && content[i - 1] !== '\\') {
      inString = false;
    }
    if (char === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
    continue;
  }

  if (char === '/' && nextChar === '/') {
    inSingleLineComment = true;
    i++;
    col += 2;
    continue;
  }

  if (char === '/' && nextChar === '*') {
    inMultiLineComment = true;
    i++;
    col += 2;
    continue;
  }

  if (char === "'" || char === '"' || char === '`') {
    inString = true;
    stringChar = char;
    col++;
    continue;
  }

  if (char === '\n') {
    line++;
    col = 1;
    continue;
  }

  col++;

  if (char === '{') {
    curlyCount++;
    curlyStack.push({ line, col });
  } else if (char === '}') {
    curlyCount--;
    if (curlyCount === 0) {
      console.log(`[NESTING] curlyCount hit 0 at line ${line}, col ${col}`);
    }
    if (curlyStack.length === 0) {
      console.log(`Extra } at line ${line}, col ${col}`);
    } else {
      curlyStack.pop();
    }
  } else if (char === '(') {
    parenCount++;
    parenStack.push({ line, col });
  } else if (char === ')') {
    parenCount--;
    if (parenStack.length === 0) {
      console.log(`Extra ) at line ${line}, col ${col}`);
    } else {
      parenStack.pop();
    }
  }
}

console.log(`Final curlyCount: ${curlyCount}`);
console.log(`Final parenCount: ${parenCount}`);
