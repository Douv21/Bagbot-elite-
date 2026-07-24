const { callGroqApi, callOllamaApi } = require('./utils/aiManager');
const { getAiKeys } = require('./database/db');

const prompt = "Explique en 2 phrases simples ce qu'est un trou noir dans l'espace.";
const systemPrompt = "Tu es un assistant IA précis, concis et en français.";

async function runBenchmark() {
  console.log("=========================================================");
  console.log("   🚀 BENCHMARK COMPARATIF : TEMPS DE RÉPONSE & QUALITÉ  ");
  console.log("=========================================================");
  console.log(`PROMPT TEST: "${prompt}"\n`);

  const results = [];

  // 1. Test Groq Cloud API
  const groqKeyObj = getAiKeys(null, 'text').find(k => k.provider === 'groq' && k.is_active === 1);
  if (groqKeyObj) {
    const start = Date.now();
    try {
      const res = await callGroqApi(groqKeyObj.api_key, 'llama-3.3-70b-versatile', systemPrompt, prompt, 0.7, 100);
      const timeMs = Date.now() - start;
      results.push({ provider: 'Groq Cloud', model: 'llama-3.3-70b-versatile', size: 'Cloud Llama 70B', timeMs, response: res });
    } catch (e) {
      results.push({ provider: 'Groq Cloud', model: 'llama-3.3-70b-versatile', size: 'Cloud Llama 70B', timeMs: -1, error: e.message });
    }
  }

  // 2. Test Ollama Freebox Models
  const ollamaModels = [
    { name: 'smollm2:1.7b', label: 'SmolLM2 1.7B (Mistral)' },
    { name: 'llama3.2:1b', label: 'Llama 3.2 1B (Meta)' },
    { name: 'qwen2.5:0.5b', label: 'Qwen 2.5 0.5B (Alibaba)' },
    { name: 'smollm:360m', label: 'SmolLM 360M (Mistral)' },
    { name: 'tinyllama', label: 'TinyLlama 1.1B' }
  ];

  for (const m of ollamaModels) {
    const start = Date.now();
    try {
      const res = await callOllamaApi('http://192.168.1.145:11434', m.name, systemPrompt, prompt, 0.7, 100);
      const timeMs = Date.now() - start;
      results.push({ provider: 'Freebox Ollama', model: m.label, size: m.name, timeMs, response: res });
    } catch (e) {
      results.push({ provider: 'Freebox Ollama', model: m.label, size: m.name, timeMs: -1, error: e.message });
    }
  }

  console.log("---------------------------------------------------------");
  console.log("                  RÉSULTATS DU BENCHMARK                 ");
  console.log("---------------------------------------------------------\n");

  results.sort((a, b) => (a.timeMs > 0 ? a.timeMs : 99999) - (b.timeMs > 0 ? b.timeMs : 99999));

  results.forEach((r, idx) => {
    console.log(`[#${idx + 1}] ${r.provider} - ${r.model}`);
    console.log(`⏱️ Temps de réponse : ${r.timeMs > 0 ? r.timeMs + ' ms (' + (r.timeMs / 1000).toFixed(2) + 's)' : '❌ Erreur'}`);
    if (r.response) {
      console.log(`💬 Extrait réponse  : "${r.response.replace(/\n/g, ' ').substring(0, 150)}..."`);
    } else {
      console.log(`⚠️ Erreur : ${r.error}`);
    }
    console.log('');
  });
}

runBenchmark();
