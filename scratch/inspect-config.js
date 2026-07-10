const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.levels) {
    console.log("Levels Rewards:", g.levels.rewards);
    console.log("Levels Curve Settings:", {
      xpMessageMin: g.levels.xpMessageMin,
      xpMessageMax: g.levels.xpMessageMax,
      xpVoiceMin: g.levels.xpVoiceMin,
      xpVoiceMax: g.levels.xpVoiceMax,
      announce: g.levels.announce
    });
  }
} catch (e) {
  console.error(e);
}
