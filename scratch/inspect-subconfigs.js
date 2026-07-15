const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  function searchKeys(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(k => {
      const cp = path ? `${path}.${k}` : k;
      if (k.toLowerCase().includes('confess')) {
        console.log(`Found: ${cp} =`, obj[k]);
      }
      if (k !== 'users' && k !== 'balances' && k !== 'prompts' && k !== 'economy') {
        searchKeys(obj[k], cp);
      }
    });
  }
  searchKeys(g);
} catch (e) {
  console.error(e);
}
