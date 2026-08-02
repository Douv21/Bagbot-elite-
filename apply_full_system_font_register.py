print("Applying full system font scanner and registration to card-worker.js...")

with open('src/carte/card-worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

top_patch = """const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Enregistrer automatiquement toutes les polices système Linux (DejaVu, Symbola, Noto Emoji, TeX Gyre, etc.)
function registerSystemFonts(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        registerSystemFonts(full);
      } else if (entry.name.endsWith('.ttf') || entry.name.endsWith('.otf') || entry.name.endsWith('.ttc')) {
        try { GlobalFonts.registerFromPath(full); } catch (e) {}
      }
    }
  } catch (e) {}
}

registerSystemFonts('/usr/share/fonts');"""

content = content.replace("const { createCanvas, loadImage } = require('@napi-rs/canvas');", top_patch)

with open('src/carte/card-worker.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied full system font scanner to card-worker.js successfully!")
