const { callOllamaApi } = require('./utils/aiManager');

async function testFastModel() {
  console.log("--> Testing Ollama llama3.2:1b & qwen2.5:0.5b...");
  const start = Date.now();
  try {
    const res = await callOllamaApi('http://192.168.1.145:11434', 'llama3.2:1b', 'Tu es un assistant ultra-rapide.', 'Bonjour, dis-moi bonjour rapidement.', 0.7, 40);
    console.log(`⚡ Réponse Ollama reçue en ${Date.now() - start}ms : "${res}"`);
  } catch (e) {
    console.error(`❌ Erreur Ollama (${Date.now() - start}ms) :`, e.message);
  }
}

testFastModel();
