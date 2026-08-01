import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    d1_html = f.read()

# Parse tabs in d1_html
tabs = re.findall(r'<div class="tab-content[^"]*" id="tab-([^"]+)">([\s\S]*?)<!-- /tab', d1_html)
if not tabs:
    tabs = re.findall(r'id="tab-([^"]+)"([\s\S]*?)(?=<div class="tab-content"|</body>)', d1_html)

print(f"Found {len(tabs)} tabs in Dashboard 1:")

for tab_id, content in tabs:
    inputs = re.findall(r'id="([^"]+)"', content)
    buttons = re.findall(r'<button[^>]*id="([^"]+)"[^>]*>', content)
    labels = re.findall(r'<label[^>]*>(.*?)</label>', content)
    print(f"\n--- TAB: tab-{tab_id} ---")
    print(f"  Inputs/Controls count: {len(inputs)}")
    print(f"  Sample controls: {inputs[:10]}")
