import re

with open('public2/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add getActiveGuildId helper at the top of script.js
helper_code = """
function getActiveGuildId() {
  if (typeof state !== 'undefined' && state.selectedGuild) return state.selectedGuild;
  if (window.state && window.state.selectedGuild) return window.state.selectedGuild;
  const el = document.getElementById('guild-select');
  return el ? el.value : '';
}
"""

js = helper_code + "\n" + js

# Replace patterns where guildSelect.value or (guildSelect ? guildSelect.value : '') was used
js = re.sub(r'guildSelect\s*\?\s*guildSelect\.value\s*:\s*\'\'', 'getActiveGuildId()', js)
js = re.sub(r'guildSelect\.value', 'getActiveGuildId()', js)

with open('public2/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("public2/script.js patched with getActiveGuildId() helper!")
