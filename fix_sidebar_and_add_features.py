import re

# 1. Update style.css to fix blurry sidebar
with open('public2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Make sidebar 100% solid, crisp, and non-blurry
old_sidebar_css = """.dash-sidebar {
  width: var(--sidebar-w);
  background: var(--card-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  overflow-y: auto;
  gap: 16px;
  transition: width 0.3s ease;
}"""

new_sidebar_css = """.dash-sidebar {
  width: var(--sidebar-w);
  background: #0f0f18 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  opacity: 1 !important;
  border-right: 1px solid rgba(212, 175, 55, 0.3);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  overflow-y: auto;
  gap: 16px;
  transition: width 0.3s ease;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  box-shadow: 4px 0 25px rgba(0,0,0,0.5);
}"""

css = css.replace(old_sidebar_css, new_sidebar_css)

# Also fix drawer on mobile in style.css
old_drawer_css = """  .dash-sidebar {
    position: fixed;
    left: -290px;
    top: 0;
    bottom: 0;
    width: 280px;
    z-index: 500;
    transition: left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 10px 0 40px rgba(0,0,0,0.8);
    background: #0d0d15;
  }"""

new_drawer_css = """  .dash-sidebar {
    position: fixed;
    left: -290px;
    top: 0;
    bottom: 0;
    width: 280px;
    z-index: 500;
    transition: left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 10px 0 40px rgba(0,0,0,0.9);
    background: #0b0b12 !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    opacity: 1 !important;
  }"""

css = css.replace(old_drawer_css, new_drawer_css)

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("public2/style.css updated to make sidebar 100% sharp and solid!")
