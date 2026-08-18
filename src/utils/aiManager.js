const { db, getAiKeys, getAiConfig } = require('../database/db');

// Index de rotation pour répartition équitable des clés
const keyRotationIndex = {
  groq: 0,
  gemini: 0
};

function isRefusalResponse(text) {
  if (!text || typeof text !== 'string') return true;
  const normalized = text.toLowerCase().replace(/[’'′`]/g, "'");
  return (
    normalized.includes("sorry") ||
    normalized.includes("can't help") ||
    normalized.includes("cannot help") ||
    normalized.includes("cannot fulfill") ||
    normalized.includes("as an ai") ||
    normalized.includes("je ne peux pas") ||
    normalized.includes("désolé") ||
    normalized.includes("inappropriate")
  );
}

/**
 * Appelle l'API Groq (OpenAI Compatible)
 */
async function callGroqApi(apiKey, model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1000, messagesHistory = null) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  if (messagesHistory && Array.isArray(messagesHistory) && messagesHistory.length > 0) {
    messages.push(...messagesHistory);
  } else if (userPrompt) {
    messages.push({ role: 'user', content: userPrompt });
  }

  const modelsToTry = [
    model || 'compound-beta-mini',
    'compound-beta-mini',
    'groq/compound-mini'
  ];

  const uniqueModels = [...new Set(modelsToTry)];
  let lastError = null;

  for (const targetModel of uniqueModels) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          const content = data.choices[0].message.content.trim();
          if (!isRefusalResponse(content)) {
            return content;
          }
          lastError = new Error(`Groq model returned safety refusal: ${content}`);
        }
      } else {
        const errorText = await response.text().catch(() => '');
        lastError = new Error(`Groq API (${targetModel}) HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        
        if (errorText.includes('organization_restricted') || errorText.includes('invalid_api_key') || response.status === 401 || response.status === 403) {
          throw lastError;
        }
        console.warn(`[AI Manager] Groq modèle ${targetModel} indisponible (${response.status}), tentative sur modèle alternatif...`);
      }
    } catch (err) {
      if (err.message.includes('organization_restricted') || err.message.includes('invalid_api_key') || err.message.includes('401') || err.message.includes('403')) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('Groq API request failed');
}

/**
 * Appelle l'API Groq Vision (Vision LLM)
 */
async function callGroqVisionApi(apiKey, model, prompt, imageUrl, temperature = 0.7, maxTokens = 1000) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt || 'Décris cette image en détail.' },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }
  ];

  // Seul modèle Vision Groq disponible avec cette clé (août 2026)
  const modelsToTry = [
    model,
    'qwen/qwen3.6-27b'
  ].filter(m => m && ![
    'llama-3.2-11b-vision-preview',
    'llama-3.2-90b-vision-preview',
    'llama-3.2-90b-vision-instruct',
    'llama-3.2-11b-vision-instruct',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'qwen/qwen3-2-27b'
  ].includes(m));

  const uniqueModels = [...new Set(modelsToTry)];
  let lastError = null;

  for (const targetModel of uniqueModels) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          return data.choices[0].message.content.trim();
        }
      } else {
        const errorText = await response.text().catch(() => '');
        lastError = new Error(`Groq Vision API (${targetModel}) HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Groq Vision API failed');
}

/**
 * Appelle l'API Google AI Studio Gemini
 */
async function callGeminiApi(apiKey, model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1000, messagesHistory = null, imageUrl = null) {
  const targetModel = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

  let contents = [];
  if (messagesHistory && Array.isArray(messagesHistory) && messagesHistory.length > 0) {
    contents = messagesHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
  } else {
    const parts = [{ text: userPrompt || 'Analyse cette image.' }];
    if (imageUrl) {
      const match = imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inline_data: {
            mime_type: match[1],
            data: match[2]
          }
        });
      }
    }
    contents = [{ role: 'user', parts }];
  }

  const payload = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  };

  if (systemPrompt) {
    payload.system_instruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini API HTTP ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    return data.candidates[0].content.parts.map(p => p.text).join('').trim();
  }
  throw new Error('Gemini API response format invalid');
}

/**
 * Appelle une instance locale ou distante Ollama (avec timeout rapide de 3s et fallback LAN/Public)
 */
async function callOllamaApi(hostUrl, model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1000, messagesHistory = null) {
  const hostsToTry = [
    'http://192.168.1.145:11434',
    'http://82.65.75.176:11434',
    hostUrl,
    process.env.OLLAMA_HOST,
    process.env.PUBLIC_IP ? `http://${process.env.PUBLIC_IP}:11434` : null,
    'http://127.0.0.1:11434',
    'http://localhost:11434'
  ].filter(Boolean);

  const modelsToTry = [
    model || 'qwen2.5:0.5b',
    'qwen2.5:0.5b',
    'smollm2:1.7b',
    'smollm:360m',
    'tinyllama:latest'
  ].filter(Boolean);

  const uniqueHosts = [...new Set(hostsToTry)];
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError = null;

  for (const h of uniqueHosts) {
    const baseUrl = h.replace(/\/+$/, '');
    const url = `${baseUrl}/api/chat`;

    for (const m of uniqueModels) {
      try {
        const messages = [];
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
        if (messagesHistory && Array.isArray(messagesHistory) && messagesHistory.length > 0) {
          messages.push(...messagesHistory);
        } else if (userPrompt) {
          messages.push({ role: 'user', content: userPrompt });
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: m,
            messages,
            stream: false,
            options: {
              temperature,
              num_predict: maxTokens
            }
          }),
          signal: AbortSignal.timeout(20000) // Timeout de 20 secondes adapté au processeur de la Freebox VM
        });

        if (response.ok) {
          const data = await response.json();
          if (data.message && data.message.content) {
            return data.message.content.trim();
          }
        } else {
          const errorText = await response.text().catch(() => '');
          lastError = new Error(`Ollama API (${baseUrl} - ${m}) HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error('Ollama inaccessible sur toutes les adresses testées.');
}

/**
 * Appelle Ollama Vision (moondream, llava, etc.) avec une image en base64
 * Utilisé comme fallback local quand Groq Vision est indisponible
 */
async function callOllamaVisionApi(prompt, imageBase64OrUrl) {
  const hosts = [
    'http://192.168.1.145:11434',
    'http://82.65.75.176:11434',
    process.env.OLLAMA_HOST,
    'http://127.0.0.1:11434'
  ].filter(Boolean);

  // Modèles vision disponibles localement (dans l'ordre de préférence)
  const visionModels = ['moondream', 'llava:7b', 'llava', 'minicpm-v', 'llava:13b'];

  // Extraire le base64 pur si c'est une data URL
  let imageBase64 = imageBase64OrUrl;
  if (imageBase64OrUrl && imageBase64OrUrl.startsWith('data:')) {
    imageBase64 = imageBase64OrUrl.split(',')[1];
  }

  for (const host of hosts) {
    const baseUrl = host.replace(/\/+$/, '');
    // Vérifier quels modèles vision sont disponibles sur ce host
    let availableVisionModels = [];
    try {
      const tagsRes = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        const available = (tagsData.models || []).map(m => m.name);
        availableVisionModels = visionModels.filter(vm => available.some(a => a.startsWith(vm.split(':')[0])));
      }
    } catch (e) { continue; }

    if (availableVisionModels.length === 0) continue;

    for (const model of availableVisionModels) {
      try {
        const body = {
          model,
          prompt: prompt || 'Estime l\'age de la personne sur cette image. Reponds uniquement en JSON valide: {"age": X, "isAdult": true/false, "confidence": "low/medium/high"}',
          images: [imageBase64],
          stream: false,
          options: { temperature: 0.3, num_predict: 200 }
        };
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000) // 30s pour la vision locale
        });
        if (res.ok) {
          const data = await res.json();
          if (data.response) {
            console.log(`[AI Manager] Ollama Vision (${model}@${host}) OK`);
            return data.response.trim();
          }
        }
      } catch (e) {
        console.warn(`[AI Manager] Ollama Vision (${model}@${host}) échoué: ${e.message}`);
      }
    }
  }
  throw new Error('Aucun modèle Vision Ollama local disponible (moondream/llava non installés)');
}


async function callPollinationsFallback(systemPrompt, userPrompt, messagesHistory = null) {
  const models = ['openai', 'mistral', 'qwen', 'llama'];
  
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  if (messagesHistory && Array.isArray(messagesHistory) && messagesHistory.length > 0) {
    messages.push(...messagesHistory);
  } else {
    messages.push({ role: 'user', content: userPrompt });
  }

  for (const m of models) {
    try {
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: m,
          seed: Math.floor(Math.random() * 1000000)
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 0 && !text.toLowerCase().includes('error') && !isRefusalResponse(text)) {
          return text.trim();
        }
      }
    } catch (e) {
      console.warn(`[AI Manager] Pollinations fallback (${m}) error:`, e.message);
    }
  }

  // Fallback GET en dernier recours
  try {
    const promptFull = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
    const getRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent(promptFull.substring(0, 800))}?model=openai`, {
      signal: AbortSignal.timeout(20000)
    });
    if (getRes.ok) {
      const text = await getRes.text();
      if (text && text.trim().length > 0 && !text.toLowerCase().includes('error') && !isRefusalResponse(text)) {
        return text.trim();
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Moteur principal de génération d'IA avec Pool Multi-Clés et Basculement Automatique (Ollama Freebox -> Groq -> Gemini -> Fallback)
 */
async function generateAiCompletion({ guildId = null, category = 'text', systemPrompt = '', userPrompt = '', imageUrl = null, temperature = 0.7, maxTokens = 1000, messagesHistory = null, skipGroqForNsfw = false }) {
  const config = guildId ? getAiConfig(guildId) : {
    preferred_provider: 'auto',
    groq_text_model: 'compound-beta-mini',
    groq_vision_model: 'qwen/qwen3.6-27b',
    groq_server_model: 'compound-beta-mini',
    gemini_model: 'gemini-2.0-flash'
  };

  const activeKeys = getAiKeys(null, category).filter(k => k.is_active === 1);
  const ollamaKeys = activeKeys.filter(k => k.provider === 'ollama');
  const groqKeys = activeKeys.filter(k => k.provider === 'groq');
  const geminiKeys = activeKeys.filter(k => k.provider === 'gemini');

  // Déterminer les modèles à utiliser selon la catégorie
  let groqModel = config.groq_text_model || 'compound-beta-mini';
  if (!groqModel || groqModel.includes('llama-3.3') || groqModel.includes('llama-3.1')) {
    groqModel = 'compound-beta-mini';
  }

  // Force le bon modèle Vision (les anciens llama-3.2 et llama-4-scout sont inaccessibles avec cette clé)
  if (category === 'vision') {
    const visionModelFromDb = config.groq_vision_model || '';
    const badModels = [
      'llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview',
      'llama-3.2-90b-vision-instruct', 'llama-3.2-11b-vision-instruct',
      'meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct',
      'qwen/qwen3-2-27b'
    ];
    groqModel = badModels.includes(visionModelFromDb) || !visionModelFromDb
      ? 'qwen/qwen3.6-27b'
      : visionModelFromDb;
  }
  if (category === 'server') {
    groqModel = config.groq_server_model || 'compound-beta-mini';
    if (!groqModel || groqModel.includes('llama-3.3') || groqModel.includes('llama-3.1')) {
      groqModel = 'compound-beta-mini';
    }
  }

  const geminiModel = config.gemini_model || 'gemini-2.0-flash';

  const tryOllamaPool = async () => {
    // Utilise qwen2.5:0.5b (RAM-safe pour la Freebox VM ~900MB)
    const freboxModel = 'qwen2.5:0.5b';
    try {
      const resLocal = await callOllamaApi('http://192.168.1.145:11434', freboxModel, systemPrompt, userPrompt, temperature, maxTokens, messagesHistory);
      if (resLocal && !isRefusalResponse(resLocal)) return resLocal;
    } catch (e) {}

    try {
      const resPublic = await callOllamaApi('http://82.65.75.176:11434', freboxModel, systemPrompt, userPrompt, temperature, maxTokens, messagesHistory);
      if (resPublic && !isRefusalResponse(resPublic)) return resPublic;
    } catch (e) {}

    if (ollamaKeys.length === 0) return null;
    for (const keyObj of ollamaKeys) {
      try {
        const hostUrl = keyObj.api_key || 'http://192.168.1.145:11434';
        const model = 'qwen2.5:0.5b';
        const result = await callOllamaApi(hostUrl, model, systemPrompt, userPrompt, temperature, maxTokens, messagesHistory);
        if (result && !isRefusalResponse(result)) return result;
      } catch (err) {
        console.warn(`[AI Manager] Ollama (${keyObj.api_key}) échoué : ${err.message}`);
      }
    }
    return null;
  };

  const tryGroqPool = async () => {
    if (groqKeys.length === 0) return null;
    const startIndex = keyRotationIndex.groq % groqKeys.length;
    for (let i = 0; i < groqKeys.length; i++) {
      const idx = (startIndex + i) % groqKeys.length;
      const keyObj = groqKeys[idx];
      try {
        let result = null;
        if (imageUrl && category === 'vision') {
          result = await callGroqVisionApi(keyObj.api_key, groqModel || 'qwen/qwen3.6-27b', userPrompt, imageUrl, temperature, maxTokens);
        } else {
          result = await callGroqApi(keyObj.api_key, groqModel, systemPrompt, userPrompt, temperature, maxTokens, messagesHistory);
        }
        keyRotationIndex.groq = (idx + 1) % groqKeys.length;
        return result;
      } catch (err) {
        console.warn(`[AI Manager] Clé Groq ID ${keyObj.id} (${keyObj.label}) échouée : ${err.message}. Essai de la clé suivante...`);
      }
    }
    return null;
  };

  const tryGeminiPool = async () => {
    if (geminiKeys.length === 0) return null;
    const startIndex = keyRotationIndex.gemini % geminiKeys.length;
    for (let i = 0; i < geminiKeys.length; i++) {
      const idx = (startIndex + i) % geminiKeys.length;
      const keyObj = geminiKeys[idx];
      try {
        const result = await callGeminiApi(keyObj.api_key, geminiModel || 'gemini-2.0-flash', systemPrompt, userPrompt, temperature, maxTokens, messagesHistory, imageUrl);
        keyRotationIndex.gemini = (idx + 1) % geminiKeys.length;
        return result;
      } catch (err) {
        console.warn(`[AI Manager] Clé Gemini ID ${keyObj.id} (${keyObj.label}) échouée : ${err.message}. Essai de la clé suivante...`);
      }
    }
    return null;
  };

  // Pour la catégorie vision : Gemini → Groq → Ollama local (moondream/llava)
  if (category === 'vision') {
    const resGemini = await tryGeminiPool();
    if (resGemini) return resGemini;

    const resGroq = await tryGroqPool();
    if (resGroq) return resGroq;

    // Fallback local : Ollama avec moondream ou llava (fonctionne sans internet)
    if (imageUrl) {
      try {
        console.log('[AI Manager] Basculement sur Ollama Vision local (moondream/llava)...');
        const resOllamaVision = await callOllamaVisionApi(userPrompt, imageUrl);
        if (resOllamaVision) return resOllamaVision;
      } catch (e) {
        console.warn('[AI Manager] Ollama Vision local indisponible:', e.message);
      }
    }

    throw new Error("Aucune API Vision disponible (Groq, Gemini, Ollama local tous échoués).");
  }

  // Chaîne de fallback :
  // SFW  : Groq (rapide) → Gemini → Ollama → Pollinations
  // NSFW : Gemini (permissif) → Groq (fallback si Gemini indispo) → Ollama → Pollinations
  if (!skipGroqForNsfw) {
    // SFW : Groq en priorité
    const resGroq = await tryGroqPool();
    if (resGroq) return resGroq;
  }

  // Gemini (pour NSFW en priorité, ou SFW en fallback)
  const resGemini = await tryGeminiPool();
  if (resGemini) return resGemini;

  // Si NSFW et Gemini indisponible → tenter Groq quand même (mieux que rien)
  if (skipGroqForNsfw) {
    console.log('[AI Manager] Gemini indisponible (NSFW) → tentative Groq en fallback...');
    const resGroqFallback = await tryGroqPool();
    if (resGroqFallback) return resGroqFallback;
  }

  // Ollama Freebox (Qwen 0.5b RAM-safe)
  const resOllama = await tryOllamaPool();
  if (resOllama) return resOllama;

  // Ultime secours : Pollinations AI (accepte le contenu adulte)
  const resPol = await callPollinationsFallback(systemPrompt, userPrompt, messagesHistory);
  if (resPol) return resPol;

  throw new Error("Aucun fournisseur IA disponible (Groq/Gemini/Ollama/Pollinations tous échoués).");
}

/**
 * Redimensionne une image base64 à max 600x600 px pour réduire considérablement le nombre de tokens Groq et accélérer l'analyse
 */
async function compressBase64Image(base64Data, maxDim = 600) {
  try {
    const { createCanvas, loadImage } = require('@napi-rs/canvas');
    let cleanB64 = base64Data || '';
    const base64Pure = cleanB64.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Pure, 'base64');

    const img = await loadImage(imgBuffer);
    let width = img.width;
    let height = img.height;

    if (!width || !height) return base64Data;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const compressedBuffer = canvas.toBuffer('image/jpeg');
    return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
  } catch (err) {
    console.warn('[AI Manager] Image compression skipped:', err.message);
    return base64Data;
  }
}

/**
 * Analyse l'âge d'un membre à partir d'une image (visage ou document) avec l'IA Vision
 */
async function analyzeAgeWithAi(imageBase64, method, minAge = 18, birthDateInput = null) {
  // Redimensionner l'image à 600px pour un traitement ultra-rapide (réduit les tokens de 7000 à 350 et évite l'erreur HTTP 429)
  let cleanBase64 = await compressBase64Image(imageBase64, 600);

  const prompt = method === 'facial'
    ? `Tu es un expert biométrique légiste et dermatologique spécialisé dans la détermination objective et précise de l'âge facial.

CONSIGNES D'ANALYSE BIOMÉTRIQUE :
1. Analyse objective des marqueurs de maturité :
   - Structure osseuse du visage (arcade sourcilière, mâchoire, pommettes).
   - Marqueurs cutanés et texture (rides d'expression, ridules autour des yeux, plis nasogéniens, maturité du grain de peau).
   - Barbe/pilosite faciale, regard et maturité globale du sujet.
2. Évaluation de l'âge numérique :
   - Si le visage présente des traits adultes nets (ex: adulte de 25-40+ ans), attribue un âge adulte réaliste (ex: 30, 35, 38 ans) et définis "is_adult": true.
   - Si le visage présente des traits juvéniles/adolescents marqués (ex: 12-17 ans) ou s'il s'agit visiblement d'un mineur, attribue un âge < 18 ans (ex: 15 ou 16 ans) et définis "is_adult": false.
3. En cas de doute raisonnable (sujet borderline 17-18 ans), privilégie la sécurité ("is_adult": false).

Réponds STRICTEMENT sous la forme d'un objet JSON unique au format :
{
  "reasoning": "<analyse des marqueurs faciaux observés>",
  "age": <nombre_entier_estime>,
  "is_adult": <true_si_18_ans_ou_plus_sinon_false>,
  "reason": "<résumé en 1 sentence des éléments clés observés>"
}`
    : `Tu es un expert en vérification de pièces d'identité (CNI, Passeport, Permis). Examine cette photo de document d'identité.
Identifie la date de naissance si présente. Date déclarée : ${birthDateInput || 'Non renseignée'}.
RÈGLE STRICTE : Si la date de naissance indique moins de 18 ans, ou si le document indique un mineur, is_adult DOIT être false.
Réponds STRICTEMENT avec un objet JSON unique au format :
{"age": <nombre_entier>, "is_adult": <true_ou_false>, "reason": "<explication très courte en français sur la date ou le document>"}`;

  try {
    const aiPromise = generateAiCompletion({
      category: 'vision',
      userPrompt: prompt,
      imageUrl: cleanBase64,
      temperature: 0.0,
      maxTokens: 1000
    });

    // Timeout de sécurité de 25 secondes max
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI Vision Timeout (25s limit exceeded)')), 25000)
    );

    const aiRes = await Promise.race([aiPromise, timeoutPromise]);

    if (aiRes) {
      console.log('[AI Vision Raw Output]:', aiRes.substring(0, 500));
      let cleanRes = aiRes.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // 1. Essai de parsing JSON standard
      const jsonMatch = cleanRes.match(/\{[\s\S]*?\}/);
      let parsed = null;
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (jsonErr) {
          // Essai de réparation si JSON incomplet (fermeture de l'accolade manquante)
          try {
            parsed = JSON.parse(jsonMatch[0] + '}');
          } catch (e2) {}
        }
      }

      let calculatedAge = null;
      let isAdultFinal = null;
      let reasonStr = '';

      if (parsed) {
        const rawAge = parsed.age ?? parsed.estimated_age ?? parsed.age_estime;
        if (rawAge !== undefined && rawAge !== null) {
          calculatedAge = Math.max(1, Math.round(Number(rawAge) || 18));
          if (typeof parsed.is_adult === 'boolean') {
            isAdultFinal = parsed.is_adult;
          }
          reasonStr = parsed.reason || '';
        }
      }

      // 2. Fallback par expressions régulières (si le JSON est malformé ou tronqué)
      if (calculatedAge === null) {
        const ageMatch = cleanRes.match(/["']?age["']?\s*:\s*(\d+)/i) || cleanRes.match(/(\d{2})\s*ans/i);
        if (ageMatch) {
          calculatedAge = parseInt(ageMatch[1], 10);
        }
        const adultMatch = cleanRes.match(/["']?is_adult["']?\s*:\s*(true|false)/i);
        if (adultMatch) {
          isAdultFinal = adultMatch[1].toLowerCase() === 'true';
        }
        reasonStr = cleanRes.substring(0, 150);
      }

      if (calculatedAge !== null) {
        // Dans le mode document uniquement, validation par date de naissance si présente
        if (method === 'document' && birthDateInput) {
          const birthYear = new Date(birthDateInput).getFullYear();
          if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= new Date().getFullYear()) {
            const declaredAge = new Date().getFullYear() - birthYear;
            calculatedAge = Math.min(calculatedAge, declaredAge);
          }
        }

        if (isAdultFinal === null) {
          isAdultFinal = calculatedAge >= minAge;
        }

        const isAdultResult = (isAdultFinal === false || calculatedAge < minAge) ? false : (isAdultFinal === true && calculatedAge >= minAge);

        return {
          age: calculatedAge,
          isAdult: isAdultResult,
          reason: reasonStr || (isAdultResult ? 'Majeur certifié par l\'analyse biométrique.' : 'Détecté comme mineur / adolescent.')
        };
      }
    }
    throw new Error('Format de réponse IA invalide.');
  } catch (err) {
    console.warn('[AI Age Analysis] Error during analysis:', err.message);
    
    // Fallback rapide avec date de naissance si fournie (mode document)
    if (birthDateInput) {
      const birthYear = new Date(birthDateInput).getFullYear();
      if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= new Date().getFullYear()) {
        const calcAge = new Date().getFullYear() - birthYear;
        return {
          age: calcAge,
          isAdult: calcAge >= minAge,
          reason: `Basé sur la date de naissance déclarée (${birthDateInput}).`
        };
      }
    }

    // Lever une erreur explicite pour que l'utilisateur voie la cause exacte
    throw new Error(`L'analyse d'âge a échoué (${err.message}). Veuillez reprendre une photo nette et bien éclairée.`);
  }
}

/**
 * Teste la validité d'une clé API Groq, Gemini ou Ollama
 */
async function testAiKey(provider, apiKey) {
  try {
    if (provider === 'groq') {
      const res = await callGroqApi(apiKey, 'llama-3.1-8b-instant', 'Test', 'Bonjour', 0.5, 10);
      return { success: true, message: `✅ Clé Groq valide ! Réponse : "${res.substring(0, 50)}"` };
    } else if (provider === 'gemini') {
      const res = await callGeminiApi(apiKey, 'gemini-2.0-flash', 'Test', 'Bonjour', 0.5, 10);
      return { success: true, message: `✅ Clé Gemini valide ! Réponse : "${res.substring(0, 50)}"` };
    } else if (provider === 'ollama') {
      const hostUrl = apiKey || 'http://127.0.0.1:11434';
      const res = await callOllamaApi(hostUrl, 'qwen2.5:7b', 'Test', 'Bonjour', 0.5, 10);
      return { success: true, message: `✅ Instance Ollama locale connectée ! Réponse : "${res.substring(0, 50)}"` };
    } else {
      return { success: false, error: "Fournisseur inconnu." };
    }
  } catch (err) {
    let cleanErr = err.message;
    if (cleanErr.includes('organization_restricted')) {
      cleanErr = 'Clé restreinte par Groq (Organization Restricted). Veuillez générer une nouvelle clé valide sur console.groq.com.';
    } else if (cleanErr.includes('invalid_api_key')) {
      cleanErr = 'Clé API Groq invalide ou inexistante.';
    } else if (cleanErr.includes('429')) {
      cleanErr = 'Quota dépassé (429 Rate limit). Veuillez patienter ou ajouter une autre clé.';
    }
    return { success: false, error: cleanErr };
  }
}

module.exports = {
  callGroqApi,
  callGroqVisionApi,
  callGeminiApi,
  callOllamaApi,
  callPollinationsFallback,
  generateAiCompletion,
  analyzeAgeWithAi,
  testAiKey
};
