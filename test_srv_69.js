const { generateAiActionPhrase } = require('./src/utils/aiActionHelper');

async function main() {
  console.log("=== TEST COMPLET GENERATION /69 SUR LE SERVEUR ===");
  const res = await generateAiActionPhrase('69', 'Faire un 69 avec quelqu\'un', { displayName: 'Marc', gender: 'homme', guild: { id: '1360897918504271882' } }, { displayName: 'Sophie', gender: 'femme' });
  console.log("RÉSULTAT GÉNÉRÉ POUR /69:", res);
  process.exit(0);
}

main().catch(err => {
  console.error("ERREUR TEST:", err);
  process.exit(1);
});
