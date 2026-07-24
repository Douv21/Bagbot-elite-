async function pullModel(modelName) {
  console.log(`\n⏳ Lancement du téléchargement du modèle ultra-rapide "${modelName}" sur Ollama Freebox (http://192.168.1.145:11434)...`);
  try {
    const res = await fetch('http://192.168.1.145:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false })
    });
    const data = await res.json();
    console.log(`✅ Modèle "${modelName}" téléchargé avec succès ! Statut:`, data.status || 'OK');
  } catch (e) {
    console.error(`❌ Erreur lors du téléchargement de ${modelName}:`, e.message);
  }
}

async function main() {
  await pullModel('tinyllama');
  await pullModel('llama3.2:1b');
  
  // Vérifier les modèles disponibles
  const tagsRes = await fetch('http://192.168.1.145:11434/api/tags');
  const tagsData = await tagsRes.json();
  console.log("\n--- LISTE FINALE DES MODÈLES LLM INSTALLÉS ET ULTRA-RAPIDES ---");
  console.log(tagsData.models.map(m => `- ${m.name} (${(m.size / 1024 / 1024).toFixed(0)} MB)`).join('\n'));
}

main();
