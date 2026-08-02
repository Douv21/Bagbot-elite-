import subprocess

js_code = """
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function registerDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      registerDir(full);
    } else if (entry.name.endsWith('.ttf') || entry.name.endsWith('.otf')) {
      try { GlobalFonts.registerFromPath(full); } catch(e) {}
    }
  }
}

registerDir('/usr/share/fonts');

console.log('Registered font families count:', GlobalFonts.families.length);
console.log('Registered font families:', GlobalFonts.families.map(f => f.family));

const canvas = createCanvas(800, 200);
const ctx = canvas.getContext('2d');

const text = '𝔅𝔞𝔤 𝓥2 Éléonore ★ 🔥';

ctx.font = 'bold 50px "DejaVu Sans", "DejaVu Math TeX Gyre", "Symbola", "Noto Color Emoji", sans-serif';
ctx.fillStyle = '#ffffff';
ctx.fillText(text, 20, 100);

const buf = canvas.toBuffer('image/png');
console.log('SUCCESS! Buffer length:', buf.length);
"""

res = subprocess.run([
    r"C:\Users\maiso\.gemini\antigravity\scratch\plink.exe",
    "-batch",
    "-hostkey", "ssh-ed25519 255 SHA256:jUpI+ZryQE9AEVHww1yIkQSQf9PpW5kFoCQqc7lcBHU",
    "-pw", "maison",
    "maison@82.65.75.176",
    "cd /home/maison/bagbot-elite && node -e " + repr(js_code.replace('\n', ' '))
], capture_output=True, text=True)

print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
