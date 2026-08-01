import re

with open('public2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

wysiwyg_css = """
/* INLINE WYSIWYG CLICK-TO-EDIT DISCORD EMBED STYLING */
.discord-left-bar {
  cursor: pointer;
}
.discord-left-bar:hover {
  filter: brightness(1.2);
  box-shadow: 0 0 10px rgba(255,255,255,0.4);
}

.discord-inline-input, .discord-inline-textarea {
  background: transparent;
  border: 1px dashed transparent;
  color: #dcddde;
  font-family: inherit;
  width: 100%;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}
.discord-inline-input:hover, .discord-inline-textarea:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(212,175,55,0.4);
}
.discord-inline-input:focus, .discord-inline-textarea:focus {
  background: rgba(0,0,0,0.5);
  border: 1px solid var(--gold);
  color: #ffffff;
  outline: none;
  box-shadow: 0 0 10px rgba(212,175,55,0.3);
}

.author-name-input {
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffffff;
}
.author-icon-input {
  font-size: 0.75rem;
  color: var(--gold2);
}
.title-input {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
}
.desc-input {
  font-size: 0.9rem;
  color: #dcddde;
  line-height: 1.4;
  resize: vertical;
}
.thumb-input, .banner-input {
  font-size: 0.78rem;
  color: var(--gold2);
  margin-top: 6px;
}
.footer-input {
  font-size: 0.78rem;
  color: #72767d;
}

.discord-inline-author-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.discord-inline-footer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
"""

css += "\n" + wysiwyg_css

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("public2/style.css updated with WYSIWYG click-to-edit styling!")
