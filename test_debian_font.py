import subprocess

cmd = '''node -e "
const { createCanvas, GlobalFonts } = require('./node_modules/@napi-rs/canvas');
const fs = require('fs');

const f1 = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const f2 = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
if (fs.existsSync(f1)) GlobalFonts.registerFromPath(f1, 'DejaVuSansBold');
if (fs.existsSync(f2)) GlobalFonts.registerFromPath(f2, 'DejaVuSans');

const c = createCanvas(800, 200);
const ctx = c.getContext('2d');
ctx.font = 'bold 50px DejaVuSans, sans-serif';
const text = '𝔅𝔞𝔤 𝓥2 Éléonore ★ 🔥';
console.log('Width:', ctx.measureText(text).width);
ctx.fillStyle = '#ffffff';
ctx.fillText(text, 10, 100);
const buf = c.toBuffer('image/png');
console.log('PNG Buffer size:', buf.length);
"'''

res = subprocess.run([
    r"C:\Users\maiso\.gemini\antigravity\scratch\plink.exe",
    "-batch",
    "-hostkey", "ssh-ed25519 255 SHA256:jUpI+ZryQE9AEVHww1yIkQSQf9PpW5kFoCQqc7lcBHU",
    "-pw", "maison",
    "maison@82.65.75.176",
    f"cd /home/maison/bagbot-elite && {cmd}"
], capture_output=True, text=True)

print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
