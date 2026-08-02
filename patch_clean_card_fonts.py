print("Patching card-worker.js safely with GlobalFonts and font family stack...")

with open('src/carte/card-worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update require: const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
top_patch = """const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');

// Enregistrer les polices système Unicode, Symboles et Emojis pour la compatibilité Linux / Debian
const FONT_PATHS = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSansExtra.ttf',
  '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
  '/usr/share/fonts/truetype/symbola/Symbola.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
];

FONT_PATHS.forEach(fontPath => {
  if (fs.existsSync(fontPath)) {
    try { GlobalFonts.registerFromPath(fontPath); } catch (e) {}
  }
});

const FONT_FAMILY = '"DejaVu Sans", "Liberation Sans", "Noto Color Emoji", "Symbola", "Segoe UI", Arial, sans-serif';"""

content = content.replace("const { createCanvas, loadImage } = require('@napi-rs/canvas');", top_patch)

# 2. Replace 'Arial' with ' + FONT_FAMILY
content = content.replace("'Arial'", " + FONT_FAMILY")
content = content.replace(" Arial'", ' " + FONT_FAMILY')

with open('src/carte/card-worker.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Card worker fonts patched successfully!")
