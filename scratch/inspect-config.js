const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  console.log("=== WELCOME ===");
  console.log(g.welcome);

  console.log("=== GOODBYE ===");
  console.log(g.goodbye);

  console.log("=== TICKETS ===");
  console.log(g.tickets);

  console.log("=== MOT CACHE ===");
  console.log(g.motCache);
} catch (e) {
  console.error(e);
}
