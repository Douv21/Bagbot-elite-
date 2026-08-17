const { generateAiCompletion } = require('./src/utils/aiManager');
const { generateAiActionPhrase } = require('./src/utils/aiActionHelper');

async function testActions() {
  console.log("=== TEST DES ACTIONS IA EN PROFONDEUR ===");

  const actionsToTest = [
    { name: '69', desc: 'Faire un 69 avec quelqu\'un' },
    { name: 'sodo', desc: 'Faire une sodomie' },
    { name: 'branler', desc: 'Faire une gâterie à la main' },
    { name: 'sucer', desc: 'Faire une fellation' }
  ];

  for (const act of actionsToTest) {
    console.log(`\n--- Test Action: /${act.name} ---`);
    try {
      const res = await generateAiActionPhrase(act.name, act.desc, { displayName: 'Marc', gender: 'homme', guild: { id: '1360897918504271882' } }, { displayName: 'Sophie', gender: 'femme' });
      console.log(`Résultat pour /${act.name}:`, res);
    } catch (e) {
      console.log(`Erreur pour /${act.name}:`, e.message);
    }
  }

  process.exit(0);
}

testActions();
