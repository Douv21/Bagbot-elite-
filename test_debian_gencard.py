import subprocess

js_code = """
const gen = require('./src/carte/holographique');
const mockMember = {
  displayName: 'TestUser',
  user: {
    username: 'testuser',
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
  }
};
const mockData = {
  level: 1, xp: 10, required: 100, messages: 5, voiceMinutes: 0, streak: 0, karma: 0, roleName: 'AUCUN'
};

gen(mockMember, mockData, 'holographique').then(a => {
  console.log('CARD GEN OK:', a.attachment.length);
}).catch(e => {
  console.error('CARD GEN ERR:', e);
});
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
