const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.levels) {
    console.log("Levels Keys:", Object.keys(g.levels));
    const userIds = Object.keys(g.levels.users || {});
    console.log("Levels Users Count:", userIds.length);
    if (userIds.length > 0) {
      console.log("Example User Level Record:", userIds[0], g.levels.users[userIds[0]]);
    }
  }
} catch (e) {
  console.error(e);
}
