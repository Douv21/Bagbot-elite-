import re

print("Fixing src/carte/card-worker.js font family replacement...")

with open('src/carte/card-worker.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'FONT_FAMILY = "' in line:
        new_lines.append('const FONT_FAMILY = \'"DejaVu Sans", "Liberation Sans", "Noto Color Emoji", "Symbola", "Segoe UI", Arial, sans-serif\';\n')
    elif "return `';" in line:
        new_lines.append("  if (!str && str !== 0) return '';\n")
    elif 'Arial' in line:
        # replace Arial with ${FONT_FAMILY} and convert quotes to backticks if needed
        line_sub = line.replace('Arial', '${FONT_FAMILY}')
        if "'" in line_sub and '${FONT_FAMILY}' in line_sub:
            line_sub = line_sub.replace("'", "`")
        new_lines.append(line_sub)
    else:
        new_lines.append(line)

with open('src/carte/card-worker.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed src/carte/card-worker.js cleanly!")
