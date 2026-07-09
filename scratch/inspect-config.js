const fs = require('fs');

try {
  const content = fs.readFileSync('/var/data/config.json', 'utf8');
  const data = JSON.parse(content);
  console.log("Guilds count:", Object.keys(data.guilds).length);
  for (const gid of Object.keys(data.guilds)) {
    const g = data.guilds[gid];
    console.log(`Guild ${gid}:`);
    if (g.economy && g.economy.balances) {
      console.log(` - Balances count: ${Object.keys(g.economy.balances).length}`);
      console.log(" - Balance keys:", Object.keys(g.economy.balances));
    } else {
      console.log(` - No balances found`);
    }
  }
} catch (e) {
  console.error(e);
}
