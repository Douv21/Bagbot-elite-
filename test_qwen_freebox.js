const fetch = require('node-fetch');

async function testOllamaQwen() {
  console.log("=== TESTING LIGHTWEIGHT FREEBOX OLLAMA MODELS ===");
  const modelsToTest = ['qwen2.5:0.5b', 'smollm:360m', 'tinyllama:latest'];
  
  for (const model of modelsToTest) {
    const start = Date.now();
    try {
      const res = await fetch('http://192.168.1.145:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'Tu es un assistant d\'écriture romantique et sensuelle pour un bot Discord.' },
            { role: 'user', content: 'Rédige une phrase captivante et très sensuelle (max 180 caractères) pour Marc qui embrasse Sophie.' }
          ],
          stream: false,
          options: { temperature: 0.85, num_predict: 150 }
        })
      });
      const data = await res.json();
      const elapsed = Date.now() - start;
      console.log(`[${model} - ${elapsed}ms] Response:`, data.message ? data.message.content : JSON.stringify(data));
    } catch (e) {
      console.error(`[${model}] Error:`, e.message);
    }
  }
  process.exit(0);
}

testOllamaQwen();
