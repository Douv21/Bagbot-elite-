const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function registerDir(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        registerDir(full);
      } else if (entry.name.endsWith('.ttf') || entry.name.endsWith('.otf') || entry.name.endsWith('.ttc')) {
        try { GlobalFonts.registerFromPath(full); } catch(e) {}
      }
    }
  } catch(e) {}
}

registerDir('/usr/share/fonts');

console.log('Total Families:', GlobalFonts.families.length);
const matching = GlobalFonts.families.filter(f => 
  f.family.toLowerCase().includes('emoji') || 
  f.family.toLowerCase().includes('symbol') || 
  f.family.toLowerCase().includes('dejavu') ||
  f.family.toLowerCase().includes('noto')
);

console.log('Matching Families:', matching.map(f => f.family));
