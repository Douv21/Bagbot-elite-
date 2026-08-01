import re

# 1. Read public/index.html lines 295 to 414
with open('public/index.html', 'r', encoding='utf-8') as f:
    d1_html = f.read()

m = re.search(r'<form id="form-welcome-leave" class="glass-form">[\s\S]*?</form>', d1_html)
d1_form_html = m.group(0) if m else ""

# Replace panel-welcome-leave in public2/index.html with the EXACT interactive embed form from D1 styled for D2
with open('public2/index.html', 'r', encoding='utf-8') as f:
    d2_html = f.read()

d2_panel_welcome = f"""        <!-- 1. ARRIVÉES & DÉPARTS (EXACT EMBED INTERACTIF DASHBOARD 1) -->
        <div class="content-panel" id="panel-welcome-leave">
          <h2 class="section-title"><i class="fa-solid fa-door-open" style="color:var(--gold3);margin-right:10px;"></i> Éditeur interactif d'Arrivées & Départs (Embed Discord)</h2>
          {d1_form_html}
        </div>"""

d2_html = re.sub(
    r'<!-- 1\. ARRIVÉES & DÉPARTS \(DISCORD EMBED PREVIEW HD\) -->[\s\S]*?<!-- 2\. REMERCIEMENTS BOOST -->',
    d2_panel_welcome + '\n\n        <!-- 2. REMERCIEMENTS BOOST -->',
    d2_html
)

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(d2_html)

print("public2/index.html updated with EXACT interactive embed form from Dashboard 1!")
