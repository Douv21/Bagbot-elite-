const { generateAiCompletion } = require('./utils/aiManager');

async function test() {
  console.log("--> Testing generateAiCompletion starting...");
  const start = Date.now();
  try {
    const res = await generateAiCompletion({
      systemPrompt: "Tu es un assistant.",
      userPrompt: "Bonjour, réponds en 3 mots.",
      temperature: 0.7,
      maxTokens: 50
    });
    console.log(`✅ Succès (${Date.now() - start}ms) : "${res}"`);
  } catch (e) {
    console.error(`❌ Erreur (${Date.now() - start}ms) :`, e.message);
  }
}

test();
