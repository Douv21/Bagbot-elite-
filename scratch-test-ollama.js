const { callOllamaApi, generateAiCompletion } = require('./src/utils/aiManager');
const { addAiKey, getAiKeys } = require('./src/database/db');

(async () => {
  console.log('Testing Ollama on Freebox Delta (192.168.1.145)...');
  try {
    const res = await callOllamaApi('http://192.168.1.145:11434', 'qwen2.5:1.5b', 'Tu es l\'assistant du serveur.', 'Bonjour', 0.7, 100);
    console.log('✅ OLLAMA RESPONDED SUCCESSFULLY:\n', res);

    // Register key in DB if not already present
    const existing = getAiKeys().find(k => k.provider === 'ollama');
    if (!existing) {
      addAiKey('ollama', 'all', 'http://192.168.1.145:11434', 'Freebox Delta Ollama (qwen2.5:1.5b)');
      console.log('✅ Key registered in DB!');
    }
  } catch (err) {
    console.error('❌ OLLAMA ERROR:', err.message);
  }
})();
