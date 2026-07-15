const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.levels) {
    const levelsCopy = { ...g.levels };
    delete levelsCopy.users;
    console.log("Levels configuration in Freebox JSON:", levelsCopy);
  }
} catch (e) {
  console.error(e);
}
