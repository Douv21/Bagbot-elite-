import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    d1_html = f.read()

with open('public2/index.html', 'r', encoding='utf-8') as f:
    d2_html = f.read()

# Find all form inputs, selects, buttons, tables, and sections in d1_html
d1_inputs = set(re.findall(r'id="([^"]+)"', d1_html))
d2_inputs = set(re.findall(r'id="([^"]+)"', d2_html))

print(f"Total IDs in Dashboard 1: {len(d1_inputs)}")
print(f"Total IDs in Dashboard 2: {len(d2_inputs)}")

# Let's inspect major sections in Dashboard 1:
sections = re.findall(r'id="(tab-[^"]+)"', d1_html)
print("Dashboard 1 Tabs:", list(set(sections)))
