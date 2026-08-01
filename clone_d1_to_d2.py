import os
import shutil
import re

print("Cloning Dashboard 1 (working) to Dashboard 2 (port 49602)...")

# 1. Clean public2 directory
public2_dir = 'public2'
if os.path.exists(public2_dir):
    shutil.rmtree(public2_dir)

# Copy public/ to public2/
shutil.copytree('public', public2_dir)
print("Copied public/ to public2/ cleanly!")

# 2. Read src/dashboard.js and adapt for dashboard2.js (port 49602)
with open('src/dashboard.js', 'r', encoding='utf-8') as f:
    d1_code = f.read()

# Replace PORT 49601 with 49602
d2_code = d1_code.replace("process.env.PORT || 49601", "process.env.DASHBOARD2_PORT || 49602")
d2_code = d2_code.replace("PORT = process.env.PORT || 49601", "PORT = process.env.DASHBOARD2_PORT || 49602")
d2_code = d2_code.replace("49601", "49602")

# Replace public static path with public2
d2_code = d2_code.replace("path.join(__dirname, '../public')", "path.join(__dirname, '../public2')")
d2_code = d2_code.replace("express.static('public')", "express.static('public2')")

# Save to src/dashboard2.js
with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2_code)

print("Created src/dashboard2.js from src/dashboard.js!")

# 3. Rename script.js to app.js in public2 or keep script.js and update index.html
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Make title say Dashboard 2.0
html = html.replace("<title>", "<title>Bagbot Elite — Dashboard 2.0 — ")

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated!")
