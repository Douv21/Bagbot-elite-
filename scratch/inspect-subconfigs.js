const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  function findGifKeys(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(k => {
      const currentPath = path ? `${path}.${k}` : k;
      if (k.toLowerCase().includes('gif')) {
        console.log(`Found GIF key: ${currentPath} ->`, typeof obj[k] === 'object' ? Object.keys(obj[k]).slice(0, 10) : obj[k]);
      }
      if (k !== 'users' && k !== 'balances' && k !== 'prompts' && k !== 'economy') {
        findGifKeys(obj[k], currentPath);
      }
    });
  }
  
  findGifKeys(g);
} catch (e) {
  console.error(e);
}
