print("Fixing font strings in card-worker.js with backtick template literals...")

with open('src/carte/card-worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any invalid '... " + FONT_FAMILY' with backticks `${FONT_FAMILY}`
# e.g., 'bold 28px " + FONT_FAMILY -> `bold 28px ${FONT_FAMILY}`
# e.g., `bold ${ar}px " + FONT_FAMILY -> `bold ${ar}px ${FONT_FAMILY}`

import re
content = re.sub(r"['`]\s*([^'`]*?)\s*\" \+ FONT_FAMILY;?", r'`\1 ${FONT_FAMILY}`;', content)

with open('src/carte/card-worker.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed backtick template literals in card-worker.js!")
