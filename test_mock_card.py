import subprocess

cmd = '''node -e "
const genCard = require('./src/carte/holographique');
const mockMember = {
  displayName: '𝔅𝔞𝔤 𝓥2 Éléonore ★ 🔥',
  user: {
    username: 'eleonore_bag',
    discriminator: '0',
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
  }
};
const mockData = {
  level: 12,
  xp: 1500,
  required: 3000,
  messages: 250,
  voiceMinutes: 420,
  streak: 5,
  karma: 850,
  roleName: 'VIP Gold'
};

genCard(mockMember, mockData, 'holographique').then(attachment => {
  console.log('Card Attachment Name:', attachment.name);
  console.log('Buffer Size:', attachment.attachment.length);
}).catch(err => console.error('Error generating card:', err));
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
