import re

with open('public2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace sidebar-overlay and mobile sidebar media query with 100% crisp solid styling
old_mobile_css = """.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(4px);
  z-index: 490;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.sidebar-overlay.active {
  opacity: 1;
  pointer-events: all;
}

/* RESPONSIVE & MOBILE PORTRAIT MODE */
@media (max-width: 900px) {
  .btn-toggle-sidebar { display: flex; }
  :root { --sidebar-w: 0px; }
  .dash-sidebar {
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
  }
  .dash-sidebar.open {
    left: 0;
  }
  .category-cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }
  .category-hub {
    padding: 24px 16px;
  }
  .dash-main {
    padding: 20px 16px;
  }
}"""

new_mobile_css = """#page-dashboard.active {
  transform: none !important;
  filter: none !important;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  filter: none !important;
  z-index: 9998 !important;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.sidebar-overlay.active {
  opacity: 1;
  pointer-events: all;
}

/* RESPONSIVE & MOBILE PORTRAIT MODE */
@media (max-width: 900px) {
  .btn-toggle-sidebar { display: flex; }
  :root { --sidebar-w: 0px; }
  .dash-sidebar {
    position: fixed !important;
    left: -330px !important;
    top: 0 !important;
    bottom: 0 !important;
    width: 300px !important;
    height: 100vh !important;
    z-index: 9999 !important;
    background: #0d0d15 !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    filter: none !important;
    opacity: 1 !important;
    box-shadow: 10px 0 50px rgba(0,0,0,0.98) !important;
    transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    border-right: 2px solid var(--gold) !important;
    overflow-y: auto !important;
    text-rendering: optimizeLegibility !important;
    -webkit-font-smoothing: antialiased !important;
  }
  .dash-sidebar.open {
    left: 0 !important;
  }
  .category-cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }
  .category-hub {
    padding: 24px 16px;
  }
  .dash-main {
    padding: 20px 16px;
  }
}"""

css = css.replace(old_mobile_css, new_mobile_css)

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("public2/style.css updated to eliminate all mobile GPU blur effects!")
