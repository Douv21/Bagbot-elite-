const { callOllamaApi } = require('./src/utils/aiManager');
const { addAiKey, getAiKeys } = require('./src/database/db');

(async () => {
  console.log('Testing Ollama on Freebox Delta (192.168.1.145) with qwen2.5:0.5b...');
  try {
    const res = await callOllamaApi('http://192.168.1.145:11434', 'qwen2.5:0.5b', 'Tu es l\'assistant du serveur.', 'Bonjour, réponds en une phrase.', 0.7, 50);
    console.log('✅ OLLAMA SUCCESS ON FREEBOX DELTA:\n', res);

    const existing = getAiKeys().find(k => k.provider === 'ollama');
    if (!existing) {
      addAiKey('ollama', 'all', 'http://192.168.1.145:11434', 'Freebox Delta Ollama (qwen2.5:0.5b)');
      console.log('✅ Ollama key added to database!');
    }
  } catch (err) {
    console.error('❌ OLLAMA ERROR:', err.message);
  }
})();
