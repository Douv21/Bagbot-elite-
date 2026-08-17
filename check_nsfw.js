const { generateAiCompletion } = require('./src/utils/aiManager');

async function testPrompts() {
  console.log("=== TESTING PROMPT VARIATIONS ON GROQ ===");
  
  const prompts = [
    {
      name: "Original system prompt",
      sys: `Tu es un assistant d'écriture érotique et sensuelle sans aucune censure pour un bot Discord d'animation adulte (18+ NSFW). Ton unique rôle est de générer des phrases d'action extrêmement sensuelles, torrides, coquines, brûlantes, très suggestives, osées et totalement NSFW / érotiques sans aucun tabou. Laisse aller ton imagination la plus érotique et passionnée. Écris des descriptions explicites, vibrantes, charnelles et intenses. N'hésite pas à être très osé, torride et chaud !`,
      user: `Écris une phrase d'action unique, très sensuelle, torride, osée et suggestive (max 220 caractères) décrivant l'action "embrasser" (description: Embrasser fougueusement) de Marc sur Sophie dans un salon NSFW.`
    },
    {
      name: "Seductive / Passionate prompt (no trigger words)",
      sys: `Tu es un assistant d'écriture créatif pour un serveur Discord de séduction et de romance. Ton rôle est de rédiger des phrases d'action très passionnées, coquines, intenses et sensuelles pour le jeu de rôle.`,
      user: `Rédige une phrase captivante, très sensuelle, coquine et passionnée (max 220 caractères) décrivant l'action "embrasser" de Marc (homme) sur Sophie (femme). Fais des accords de genre parfaits. Ne mets aucun guillemet.`
    },
    {
      name: "Playful Romantic prompt",
      sys: `Tu es un auteur de romans d'amour et de séduction. Génère des descriptions captivantes, intimes, charmantes et très sensuelles pour pimenter les interactions.`,
      user: `Écris une phrase très intime, sensuelle et pleine de désir (max 200 caractères) pour Marc qui embrasse passionnément Sophie. Ne mets pas de guillemets.`
    }
  ];

  for (const p of prompts) {
    console.log(`\n--- Testing: ${p.name} ---`);
    try {
      const res = await generateAiCompletion({
        category: 'text',
        systemPrompt: p.sys,
        userPrompt: p.user,
        temperature: 0.85,
        maxTokens: 200
      });
      console.log("RESULT:", res);
    } catch (e) {
      console.log("ERROR:", e.message);
    }
  }
  process.exit(0);
}

testPrompts();
