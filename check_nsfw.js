const { generateAiActionPhrase } = require('./src/utils/aiActionHelper');

async function testAction() {
  console.log("=== TESTING generateAiActionPhrase AFTER PROMPT REFINEMENT ===");
  try {
    const res = await generateAiActionPhrase('embrasser', 'Embrasser fougueusement', null, null);
    console.log("GENERATED ACTION PHRASE RESULT:", res);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
  process.exit(0);
}

testAction();
