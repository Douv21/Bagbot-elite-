const { generateAiCompletion } = require('./utils/aiManager');
const { getAiKeys } = require('./database/db');

async function test() {
  console.log("--- TESTING AI SPEED ---");
  const keys = getAiKeys(null, 'text').filter(k => k.is_active === 1);
  console.log("Active keys in DB:", keys.map(k => ({ provider: k.provider, label: k.label })));

  const start = Date.now();
  try {
    const res = await generateAiCompletion({
      systemPrompt: "Tu es un assistant.",
      userPrompt: "Bonjour, réponds en 3 mots.",
      temperature: 0.7,
      maxTokens: 50
    });
    console.log(`✅ Réponse reçue en ${Date.now() - start}ms : "${res}"`);
  } catch (e) {
    console.error(`❌ Erreur (${Date.now() - start}ms) :`, e.message);
  }
}

test();
