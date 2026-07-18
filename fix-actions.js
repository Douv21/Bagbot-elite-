const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/commands/actions');
const files = fs.readdirSync(dir);

let count = 0;
for (const file of files) {
  if (file.endsWith('.js')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remplacer le bloc de fallback par target = interaction.user
    const targetBlockRegex = /if\s*\(!target\)\s*\{\s*if\s*\(interaction\.guild\)\s*\{\s*const\s*members\s*=\s*await\s*interaction\.guild\.members\.fetch\(\{\s*limit:\s*100\s*\}\)\.catch\(\(\)\s*=>\s*null\);\s*const\s*randomMember\s*=\s*members\s*\?\s*members\.filter\(m\s*=>\s*m\.id\s*!==\s*userId\)\.random\(\)\s*:\s*null;\s*target\s*=\s*randomMember\s*\?\s*randomMember\.user\s*:\s*interaction\.user;\s*\}\s*else\s*\{\s*target\s*=\s*interaction\.user;\s*\}\s*\}/;

    if (targetBlockRegex.test(content)) {
      content = content.replace(targetBlockRegex, 'if (!target) {\n      target = interaction.user;\n    }');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated action file: ${file}`);
      count++;
    } else {
      // Tenter un remplacement textuel plus simple au cas où l'espacement diffère
      const simpleTargetBlock = `    if (!target) {
      if (interaction.guild) {
        const members = await interaction.guild.members.fetch({ limit: 100 }).catch(() => null);
        const randomMember = members ? members.filter(m => m.id !== userId).random() : null;
        target = randomMember ? randomMember.user : interaction.user;
      } else {
        target = interaction.user;
      }
    }`;
      if (content.includes(simpleTargetBlock)) {
        content = content.replace(simpleTargetBlock, `    if (!target) {
      target = interaction.user;
    }`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated action file (simple replace): ${file}`);
        count++;
      } else {
        console.warn(`Could not match fallback block in file: ${file}`);
      }
    }
  }
}

console.log(`Done! Updated ${count} files.`);
