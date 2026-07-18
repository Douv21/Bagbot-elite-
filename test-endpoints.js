async function test() {
  const systemPrompt = "Tu es un assistant utile.";
  const userPrompt = "Dis bonjour courtement.";

  const urls = [
    { name: "POST text.pollinations.ai/v1/chat/completions", url: "https://text.pollinations.ai/v1/chat/completions", method: "POST", body: { messages: [{role:"system", content: systemPrompt}, {role:"user", content: userPrompt}], model: "openai" } },
    { name: "POST text.pollinations.ai/", url: "https://text.pollinations.ai/", method: "POST", body: { messages: [{role:"system", content: systemPrompt}, {role:"user", content: userPrompt}], model: "openai" } },
    { name: "POST text.pollinations.ai/v1/chat/completions (qwen)", url: "https://text.pollinations.ai/v1/chat/completions", method: "POST", body: { messages: [{role:"system", content: systemPrompt}, {role:"user", content: userPrompt}], model: "qwen" } },
    { name: "GET text.pollinations.ai", url: `https://text.pollinations.ai/${encodeURIComponent(systemPrompt + " " + userPrompt)}?model=openai`, method: "GET" }
  ];

  for (const item of urls) {
    try {
      console.log(`\nTesting ${item.name}...`);
      const options = {
        method: item.method,
        headers: item.method === "POST" ? { "Content-Type": "application/json" } : {},
      };
      if (item.method === "POST") {
        options.body = JSON.stringify(item.body);
      }
      const t0 = Date.now();
      const res = await fetch(item.url, options);
      console.log(`Status: ${res.status} (${Date.now() - t0}ms)`);
      const text = await res.text();
      console.log(`Response snippet: ${text.slice(0, 150)}`);
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
}

test();
