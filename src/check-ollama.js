async function testOllama() {
  try {
    const res = await fetch('http://192.168.1.145:11434/api/tags');
    const data = await res.json();
    console.log("--- MODELS AVAILABLE ON FREEBOX OLLAMA (192.168.1.145) ---");
    console.log(JSON.stringify(data.models, null, 2));
  } catch (e) {
    console.error("Erreur fetch tags Ollama:", e);
  }
}

testOllama();
