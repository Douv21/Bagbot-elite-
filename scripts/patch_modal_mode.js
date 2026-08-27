const fs = require('fs');
const path = require('path');

const modeFieldHTML = `
                        <!-- Field 2b: MODE D'ATTRIBUTION -->
                        <div style="margin-bottom: 16px;">
                          <label style="font-weight: 700; font-size: 0.78rem; text-transform: uppercase; color: #b5bac1; display: block; margin-bottom: 6px;">
                            MODE D'ATTRIBUTION
                          </label>
                          <select id="modal-selector-mode" style="width: 100%; background: #2b2d31; border: 1px solid #383a40; border-radius: 6px; color: #ffffff; font-size: 0.92rem; padding: 10px 14px; font-family: inherit; outline: none; cursor: pointer;">
                            <option value="normal">🔄 Normal (Bascule : ajoute OU retire)</option>
                            <option value="add">➕ Ajout uniquement</option>
                            <option value="remove">➖ Retrait uniquement</option>
                            <option value="unique">☝️ Unique (remplace les autres rôles du sélecteur)</option>
                            <option value="verify">✅ Définitif (ajoute et ne peut plus être retiré)</option>
                          </select>
                        </div>
`;

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'public2', 'index.html'),
];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already patched
  if (content.includes('modal-selector-mode')) {
    console.log(`[SKIP] ${filePath} - déjà patché`);
    return;
  }
  
  // Insert after the closing </div> of the TYPE DE SÉLECTEUR block
  // Anchor: the comment "Section Header: OPTIONS DU SÉLECTEUR"
  const anchor = '<!-- Section Header: OPTIONS DU SÉLECTEUR -->';
  if (!content.includes(anchor)) {
    console.log(`[ERROR] ${filePath} - ancre introuvable`);
    return;
  }
  
  content = content.replace(anchor, modeFieldHTML + '\n                          ' + anchor);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[OK] ${filePath} - patché avec succès`);
});
