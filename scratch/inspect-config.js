const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  console.log("Guild keys:", Object.keys(g));
  if (g.economy) {
    console.log("Economy keys:", Object.keys(g.economy));
  }
} catch (e) {
  console.error(e);
}
