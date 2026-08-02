import re

print("Fixing src/dashboard2.js to run standalone without requiring ./index...")

with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace line: const { client } = require('./index');
old_require = "const { client } = require('./index');"

new_helper = """// Safe mock client for Dashboard 2 (runs as standalone process on port 49602)
const client = {
  user: { displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png', id: '1523016917588115566' },
  commands: new Map(),
  guilds: { cache: { get: () => null } },
  syncExistingChannels: () => {}
};"""

code = code.replace(old_require, new_helper)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Replaced require('./index') in src/dashboard2.js!")
