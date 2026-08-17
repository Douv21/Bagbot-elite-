const { db, getAiConfig, getAiKeys } = require('./src/database/db');
const { generateAiActionPhrase } = require('./src/utils/aiActionHelper');

async function test() {
  console.log("=== CHECKING AI CONFIG & KEYS ===");
  const keys = getAiKeys(null, 'text');
  console.log("Active keys count:", keys.filter(k => k.is_active === 1).length);
  
  const configs = db.prepare('SELECT * FROM ai_config').all();
  console.log("ai_config entries in DB:", JSON.stringify(configs, null, 2));

  console.log("\n=== TESTING generateAiActionPhrase ('embrasser') ===");
  try {
    const res = await generateAiActionPhrase('embrasser', 'Embrasser fougueusement', null, null);
    console.log("GENERATED PHRASE RESULT:", res);
  } catch (err) {
    console.error("ERROR GENERATING PHRASE:", err);
  }
  process.exit(0);
}

test();
