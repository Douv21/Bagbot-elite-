async function pullModel(modelName) {
  console.log(`\n⏳ Test & Téléchargement du modèle mobile/edge ultra-rapide "${modelName}" sur Ollama Freebox (http://192.168.1.145:11434)...`);
  try {
    const res = await fetch('http://192.168.1.145:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false })
    });
    const data = await res.json();
    console.log(`✅ Modèle "${modelName}" :`, data.status || data.error || 'OK');
  } catch (e) {
    console.error(`❌ Erreur lors de la tentative sur ${modelName}:`, e.message);
  }
}

async function main() {
  await pullModel('smollm2:1.7b');
  await pullModel('smollm:1.7b');
  await pullModel('smollm:360m');

  const tagsRes = await fetch('http://192.168.1.145:11434/api/tags');
  const tagsData = await tagsRes.json();
  console.log("\n--- LISTE MISE À JOUR DES MODÈLES LLM MOBILE & CPU ULTRA-RAPIDES ---");
  console.log(tagsData.models.map(m => `- ${m.name} (${(m.size / 1024 / 1024).toFixed(0)} MB)`).join('\n'));
}

main();
