import subprocess

js_code = """
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');

const fontPaths = [
  ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'DejaVu Sans'],
  ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVu Sans'],
  ['/usr/share/fonts/truetype/symbola/Symbola.ttf', 'Symbola'],
  ['/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf', 'Noto Color Emoji']
];

fontPaths.forEach(([p, alias]) => {
  if (fs.existsSync(p)) {
    try { GlobalFonts.registerFromPath(p, alias); } catch(e) {}
  }
});

const FONT = '"DejaVu Sans", "Symbola", "Noto Color Emoji", sans-serif';

const c = createCanvas(800, 200);
const ctx = c.getContext('2d');
const username = '𝔅𝔞𝔤 𝓥2 Éléonore ★ 🔥';

let namePx = 68;
ctx.font = 'bold ' + namePx + 'px ' + FONT;
while (ctx.measureText(username).width > 480 && namePx > 30) {
  namePx -= 2;
  ctx.font = 'bold ' + namePx + 'px ' + FONT;
}

ctx.fillStyle = '#ffffff';
ctx.fillText(username, 50, 100);
const buf = c.toBuffer('image/png');
console.log('SUCCESS! Buffer size:', buf.length, 'font size:', namePx, 'width:', ctx.measureText(username).width);
"""

flat_js = js_code.replace('\n', ' ')

res = subprocess.run([
    r"C:\Users\maiso\.gemini\antigravity\scratch\plink.exe",
    "-batch",
    "-hostkey", "ssh-ed25519 255 SHA256:jUpI+ZryQE9AEVHww1yIkQSQf9PpW5kFoCQqc7lcBHU",
    "-pw", "maison",
    "maison@82.65.75.176",
    "cd /home/maison/bagbot-elite && node -e " + repr(flat_js)
], capture_output=True, text=True)

print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
