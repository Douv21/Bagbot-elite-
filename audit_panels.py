import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    d1_html = f.read()

with open('public/script.js', 'r', encoding='utf-8') as f:
    d1_js = f.read()

with open('public2/index.html', 'r', encoding='utf-8') as f:
    d2_html = f.read()

with open('public2/app.js', 'r', encoding='utf-8') as f:
    d2_js = f.read()

# Extract data-panel or panel IDs from D1
d1_nav = re.findall(r'data-panel=["\']([^"\']+)["\']', d1_html)
d1_divs = re.findall(r'id=["\']([a-zA-Z0-9_-]*panel[a-zA-Z0-9_-]*)["\']', d1_html)

d2_nav = re.findall(r'data-panel=["\']([^"\']+)["\']', d2_html)
d2_divs = re.findall(r'id=["\']panel-([^"\']+)["\']', d2_html)

print("--- D1 NAV PANELS ---")
print(sorted(set(d1_nav)))

print("\n--- D2 NAV PANELS ---")
print(sorted(set(d2_nav)))

print("\n--- D1 API CALLS / POST ROUTES IN SCRIPT.JS ---")
d1_routes = re.findall(r'fetch\(["\'](/api/[^"\']+)["\']', d1_js)
print(sorted(set(d1_routes)))

print("\n--- D2 API CALLS / POST ROUTES IN APP.JS ---")
d2_routes = re.findall(r'fetch\(["\'](/api/[^"\']+)["\']', d2_js)
print(sorted(set(d2_routes)))

missing_routes = set(d1_routes) - set(d2_routes)
print("\n--- MISSING API ROUTES IN D2 ---")
print(sorted(missing_routes))
