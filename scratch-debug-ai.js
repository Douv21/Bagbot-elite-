const { getAiKeys, getAiConfig } = require('./src/database/db');
const { generateAiCompletion } = require('./src/utils/aiManager');

(async () => {
  console.log('Testing generateAiCompletion with category: server...');
  try {
    const res = await generateAiCompletion({
      guildId: '1203001859661471744',
      category: 'server',
      systemPrompt: 'Tu es l\'assistant.',
      userPrompt: 'Bonjour',
      temperature: 0.2,
      maxTokens: 500
    });
    console.log('SUCCESS:', res);
  } catch (err) {
    console.error('FAILED:', err.stack || err.message);
  }
})();
