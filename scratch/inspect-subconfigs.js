const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  console.log("Confess configuration:", g.confess);
  console.log("TruthDare configuration:", g.truthdare);
  console.log("Category Banners:", g.categoryBanners);
  console.log("Drops:", g.drops);
  console.log("Geo:", g.geo);
} catch (e) {
  console.error(e);
}
