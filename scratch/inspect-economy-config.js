const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.economy) {
    const copy = { ...g.economy };
    delete copy.balances;
    console.log("Economy configuration:", JSON.stringify(copy, null, 2));
  }
} catch (e) {
  console.error(e);
}
