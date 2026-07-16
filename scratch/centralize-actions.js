const fs = require('fs');
const path = require('path');

const actionsDir = path.join(__dirname, '../src/commands/actions');
const files = fs.readdirSync(actionsDir).filter(f => f.endsWith('.js'));

console.log(`Found ${files.length} action command files to centralize...`);

files.forEach(file => {
  const filePath = path.join(actionsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Parse name
  const nameMatch = content.match(/\.setName\(['"]([^'"]+)['"]\)/);
  if (!nameMatch) {
    console.error(`Name not found in ${file}`);
    return;
  }
  const name = nameMatch[1];

  // Parse description
  const descMatch = content.match(/\.setDescription\((['"][\s\S]*?['"])\)/);
  if (!descMatch) {
    console.error(`Description not found in ${file}`);
    return;
  }
  const desc = descMatch[1];

  // Parse title
  const titleMatch = content.match(/\.setTitle\((['"][\s\S]*?['"])\)/);
  if (!titleMatch) {
    console.error(`Title not found in ${file}`);
    return;
  }
  const title = titleMatch[1];

  // Parse actionMessage expression
  // Pattern: const actionMessage = target.id === userId \s* \? ([\s\S]*?) : ([\s\S]*?) ;
  const messageBlockMatch = content.match(/const actionMessage = ([\s\S]*?)(?=const embed|\s*let |const files)/);
  if (!messageBlockMatch) {
    console.error(`Message block not found in ${file}`);
    return;
  }
  let messageExpr = messageBlockMatch[1].trim();
  if (messageExpr.endsWith(';')) {
    messageExpr = messageExpr.slice(0, -1);
  }

  // Generate new centralized code
  const newCode = `const { SlashCommandBuilder } = require('discord.js');
const { executeAction } = require('../../utils/actionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('${name}')
    .setDescription(${desc})
    .addUserOption(option => option.setName('cible').setDescription('Personne ciblée (optionnel)').setRequired(false))
    .setDMPermission(true),

  async execute(interaction) {
    await executeAction(interaction, '${name}', {
      title: ${title},
      defaultMessage: (author, target) => {
        const userId = interaction.user.id;
        return ${messageExpr.replace(/interaction\.user/g, 'author')};
      },
      color: 0x8B0000
    });
  }
};
`;

  fs.writeFileSync(filePath, newCode, 'utf8');
  console.log(`Successfully centralized: ${file}`);
});
