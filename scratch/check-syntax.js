const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/commands/actions');
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  console.log(`Found ${files.length} action files.`);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      eval(content);
    } catch (e) {
      console.error(`Syntax error in ${file}:`, e.message);
      // Print first line and last 100 chars
      console.log("  First line:", content.split('\n')[0].slice(0, 150));
      console.log("  End:", JSON.stringify(content.slice(-100)));
    }
  }
} else {
  console.log("Actions directory does not exist.");
}
