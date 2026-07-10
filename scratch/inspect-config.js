const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  console.log("=== LEVELS ===");
  if (g.levels) {
    console.log("Levels Keys:", Object.keys(g.levels));
    const userIds = Object.keys(g.levels.users || {});
    console.log("Levels Users Count:", userIds.length);
    if (userIds.length > 0) {
      console.log("Example User Level:", userIds[0], g.levels.users[userIds[0]]);
    }
  }

  console.log("=== WELCOME ===");
  console.log(g.welcome);

  console.log("=== GOODBYE ===");
  console.log(g.goodbye);

  console.log("=== TICKETS ===");
  console.log(g.tickets);

  console.log("=== MOT CACHE ===");
  console.log(g.motCache);

  console.log("=== COUNTING ===");
  console.log(g.counting);

} catch (e) {
  console.error(e);
}
