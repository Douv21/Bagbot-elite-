import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all <div class="tab-content" id="tab-..."> blocks
matches = list(re.finditer(r'<div class="tab-content[^"]*" id="tab-([^"]+)">', html))

print(f"Found {len(matches)} tab-content divs:")

tab_data = {}
for i in range(len(matches)):
    start = matches[i].start()
    end = matches[i+1].start() if i + 1 < len(matches) else len(html)
    tab_id = matches[i].group(1)
    chunk = html[start:end]
    tab_data[tab_id] = chunk
    print(f"Tab {tab_id}: length {len(chunk)} chars")

# Let's inspect detailed controls in each tab
for tab_id, chunk in tab_data.items():
    ids = re.findall(r'id="([^"]+)"', chunk)
    headings = re.findall(r'<h[234][^>]*>(.*?)</h[234]>', chunk)
    print(f"\nTab [{tab_id}]: {len(ids)} IDs")
    print(f"  Headings: {[re.sub('<[^<]+?>', '', h).strip() for h in headings[:5]]}")
