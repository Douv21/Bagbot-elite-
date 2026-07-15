const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  console.log("Guild config top-level keys:", Object.keys(g));
  
  if (g.confessions) {
    console.log("Confessions configuration:", g.confessions);
  }
  if (g.actionVerite) {
    console.log("Action/Verite configuration:", g.actionVerite);
  }
  if (g.karma) {
    console.log("Karma configuration:", g.karma);
  }
  if (g.gifs) {
    console.log("Gifs configuration:", g.gifs);
  }
} catch (e) {
  console.error(e);
}
