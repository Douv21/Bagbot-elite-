import re

print("Patching src/carte/card-worker.js with font registration and FONT_FAMILY fallback...")

with open('src/carte/card-worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update require: const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
content = content.replace(
    "const { createCanvas, loadImage } = require('@napi-rs/canvas');",
    """const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');

// Enregistrer les polices système Unicode et Emojis pour la compatibilité Linux / Debian
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

const FONT_FAMILY = '"DejaVu Sans", "Liberation Sans", "Noto Color Emoji", "Symbola", "Segoe UI", Arial, sans-serif";"""
)

# 2. Replace all instances of Arial with FONT_FAMILY or font family string
# e.g., '30px Arial' -> `30px ${FONT_FAMILY}`
# e.g., `bold ${ar}px Arial` -> `bold ${ar}px ${FONT_FAMILY}`
# e.g., 'bold 28px Arial' -> `bold 28px ${FONT_FAMILY}`

content = re.sub(r"(['`])([^'`]*?)\bArial\b([^'`]*?)(['`])", r'`\2${FONT_FAMILY}\3`', content)

with open('src/carte/card-worker.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched card-worker.js successfully!")
