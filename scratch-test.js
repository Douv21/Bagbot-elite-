const { getAiKeys, getAiConfig } = require('./src/database/db');
const { generateAiCompletion } = require('./src/utils/aiManager');

console.log('--- DB KEYS ---');
console.log(getAiKeys());

(async () => {
  try {
    const res = await generateAiCompletion({
      category: 'text',
      systemPrompt: 'Test',
      userPrompt: 'Dis bonjour en 3 mots.',
      temperature: 0.7,
      maxTokens: 50
    });
    console.log('--- RESULT ---');
    console.log(res);
  } catch (err) {
    console.error('--- ERROR ---', err);
  }
})();
