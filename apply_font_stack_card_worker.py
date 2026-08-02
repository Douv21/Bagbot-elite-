print("Applying font stack Arial, \"DejaVu Sans\", sans-serif and safeText(username) to card-worker.js...")

with open('src/carte/card-worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update username parsing in run():
content = content.replace(
    'const { username, discriminator, avatarUrl, data, theme: themeName } = JSON.parse(raw);',
    'const { username: rawUsername, discriminator, avatarUrl, data, theme: themeName } = JSON.parse(raw);\n  const username = safeText(rawUsername) || \'Membre\';'
)

# 2. Replace all instances of 'Arial' or "Arial" with 'Arial, "DejaVu Sans", sans-serif'
content = content.replace('Arial', 'Arial, "DejaVu Sans", sans-serif')

with open('src/carte/card-worker.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated card-worker.js successfully!")
