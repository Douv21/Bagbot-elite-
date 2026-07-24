const net = require('net');
const { db } = require('./database/db');

console.log("--- AI KEYS IN DATABASE ---");
console.log(db.prepare("SELECT * FROM ai_keys WHERE provider = 'ollama'").all());

console.log("\n--- SCANNING LOCAL NETWORK (192.168.1.1 to 192.168.1.254) FOR OLLAMA (PORT 11434) ---");

for (let i = 1; i <= 254; i++) {
  const ip = `192.168.1.${i}`;
  const socket = new net.Socket();
  socket.setTimeout(400);

  socket.on('connect', () => {
    console.log(`✅ OLLAMA DÉTECTÉ ET ACTIF SUR L'IP : http://${ip}:11434`);
    socket.destroy();
  });

  socket.on('error', () => {
    socket.destroy();
  });

  socket.on('timeout', () => {
    socket.destroy();
  });

  socket.connect(11434, ip);
}
