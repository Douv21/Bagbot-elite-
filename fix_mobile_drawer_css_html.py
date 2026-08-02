import re

# 1. Update style.css
with open('public2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Fix .page.active transform issue for page-dashboard
css_patch = """
#page-dashboard.active {
  transform: none !important;
}
"""
css += "\n" + css_patch

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("public2/style.css updated with transform: none fix!")

# 2. Update index.html to ensure sidebar and overlay are properly positioned
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove sidebar from inside dash-body and place it as first child of categoryWorkspace or body
if '<aside class="dash-sidebar" id="dashSidebar"></aside>' in html:
    html = html.replace('<aside class="dash-sidebar" id="dashSidebar"></aside>', '')
    # Insert dashSidebar inside categoryWorkspace before dash-body
    html = html.replace('<div class="dash-body">', '<aside class="dash-sidebar" id="dashSidebar"></aside>\n    <div class="dash-body">')

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated with clean sidebar drawer structure!")
