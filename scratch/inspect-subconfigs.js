const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  
  console.log("Root keys of config.json:", Object.keys(data));
  
  // Find any key in the whole json that might contain gifs
  function findKeysRecursively(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(k => {
      const currentPath = path ? `${path}.${k}` : k;
      if (k.toLowerCase().includes('gif') || k.toLowerCase().includes('action')) {
        console.log(`Found match: ${currentPath} ->`, typeof obj[k] === 'object' ? Object.keys(obj[k]).slice(0, 10) : obj[k]);
      }
      if (k !== 'users' && k !== 'balances' && k !== 'prompts' && k !== 'economy') {
        findKeysRecursively(obj[k], currentPath);
      }
    });
  }
  findKeysRecursively(data);
} catch (e) {
  console.error(e);
}
