const { getAiKeys, getAiConfig } = require('./src/database/db');
const { callGroqApi, callGeminiApi } = require('./src/utils/aiManager');

const keys = getAiKeys();
console.log('Total keys in DB:', keys.length);

(async () => {
  for (const k of keys) {
    console.log(`\nTesting key ID ${k.id} [${k.provider}] label "${k.label}"...`);
    try {
      if (k.provider === 'groq') {
        const res = await callGroqApi(k.api_key, 'llama-3.3-70b-versatile', 'Test', 'Bonjour', 0.7, 50);
        console.log('SUCCESS:', res);
      } else if (k.provider === 'gemini') {
        const res = await callGeminiApi(k.api_key, 'gemini-2.0-flash', 'Test', 'Bonjour', 0.7, 50);
        console.log('SUCCESS:', res);
      }
    } catch (e) {
      console.error('FAILED:', e.message);
    }
  }
})();
