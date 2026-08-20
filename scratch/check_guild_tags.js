const path = require('path');
const { client } = require(path.join(__dirname, '../src/index'));

setTimeout(async () => {
  console.log('--- INSPECTING GUILDS ---');
  for (const [id, g] of client.guilds.cache) {
    try {
      const raw = await client.rest.get(`/guilds/${id}?with_counts=true`).catch(() => null);
      console.log('Guild:', g.name, '(' + id + ')');
      if (raw) {
        console.log('  Keys containing clan/tag/badge/identity:', Object.keys(raw).filter(k => k.includes('clan') || k.includes('tag') || k.includes('badge') || k.includes('identity')));
        console.log('  raw.clan:', JSON.stringify(raw.clan));
        console.log('  raw.profile:', JSON.stringify(raw.profile));
      }
      console.log('  g.clan:', JSON.stringify(g.clan));
    } catch (e) {
      console.error('Err:', e.message);
    }
  }
  process.exit(0);
}, 4000);
