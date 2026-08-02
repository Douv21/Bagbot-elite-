import subprocess

js_code = """
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
