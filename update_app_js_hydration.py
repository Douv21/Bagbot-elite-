import re

with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Update loadDashboard
old_load = "populateAllDropdowns();\n  hydrateForms();"
new_load = """populateAllDropdowns();
  hydrateForms();
  if (typeof loadGuildConfiguration === 'function') {
    try { loadGuildConfiguration(state.selectedGuild); } catch(e) {}
  }"""

app_js = app_js.replace(old_load, new_load)

# Update showPanel
old_show = "populateAllDropdowns();\n    hydrateForms();"
new_show = """populateAllDropdowns();
    hydrateForms();
    if (typeof loadGuildConfiguration === 'function') {
      try { loadGuildConfiguration(state.selectedGuild); } catch(e) {}
    }"""

app_js = app_js.replace(old_show, new_show)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js updated to call loadGuildConfiguration(state.selectedGuild)!")
