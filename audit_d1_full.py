"""
Audit complet de Dashboard 1 pour la reconstruction de Dashboard 2
"""
import re
import json

print("=== AUDIT DASHBOARD 1 ===\n")

# Routes du backend
with open('src/dashboard.js', 'r', encoding='utf-8', errors='ignore') as f:
    d1_server = f.read()

routes_get = re.findall(r"app\.get\(['\"]([^'\"]+)['\"]", d1_server)
routes_post = re.findall(r"app\.post\(['\"]([^'\"]+)['\"]", d1_server)

print("GET ROUTES:")
for r in sorted(set(routes_get)):
    print(f"  {r}")

print("\nPOST ROUTES:")
for r in sorted(set(routes_post)):
    print(f"  {r}")

# Tables SQLite
tables = re.findall(r'CREATE TABLE IF NOT EXISTS (\w+)', d1_server)
print(f"\nSQLite TABLES ({len(tables)}):")
for t in sorted(set(tables)):
    print(f"  {t}")

# Panels HTML
with open('public/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    d1_html = f.read()

panels = re.findall(r'id=["\'](?:panel-|tab-)([^"\']+)["\']', d1_html)
print(f"\nHTML PANELS ({len(panels)}):")
for p in sorted(set(panels)):
    print(f"  {p}")
