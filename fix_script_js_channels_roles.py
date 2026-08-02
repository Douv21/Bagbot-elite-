import re

with open('public2/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update channelsList and rolesList getters in script.js
header_patch = """
// Sync with app.js state
function getChannelsList() {
  if (typeof state !== 'undefined' && state.channels && state.channels.length > 0) return state.channels;
  if (window.state && window.state.channels && window.state.channels.length > 0) return window.state.channels;
  return channelsList || [];
}

function getRolesList() {
  if (typeof state !== 'undefined' && state.roles && state.roles.length > 0) return state.roles;
  if (window.state && window.state.roles && window.state.roles.length > 0) return window.state.roles;
  return rolesList || [];
}
"""

js = header_patch + "\n" + js

# Replace usages of channelsList and rolesList in dropdown population loops
js = re.sub(r'channelsList\.forEach\(', 'getChannelsList().forEach(', js)
js = re.sub(r'channelsList\.filter\(', 'getChannelsList().filter(', js)
js = re.sub(r'rolesList\.forEach\(', 'getRolesList().forEach(', js)
js = re.sub(r'rolesList\.find\(', 'getRolesList().find(', js)

with open('public2/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("public2/script.js patched with getChannelsList() and getRolesList()!")

# 2. Update app.js to sync state to window.channelsList and window.rolesList
with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

sync_code = """    state.channels = channels;
    state.roles = roles;
    state.config = config;
    window.channelsList = channels;
    window.rolesList = roles;"""

app_js = app_js.replace("""    state.channels = channels;
    state.roles = roles;
    state.config = config;""", sync_code)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js updated to sync window.channelsList and window.rolesList!")
