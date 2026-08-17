const fetch = require('node-fetch');

async function testOllamaQwen() {
  console.log("=== TESTING FREEBOX OLLAMA (uncensored-qwen) ===");
  const start = Date.now();
  try {
    const res = await fetch('http://192.168.1.145:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'uncensored-qwen:latest',
        messages: [
          { role: 'system', content: 'Tu es un assistant d\'écriture romantique et sensuelle pour un bot Discord.' },
          { role: 'user', content: 'Rédige une phrase captivante, très sensuelle et torride (max 180 caractères) décrivant un 69 entre Marc et Sophie.' }
        ],
        stream: false,
        options: { temperature: 0.85, num_predict: 150 }
      })
    });
    const data = await res.json();
    const elapsed = Date.now() - start;
    console.log(`[${elapsed}ms] Response:`, data.message ? data.message.content : JSON.stringify(data));
  } catch (e) {
    console.error("Ollama test error:", e.message);
  }
  process.exit(0);
}

testOllamaQwen();
