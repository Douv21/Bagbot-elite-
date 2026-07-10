const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.tickets && g.tickets.categories) {
    console.log("Category Example Details:", g.tickets.categories[0]);
  }
} catch (e) {
  console.error(e);
}
