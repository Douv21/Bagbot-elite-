print("Applying ultimate font stack to card-worker.js...")

with open('src/carte/card-worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define FONT_FAMILY constant after imports / system font scanner
font_def = """const FONT_FAMILY = 'Arial, "Noto Color Emoji", "Symbola", "DejaVu Math TeX Gyre", "DejaVu Sans", sans-serif';"""

if 'const FONT_FAMILY =' not in content:
    content = content.replace("registerSystemFonts('/usr/share/fonts');", "registerSystemFonts('/usr/share/fonts');\n\n" + font_def)
else:
    import re
    content = re.sub(r'const FONT_FAMILY = [^;\n]+;', font_def, content)

# Replace all occurrences of 'Arial, "DejaVu Sans", sans-serif' or 'Arial' with FONT_FAMILY
content = content.replace('Arial, "DejaVu Sans", sans-serif', '${FONT_FAMILY}')
content = content.replace('Arial', '${FONT_FAMILY}')

# Clean up backtick strings where ${FONT_FAMILY} was inserted into single-quoted strings
lines = content.split('\n')
new_lines = []
for line in lines:
    if '${FONT_FAMILY}' in line and '`' not in line:
        # Convert single quotes to backticks
        # e.g., ctx.font = 'bold 28px ${FONT_FAMILY}'; -> ctx.font = `bold 28px ${FONT_FAMILY}`;
        line = line.replace("'", "`")
    new_lines.append(line)

content = '\n'.join(new_lines)

with open('src/carte/card-worker.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated card-worker.js with ultimate font stack successfully!")
