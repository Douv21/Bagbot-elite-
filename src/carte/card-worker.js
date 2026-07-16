// Standalone card worker — runs as a child process.
// Reads JSON from stdin, writes PNG buffer to stdout.
// Uses @napi-rs/canvas — prebuilt binaries, no native compilation required.

const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ─── Safe text helper (strips chars that crash canvas fillText) ───────────────
function safeText(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{E000}-\u{F8FF}]/gu, '')
    .replace(/\uFFFD/g, '')
    .replace(/[^\x00-\xFF\u00C0-\u024F\u1E00-\u1EFF\u2000-\u206F\u20A0-\u20CF]/g, '')
    .replace(/\s{2,}/g, ' ').trim();
}


// ─── Themes ──────────────────────────────────────────────────────────────────

function getTheme(name) {
  const t = (name || 'holographique').toLowerCase();
  const themes = {
    holographique: {
      bg1: '#040a1e', bg2: '#060f28',
      aura1: ['rgba(80,40,180,0.55)','rgba(0,120,200,0.35)','rgba(0,200,180,0.15)'],
      aura2: ['rgba(140,0,200,0.45)','rgba(0,100,220,0.35)','rgba(0,200,255,0.20)'],
      border: 'rgba(0,200,255,0.4)', borderGlow: '#00c8ff',
      corner: '#00e8ff', cornerGlow: '#00e8ff',
      ringColors: ['#ff88cc','#cc88ff','#88aaff','#00eeff','#88ffcc','#cc88ff','#ff88cc'],
      barColors: ['#ff80cc','#cc80ff','#80aaff','#00eeff','#80ffcc','#cc80ff','#ff80cc'],
      levelColors: ['#e0f0ff','#a0b8ff','#c080ff','#ff80cc','#80d8ff','#a0e8cc','#e0f8ff'],
      levelGlow: '#60a8ff',
      panelBg1: 'rgba(6,16,44,0.94)', panelBg2: 'rgba(4,10,32,0.94)',
      panelBorder: 'rgba(0,180,255,0.45)', panelGlow: '#00c8ff',
      titleColor: '#a0d8ff', titleGlow: '#00c8ff',
      statColor: '#6ef7ff', grid: 'rgba(60,140,255,0.06)',
      gemOverride: null,
    },
    gaming: {
      bg1: '#0a0a0a', bg2: '#111118',
      aura1: ['rgba(0,255,80,0.45)','rgba(0,180,60,0.25)','rgba(0,255,100,0.10)'],
      aura2: ['rgba(255,100,0,0.40)','rgba(200,50,0,0.25)','rgba(255,180,0,0.15)'],
      border: 'rgba(0,255,80,0.55)', borderGlow: '#00ff50',
      corner: '#00ff50', cornerGlow: '#00ff50',
      ringColors: ['#00ff50','#80ff00','#ffff00','#ff8000','#ff4000','#ff0080','#00ff50'],
      barColors: ['#00ff50','#80ff00','#ffff00','#ff8000','#ff4000','#ff0080','#00ff50'],
      levelColors: ['#ffffff','#80ff80','#00ff50','#ffff00','#ff8000','#80ff80','#ffffff'],
      levelGlow: '#00ff50',
      panelBg1: 'rgba(0,20,5,0.94)', panelBg2: 'rgba(0,10,3,0.94)',
      panelBorder: 'rgba(0,255,80,0.45)', panelGlow: '#00ff50',
      titleColor: '#80ff80', titleGlow: '#00ff50',
      statColor: '#00ff80', grid: 'rgba(0,255,80,0.05)',
      gemOverride: ['#80ff80','#00cc40','#005020','#00ff50'],
    },
    love: {
      bg1: '#1a0010', bg2: '#120008',
      aura1: ['rgba(255,80,150,0.55)','rgba(200,40,100,0.35)','rgba(255,150,200,0.15)'],
      aura2: ['rgba(255,40,120,0.45)','rgba(180,0,80,0.30)','rgba(255,100,180,0.20)'],
      border: 'rgba(255,80,160,0.55)', borderGlow: '#ff50a0',
      corner: '#ff80c0', cornerGlow: '#ff50a0',
      ringColors: ['#ff80c0','#ff40a0','#ff0080','#ff80c0','#ffb0d8','#ff40a0','#ff80c0'],
      barColors: ['#ff80c0','#ff40a0','#ff0080','#ff80c0','#ffb0d8','#ff40a0','#ff80c0'],
      levelColors: ['#ffe0f0','#ffb0d8','#ff80c0','#ff40a0','#ff0080','#ffb0d8','#ffe0f0'],
      levelGlow: '#ff50a0',
      panelBg1: 'rgba(40,5,20,0.94)', panelBg2: 'rgba(30,3,15,0.94)',
      panelBorder: 'rgba(255,80,160,0.45)', panelGlow: '#ff50a0',
      titleColor: '#ffb0d8', titleGlow: '#ff50a0',
      statColor: '#ffb0d8', grid: 'rgba(255,80,160,0.05)',
      gemOverride: ['#ffb0d8','#ff40a0','#cc0060','#ff80c0'],
    },
    sensuel: {
      bg1: '#150010', bg2: '#0d0008',
      aura1: ['rgba(180,0,120,0.55)','rgba(120,0,80,0.35)','rgba(220,80,180,0.15)'],
      aura2: ['rgba(100,0,60,0.50)','rgba(200,0,100,0.30)','rgba(255,60,160,0.20)'],
      border: 'rgba(200,0,120,0.55)', borderGlow: '#cc0080',
      corner: '#cc0080', cornerGlow: '#ff0090',
      ringColors: ['#cc0080','#990060','#660040','#cc0080','#ff40a0','#990060','#cc0080'],
      barColors: ['#ff40a0','#cc0080','#990060','#660040','#cc0080','#ff40a0','#cc0080'],
      levelColors: ['#ffc0e0','#ff80c0','#cc0080','#990060','#660040','#ff80c0','#ffc0e0'],
      levelGlow: '#cc0080',
      panelBg1: 'rgba(30,0,18,0.96)', panelBg2: 'rgba(20,0,12,0.96)',
      panelBorder: 'rgba(200,0,120,0.50)', panelGlow: '#cc0080',
      titleColor: '#ff80c0', titleGlow: '#cc0080',
      statColor: '#ff80c0', grid: 'rgba(200,0,120,0.04)',
      gemOverride: ['#ff80c0','#cc0080','#660040','#ff40a0'],
    },
    cosmos: {
      bg1: '#010112', bg2: '#00010e',
      aura1: ['rgba(60,0,180,0.55)','rgba(100,0,200,0.35)','rgba(180,80,255,0.15)'],
      aura2: ['rgba(0,20,180,0.45)','rgba(40,0,160,0.30)','rgba(120,60,255,0.20)'],
      border: 'rgba(140,60,255,0.55)', borderGlow: '#8c3cff',
      corner: '#a060ff', cornerGlow: '#8c3cff',
      ringColors: ['#a060ff','#8040ff','#6020ff','#a060ff','#c090ff','#8040ff','#a060ff'],
      barColors: ['#c090ff','#a060ff','#8040ff','#6020ff','#a060ff','#c090ff','#a060ff'],
      levelColors: ['#e8d8ff','#c090ff','#a060ff','#8040ff','#6020ff','#c090ff','#e8d8ff'],
      levelGlow: '#8c3cff',
      panelBg1: 'rgba(5,2,20,0.96)', panelBg2: 'rgba(3,1,15,0.96)',
      panelBorder: 'rgba(140,60,255,0.45)', panelGlow: '#8c3cff',
      titleColor: '#c090ff', titleGlow: '#8c3cff',
      statColor: '#c090ff', grid: 'rgba(120,60,255,0.05)',
      gemOverride: ['#c090ff','#8040ff','#4010c0','#a060ff'],
    },
    nature: {
      bg1: '#021008', bg2: '#010a05',
      aura1: ['rgba(20,120,40,0.55)','rgba(40,160,60,0.35)','rgba(80,200,80,0.15)'],
      aura2: ['rgba(100,180,20,0.40)','rgba(60,140,20,0.25)','rgba(160,220,40,0.15)'],
      border: 'rgba(40,180,60,0.55)', borderGlow: '#28b43c',
      corner: '#40c050', cornerGlow: '#28b43c',
      ringColors: ['#40c050','#80d840','#c0f040','#80d840','#40c050','#20a030','#40c050'],
      barColors: ['#40c050','#80d840','#c0f040','#80d840','#40c050','#20a030','#40c050'],
      levelColors: ['#e0ffe8','#a0f0b0','#40c050','#80d840','#20a030','#a0f0b0','#e0ffe8'],
      levelGlow: '#28b43c',
      panelBg1: 'rgba(3,16,6,0.94)', panelBg2: 'rgba(2,10,4,0.94)',
      panelBorder: 'rgba(40,180,60,0.45)', panelGlow: '#28b43c',
      titleColor: '#a0f0b0', titleGlow: '#28b43c',
      statColor: '#80e890', grid: 'rgba(40,180,60,0.05)',
      gemOverride: ['#a0f0b0','#40c050','#106020','#80d840'],
    },
    dark: {
      bg1: '#050505', bg2: '#020202',
      aura1: ['rgba(80,80,80,0.45)','rgba(40,40,60,0.30)','rgba(100,100,120,0.12)'],
      aura2: ['rgba(60,40,80,0.40)','rgba(40,20,60,0.25)','rgba(80,60,100,0.15)'],
      border: 'rgba(160,140,180,0.40)', borderGlow: '#a08cb4',
      corner: '#c0a8d8', cornerGlow: '#a08cb4',
      ringColors: ['#c0a8d8','#a080c0','#8060a0','#604080','#a080c0','#c0a8d8','#c0a8d8'],
      barColors: ['#c0a8d8','#a080c0','#8060a0','#604080','#a080c0','#c0a8d8','#c0a8d8'],
      levelColors: ['#e8e0f0','#c0a8d8','#a080c0','#8060a0','#604080','#c0a8d8','#e8e0f0'],
      levelGlow: '#a08cb4',
      panelBg1: 'rgba(8,6,10,0.97)', panelBg2: 'rgba(5,4,7,0.97)',
      panelBorder: 'rgba(140,120,160,0.40)', panelGlow: '#a08cb4',
      titleColor: '#c0a8d8', titleGlow: '#a08cb4',
      statColor: '#c0a8d8', grid: 'rgba(100,80,120,0.04)',
      gemOverride: ['#c0a8d8','#8060a0','#402060','#a080c0'],
    },
    gold: {
      bg1: '#100800', bg2: '#0a0500',
      aura1: ['rgba(220,160,0,0.55)','rgba(180,120,0,0.35)','rgba(255,200,40,0.15)'],
      aura2: ['rgba(200,120,0,0.45)','rgba(160,80,0,0.30)','rgba(255,160,0,0.20)'],
      border: 'rgba(220,160,0,0.60)', borderGlow: '#dca000',
      corner: '#ffd700', cornerGlow: '#dca000',
      ringColors: ['#ffd700','#ffaa00','#ff8800','#ffaa00','#ffd700','#ffe860','#ffd700'],
      barColors: ['#ffd700','#ffaa00','#ff8800','#ffaa00','#ffd700','#ffe860','#ffd700'],
      levelColors: ['#fffbe0','#ffe860','#ffd700','#ffaa00','#ff8800','#ffe860','#fffbe0'],
      levelGlow: '#dca000',
      panelBg1: 'rgba(20,12,0,0.96)', panelBg2: 'rgba(14,8,0,0.96)',
      panelBorder: 'rgba(220,160,0,0.50)', panelGlow: '#dca000',
      titleColor: '#ffe860', titleGlow: '#dca000',
      statColor: '#ffd060', grid: 'rgba(220,160,0,0.05)',
      gemOverride: ['#ffe860','#ffd700','#a07000','#ffaa00'],
    },
    argent: {
      bg1: '#0a0c10', bg2: '#060810',
      aura1: ['rgba(160,180,210,0.50)','rgba(120,140,180,0.30)','rgba(200,210,230,0.12)'],
      aura2: ['rgba(100,120,160,0.40)','rgba(80,100,140,0.25)','rgba(160,180,210,0.15)'],
      border: 'rgba(180,200,230,0.55)', borderGlow: '#b4c8e6',
      corner: '#d0e0f8', cornerGlow: '#b4c8e6',
      ringColors: ['#d0e0f8','#b0c8e8','#90a8d0','#b0c8e8','#d0e0f8','#e8f0fc','#d0e0f8'],
      barColors: ['#d0e0f8','#b0c8e8','#90a8d0','#b0c8e8','#d0e0f8','#e8f0fc','#d0e0f8'],
      levelColors: ['#ffffff','#e8f0fc','#d0e0f8','#b0c8e8','#90a8d0','#e8f0fc','#ffffff'],
      levelGlow: '#b4c8e6',
      panelBg1: 'rgba(12,16,22,0.96)', panelBg2: 'rgba(8,10,16,0.96)',
      panelBorder: 'rgba(180,200,230,0.45)', panelGlow: '#b4c8e6',
      titleColor: '#d0e0f8', titleGlow: '#b4c8e6',
      statColor: '#c0d8f0', grid: 'rgba(160,180,220,0.04)',
      gemOverride: ['#e8f0fc','#b0c8e8','#607090','#d0e0f8'],
    },
    bleu: {
      bg1: '#000818', bg2: '#000510',
      aura1: ['rgba(0,80,220,0.55)','rgba(0,120,255,0.35)','rgba(0,180,255,0.15)'],
      aura2: ['rgba(0,60,200,0.45)','rgba(0,100,240,0.30)','rgba(40,160,255,0.20)'],
      border: 'rgba(0,140,255,0.60)', borderGlow: '#008cff',
      corner: '#40b0ff', cornerGlow: '#008cff',
      ringColors: ['#40b0ff','#0080ff','#0050e0','#0080ff','#40b0ff','#80d0ff','#40b0ff'],
      barColors: ['#40b0ff','#0080ff','#0050e0','#0080ff','#40b0ff','#80d0ff','#40b0ff'],
      levelColors: ['#e0f4ff','#80d0ff','#40b0ff','#0080ff','#0050e0','#80d0ff','#e0f4ff'],
      levelGlow: '#008cff',
      panelBg1: 'rgba(0,8,22,0.96)', panelBg2: 'rgba(0,5,15,0.96)',
      panelBorder: 'rgba(0,140,255,0.50)', panelGlow: '#008cff',
      titleColor: '#80d0ff', titleGlow: '#008cff',
      statColor: '#60c0ff', grid: 'rgba(0,140,255,0.05)',
      gemOverride: ['#80d0ff','#0080ff','#002080','#40b0ff'],
    },
    rose: {
      bg1: '#120008', bg2: '#0d0005',
      aura1: ['rgba(255,100,180,0.55)','rgba(220,60,150,0.35)','rgba(255,160,210,0.15)'],
      aura2: ['rgba(200,40,140,0.45)','rgba(160,20,110,0.30)','rgba(255,120,190,0.20)'],
      border: 'rgba(255,100,180,0.60)', borderGlow: '#ff64b4',
      corner: '#ff80c8', cornerGlow: '#ff64b4',
      ringColors: ['#ff80c8','#ff50a8','#ff2090','#ff50a8','#ff80c8','#ffb0de','#ff80c8'],
      barColors: ['#ff80c8','#ff50a8','#ff2090','#ff50a8','#ff80c8','#ffb0de','#ff80c8'],
      levelColors: ['#ffe8f4','#ffb0de','#ff80c8','#ff50a8','#ff2090','#ffb0de','#ffe8f4'],
      levelGlow: '#ff64b4',
      panelBg1: 'rgba(20,0,10,0.96)', panelBg2: 'rgba(14,0,7,0.96)',
      panelBorder: 'rgba(255,100,180,0.50)', panelGlow: '#ff64b4',
      titleColor: '#ffb0de', titleGlow: '#ff64b4',
      statColor: '#ff90d0', grid: 'rgba(255,100,180,0.05)',
      gemOverride: ['#ffb0de','#ff50a8','#880040','#ff80c8'],
    },
  };
  return themes[t] || themes['holographique'];
}

// ─── Themed background decorations ───────────────────────────────────────────

function drawHeart(ctx, hx, hy, hs) {
  ctx.beginPath();
  ctx.moveTo(hx, hy + hs * 0.35);
  ctx.bezierCurveTo(hx, hy - hs*0.05, hx - hs, hy - hs*0.05, hx - hs, hy + hs*0.35);
  ctx.bezierCurveTo(hx - hs, hy + hs*0.8, hx, hy + hs*1.2, hx, hy + hs*1.4);
  ctx.bezierCurveTo(hx, hy + hs*1.2, hx + hs, hy + hs*0.8, hx + hs, hy + hs*0.35);
  ctx.bezierCurveTo(hx + hs, hy - hs*0.05, hx, hy - hs*0.05, hx, hy + hs*0.35);
  ctx.closePath();
}

function drawLeaf(ctx, lx, ly, ls, rot) {
  ctx.save(); ctx.translate(lx, ly); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -ls);
  ctx.bezierCurveTo(ls*0.85, -ls*0.4, ls*0.85, ls*0.4, 0, ls);
  ctx.bezierCurveTo(-ls*0.85, ls*0.4, -ls*0.85, -ls*0.4, 0, -ls);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawThemeBackground(ctx, W, H, theme, themeName) {
  ctx.save();
  const t = (themeName || 'holographique').toLowerCase();

  // Visible zones (not covered by panels):
  // - Top strip: y=22..130, full width
  // - Left section: x=22..310, y=130..410 (avatar area, no panel)
  // - Center-left: x=310..840, y=130..410 (name area, no panel)
  // - Bottom thin strip: y=750..778
  // - All 4 corner areas
  // Panel areas (semi-transparent 94-97%) show ~4% of background through them

  if (t === 'holographique') {
    // Prismatic rays from top-left corner (visible zone)
    for (let i = 0; i < 12; i++) {
      const angle = 0.05 + i * 0.14;
      const g = ctx.createLinearGradient(0, 0, Math.cos(angle)*W*1.2, Math.sin(angle)*H*1.2);
      const cols = ['rgba(0,240,255,0.32)','rgba(180,60,255,0.26)','rgba(0,200,200,0.28)'];
      g.addColorStop(0, cols[i%3]); g.addColorStop(0.6,'rgba(0,100,200,0.08)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle-0.06)*W*1.2, Math.sin(angle-0.06)*H*1.2);
      ctx.lineTo(Math.cos(angle+0.06)*W*1.2, Math.sin(angle+0.06)*H*1.2);
      ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    }
    // Large lens flares in top area (visible)
    [[80,80,110,'rgba(0,240,255,0.40)'],[400,60,80,'rgba(160,80,255,0.35)'],
     [700,50,70,'rgba(0,200,255,0.30)'],[180,340,100,'rgba(0,160,255,0.25)'],
     [550,300,90,'rgba(120,60,255,0.22)']].forEach(([x,y,r,c]) => {
      const g = ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,c); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    });
    // Right-side diagonal sheen
    const sw = ctx.createLinearGradient(W*0.55,0,W,H);
    sw.addColorStop(0,'rgba(0,220,255,0.12)'); sw.addColorStop(0.4,'rgba(180,80,255,0.16)');
    sw.addColorStop(0.7,'rgba(0,240,255,0.10)'); sw.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sw; ctx.fillRect(0,0,W,H);

  } else if (t === 'gaming') {
    // Scanlines full card
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#00ff50';
    for (let y = 0; y < H; y += 5) { ctx.fillRect(0, y, W, 2); }
    // HUD crosshair — in the center-top VISIBLE area (not behind niveau panel)
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#00ff50'; ctx.lineWidth = 3;
    const gcx = 560, gcy = 80, gcr = 55;
    ctx.beginPath(); ctx.arc(gcx, gcy, gcr, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(gcx, gcy, gcr*0.32, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 0.30;
    ctx.beginPath(); ctx.arc(gcx, gcy, gcr*1.5, 0, Math.PI*2);
    ctx.strokeStyle = '#00ff50'; ctx.lineWidth = 1; ctx.stroke();
    [[gcx-gcr*1.7,gcy,gcx-gcr*1.1,gcy],[gcx+gcr*1.1,gcy,gcx+gcr*1.7,gcy],
     [gcx,gcy-gcr*1.7,gcx,gcy-gcr*1.1],[gcx,gcy+gcr*1.1,gcx,gcy+gcr*1.7]].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
      ctx.globalAlpha=0.55; ctx.strokeStyle='#00ff50'; ctx.lineWidth=3; ctx.stroke();
    });
    // HP / MP bars visible in top-left
    ctx.globalAlpha = 0.50;
    [['#00ff50',36,38,200,18],['#4488ff',36,64,145,18]].forEach(([col,bx,by,bw,bh]) => {
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(bx-2,by-2,bw+4,bh+4);
      ctx.fillStyle=col; ctx.fillRect(bx,by,bw,bh);
    });
    // Pixel blocks (corners)
    ctx.globalAlpha = 0.45;
    [[36,H-60,14,'#00ff50'],[56,H-60,10,'#ffff00'],[36,H-80,12,'#ff4000'],
     [760,44,16,'#00ff50'],[782,38,10,'#ffff00'],[760,26,12,'#80ff00']].forEach(([x,y,s,c]) => {
      ctx.fillStyle=c; ctx.fillRect(x,y,s,s);
    });
    // Radar lines from crosshair
    ctx.globalAlpha = 0.20;
    ctx.strokeStyle = '#00ff50'; ctx.lineWidth = 1;
    for (let a = 0; a < Math.PI*2; a += Math.PI/6) {
      ctx.beginPath(); ctx.moveTo(gcx,gcy);
      ctx.lineTo(gcx+Math.cos(a)*200, gcy+Math.sin(a)*200); ctx.stroke();
    }
    // Green glow in left section
    const gg2 = ctx.createRadialGradient(200,300,0,200,300,220);
    gg2.addColorStop(0,'rgba(0,255,80,0.12)'); gg2.addColorStop(1,'rgba(0,255,80,0)');
    ctx.globalAlpha=1; ctx.fillStyle=gg2; ctx.beginPath(); ctx.arc(200,300,220,0,Math.PI*2); ctx.fill();

  } else if (t === 'love') {
    // Large hearts — focused in VISIBLE zones (top strip + left/center + borders)
    const heartPos = [
      // Top strip (very visible)
      [80,45,36],[260,38,26],[480,52,32],[700,42,28],[850,50,22],
      // Left-center section (avatar area, visible)
      [50,200,22],[50,380,18],[260,160,16],[400,200,14],[200,340,20],
      // Bottom border
      [100,740,22],[350,750,18],[700,745,24],[1050,748,18],[1350,738,20],
      // Right border (outside niveau panel bottom area)
      [1380,200,18],[1360,420,20],[1370,600,16],
    ];
    heartPos.forEach(([hx, hy, hs]) => {
      const hg = ctx.createRadialGradient(hx,hy+hs*0.7,0,hx,hy+hs*0.7,hs*2.8);
      hg.addColorStop(0,'rgba(255,60,140,0.30)'); hg.addColorStop(1,'rgba(255,60,140,0)');
      ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(hx,hy+hs*0.7,hs*2.8,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.50; ctx.fillStyle=theme.corner;
      drawHeart(ctx,hx,hy,hs); ctx.fill(); ctx.globalAlpha=1;
    });
    // Pink glow corners
    [[0,0],[W,0],[0,H],[W,H]].forEach(([mx,my]) => {
      const mg=ctx.createRadialGradient(mx,my,0,mx,my,350);
      mg.addColorStop(0,'rgba(255,80,160,0.18)'); mg.addColorStop(1,'rgba(255,80,160,0)');
      ctx.fillStyle=mg; ctx.fillRect(0,0,W,H);
    });

  } else if (t === 'sensuel') {
    // Silk drapes — thick, visible
    ctx.lineWidth = 4;
    for (let i = 0; i < 10; i++) {
      const ox = -80 + i * 155;
      const g = ctx.createLinearGradient(ox, 0, ox+100, H);
      g.addColorStop(0,'rgba(200,0,100,0)');
      g.addColorStop(0.25,'rgba(200,0,100,0.30)');
      g.addColorStop(0.5,'rgba(255,40,120,0.22)');
      g.addColorStop(0.75,'rgba(200,0,100,0.30)');
      g.addColorStop(1,'rgba(200,0,100,0)');
      ctx.strokeStyle=g; ctx.globalAlpha=0.60;
      ctx.beginPath(); ctx.moveTo(ox,0);
      ctx.bezierCurveTo(ox+70,H*0.28, ox+20,H*0.55, ox+90,H); ctx.stroke();
    }
    ctx.globalAlpha=1;
    // Large rose petals — in visible areas
    [[160,68,55,26,0.5],[400,58,45,21,1.1],[620,72,40,19,2.2],
     [50,250,42,20,0.8],[50,450,38,18,1.5],
     [1380,230,40,19,0.3],[1370,480,36,17,1.9],
     [200,740,50,23,0.7],[550,748,44,21,1.8],[900,742,42,20,0.4],[1200,740,46,22,2.1]].forEach(([px,py,rw,rh,angle]) => {
      ctx.save(); ctx.translate(px,py); ctx.rotate(angle);
      ctx.globalAlpha=0.50; ctx.fillStyle=theme.corner;
      ctx.beginPath(); ctx.ellipse(0,0,rw,rh,0,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.18; ctx.fillStyle='#ffffff';
      ctx.beginPath(); ctx.ellipse(-rw*0.25,-rh*0.25,rw*0.35,rh*0.28,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
    // Corner vignette
    [[0,H],[W,0]].forEach(([vx,vy]) => {
      const vg=ctx.createRadialGradient(vx,vy,0,vx,vy,500);
      vg.addColorStop(0,'rgba(160,0,80,0.22)'); vg.addColorStop(1,'rgba(160,0,80,0)');
      ctx.globalAlpha=1; ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    });

  } else if (t === 'cosmos') {
    // Dense starfield — 400 stars, full brightness
    const rng = s => { let x=Math.sin(s)*10000; return x-Math.floor(x); };
    for (let i = 0; i < 400; i++) {
      const sx=rng(i*3+1)*W, sy=rng(i*3+2)*H, sr=rng(i*3+3)*2.5+0.4;
      const bright=rng(i*3)*0.5+0.5;
      ctx.globalAlpha=bright*0.85;
      if (sr > 1.8) {
        ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=0.8;
        ctx.globalAlpha=bright*0.45;
        [[sx-sr*4,sy,sx+sr*4,sy],[sx,sy-sr*4,sx,sy+sr*4]].forEach(([x1,y1,x2,y2]) => {
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        });
        ctx.globalAlpha=bright*0.85;
      }
      ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2);
      ctx.fillStyle='#ffffff'; ctx.fill();
    }
    // Bright nebula (left section, visible around avatar)
    ctx.globalAlpha=1;
    [[180,280,200,'rgba(80,20,180,0.35)'],[350,180,160,'rgba(120,40,220,0.28)'],
     [480,350,140,'rgba(60,0,160,0.22)'],[100,400,180,'rgba(100,30,200,0.20)'],
     [1100,200,220,'rgba(80,20,160,0.25)'],[1280,400,180,'rgba(60,0,140,0.20)']].forEach(([nx,ny,nr,nc]) => {
      const ng=ctx.createRadialGradient(nx,ny,0,nx,ny,nr);
      ng.addColorStop(0,nc); ng.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(nx,ny,nr,0,Math.PI*2); ctx.fill();
    });
    // Bright constellations in top strip (very visible)
    ctx.globalAlpha=0.70;
    ctx.strokeStyle=theme.corner; ctx.lineWidth=1.5;
    const cst=[[80,60],[200,40],[320,75],[440,45],[540,80],[660,50],[760,65],[820,42]];
    for (let i=0;i<cst.length-1;i++) {
      ctx.beginPath(); ctx.moveTo(...cst[i]); ctx.lineTo(...cst[i+1]); ctx.stroke();
    }
    cst.forEach(([sx,sy]) => {
      ctx.beginPath(); ctx.arc(sx,sy,4,0,Math.PI*2);
      ctx.fillStyle='#ffffff'; ctx.fill();
    });
    // Shooting star
    ctx.globalAlpha=0.75;
    const ssg=ctx.createLinearGradient(900,30,1250,90);
    ssg.addColorStop(0,'rgba(180,120,255,0)'); ssg.addColorStop(0.5,theme.corner); ssg.addColorStop(1,'#ffffff');
    ctx.strokeStyle=ssg; ctx.lineWidth=3.5;
    ctx.beginPath(); ctx.moveTo(900,30); ctx.lineTo(1250,90); ctx.stroke();

  } else if (t === 'nature') {
    // Green mist (bottom and left)
    const gnd=ctx.createLinearGradient(0,H*0.5,0,H);
    gnd.addColorStop(0,'rgba(10,60,15,0)'); gnd.addColorStop(1,'rgba(10,70,20,0.35)');
    ctx.fillStyle=gnd; ctx.fillRect(0,0,W,H);
    const gLeft=ctx.createLinearGradient(0,0,200,0);
    gLeft.addColorStop(0,'rgba(10,80,20,0.25)'); gLeft.addColorStop(1,'rgba(10,80,20,0)');
    ctx.fillStyle=gLeft; ctx.fillRect(0,0,W,H);
    // Large leaves in visible areas
    ctx.globalAlpha=0.52;
    ctx.fillStyle=theme.corner;
    [// Top strip
     [70,50,62,0.3],[200,36,50,1.2],[400,48,56,2.0],[620,38,46,0.7],
     [830,44,52,1.5],[1050,52,48,0.2],[1250,60,44,1.9],[1390,130,40,2.5],
     // Bottom border
     [50,740,58,1.1],[280,752,50,0.4],[600,748,54,2.3],[900,750,48,1.0],[1150,742,44,1.6],[1380,720,40,0.8],
     // Left side (visible, no panel)
     [36,200,42,2.1],[36,360,38,0.6]
    ].forEach(([lx,ly,ls,rot]) => { drawLeaf(ctx,lx,ly,ls,rot); });
    // Veins on large leaves
    ctx.globalAlpha=0.25; ctx.strokeStyle='#c0f040'; ctx.lineWidth=2;
    [[70,50,62,0.3],[830,44,52,1.5],[1250,60,44,1.9]].forEach(([lx,ly,ls,rot]) => {
      ctx.save(); ctx.translate(lx,ly); ctx.rotate(rot);
      ctx.beginPath(); ctx.moveTo(0,-ls); ctx.lineTo(0,ls); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-ls*0.2); ctx.lineTo(ls*0.55,ls*0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,ls*0.25); ctx.lineTo(-ls*0.55,ls*0.55); ctx.stroke();
      ctx.restore();
    });
    // Branch curves
    ctx.globalAlpha=0.35; ctx.strokeStyle='#50901e'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(0,H*0.32);
    ctx.bezierCurveTo(W*0.18,H*0.12, W*0.38,H*0.52, W*0.58,H*0.22);
    ctx.bezierCurveTo(W*0.76,H*0.04, W*0.92,H*0.42, W,H*0.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,H*0.72);
    ctx.bezierCurveTo(W*0.22,H*0.88, W*0.52,H*0.75, W*0.72,H*0.90);
    ctx.bezierCurveTo(W*0.86,H*0.98, W*0.94,H*0.86, W,H*0.92); ctx.stroke();

  } else if (t === 'dark') {
    // Full hexagon grid, clearly visible
    ctx.globalAlpha=0.28; ctx.strokeStyle=theme.corner; ctx.lineWidth=1.8;
    const hexR=52, hexH=hexR*Math.sqrt(3);
    for (let col=-1; col<W/(hexR*1.5)+2; col++) {
      for (let row=-1; row<H/hexH+2; row++) {
        const hcx=col*hexR*3+(row%2===0?0:hexR*1.5), hcy=row*hexH;
        ctx.beginPath();
        for (let i=0;i<6;i++) {
          const a=(Math.PI/180)*(60*i-30);
          i===0?ctx.moveTo(hcx+hexR*Math.cos(a),hcy+hexR*Math.sin(a)):ctx.lineTo(hcx+hexR*Math.cos(a),hcy+hexR*Math.sin(a));
        }
        ctx.closePath(); ctx.stroke();
      }
    }
    // Glowing filled hexagons
    ctx.globalAlpha=0.20; ctx.fillStyle=theme.corner;
    [[180,165],[560,110],[820,280],[300,460],[680,600],[1100,290],[950,640]].forEach(([hx,hy]) => {
      ctx.beginPath();
      for (let i=0;i<6;i++) {
        const a=(Math.PI/180)*(60*i-30);
        i===0?ctx.moveTo(hx+hexR*Math.cos(a),hy+hexR*Math.sin(a)):ctx.lineTo(hx+hexR*Math.cos(a),hy+hexR*Math.sin(a));
      }
      ctx.closePath(); ctx.fill();
    });
    // Corner dark mist
    [[0,0,350,'rgba(50,0,70,0.28)'],[W,0,320,'rgba(30,0,50,0.22)'],
     [0,H,300,'rgba(40,0,60,0.20)'],[W,H,280,'rgba(50,0,70,0.25)']].forEach(([fx,fy,fr,fc]) => {
      const fg2=ctx.createRadialGradient(fx,fy,0,fx,fy,fr);
      fg2.addColorStop(0,fc); fg2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.globalAlpha=1; ctx.fillStyle=fg2; ctx.beginPath(); ctx.arc(fx,fy,fr,0,Math.PI*2); ctx.fill();
    });

  } else if (t === 'gold') {
    // Bold diagonal gold stripes
    ctx.globalAlpha=0.22; ctx.strokeStyle='#ffd700'; ctx.lineWidth=1.5;
    for (let i=-H; i<W+H; i+=20) {
      ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+H,H); ctx.stroke();
    }
    // Large diamond lattice
    ctx.globalAlpha=0.28; ctx.strokeStyle='#ffe860'; ctx.lineWidth=2.5;
    for (let i=0; i<9; i++) for (let j=0; j<6; j++) {
      const dx=70+i*148, dy=60+j*130, ds=52;
      ctx.beginPath();
      ctx.moveTo(dx,dy-ds); ctx.lineTo(dx+ds,dy); ctx.lineTo(dx,dy+ds); ctx.lineTo(dx-ds,dy);
      ctx.closePath(); ctx.stroke();
    }
    // Bright gold orbs in visible areas
    [[120,80,140,'rgba(255,215,0,0.38)'],[400,200,120,'rgba(255,180,0,0.28)'],
     [200,380,110,'rgba(255,200,0,0.25)'],[700,60,100,'rgba(255,220,0,0.22)'],
     [1200,120,130,'rgba(255,215,0,0.30)'],[1000,680,110,'rgba(255,200,0,0.26)']].forEach(([gx,gy,gr,gc]) => {
      const gg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
      gg.addColorStop(0,gc); gg.addColorStop(1,'rgba(255,180,0,0)');
      ctx.globalAlpha=1; ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(gx,gy,gr,0,Math.PI*2); ctx.fill();
    });
    // Gold sheen sweep
    const gs=ctx.createLinearGradient(0,0,W,H*0.55);
    gs.addColorStop(0,'rgba(255,255,180,0)'); gs.addColorStop(0.42,'rgba(255,235,80,0.18)');
    gs.addColorStop(0.5,'rgba(255,255,200,0.30)'); gs.addColorStop(0.58,'rgba(255,235,80,0.18)');
    gs.addColorStop(1,'rgba(255,255,180,0)');
    ctx.fillStyle=gs; ctx.fillRect(0,0,W,H);

  } else if (t === 'argent') {
    // Metallic horizontal wave bands
    ctx.globalAlpha=0.18; ctx.strokeStyle='#c8dcf4'; ctx.lineWidth=1.2;
    for (let y=0; y<H; y+=7) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y+Math.sin(y*0.035)*12); ctx.stroke();
    }
    // Multiple silver sheen streaks
    [[0,0,W*0.45,H*0.30],[W*0.25,H*0.1,W*0.7,H*0.4],[W*0.5,H*0.25,W,H*0.6]].forEach(([x1,y1,x2,y2]) => {
      const ag=ctx.createLinearGradient(x1,y1,x2,y2);
      ag.addColorStop(0,'rgba(255,255,255,0)'); ag.addColorStop(0.38,'rgba(210,230,255,0.28)');
      ag.addColorStop(0.5,'rgba(255,255,255,0.45)'); ag.addColorStop(0.62,'rgba(210,230,255,0.28)');
      ag.addColorStop(1,'rgba(255,255,255,0)');
      ctx.globalAlpha=1; ctx.fillStyle=ag; ctx.fillRect(0,0,W,H);
    });
    // Silver rings (left section, visible)
    ctx.globalAlpha=0.30; ctx.strokeStyle='#d8eeff'; ctx.lineWidth=2.5;
    [[200,240,90],[120,340,60],[350,160,70],[550,80,55]].forEach(([cx,cy,cr]) => {
      ctx.beginPath(); ctx.arc(cx,cy,cr,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=0.12; ctx.beginPath(); ctx.arc(cx,cy,cr*1.5,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=0.30;
    });

  } else if (t === 'bleu') {
    // Ocean waves full width (centered in visible mid area)
    ctx.lineWidth=3.5;
    const wc=['#40b0ff','#0080ff','#80d0ff','#0060e0','#60c0ff','#2090e0'];
    for (let w=0; w<10; w++) {
      ctx.globalAlpha=0.35;
      ctx.strokeStyle=wc[w%wc.length];
      ctx.beginPath();
      for (let x=0; x<=W; x+=4) {
        const wy=H*0.48+w*46+Math.sin(x*0.011+w*0.85)*38+Math.sin(x*0.024+w*0.38)*20;
        x===0?ctx.moveTo(x,wy):ctx.lineTo(x,wy);
      }
      ctx.stroke();
    }
    // Concentric ripples from top-left (visible, not behind panel)
    ctx.globalAlpha=0.38; ctx.strokeStyle='#40b0ff';
    for (let r=50; r<420; r+=50) {
      ctx.lineWidth=r>220?1.5:2.5;
      ctx.beginPath(); ctx.arc(50,50,r,0,Math.PI*2); ctx.stroke();
    }
    // Deep water gradient
    const bwg=ctx.createLinearGradient(0,H*0.4,0,H);
    bwg.addColorStop(0,'rgba(0,50,160,0)'); bwg.addColorStop(1,'rgba(0,30,130,0.35)');
    ctx.globalAlpha=1; ctx.fillStyle=bwg; ctx.fillRect(0,0,W,H);
    // Water glints (top strip)
    ctx.globalAlpha=0.40;
    [[200,55,60,'rgba(0,160,255,0.30)'],[500,45,50,'rgba(0,140,255,0.25)'],
     [750,60,55,'rgba(40,180,255,0.28)'],[200,320,80,'rgba(0,100,200,0.22)']].forEach(([gx,gy,gr,gc]) => {
      const bg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
      bg.addColorStop(0,gc); bg.addColorStop(1,'rgba(0,100,200,0)');
      ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(gx,gy,gr,0,Math.PI*2); ctx.fill();
    });

  } else if (t === 'rose') {
    // Sakura petals — large, spread in visible areas
    ctx.globalAlpha=0.50;
    [// Top strip
     [80,48,34,15,0.4],[240,40,28,12,1.2],[440,58,36,16,2.1],[640,44,30,13,0.7],
     [800,50,26,11,1.8],
     // Left section (avatar area, no panel)
     [50,180,30,13,0.9],[50,330,26,11,1.5],[220,150,24,10,2.0],[380,190,28,12,0.3],
     // Bottom border
     [90,742,32,14,1.1],[340,750,28,12,2.2],[620,745,34,15,0.6],[920,748,28,12,1.8],[1200,742,30,13,0.4],[1380,720,26,11,1.9],
     // Right border
     [1380,180,24,10,0.7],[1370,380,28,12,1.4],[1365,560,22,9,2.3]
    ].forEach(([px,py,rw,rh,angle]) => {
      ctx.save(); ctx.translate(px,py); ctx.rotate(angle);
      ctx.fillStyle=theme.corner;
      ctx.beginPath(); ctx.ellipse(0,0,rw,rh,0,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.22; ctx.fillStyle='#ffffff';
      ctx.beginPath(); ctx.ellipse(-rw*0.22,-rh*0.22,rw*0.38,rh*0.30,0,0,Math.PI*2); ctx.fill();
      ctx.restore(); ctx.globalAlpha=0.50;
    });
    // Flower clusters in corners
    ctx.globalAlpha=0.48; ctx.fillStyle=theme.corner;
    [[80,80],[1340,80],[80,720],[1340,720]].forEach(([fcx,fcy]) => {
      for (let p=0; p<5; p++) {
        const pa=(Math.PI*2/5)*p-Math.PI/2;
        ctx.save(); ctx.translate(fcx+Math.cos(pa)*34, fcy+Math.sin(pa)*34); ctx.rotate(pa);
        ctx.beginPath(); ctx.ellipse(0,0,22,11,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(fcx,fcy,9,0,Math.PI*2);
      ctx.fillStyle='#fff0f8'; ctx.fill(); ctx.fillStyle=theme.corner;
    });
    // Pink corner glow
    [[0,0,'rgba(255,80,160,0.20)'],[W,0,'rgba(255,60,140,0.16)'],
     [0,H,'rgba(255,100,170,0.18)'],[W,H,'rgba(255,80,150,0.16)']].forEach(([mx,my,mc]) => {
      const mg=ctx.createRadialGradient(mx,my,0,mx,my,450);
      mg.addColorStop(0,mc); mg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.globalAlpha=1; ctx.fillStyle=mg; ctx.fillRect(0,0,W,H);
    });
  }

  ctx.restore();
}

// ─── Theme overlay: drawn OVER all panels for always-visible theme atmosphere ──
function drawThemeOverlay(ctx, W, H, theme, themeName) {
  ctx.save();
  const t = (themeName || 'holographique').toLowerCase();

  // Every theme: corner vignette in theme color
  const corners = [[0,0],[W,0],[0,H],[W,H]];
  const cg = theme.corner || '#00cfff';
  // Parse first color from corner string for glow
  const glowRgb = cg.startsWith('#') ? hexToRgb(cg) : '0,200,255';

  corners.forEach(([cx,cy]) => {
    const vg = ctx.createRadialGradient(cx,cy,0,cx,cy,380);
    vg.addColorStop(0, `rgba(${glowRgb},0.18)`);
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
  });

  if (t === 'holographique') {
    // Prismatic horizontal band across center
    const pb = ctx.createLinearGradient(0, H*0.48, 0, H*0.55);
    pb.addColorStop(0,'rgba(0,240,255,0.08)');
    pb.addColorStop(0.5,'rgba(180,80,255,0.12)');
    pb.addColorStop(1,'rgba(0,240,255,0.08)');
    ctx.fillStyle=pb; ctx.fillRect(0,0,W,H);

  } else if (t === 'gaming') {
    // Green scan flicker on EXP bar zone
    ctx.globalAlpha=0.10; ctx.fillStyle='#00ff80';
    for (let y=418; y<482; y+=4) ctx.fillRect(0,y,W,2);
    // Green top border glow
    const tg=ctx.createLinearGradient(0,0,0,60);
    tg.addColorStop(0,'rgba(0,255,80,0.22)'); tg.addColorStop(1,'rgba(0,255,80,0)');
    ctx.globalAlpha=1; ctx.fillStyle=tg; ctx.fillRect(0,0,W,60);
    // Bottom green border
    const bg=ctx.createLinearGradient(0,H-60,0,H);
    bg.addColorStop(0,'rgba(0,255,80,0)'); bg.addColorStop(1,'rgba(0,255,80,0.18)');
    ctx.fillStyle=bg; ctx.fillRect(0,H-60,W,60);

  } else if (t === 'love') {
    // Pink top gradient
    const lg=ctx.createLinearGradient(0,0,0,80);
    lg.addColorStop(0,'rgba(255,60,140,0.25)'); lg.addColorStop(1,'rgba(255,60,140,0)');
    ctx.fillStyle=lg; ctx.fillRect(0,0,W,80);
    // Pink bottom gradient
    const lg2=ctx.createLinearGradient(0,H-80,0,H);
    lg2.addColorStop(0,'rgba(255,60,140,0)'); lg2.addColorStop(1,'rgba(255,60,140,0.22)');
    ctx.fillStyle=lg2; ctx.fillRect(0,H-80,W,80);
    // Small sparkle dots over panels
    ctx.globalAlpha=0.35; ctx.fillStyle=cg;
    [[200,520],[450,560],[700,530],[950,540],[1200,525],
     [320,680],[600,660],[900,675],[1150,665]].forEach(([sx,sy]) => {
      ctx.beginPath(); ctx.arc(sx,sy,4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.15; ctx.beginPath(); ctx.arc(sx,sy,10,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.35;
    });

  } else if (t === 'sensuel') {
    // Magenta top glow
    const sg=ctx.createLinearGradient(0,0,0,90);
    sg.addColorStop(0,'rgba(200,0,100,0.28)'); sg.addColorStop(1,'rgba(200,0,100,0)');
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,90);
    // Faint diagonal silk lines over entire card
    ctx.globalAlpha=0.08; ctx.lineWidth=3;
    for (let i=0; i<9; i++) {
      const ox=-80+i*185;
      ctx.strokeStyle=i%2===0?'rgba(255,40,120,0.6)':'rgba(200,0,80,0.6)';
      ctx.beginPath(); ctx.moveTo(ox,0);
      ctx.bezierCurveTo(ox+70,H*0.28,ox+20,H*0.55,ox+90,H); ctx.stroke();
    }

  } else if (t === 'cosmos') {
    // Purple top nebula
    const cng=ctx.createLinearGradient(0,0,0,100);
    cng.addColorStop(0,'rgba(80,20,180,0.30)'); cng.addColorStop(1,'rgba(80,20,180,0)');
    ctx.fillStyle=cng; ctx.fillRect(0,0,W,100);
    // Twinkle stars over panels
    const rng=s=>{let x=Math.sin(s)*9999;return x-Math.floor(x);};
    for (let i=0; i<60; i++) {
      const sx=rng(i*5+1)*W, sy=rng(i*5+2)*(H-100)+100;
      ctx.globalAlpha=rng(i*5+3)*0.45+0.20;
      ctx.beginPath(); ctx.arc(sx,sy,rng(i*5+4)*1.5+0.5,0,Math.PI*2);
      ctx.fillStyle='#ffffff'; ctx.fill();
    }

  } else if (t === 'nature') {
    // Green top canopy
    const ntg=ctx.createLinearGradient(0,0,0,80);
    ntg.addColorStop(0,'rgba(30,100,10,0.28)'); ntg.addColorStop(1,'rgba(30,100,10,0)');
    ctx.fillStyle=ntg; ctx.fillRect(0,0,W,80);
    // Green bottom ground
    const nbg=ctx.createLinearGradient(0,H-80,0,H);
    nbg.addColorStop(0,'rgba(20,80,10,0)'); nbg.addColorStop(1,'rgba(20,80,10,0.30)');
    ctx.fillStyle=nbg; ctx.fillRect(0,H-80,W,80);

  } else if (t === 'dark') {
    // Purple top glow
    const dtg=ctx.createLinearGradient(0,0,0,90);
    dtg.addColorStop(0,'rgba(80,0,120,0.35)'); dtg.addColorStop(1,'rgba(80,0,120,0)');
    ctx.fillStyle=dtg; ctx.fillRect(0,0,W,90);
    // Faint hexagons over panels
    ctx.globalAlpha=0.06; ctx.strokeStyle=cg; ctx.lineWidth=1;
    const hr=45, hh=hr*Math.sqrt(3);
    for (let col=-1;col<W/(hr*1.5)+2;col++) for (let row=-1;row<H/hh+2;row++) {
      const hcx=col*hr*3+(row%2===0?0:hr*1.5), hcy=row*hh;
      if (hcy < 400) continue; // Only over bottom panels
      ctx.beginPath();
      for (let i=0;i<6;i++){const a=(Math.PI/180)*(60*i-30);i===0?ctx.moveTo(hcx+hr*Math.cos(a),hcy+hr*Math.sin(a)):ctx.lineTo(hcx+hr*Math.cos(a),hcy+hr*Math.sin(a));}
      ctx.closePath(); ctx.stroke();
    }

  } else if (t === 'gold') {
    // Gold top shimmer
    const gtg=ctx.createLinearGradient(0,0,0,80);
    gtg.addColorStop(0,'rgba(255,215,0,0.28)'); gtg.addColorStop(1,'rgba(255,200,0,0)');
    ctx.fillStyle=gtg; ctx.fillRect(0,0,W,80);
    // Gold diagonal sheen over entire card
    const gds=ctx.createLinearGradient(0,0,W*0.6,H*0.4);
    gds.addColorStop(0,'rgba(255,255,180,0)'); gds.addColorStop(0.46,'rgba(255,240,80,0.10)');
    gds.addColorStop(0.5,'rgba(255,255,220,0.18)'); gds.addColorStop(0.54,'rgba(255,240,80,0.10)');
    gds.addColorStop(1,'rgba(255,255,180,0)');
    ctx.fillStyle=gds; ctx.fillRect(0,0,W,H);

  } else if (t === 'argent') {
    // Silver top sheen
    const atg=ctx.createLinearGradient(0,0,0,70);
    atg.addColorStop(0,'rgba(200,220,255,0.30)'); atg.addColorStop(1,'rgba(200,220,255,0)');
    ctx.fillStyle=atg; ctx.fillRect(0,0,W,70);
    // Silver diagonal glint
    const ads=ctx.createLinearGradient(0,0,W*0.55,H*0.38);
    ads.addColorStop(0,'rgba(255,255,255,0)'); ads.addColorStop(0.48,'rgba(220,235,255,0.16)');
    ads.addColorStop(0.5,'rgba(255,255,255,0.25)'); ads.addColorStop(0.52,'rgba(220,235,255,0.16)');
    ads.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=ads; ctx.fillRect(0,0,W,H);

  } else if (t === 'bleu') {
    // Blue top wave glow
    const btg=ctx.createLinearGradient(0,0,0,85);
    btg.addColorStop(0,'rgba(0,100,220,0.28)'); btg.addColorStop(1,'rgba(0,80,200,0)');
    ctx.fillStyle=btg; ctx.fillRect(0,0,W,85);
    // 2 bold waves over lower panels
    ctx.globalAlpha=0.18; ctx.lineWidth=3;
    [H*0.72, H*0.82].forEach((wy,wi) => {
      ctx.strokeStyle=wi===0?'#40b0ff':'#0080e0';
      ctx.beginPath();
      for (let x=0;x<=W;x+=4) { const y=wy+Math.sin(x*0.013+wi*1.2)*22; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
      ctx.stroke();
    });

  } else if (t === 'rose') {
    // Pink top bloom
    const rtg=ctx.createLinearGradient(0,0,0,80);
    rtg.addColorStop(0,'rgba(255,60,140,0.28)'); rtg.addColorStop(1,'rgba(255,60,140,0)');
    ctx.fillStyle=rtg; ctx.fillRect(0,0,W,80);
    // Tiny sparkle petals over panels
    ctx.globalAlpha=0.28; ctx.fillStyle=cg;
    [[180,550],[400,570],[680,545],[920,560],[1180,548],
     [300,700],[580,690],[850,705],[1100,695],[1320,680]].forEach(([px,py]) => {
      ctx.save(); ctx.translate(px,py); ctx.rotate(Math.sin(px)*2);
      ctx.beginPath(); ctx.ellipse(0,0,14,6,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ─── Rank helpers ─────────────────────────────────────────────────────────────

function getRankName(level) {
  if (level < 5)  return 'TIMIDE';
  if (level < 10) return 'COQUIN '  + romanTier(level - 5,  5,  3);
  if (level < 20) return 'EXHIBITIONNISTE '  + romanTier(level - 10, 10, 3);
  if (level < 30) return 'LIBERTIN '      + romanTier(level - 20, 10, 3);
  if (level < 40) return 'DÉPRAVÉ ' + romanTier(level - 30, 10, 3);
  if (level < 50) return 'KINKY ' + romanTier(level - 40, 10, 3);
  if (level < 60) return 'MAÎTRE DU PLAISIR';
  if (level < 75) return 'DIEU / DÉESSE DU SEXE';
  return 'DIVINITÉ DU PLAISIR';
}
function romanTier(d, r, s) {
  return ['III','II','I'][Math.min(s - 1, Math.floor(d / (r / s)))];
}
function gemPalette(name, themeOverride) {
  if (themeOverride) return themeOverride;
  if (name.includes('TIMIDE'))           return ['#ffd090','#c07820','#804010','#ffb050'];
  if (name.includes('COQUIN'))           return ['#ffffff','#c0c8d8','#8090a8','#e0e8f8'];
  if (name.includes('EXHIBITIONNISTE'))  return ['#fff0a0','#ffd700','#a07800','#ffe860'];
  if (name.includes('LIBERTIN'))         return ['#e0f4ff','#a0d0f0','#4090c0','#c0e8ff'];
  if (name.includes('DÉPRAVÉ'))          return ['#c0f8ff','#60c8ff','#1060c8','#80e8ff'];
  if (name.includes('KINKY'))            return ['#e8c0ff','#a040e0','#600090','#d080ff'];
  if (name.includes('MAÎTRE'))           return ['#ffc080','#ff4010','#a00000','#ff8040'];
  if (name.includes('DIEU'))             return ['#fff080','#ff8020','#cc0000','#ffcc40'];
  if (name.includes('DIVINITÉ'))         return ['#fff080','#ff8020','#cc0000','#ffcc40'];
  return ['#c0e8ff','#6090d0','#304880','#90c0f0'];
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function poly(ctx, pts, grad) {
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  pts.slice(1).forEach(p => ctx.lineTo(...p));
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
}
function lerpGrad(ctx, x1, y1, x2, y2, colors) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
  return g;
}
function drawPanel(ctx, x, y, w, h, theme) {
  roundedRect(ctx, x, y, w, h, 18);
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, theme.panelBg1);
  bg.addColorStop(1, theme.panelBg2);
  ctx.fillStyle = bg; ctx.fill();
  roundedRect(ctx, x, y, w, h, 18);
  ctx.strokeStyle = theme.panelBorder; ctx.lineWidth = 1.5;
  ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 10;
  ctx.stroke(); ctx.shadowBlur = 0;
}
function drawCrystalGem(ctx, cx, cy, s, pal) {
  const [hi, mid, dark, glow] = pal;
  ctx.shadowColor = glow; ctx.shadowBlur = 28;
  poly(ctx, [[cx,cy-s],[cx-s*0.62,cy-s*0.18],[cx-s*0.28,cy+s*0.10]],
    lerpGrad(ctx, cx-s*0.6,cy-s, cx,cy+s*0.1, [hi,'rgba(255,255,255,0.8)',mid]));
  poly(ctx, [[cx,cy-s],[cx+s*0.62,cy-s*0.18],[cx+s*0.28,cy+s*0.10]],
    lerpGrad(ctx, cx,cy-s, cx+s*0.6,cy+s*0.1, ['rgba(255,255,255,0.9)',hi,mid]));
  poly(ctx, [[cx,cy-s],[cx-s*0.28,cy+s*0.10],[cx+s*0.28,cy+s*0.10]],
    lerpGrad(ctx, cx,cy-s, cx,cy+s*0.1, ['rgba(255,255,255,0.95)',hi]));
  poly(ctx, [[cx-s*0.62,cy-s*0.18],[cx-s*0.72,cy+s*0.10],[cx-s*0.28,cy+s*0.10]],
    lerpGrad(ctx, cx-s*0.7,cy-s*0.1, cx-s*0.3,cy+s*0.1, [mid,dark]));
  poly(ctx, [[cx+s*0.62,cy-s*0.18],[cx+s*0.72,cy+s*0.10],[cx+s*0.28,cy+s*0.10]],
    lerpGrad(ctx, cx+s*0.3,cy-s*0.1, cx+s*0.7,cy+s*0.1, [hi,mid]));
  poly(ctx, [[cx-s*0.72,cy+s*0.10],[cx-s*0.28,cy+s*0.10],[cx,cy+s]],
    lerpGrad(ctx, cx-s*0.7,cy+s*0.1, cx,cy+s, [mid,dark]));
  poly(ctx, [[cx+s*0.72,cy+s*0.10],[cx+s*0.28,cy+s*0.10],[cx,cy+s]],
    lerpGrad(ctx, cx+s*0.3,cy+s*0.1, cx,cy+s, [hi,mid]));
  poly(ctx, [[cx-s*0.28,cy+s*0.10],[cx+s*0.28,cy+s*0.10],[cx,cy+s]],
    lerpGrad(ctx, cx,cy+s*0.1, cx,cy+s, [mid,dark]));
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.55;
  poly(ctx, [[cx-s*0.05,cy-s*0.95],[cx-s*0.35,cy-s*0.15],[cx-s*0.05,cy-s*0.05]],
    lerpGrad(ctx, cx-s*0.2,cy-s, cx,cy-s*0.1, ['rgba(255,255,255,0.9)','rgba(255,255,255,0)']));
  ctx.globalAlpha = 1.0;
}
function drawBarcode(ctx, x, y, theme) {
  const ws = [2,4,2,6,2,3,5,2,4,2,6,3,2,4,2,3,5,2,3,4];
  const c1 = theme.panelBorder.replace(/[\d.]+\)$/, '0.6)');
  const c2 = theme.panelBorder.replace(/[\d.]+\)$/, '0.4)');
  const cs = [c1, c2, theme.panelBorder.replace(/[\d.]+\)$/, '0.3)')];
  let bx = x - ws.reduce((a,b) => a+b,0) - ws.length * 2;
  ws.forEach((w, i) => {
    ctx.fillStyle = cs[i % cs.length];
    ctx.fillRect(bx, y - 22, w, 16); bx += w + 2;
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const { username, discriminator, avatarUrl, data, theme: themeName } = JSON.parse(raw);

  const theme = getTheme(themeName);

  const W = 1400, H = 800;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const level    = data.level    || 0;
  const xp       = data.xp       || 0;
  const required = data.required || 100;
  const messages = data.messages     || 0;
  const voiceMin = data.voiceMinutes || 0;
  const streak   = data.streak       || 0;
  const karma    = data.karma        || 0;
  const roleName = (data.roleName || 'MEMBRE DU SERVEUR').toUpperCase();
  const nextLvl  = level + 1;
  const xpLeft   = Math.max(0, required - xp);
  const pct      = Math.min(1, xp / Math.max(1, required));
  const rankName = getRankName(level);
  const pal      = gemPalette(rankName, theme.gemOverride);

  // ── Dynamic mode helpers (all optional, keep full backward-compat) ────────
  const voiceStr      = voiceMin >= 60 ? `${Math.floor(voiceMin/60)}h` : `${voiceMin}m`;
  const msgStr        = messages >= 10000 ? `${Math.floor(messages/1000)}K`
                      : messages >= 1000  ? `${(messages/1000).toFixed(1)}K` : String(messages);
  const fireStr       = streak >= 1000 ? `${Math.floor(streak/1000)}K` : `${streak}msg`;
  const panelTitle      = (data.panelTitle || 'NIVEAU').toUpperCase();
  const displayNumStr   = data.displayNumStr != null ? String(data.displayNumStr) : String(level);
  const expBarLabel     = data.expBarLabel   != null ? String(data.expBarLabel)
                        : `${xp.toLocaleString('fr-FR')} / ${required.toLocaleString('fr-FR')} EXP`;
  const bottomStats     = Array.isArray(data.statsItems) ? data.statsItems : [
    { icon: 'MSG', label: 'MESSAGES', value: msgStr },
    { icon: 'VOC', label: 'VOCAL',    value: voiceStr },
    { icon: 'FEU', label: 'FEU',      value: fireStr }
  ];
  const rankDisplay     = data.rankDisplay     || rankName;
  const nextPanelTitle  = data.nextPanelTitle  || 'PROCHAIN NIVEAU';
  const nextPanelBig    = data.nextPanelBig    || `NIV. ${nextLvl}`;
  const nextPanelSub    = data.nextPanelSub    || `${xpLeft.toLocaleString('fr-FR')} XP`;
  const nextPanelSubSub = data.nextPanelSubSub || 'RESTANTES';

  let avatar = null;
  try { avatar = await loadImage(avatarUrl); } catch(_) { /* fallback: no avatar */ }

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = theme.bg1; ctx.fillRect(0, 0, W, H);
  const a1 = ctx.createRadialGradient(120, 80, 0, 120, 80, 420);
  a1.addColorStop(0, theme.aura1[0]); a1.addColorStop(0.3, theme.aura1[1]);
  a1.addColorStop(0.6, theme.aura1[2]); a1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = a1; ctx.fillRect(0, 0, W, H);
  const a2 = ctx.createRadialGradient(W-200, 100, 0, W-200, 100, 500);
  a2.addColorStop(0, theme.aura2[0]); a2.addColorStop(0.25, theme.aura2[1]);
  a2.addColorStop(0.5, theme.aura2[2]); a2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = a2; ctx.fillRect(0, 0, W, H);
  const a3 = ctx.createRadialGradient(W*0.5, H, 0, W*0.5, H, 300);
  a3.addColorStop(0, theme.aura1[1]); a3.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = a3; ctx.fillRect(0, 0, W, H);

  // ── Theme-specific background decorations ─────────────────────────────────
  try { drawThemeBackground(ctx, W, H, theme, themeName); } catch(e) { process.stderr.write('[card-worker] drawThemeBackground error: ' + e.message + '\n'); }
  ctx.globalAlpha = 1;

  // ── Grid overlay ──────────────────────────────────────────────────────────
  ctx.save(); ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 38) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 38) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();

  // ── Card border + corners ─────────────────────────────────────────────────
  const dirs = [[1,1],[-1,1],[1,-1],[-1,-1]];
  const CX = 22, CY = 22, CW = W - 44, CH = H - 44, CR = 24;
  ctx.save(); roundedRect(ctx, CX, CY, CW, CH, CR);
  ctx.strokeStyle = theme.border; ctx.lineWidth = 3;
  ctx.shadowColor = theme.borderGlow; ctx.shadowBlur = 30; ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();
  const bLen = 38, bT = 3;
  const corners = [[CX,CY],[CX+CW,CY],[CX,CY+CH],[CX+CW,CY+CH]];
  ctx.strokeStyle = theme.corner; ctx.lineWidth = bT;
  ctx.shadowColor = theme.cornerGlow; ctx.shadowBlur = 10;
  corners.forEach(([cx,cy],i) => {
    const [dx,dy] = dirs[i];
    ctx.beginPath();
    ctx.moveTo(cx+dx*bLen,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+dy*bLen); ctx.stroke();
  }); ctx.shadowBlur = 0;

  // ── Theme label (top-left) ────────────────────────────────────────────────
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = theme.titleColor;
  ctx.shadowColor = theme.titleGlow; ctx.shadowBlur = 8;
  ctx.fillText(themeName ? themeName.toUpperCase() : 'HOLOGRAPHIQUE', 48, 76);
  ctx.shadowBlur = 0;

  // ── Avatar ────────────────────────────────────────────────────────────────
  const ax = 180, ay = 270, ar = 108;
  const ringGrad = ctx.createLinearGradient(ax-ar-12,ay-ar-12,ax+ar+12,ay+ar+12);
  theme.ringColors.forEach((c, i) => ringGrad.addColorStop(i / (theme.ringColors.length - 1), c));
  ctx.beginPath(); ctx.arc(ax, ay, ar+14, 0, Math.PI*2);
  ctx.strokeStyle = ringGrad; ctx.lineWidth = 14;
  ctx.shadowColor = theme.borderGlow; ctx.shadowBlur = 22; ctx.stroke(); ctx.shadowBlur = 0;
  [Math.PI*0.25,Math.PI*0.75,Math.PI*1.25,Math.PI*1.75].forEach(angle => {
    const r1 = ar+6, r2 = ar+22;
    ctx.beginPath();
    ctx.moveTo(ax+Math.cos(angle)*r1, ay+Math.sin(angle)*r1);
    ctx.lineTo(ax+Math.cos(angle)*r2, ay+Math.sin(angle)*r2);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    ctx.shadowColor = theme.cornerGlow; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
  });
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI*2); ctx.clip();
  if (avatar) {
    ctx.drawImage(avatar, ax-ar, ay-ar, ar*2, ar*2);
  } else {
    const fbg = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar);
    fbg.addColorStop(0, theme.titleColor); fbg.addColorStop(1, theme.panelBg1);
    ctx.fillStyle = fbg; ctx.fillRect(ax-ar, ay-ar, ar*2, ar*2);
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${ar}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((username[0] || '?').toUpperCase(), ax, ay);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(ax+74, ay+72, 15, 0, Math.PI*2);
  ctx.fillStyle = '#2ecc71'; ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 14;
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(ax+74, ay+72, 15, 0, Math.PI*2);
  ctx.strokeStyle = theme.bg1; ctx.lineWidth = 3; ctx.stroke();

  // ── Username + role ───────────────────────────────────────────────────────
  const nameX = 324;
  let namePx = 68; ctx.font = `bold ${namePx}px Arial`;
  while (ctx.measureText(username).width > 480 && namePx > 30) {
    namePx -= 2; ctx.font = `bold ${namePx}px Arial`;
  }
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = theme.titleGlow; ctx.shadowBlur = 16;
  ctx.fillText(username, nameX, 220); ctx.shadowBlur = 0;
  ctx.font = '30px Arial'; ctx.fillStyle = theme.statColor;
  ctx.fillText(discriminator && discriminator !== '0' ? `#${discriminator}` : '', nameX+2, 268);
  ctx.font = 'bold 21px Arial';
  const badgeTxt = `  +  ${roleName}  `;
  const bw = ctx.measureText(badgeTxt).width;
  roundedRect(ctx, nameX, 282, bw, 40, 20);
  const bg2 = ctx.createLinearGradient(nameX, 282, nameX+bw, 322);
  bg2.addColorStop(0, theme.panelBg1.replace('0.94','0.35').replace('0.96','0.35').replace('0.97','0.35'));
  bg2.addColorStop(1, theme.panelBg2.replace('0.94','0.35').replace('0.96','0.35').replace('0.97','0.35'));
  ctx.fillStyle = bg2; ctx.fill();
  roundedRect(ctx, nameX, 282, bw, 40, 20);
  ctx.strokeStyle = theme.panelBorder; ctx.lineWidth = 1.5;
  ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = theme.titleColor; ctx.fillText(badgeTxt, nameX, 310);

  // ── Karma badge ───────────────────────────────────────────────────────────
  if (karma > 0) {
    const karmaStr = karma >= 1000000 ? `${(karma/1000000).toFixed(1)}M`
                   : karma >= 1000    ? `${Math.floor(karma/1000)}K`
                   : String(karma);
    const karmaTxt = `  KRM  KARMA ${karmaStr}  `;
    ctx.font = 'bold 19px Arial';
    const kw = ctx.measureText(karmaTxt).width;
    roundedRect(ctx, nameX, 334, kw, 34, 17);
    const kg = ctx.createLinearGradient(nameX, 334, nameX+kw, 368);
    kg.addColorStop(0, theme.panelBg1.replace('0.94','0.28').replace('0.96','0.28').replace('0.97','0.28'));
    kg.addColorStop(1, theme.panelBg2.replace('0.94','0.28').replace('0.96','0.28').replace('0.97','0.28'));
    ctx.fillStyle = kg; ctx.fill();
    roundedRect(ctx, nameX, 334, kw, 34, 17);
    ctx.strokeStyle = theme.corner || theme.panelBorder; ctx.lineWidth = 1.2;
    ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = theme.statColor; ctx.fillText(karmaTxt, nameX, 358);
  }

  // ── Niveau panel ──────────────────────────────────────────────────────────
  const NX = 860, NY = 40, NW = 510, NH = 350;
  roundedRect(ctx, NX, NY, NW, NH, 20);
  const nbg = ctx.createLinearGradient(NX, NY, NX+NW, NY+NH);
  nbg.addColorStop(0, theme.panelBg1); nbg.addColorStop(1, theme.panelBg2);
  ctx.fillStyle = nbg; ctx.fill();
  const nBLen = 50;
  ctx.strokeStyle = theme.panelBorder; ctx.lineWidth = 1.5;
  ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 12;
  [[NX,NY],[NX+NW,NY],[NX,NY+NH],[NX+NW,NY+NH]].forEach(([cx,cy],i) => {
    const [dx,dy] = dirs[i];
    ctx.beginPath();
    ctx.moveTo(cx+dx*nBLen,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+dy*nBLen); ctx.stroke();
  }); ctx.shadowBlur = 0;
  ctx.font = 'bold 44px Arial'; ctx.fillStyle = theme.titleColor;
  ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 10;
  ctx.fillText(panelTitle, NX+36, NY+76); ctx.shadowBlur = 0;

  const lvlStr = displayNumStr;
  const lvlPx  = lvlStr.length > 7 ? 70 : lvlStr.length > 5 ? 100 : lvlStr.length > 3 ? 150 : 210;
  ctx.font = `bold ${lvlPx}px Arial`;
  const lvlMw = ctx.measureText(lvlStr).width;
  const lvlStartX = NX + (NW - lvlMw) / 2;
  const lvlGrad = ctx.createLinearGradient(lvlStartX, NY+100, lvlStartX+lvlMw, NY+NH-20);
  theme.levelColors.forEach((c, i) => lvlGrad.addColorStop(i / (theme.levelColors.length - 1), c));
  ctx.fillStyle = lvlGrad; ctx.shadowColor = theme.levelGlow; ctx.shadowBlur = 50;
  ctx.fillText(lvlStr, lvlStartX, NY+NH-30); ctx.shadowBlur = 0;

  // ── EXP bar ───────────────────────────────────────────────────────────────
  const EX = 42, EY = 418, EW = W-84, EH = 62;
  roundedRect(ctx, EX, EY, EW, EH, 14);
  const ebg = ctx.createLinearGradient(EX, EY, EX+EW, EY+EH);
  ebg.addColorStop(0, theme.panelBg1); ebg.addColorStop(1, theme.panelBg2);
  ctx.fillStyle = ebg; ctx.fill();
  roundedRect(ctx, EX, EY, EW, EH, 14);
  ctx.strokeStyle = theme.panelBorder; ctx.lineWidth = 1.5;
  ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.font = 'bold 26px Arial'; ctx.fillStyle = theme.statColor;
  ctx.fillText('EXP', EX+18, EY+40);
  const bX = EX+80, bY = EY+14, bW = EW-90-320, bH = EH-28;
  roundedRect(ctx, bX, bY, bW, bH, bH/2);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
  if (pct > 0) {
    const fw = Math.max(bH, bW*pct);
    const fg = ctx.createLinearGradient(bX, 0, bX+fw, 0);
    theme.barColors.forEach((c, i) => fg.addColorStop(i / (theme.barColors.length - 1), c));
    roundedRect(ctx, bX, bY, fw, bH, bH/2);
    ctx.fillStyle = fg; ctx.shadowColor = theme.borderGlow; ctx.shadowBlur = 20;
    ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.font = 'bold 26px Arial'; ctx.fillStyle = theme.statColor;
  ctx.textAlign = 'right';
  ctx.fillText(expBarLabel, EX+EW-18, EY+40);
  ctx.textAlign = 'left';

  // ── Bottom 3 panels ───────────────────────────────────────────────────────
  const PY = 506, PH = H-PY-48;
  const PW = (W-84-24)/3;
  const p1x = 42, p2x = p1x+PW+12, p3x = p2x+PW+12;

  // Stats panel
  drawPanel(ctx, p1x, PY, PW, PH, theme);
  ctx.font = 'bold 22px Arial'; ctx.fillStyle = theme.titleColor;
  ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 6;
  ctx.fillText('STATISTIQUES', p1x+18, PY+34); ctx.shadowBlur = 0;
  const colW = PW / Math.max(1, bottomStats.length);
  bottomStats.forEach((s,i) => {
    const sx = p1x+14+i*colW;
    ctx.font = 'bold 16px Arial'; ctx.fillStyle = theme.statColor;
    ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 4;
    ctx.fillText(s.icon, sx, PY+74); ctx.shadowBlur = 0;
    ctx.font = '14px Arial'; ctx.fillStyle = theme.statColor; ctx.globalAlpha = 0.7;
    ctx.fillText(s.label, sx, PY+98); ctx.globalAlpha = 1;
    ctx.font = 'bold 30px Arial';
    const sg = ctx.createLinearGradient(sx, PY+100, sx+colW-10, PY+140);
    theme.barColors.slice(0,2).forEach((c,i) => sg.addColorStop(i, c));
    ctx.fillStyle = sg;
    ctx.fillText(s.value, sx, PY+136);
  });

  // Rang panel
  drawPanel(ctx, p2x, PY, PW, PH, theme);
  ctx.font = 'bold 22px Arial'; ctx.fillStyle = theme.titleColor;
  ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 6;
  const rangLabel = 'RANG ACTUEL';
  ctx.fillText(rangLabel, p2x+PW/2-ctx.measureText(rangLabel).width/2, PY+34);
  ctx.shadowBlur = 0;
  const gemCx = p2x+PW/2, gemCy = PY+PH/2-12;
  drawCrystalGem(ctx, gemCx, gemCy, 60, pal);
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px Arial';
  const rnG = ctx.createLinearGradient(p2x, PY+PH-48, p2x+PW, PY+PH-28);
  rnG.addColorStop(0, pal[0]); rnG.addColorStop(1, pal[1]);
  ctx.fillStyle = rnG; ctx.shadowColor = pal[0]; ctx.shadowBlur = 14;
  ctx.fillText(rankDisplay, gemCx, PY+PH-26); ctx.shadowBlur = 0;
  ctx.textAlign = 'left';

  // Prochain niveau / prochain rang panel
  drawPanel(ctx, p3x, PY, PW, PH, theme);
  ctx.font = 'bold 22px Arial'; ctx.fillStyle = theme.titleColor;
  ctx.shadowColor = theme.panelGlow; ctx.shadowBlur = 6;
  ctx.fillText(nextPanelTitle, p3x+18, PY+34); ctx.shadowBlur = 0;
  drawCrystalGem(ctx, p3x+60, PY+PH/2-8, 34, pal);
  ctx.font = 'bold 36px Arial';
  const nlG = ctx.createLinearGradient(p3x+98, PY+80, p3x+PW, PY+130);
  nlG.addColorStop(0, theme.titleColor); nlG.addColorStop(1, theme.statColor);
  ctx.fillStyle = nlG; ctx.fillText(nextPanelBig, p3x+98, PY+118);
  ctx.font = 'bold 26px Arial'; ctx.fillStyle = theme.statColor;
  ctx.fillText(nextPanelSub, p3x+98, PY+158);
  ctx.font = '18px Arial'; ctx.fillStyle = theme.statColor; ctx.globalAlpha = 0.65;
  ctx.fillText(nextPanelSubSub, p3x+98, PY+188); ctx.globalAlpha = 1;

  // Barcode
  drawBarcode(ctx, W-48, H-30, theme);

  // ── Theme overlay (drawn last, visible over panels) ───────────────────────
  try { drawThemeOverlay(ctx, W, H, theme, themeName); } catch(e) { process.stderr.write('[card-worker] drawThemeOverlay error: ' + e.message + '\n'); }

  // ── Export (JPEG pour limiter la taille et forcer l'aperçu Discord) ───────
  const buf = await canvas.encode('jpeg', 92);
  process.stdout.write(buf);
  process.exit(0);
}

run().catch(err => {
  process.stderr.write('card-worker error: ' + err.message + '\n');
  process.exit(1);
});
