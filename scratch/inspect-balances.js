const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.economy && g.economy.balances) {
    const keys = Object.keys(g.economy.balances);
    if (keys.length > 0) {
      console.log("Example balance entry keys & values:", keys[0], g.economy.balances[keys[0]]);
    }
  }
} catch (e) {
  console.error(e);
}
