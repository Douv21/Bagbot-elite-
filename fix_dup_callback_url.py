with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove duplicate const CALLBACK_URL declaration
code = code.replace("const CALLBACK_URL = process.env.DASHBOARD2_CALLBACK_URL || 'http://82.65.75.176:49602/callback';\n\napp.get('/login'", "app.get('/login'")

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Duplicate CALLBACK_URL removed!")
