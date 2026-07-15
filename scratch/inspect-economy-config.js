const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.economy && g.economy.actions) {
    console.log("Economy actions keys:", Object.keys(g.economy.actions));
    if (g.economy.actions.gifs) {
      console.log("Gifs actions keys count:", Object.keys(g.economy.actions.gifs).length);
      console.log("First action gif key & value:", Object.keys(g.economy.actions.gifs)[0], g.economy.actions.gifs[Object.keys(g.economy.actions.gifs)[0]]);
    }
  }
} catch (e) {
  console.error(e);
}
