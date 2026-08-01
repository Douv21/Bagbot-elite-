import re

# Read public/index.html to extract all panel contents
with open('public/index.html', 'r', encoding='utf-8') as f:
    html1 = f.read()

# Pattern for tab contents in public/index.html
tabs = re.findall(r'<div id="tab-([^"]+)" class="tab-content[^"]*">(.*?)</div>\s*<!-- Tab:', html1, re.DOTALL)
if not tabs:
    # Try alternate split
    raw_tabs = html1.split('<div id="tab-')
    print(f"Found {len(raw_tabs)} raw tab blocks")

# Let's inspect raw tab IDs in public/index.html
matches = re.findall(r'<div id="tab-([a-zA-Z0-9_-]+)" class="tab-content', html1)
print("Tab IDs in Dashboard 1:", matches)
print("Total tabs count:", len(matches))
