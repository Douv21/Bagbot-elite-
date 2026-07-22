const { db, getAiKeys, getAiConfig } = require('../database/db');

// Index de rotation pour répartition équitable des clés
const keyRotationIndex = {
  groq: 0,
  gemini: 0
};

/**
 * Appelle l'API Groq (OpenAI Compatible)
 */
async function callGroqApi(apiKey, model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1000) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  let targetModel = model || 'llama-3.3-70b-versatile';

  let response = await fetch(url, {
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

  // Si limite de taux (429) sur le modèle 70B, retenter immédiatement avec llama-3.1-8b-instant (30k TPM)
  if (response.status === 429 && targetModel !== 'llama-3.1-8b-instant') {
    console.warn(`[AI Manager] 429 Rate Limit sur ${targetModel}, basculement automatique sur llama-3.1-8b-instant...`);
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: AbortSignal.timeout(15000)
    });
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Groq API HTTP ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content.trim();
  }
  throw new Error('Groq API response format invalid');
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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'llama-3.2-11b-vision-preview',
      messages,
      temperature,
      max_tokens: maxTokens
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Groq Vision API HTTP ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content.trim();
  }
  throw new Error('Groq Vision API response format invalid');
}

/**
 * Appelle l'API Google AI Studio Gemini
 */
async function callGeminiApi(apiKey, model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1000) {
  const targetModel = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
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
    signal: AbortSignal.timeout(12000)
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
 * Appelle Pollinations AI (Fallback sans clé)
 */
async function callPollinationsFallback(systemPrompt, userPrompt) {
  try {
    const promptFull = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt || '' },
          { role: 'user', content: userPrompt }
        ],
        model: 'openai'
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 0) return text.trim();
    }

    // Backup GET
    const getRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent(promptFull)}?model=openai`, {
      signal: AbortSignal.timeout(10000)
    });
    if (getRes.ok) {
      const text = await getRes.text();
      if (text && text.trim().length > 0) return text.trim();
    }
  } catch (e) {
    console.warn('[AI Manager] Pollinations fallback error:', e.message);
  }
  return null;
}

/**
 * Moteur principal de génération d'IA avec Pool Multi-Clés et Basculement Automatique (Groq -> Gemini -> Fallback)
 */
async function generateAiCompletion({ guildId = null, category = 'text', systemPrompt = '', userPrompt = '', imageUrl = null, temperature = 0.7, maxTokens = 1000 }) {
  const config = guildId ? getAiConfig(guildId) : {
    preferred_provider: 'auto',
    groq_text_model: 'llama-3.3-70b-versatile',
    groq_vision_model: 'llama-3.2-11b-vision-preview',
    groq_server_model: 'llama-3.3-70b-versatile',
    gemini_model: 'gemini-2.0-flash'
  };

  const activeKeys = getAiKeys(null, category).filter(k => k.is_active === 1);
  const groqKeys = activeKeys.filter(k => k.provider === 'groq');
  const geminiKeys = activeKeys.filter(k => k.provider === 'gemini');

  // Déterminer les modèles à utiliser selon la catégorie
  let groqModel = config.groq_text_model || 'llama-3.3-70b-versatile';
  if (category === 'vision') groqModel = config.groq_vision_model || 'llama-3.2-11b-vision-preview';
  if (category === 'server') groqModel = config.groq_server_model || 'llama-3.3-70b-versatile';

  const geminiModel = config.gemini_model || 'gemini-2.0-flash';

  const tryGroqPool = async () => {
    if (groqKeys.length === 0) return null;
    const startIndex = keyRotationIndex.groq % groqKeys.length;
    for (let i = 0; i < groqKeys.length; i++) {
      const idx = (startIndex + i) % groqKeys.length;
      const keyObj = groqKeys[idx];
      try {
        let result = null;
        if (imageUrl && category === 'vision') {
          result = await callGroqVisionApi(keyObj.api_key, groqModel, userPrompt, imageUrl, temperature, maxTokens);
        } else {
          result = await callGroqApi(keyObj.api_key, groqModel, systemPrompt, userPrompt, temperature, maxTokens);
        }
        keyRotationIndex.groq = (idx + 1) % groqKeys.length;
        return result;
      } catch (err) {
        console.warn(`[AI Manager] Clé Groq ID ${keyObj.id} (${keyObj.label}) échouée : ${err.message}. Essai de la clé suivante...`);
        if (err.message.includes('organization_restricted') || err.message.includes('invalid_api_key') || err.message.includes('HTTP 401') || err.message.includes('HTTP 403')) {
          try {
            updateAiKey(keyObj.id, { is_active: 0 });
            console.warn(`[AI Manager] Clé Groq ID ${keyObj.id} (${keyObj.label}) désactivée automatiquement car restreinte par Groq.`);
          } catch (e) {}
        }
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
        const result = await callGeminiApi(keyObj.api_key, geminiModel, systemPrompt, userPrompt, temperature, maxTokens);
        keyRotationIndex.gemini = (idx + 1) % geminiKeys.length;
        return result;
      } catch (err) {
        console.warn(`[AI Manager] Clé Gemini ID ${keyObj.id} (${keyObj.label}) échouée : ${err.message}. Essai de la clé suivante...`);
        if (err.message.includes('API key not valid') || err.message.includes('HTTP 400') || err.message.includes('HTTP 401')) {
          try {
            updateAiKey(keyObj.id, { is_active: 0 });
            console.warn(`[AI Manager] Clé Gemini ID ${keyObj.id} (${keyObj.label}) désactivée automatiquement car invalide.`);
          } catch (e) {}
        }
      }
    }
    return null;
  };

  const pref = config.preferred_provider || 'auto';

  if (pref === 'groq') {
    const resGroq = await tryGroqPool();
    if (resGroq) return resGroq;
  } else if (pref === 'gemini') {
    const resGemini = await tryGeminiPool();
    if (resGemini) return resGemini;
  } else if (pref === 'pollinations') {
    const resPol = await callPollinationsFallback(systemPrompt, userPrompt);
    if (resPol) return resPol;
  } else {
    // Mode Auto : Groq en premier, puis Gemini, puis Pollinations
    const resGroq = await tryGroqPool();
    if (resGroq) return resGroq;

    const resGemini = await tryGeminiPool();
    if (resGemini) return resGemini;
  }

  // Ultime secours si le fournisseur préféré échoue
  const fallbackRes = await callPollinationsFallback(systemPrompt, userPrompt);
  if (fallbackRes) return fallbackRes;

  throw new Error("Toutes les clés d'API IA (Groq, Gemini) et le service de secours ont échoué.");
}

/**
 * Teste la validité d'une clé API Groq ou Gemini
 */
async function testAiKey(provider, apiKey) {
  try {
    if (provider === 'groq') {
      const res = await callGroqApi(apiKey, 'llama-3.1-8b-instant', 'Test', 'Bonjour', 0.5, 10);
      return { success: true, message: `✅ Clé Groq valide ! Réponse : "${res.substring(0, 50)}"` };
    } else if (provider === 'gemini') {
      const res = await callGeminiApi(apiKey, 'gemini-2.0-flash', 'Test', 'Bonjour', 0.5, 10);
      return { success: true, message: `✅ Clé Gemini valide ! Réponse : "${res.substring(0, 50)}"` };
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
  callPollinationsFallback,
  generateAiCompletion,
  testAiKey
};
