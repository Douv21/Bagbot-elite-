const { db, getAiKeys, getAiConfig } = require('../database/db');

// Index de rotation pour répartition équitable des clés
const keyRotationIndex = {
  groq: 0,
  gemini: 0
};

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
    model || 'llama-3.3-70b-versatile',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
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
          return data.choices[0].message.content.trim();
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

  // Modèles Vision Groq actifs en août 2026 (dans l'ordre de préférence)
  const modelsToTry = [
    model,
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'qwen/qwen3-2-27b'
  ].filter(Boolean);

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
    model,
    'smollm2:1.7b',
    'smollm:1.7b',
    'qwen2.5:0.5b',
    'smollm:360m',
    'llama3.2:1b',
    'tinyllama',
    'qwen2.5:1.5b'
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
 * Appelle Pollinations AI (Fallback sans clé)
 */
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
        if (text && text.trim().length > 0 && !text.toLowerCase().includes('error')) {
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
      if (text && text.trim().length > 0 && !text.toLowerCase().includes('error')) {
        return text.trim();
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Moteur principal de génération d'IA avec Pool Multi-Clés et Basculement Automatique (Ollama Freebox -> Groq -> Gemini -> Fallback)
 */
async function generateAiCompletion({ guildId = null, category = 'text', systemPrompt = '', userPrompt = '', imageUrl = null, temperature = 0.7, maxTokens = 1000, messagesHistory = null }) {
  const config = guildId ? getAiConfig(guildId) : {
    preferred_provider: 'auto',
    groq_text_model: 'llama-3.3-70b-versatile',
    groq_vision_model: 'llama-3.2-90b-vision-preview',
    groq_server_model: 'llama-3.1-8b-instant',
    gemini_model: 'gemini-2.0-flash'
  };

  const activeKeys = getAiKeys(null, category).filter(k => k.is_active === 1);
  const ollamaKeys = activeKeys.filter(k => k.provider === 'ollama');
  const groqKeys = activeKeys.filter(k => k.provider === 'groq');
  const geminiKeys = activeKeys.filter(k => k.provider === 'gemini');

  // Déterminer les modèles à utiliser selon la catégorie
  let groqModel = config.groq_text_model || 'llama-3.3-70b-versatile';
  if (category === 'vision') groqModel = config.groq_vision_model || 'llama-3.2-90b-vision-preview';
  if (category === 'server') groqModel = config.groq_server_model || 'llama-3.1-8b-instant';

  const geminiModel = config.gemini_model || 'gemini-2.0-flash';

  const tryOllamaPool = async () => {
    // Tenter en priorité le serveur local 192.168.1.145 (20ms) puis l'IP publique 82.65.75.176
    try {
      const resLocal = await callOllamaApi('http://192.168.1.145:11434', 'qwen2.5:1.5b', systemPrompt, userPrompt, temperature, maxTokens, messagesHistory);
      if (resLocal) return resLocal;
    } catch (e) {}

    try {
      const resPublic = await callOllamaApi('http://82.65.75.176:11434', 'qwen2.5:1.5b', systemPrompt, userPrompt, temperature, maxTokens, messagesHistory);
      if (resPublic) return resPublic;
    } catch (e) {}

    if (ollamaKeys.length === 0) return null;
    for (const keyObj of ollamaKeys) {
      try {
        const hostUrl = keyObj.api_key || 'http://192.168.1.145:11434';
        const model = keyObj.label || 'qwen2.5:1.5b';
        const result = await callOllamaApi(hostUrl, model, systemPrompt, userPrompt, temperature, maxTokens, messagesHistory);
        return result;
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
          result = await callGroqVisionApi(keyObj.api_key, groqModel || 'llama-3.2-90b-vision-preview', userPrompt, imageUrl, temperature, maxTokens);
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

  // Pour la catégorie vision, on teste uniquement Groq Vision & Gemini Flash (ultra-rapides 0.4s)
  if (category === 'vision') {
    const resGemini = await tryGeminiPool();
    if (resGemini) return resGemini;

    const resGroq = await tryGroqPool();
    if (resGroq) return resGroq;

    throw new Error("Aucune API Vision disponible pour le traitement instantané.");
  }

  // 1. Tenter en priorité absolue Groq (Ultra-rapide, réponse instantanée en 0.4s)
  const resGroq = await tryGroqPool();
  if (resGroq) return resGroq;

  // 2. Tenter Gemini
  const resGemini = await tryGeminiPool();
  if (resGemini) return resGemini;

  // 3. Basculer sur Ollama Freebox (Secours local illimité)
  const resOllama = await tryOllamaPool();
  if (resOllama) return resOllama;

  // 4. Ultime secours illimité : Pollinations AI
  const resPol = await callPollinationsFallback(systemPrompt, userPrompt, messagesHistory);
  if (resPol) return resPol;

  throw new Error("Impossible de joindre Ollama Freebox ou les API distantes.");
}

/**
 * Analyse l'âge d'un membre à partir d'une image (visage ou document) avec l'IA Vision
 */
async function analyzeAgeWithAi(imageBase64, method, minAge = 18, birthDateInput = null) {
  let cleanBase64 = imageBase64 || '';
  if (!cleanBase64.startsWith('data:image')) {
    cleanBase64 = `data:image/jpeg;base64,${cleanBase64}`;
  }

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
      maxTokens: 350
    });

    // Timeout de sécurité de 6 secondes max pour éviter tout blocage du frontend
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI Vision Timeout (6s limit exceeded)')), 6000)
    );

    const aiRes = await Promise.race([aiPromise, timeoutPromise]);

    if (aiRes) {
      const jsonMatch = aiRes.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && typeof parsed.age === 'number') {
          let calculatedAge = Math.max(1, Math.round(parsed.age));
          
          // Dans le mode document uniquement, validation par date de naissance si présente
          if (method === 'document' && birthDateInput) {
            const birthYear = new Date(birthDateInput).getFullYear();
            if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= new Date().getFullYear()) {
              const declaredAge = new Date().getFullYear() - birthYear;
              calculatedAge = Math.min(calculatedAge, declaredAge); // Sécurité : on prend l'âge le plus bas pour ne pas fausser la majorité
            }
          }

          const isAdultFinal = (parsed.is_adult === false || calculatedAge < minAge) ? false : (parsed.is_adult === true && calculatedAge >= minAge);

          return {
            age: calculatedAge,
            isAdult: isAdultFinal,
            reason: parsed.reason || (isAdultFinal ? 'Majeur certifié par l\'analyse biométrique.' : 'Détecté comme mineur / adolescent.')
          };
        }
      }
    }
  } catch (err) {
    console.warn('[AI Age Analysis] Vision model fast fallback triggered:', err.message);
  }

  // Fallback rapide avec date de naissance si fournie
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

  // Fallback sécurisé : En cas de doute ou d'échec d'analyse, classer par défaut comme mineur (isAdult: false)
  return {
    age: 16,
    isAdult: false,
    reason: 'Analyse biométrique faciale douteuse ou incomplète. Par sécurité mineur, la majorité n\'a pas pu être certifiée.'
  };
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
