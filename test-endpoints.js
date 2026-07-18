async function test() {
  const systemPrompt = "Tu es un assistant utile.";
  const userPrompt = "Dis bonjour courtement.";

  const models = ["openai", "qwen", "mistral"];

  for (const model of models) {
    try {
      console.log(`\nTesting model "${model}"...`);
      const t0 = Date.now();
      const res = await fetch("https://text.pollinations.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          model: model
        })
      });
      console.log(`Status: ${res.status} (${Date.now() - t0}ms)`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Response: ${JSON.stringify(data.choices[0].message)}`);
      } else {
        console.log(`Error body: ${await res.text()}`);
      }
    } catch (e) {
      console.error(`Error for ${model}: ${e.message}`);
    }
  }
}

test();
