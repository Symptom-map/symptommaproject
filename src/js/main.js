// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const DIAGNOSES = [
  { id:'tda',   label:'TDA\nTDAH',             color:'#3b82f6' },
  { id:'tlp',   label:'TLP\nBorderline',        color:'#a855f7' },
  { id:'an',    label:'Anorexia\nNerviosa',     color:'#fb7185' },
  { id:'aut',   label:'Rasgos\nAutistas',       color:'#10b981' },
  { id:'cptsd', label:'C-PTSD',                 color:'#f59e0b' },
  { id:'bi',    label:'Trastorno\nBipolar',     color:'#6366f1' },
  { id:'anx',   label:'Ansiedad\nGeneralizada', color:'#84cc16' },
];

const DIAG_MAP = Object.fromEntries(DIAGNOSES.map(d => [d.id, d]));
const HUB_R  = 46;
const SYM_R  = 6;
const AI_COLOR = '#38b6ff';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let state = loadState() || {
  lang: 'es',
  username: '',
  selectedDiags: ['tda', 'tlp', 'an', 'aut'],
  nodes: [
    { id:'hub-tda',  name:'TDA\nTDAH',        label:'TDA\nTDAH',        conds:['tda'],  hub:true, x:0, y:0, _placed:false },
    { id:'hub-tlp',  name:'TLP\nBorderline',  label:'TLP\nBorderline',  conds:['tlp'],  hub:true, x:0, y:0, _placed:false },
    { id:'hub-an',   name:'Anorexia\nNerviosa',label:'Anorexia\nNerviosa',conds:['an'], hub:true, x:0, y:0, _placed:false },
    { id:'hub-aut',  name:'Rasgos\nAutistas', label:'Rasgos\nAutistas',  conds:['aut'], hub:true, x:0, y:0, _placed:false },
  ],
  idCounter: 1,
};

let selectedId  = null;
let hoveredId   = null;
let dragging    = false;
let dragNodeId  = null;
let lastMx = 0, lastMy = 0;
let offX = 0, offY = 0, scale = 1;
let W, H;
let pendingSuggestions = [];
let highlightedDiags = new Set();
let legendHighlight = null;
let multiSelectedIds = new Set(); // Ctrl+click multi-selection

// ═══════════════════════════════════════════════════════════
// CANVAS SETUP
// ═══════════════════════════════════════════════════════════
const wrap   = document.getElementById('canvas-wrap');
const canvas = document.getElementById('graph');
const ctx    = canvas.getContext('2d');

function resize() {
  W = canvas.width  = wrap.clientWidth;
  H = canvas.height = wrap.clientHeight;
  if (state.nodes.length === 0) initLayout();
  draw();
}

function initLayout() {
  const hubs = state.nodes.filter(n => n.hub);
  if (hubs.length === 0) return;
  const spacing = Math.max(130, Math.min(W * 0.18, 200));
  const totalW  = spacing * (hubs.length - 1);
  let startX = offX - totalW / 2;
  const y = offY - H * 0.08;
  hubs.forEach((h, i) => {
    if (!h._placed) {
      h.x = startX + i * spacing;
      h.y = y;
      h._placed = true;
    }
  });
  const syms = state.nodes.filter(n => !n.hub && !n._placed);
  syms.forEach((n, i) => {
    const hub = state.nodes.find(h => h.hub && h.conds[0] === n.conds[0]);
    const ang = (i / Math.max(syms.length, 1)) * Math.PI * 2;
    n.x = (hub ? hub.x : offX) + Math.cos(ang) * 100;
    n.y = (hub ? hub.y : offY) + 90 + Math.abs(Math.sin(ang)) * 80;
    n._placed = true;
  });
}

// ═══════════════════════════════════════════════════════════
// DRAW
// ═══════════════════════════════════════════════════════════
function edgePt(cx, cy, r, tx, ty) {
  const dx = tx-cx, dy = ty-cy, d = Math.sqrt(dx*dx+dy*dy)||1;
  return { x: cx+dx/d*r, y: cy+dy/d*r };
}

function w2s(wx, wy) {
  return { x: (wx-offX)*scale + W/2, y: (wy-offY)*scale + H/2 };
}
function s2w(sx, sy) {
  return { x: (sx-W/2)/scale + offX, y: (sy-H/2)/scale + offY };
}

function draw() {
  ctx.clearRect(0,0,W,H);

  // paper lines
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.025)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 30) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  }
  ctx.restore();

  if (state.nodes.length === 0) {
    ctx.fillStyle = '#aaa090';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px Poppins, sans-serif';
    ctx.fillText('Selecciona tus diagnósticos y genera síntomas →', W/2, H/2);
    return;
  }

  const hubs = state.nodes.filter(n => n.hub);

  // hub-to-hub lines
  for (let i = 0; i < hubs.length-1; i++) {
    const pa = w2s(hubs[i].x, hubs[i].y);
    const pb = w2s(hubs[i+1].x, hubs[i+1].y);
    const from = edgePt(pa.x, pa.y, HUB_R*scale, pb.x, pb.y);
    const to   = edgePt(pb.x, pb.y, HUB_R*scale, pa.x, pa.y);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = '#1c1a1633';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
  }

  // ── symptom edges — hierarchy by shared connections ──────
  // Shared (≥2 diagnoses): thick + visible = the interesting connections
  // Individual (1 diagnosis): thin + faint = context without noise
  // Hover/select: full brightness regardless
  const syms = state.nodes.filter(n => !n.hub);

  // Draw individual edges first (below), shared on top
  [false, true].forEach(drawShared => {
    syms.forEach(sym => {
      const isShared = sym.conds.length > 1;
      if (isShared !== drawShared) return;

      const active = sym.id === selectedId || sym.id === hoveredId;
      // diagFilter dimming
      const inFilter = highlightedDiags.size === 0 ||
        sym.conds.some(c => highlightedDiags.has(c));
      const dimmed = !inFilter && highlightedDiags.size > 0;

      // legendHighlight dimming for edges
      let legEdgeDim = false;
      if (legendHighlight) {
        if (legendHighlight === 'thin'  &&  isShared) legEdgeDim = true;
        if (legendHighlight === 'thick' && !isShared) legEdgeDim = true;
        if (legendHighlight === 'hub' || legendHighlight === 'sym' ||
            legendHighlight === 'multi' || legendHighlight === 'float' ||
            legendHighlight === 'dash') legEdgeDim = true;
      }

      const opacity   = (dimmed || legEdgeDim) ? 0.04 : active ? 0.9  : isShared ? 0.55 : 0.18;
      const lineWidth = (dimmed || legEdgeDim) ? 0.5  : active ? 2.5  : isShared ? 2.0  : 1.0;

      sym.conds.forEach((c, ci) => {
        const hub = state.nodes.find(h => h.hub && h.conds[0]===c);
        if (!hub) return;
        const hubActive = hub.id === selectedId || hub.id === hoveredId;
        const edgeOpacity = (active || hubActive) ? 0.9 : opacity;
        const edgeWidth   = (active || hubActive) ? 2.5 : lineWidth;

        const ps   = w2s(sym.x, sym.y), ph = w2s(hub.x, hub.y);
        const col  = DIAG_MAP[c]?.color || '#888';
        const from = edgePt(ps.x, ps.y, SYM_R*scale+2, ph.x, ph.y);
        const to   = edgePt(ph.x, ph.y, HUB_R*scale,   ps.x, ps.y);

        // Curve shared edges slightly so multiple lines don't overlap
        const mx = (from.x+to.x)/2, my = (from.y+to.y)/2;
        // Perpendicular offset — direction alternates per condition index
        const nx = -(to.y-from.y), ny = (to.x-from.x);
        const nl = Math.sqrt(nx*nx+ny*ny)||1;
        const curve = isShared ? (ci % 2 === 0 ? 1 : -1) * 18 * scale : 0;
        const cpX = mx + (nx/nl)*curve;
        const cpY = my + (ny/nl)*curve;

        const hexOpacity = Math.round(edgeOpacity*255).toString(16).padStart(2,'0');
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(cpX, cpY, to.x, to.y);
        ctx.strokeStyle = col + hexOpacity;
        ctx.lineWidth = edgeWidth * scale;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
    });
  });

  // ── Consequence zone — drawn below main map ──
  const ZONE_Y_WORLD = offY + H * 0.32; // world-space Y divider
  const zoneY = w2s(0, ZONE_Y_WORLD).y;
  const hasConseqs = state.nodes.some(n => n.causeIds?.length > 0 && !n.inMainMap);

  if (hasConseqs) {
    // Subtle dashed divider line
    ctx.save();
    ctx.setLineDash([6*scale, 8*scale]);
    ctx.beginPath(); ctx.moveTo(0, zoneY); ctx.lineTo(W, zoneY);
    ctx.strokeStyle = '#1c1a1622';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Zone label
    ctx.fillStyle = '#1c1a1628';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.max(8, 10*scale)}px DM Mono, monospace`;
    ctx.fillText(lang === 'es' ? 'consecuencias' : 'secondary effects', 20, zoneY + 14*scale);
    ctx.restore();
  }

  // ── cause → consequence edges — thin graphite, no arrow ──
  state.nodes.filter(n => n.causeIds?.length > 0).forEach(conseq => {
    conseq.causeIds.forEach(causeId => {
      const cause = state.nodes.find(nd=>nd.id===causeId);
      if (!cause) return;
      const pc = w2s(cause.x, cause.y), pq = w2s(conseq.x, conseq.y);
      const sel = conseq.id===selectedId || cause.id===selectedId || conseq.id===hoveredId || cause.id===hoveredId;
      const fromR = cause.hub ? HUB_R*scale : SYM_R*scale+2;
      const toR   = SYM_R*scale+2;
      const from  = edgePt(pc.x, pc.y, fromR, pq.x, pq.y);
      const to    = edgePt(pq.x, pq.y, toR,   pc.x, pc.y);
      const legDashDim = legendHighlight && legendHighlight !== 'dash';
      ctx.globalAlpha = legDashDim ? 0.04 : 1;

      // Curved line, no arrow — position communicates the relationship
      const mx = (from.x+to.x)/2, my = (from.y+to.y)/2;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(mx, my - 20*scale, to.x, to.y);
      ctx.strokeStyle = sel ? '#1c1a1699' : '#1c1a1630';
      ctx.lineWidth = (sel ? 1.5 : 1) * scale;
      ctx.lineCap = 'round';
      ctx.setLineDash([3*scale, 4*scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();
    });
  });

  // draw nodes — apply highlight filter + legend hover dimming
  state.nodes.forEach(n => {
    const p = w2s(n.x, n.y);
    const sel = n.id === selectedId;
    const hov = n.id === hoveredId;

    // diagFilter dimming
    const inFilter = n.hub
      ? (highlightedDiags.size === 0 || highlightedDiags.has(n.conds[0]))
      : (highlightedDiags.size === 0 || n.conds.some(c => highlightedDiags.has(c)));
    const diagDimmed = !inFilter && highlightedDiags.size > 0;

    // legendHighlight dimming
    let legDimmed = false;
    if (legendHighlight) {
      const isHub     = n.hub;
      const isSym     = !n.hub && !n.floating && n.conds.length === 1;
      const isMulti   = !n.hub && !n.floating && n.conds.length > 1;
      const isFloat   = n.floating || (!n.hub && n.conds.length === 0);
      if (legendHighlight === 'hub'   && !isHub)   legDimmed = true;
      if (legendHighlight === 'sym'   && !isSym)   legDimmed = true;
      if (legendHighlight === 'multi' && !isMulti) legDimmed = true;
      if (legendHighlight === 'float' && !isFloat) legDimmed = true;
      if (['thin','thick','dash'].includes(legendHighlight)) legDimmed = true; // dim all nodes when hovering edges
    }

    const isConseq = !n.hub && n.causeIds?.length > 0 && !n.inMainMap;
    const isMultiSel = multiSelectedIds.has(n.id);
    ctx.globalAlpha = (diagDimmed || legDimmed) ? 0.1 : 1;
    if (isMultiSel) {
      // Glow ring for multi-selected
      const p2 = w2s(n.x, n.y);
      ctx.beginPath(); ctx.arc(p2.x, p2.y, (n.hub?HUB_R:SYM_R+4)*scale+6, 0, Math.PI*2);
      ctx.strokeStyle = '#3d7ab855'; ctx.lineWidth = 2.5*scale; ctx.stroke();
    }
    if (n.hub) drawHub(n, p, sel, hov);
    else if (isConseq) drawConsequence(n, p, sel, hov);
    else if (n.floating || n.conds.length === 0) drawFloating(n, p, sel, hov);
    else drawSymptom(n, p, sel||isMultiSel, hov);
    ctx.globalAlpha = 1;
  });
}

function drawHub(n, p, sel, hov) {
  const col = DIAG_MAP[n.conds[0]]?.color || '#888';
  const r = HUB_R * scale;

  // glow on hover/select
  if (sel || hov) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r+8, 0, Math.PI*2);
    const g = ctx.createRadialGradient(p.x,p.y,r,p.x,p.y,r+12);
    g.addColorStop(0, col+'40'); g.addColorStop(1,'transparent');
    ctx.fillStyle = g; ctx.fill();
  }

  // fill + border
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2);
  ctx.fillStyle = col+'1a'; ctx.fill();
  ctx.strokeStyle = sel ? col : col+(hov?'dd':'99');
  ctx.lineWidth = (sel?2.8:2)*scale; ctx.stroke();

  // clip text inside circle
  ctx.save();
  ctx.beginPath(); ctx.arc(p.x, p.y, r - 4*scale, 0, Math.PI*2); ctx.clip();

  const lines = (n.label || n.name).split('\n');
  const fontSize = Math.max(8, Math.min(12, r * 0.26));
  const lineH    = fontSize * scale * 1.3;
  const maxW     = (r - 8*scale) * 2;

  ctx.fillStyle    = col;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${fontSize * scale}px Poppins, sans-serif`;

  lines.forEach((l, i) => {
    ctx.fillText(l, p.x, p.y + (i - (lines.length - 1) / 2) * lineH, maxW);
  });
  ctx.restore();
}

function drawSymptom(n, p, sel, hov) {
  const r = SYM_R * scale;
  if (sel||hov) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r+6, 0, Math.PI*2);
    ctx.strokeStyle = '#1c1a1622'; ctx.lineWidth = 1; ctx.stroke();
  }
  if (n.fromAI) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r+3, 0, Math.PI*2);
    ctx.strokeStyle = AI_COLOR+'55'; ctx.lineWidth = 1.5*scale; ctx.stroke();
  }
  if (n.conds.length > 1) {
    n.conds.forEach((c,i) => {
      const a0 = (i/n.conds.length)*Math.PI*2-Math.PI/2;
      const a1 = ((i+1)/n.conds.length)*Math.PI*2-Math.PI/2;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, a0, a1);
      ctx.strokeStyle = DIAG_MAP[c]?.color||'#888';
      ctx.lineWidth = 2.5*scale; ctx.stroke();
    });
  } else {
    const col = DIAG_MAP[n.conds[0]]?.color||'#888';
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
    ctx.fillStyle = sel||hov ? col : col+'bb'; ctx.fill();
  }
  // label
  const words = n.name.split(' ');
  const lns = []; let cur = '';
  words.forEach(w => {
    if ((cur+' '+w).trim().length > 16) { lns.push(cur.trim()); cur = w; }
    else cur = (cur+' '+w).trim();
  });
  if (cur) lns.push(cur.trim());
  ctx.fillStyle = sel ? '#1c1a16' : '#3a3530';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = `500 ${Math.max(7, 9*scale)}px Poppins, sans-serif`;
  const lh = 11*scale;
  lns.forEach((l,i) => ctx.fillText(l, p.x, p.y+r+5*scale+i*lh));
  if (n.notes) {
    ctx.fillStyle = '#4a8060';
    ctx.font = `${Math.max(7,8*scale)}px DM Mono, monospace`;
    ctx.fillText('●', p.x + r + 4*scale, p.y - r - 2*scale);
  }
}

function drawConsequence(n, p, sel, hov) {
  const r = (SYM_R + 2) * scale;

  // Diamond shape
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x,   p.y-r);   // top
  ctx.lineTo(p.x+r, p.y);     // right
  ctx.lineTo(p.x,   p.y+r);   // bottom
  ctx.lineTo(p.x-r, p.y);     // left
  ctx.closePath();
  ctx.fillStyle   = sel||hov ? '#e8e4dc' : '#f0ede6';
  ctx.fill();
  ctx.strokeStyle = sel ? '#1c1a16cc' : '#1c1a1655';
  ctx.lineWidth   = (sel ? 1.8 : 1.2) * scale;
  ctx.stroke();
  ctx.restore();

  // Note indicator
  if (n.notes) {
    ctx.fillStyle = AI_COLOR;
    ctx.font = `${Math.max(6,7*scale)}px DM Mono, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('●', p.x + r + 3*scale, p.y - r);
  }

  // Label below diamond
  const words = n.name.split(' ');
  const lns = []; let cur = '';
  words.forEach(w => {
    if ((cur+' '+w).trim().length > 16) { lns.push(cur.trim()); cur = w; }
    else cur = (cur+' '+w).trim();
  });
  if (cur) lns.push(cur.trim());
  ctx.fillStyle = sel ? '#1c1a16' : '#6a6258';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = `400 ${Math.max(7,9*scale)}px Poppins, sans-serif`;
  lns.forEach((l, i) => ctx.fillText(l, p.x, p.y + r + 5*scale + i*11*scale));
}

function drawFloating(n, p, sel, hov) {
  const r = SYM_R * scale;
  if (sel||hov) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r+8, 0, Math.PI*2);
    ctx.strokeStyle = '#88776633'; ctx.lineWidth = 1; ctx.stroke();
  }
  // dashed border circle
  ctx.save();
  ctx.setLineDash([3*scale, 3*scale]);
  ctx.beginPath(); ctx.arc(p.x, p.y, r+1, 0, Math.PI*2);
  ctx.strokeStyle = sel ? '#887766cc' : '#88776688';
  ctx.lineWidth = 1.8*scale; ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(p.x, p.y, r-1, 0, Math.PI*2);
  ctx.fillStyle = sel ? '#88776630' : '#88776615'; ctx.fill();
  ctx.restore();
  // confidence dot
  if (n.confidence) {
    const cCol = { alta:'#2e8c68', media:'#d4953a', baja:'#e05c3a', desconocido:'#aaa090' }[n.confidence]||'#aaa090';
    ctx.beginPath(); ctx.arc(p.x+r+3, p.y-r-2, 3.5*scale, 0, Math.PI*2);
    ctx.fillStyle = cCol; ctx.fill();
  }
  // label
  const words = n.name.split(' ');
  const lns = []; let cur = '';
  words.forEach(w => {
    if ((cur+' '+w).trim().length > 16) { lns.push(cur.trim()); cur = w; }
    else cur = (cur+' '+w).trim();
  });
  if (cur) lns.push(cur.trim());
  ctx.fillStyle = sel ? '#5a5040' : '#887766';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = `500 ${Math.max(7,9*scale)}px Poppins, sans-serif`;
  lns.forEach((l,i) => ctx.fillText(l, p.x, p.y+r+5*scale+i*11*scale));
  if (n.notes) {
    ctx.fillStyle = AI_COLOR;
    ctx.font = `${Math.max(7,8*scale)}px DM Mono, monospace`;
    ctx.fillText('●', p.x+r+4*scale, p.y-r-2*scale);
  }
}

// ═══════════════════════════════════════════════════════════
// HIT TEST
// ═══════════════════════════════════════════════════════════
function nodeAt(sx, sy) {
  for (const n of [...state.nodes].reverse()) {
    const r = (n.hub ? HUB_R+4 : SYM_R+10) * scale;
    const p = w2s(n.x, n.y);
    if ((sx-p.x)**2+(sy-p.y)**2 < r*r) return n;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// INTERACTION
// ═══════════════════════════════════════════════════════════
let dragMoved = false; // track if mouse moved during drag

canvas.addEventListener('mousedown', e => {
  const n = nodeAt(e.offsetX, e.offsetY);
  if (n) {
    if (!n.hub && (e.ctrlKey || e.metaKey)) {
      // Ctrl+click on symptom: toggle multi-selection
      if (multiSelectedIds.has(n.id)) multiSelectedIds.delete(n.id);
      else multiSelectedIds.add(n.id);
      selectedId = null;
      dragNodeId = null;
      if (multiSelectedIds.size >= 2) openMultiPanel();
      else if (multiSelectedIds.size === 0) closeRightPanel();
      renderNodeList(); draw();
      dragging = false; dragMoved = false;
      lastMx = e.offsetX; lastMy = e.offsetY;
      return;
    }
    // Normal click — always draggable, clear multi-selection
    multiSelectedIds.clear();
    dragNodeId = n.id;
    selectedId = n.id;
    renderNodeList();
    draw();
  } else {
    multiSelectedIds.clear();
    dragNodeId = null;
    selectedId = null;
    closeRightPanel();
  }
  dragging = true;
  dragMoved = false;
  lastMx = e.offsetX; lastMy = e.offsetY;
});

canvas.addEventListener('mousemove', e => {
  const sx = e.offsetX, sy = e.offsetY;
  if (dragging) {
    const dx = sx-lastMx, dy = sy-lastMy;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true;
    if (dragNodeId) {
      const n = state.nodes.find(nd=>nd.id===dragNodeId);
      if (n) { n.x+=dx/scale; n.y+=dy/scale; }
    } else { offX-=dx/scale; offY-=dy/scale; }
    lastMx=sx; lastMy=sy; draw();
  } else {
    const n = nodeAt(sx, sy);
    const prev = hoveredId; hoveredId = n?n.id:null;
    if (n && !n.hub) showTooltip(n, e.clientX, e.clientY);
    else hideTooltip();
    canvas.style.cursor = n ? 'pointer' : 'default';
    if (hoveredId !== prev) draw();
  }
});

canvas.addEventListener('mouseup', () => { dragging=false; dragNodeId=null; saveState(); });
canvas.addEventListener('mouseleave', () => { dragging=false; dragNodeId=null; hoveredId=null; hideTooltip(); draw(); });

// Double click → open diary panel
canvas.addEventListener('dblclick', e => {
  const n = nodeAt(e.offsetX, e.offsetY);
  if (n && !n.hub) {
    selectNode(n.id); // this opens the right panel
  }
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  scale = Math.max(0.25, Math.min(4, scale * (e.deltaY>0?0.92:1.09)));
  draw();
}, { passive:false });

// Touch
canvas.addEventListener('touchstart', e=>{
  e.preventDefault();
  const t=e.touches[0], r=canvas.getBoundingClientRect();
  const sx=t.clientX-r.left, sy=t.clientY-r.top;
  const n=nodeAt(sx,sy);
  if(n){dragNodeId=n.id;selectNode(n.id);}else dragNodeId=null;
  dragging=true;lastMx=sx;lastMy=sy;
},{passive:false});

canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  const t=e.touches[0],r=canvas.getBoundingClientRect();
  const sx=t.clientX-r.left,sy=t.clientY-r.top,dx=sx-lastMx,dy=sy-lastMy;
  if(dragNodeId){const n=state.nodes.find(nd=>nd.id===dragNodeId);if(n){n.x+=dx/scale;n.y+=dy/scale;}}
  else{offX-=dx/scale;offY-=dy/scale;}
  lastMx=sx;lastMy=sy;draw();
},{passive:false});

canvas.addEventListener('touchend',()=>{dragging=false;dragNodeId=null;saveState();});

// ═══════════════════════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════════════════════
const tooltip = document.getElementById('tooltip');
function showTooltip(n, cx, cy) {
  const tags = n.conds.map(c=>DIAG_MAP[c]?.label.replace('\n',' ')||c).join(' · ');
  tooltip.textContent = n.name + (tags ? `  —  ${tags}` : '') + '  ·  doble click para abrir';
  tooltip.style.left = (cx+12)+'px'; tooltip.style.top = (cy-10)+'px';
  tooltip.classList.add('show');
}
function hideTooltip() { tooltip.classList.remove('show'); }

// ═══════════════════════════════════════════════════════════
// SELECT / RIGHT PANEL
// ═══════════════════════════════════════════════════════════
function selectNode(id, openPanel = true) {
  selectedId = id;
  const n = state.nodes.find(nd=>nd.id===id);
  const rp = document.getElementById('right-panel');
  if (n && !n.hub && openPanel) {
    document.getElementById('rp-single').style.display = 'block';
    document.getElementById('rp-multi').style.display = 'none';
    document.getElementById('rp-therapist-notice').style.display = 'none';
    // Open detail accordion, close AI accordion
    const detailBtn = document.querySelector('#rpa-detail .rp-acc-header');
    const detailBody = document.querySelector('#rpa-detail .rp-acc-body');
    if (detailBtn) { detailBtn.classList.add('open'); detailBody.style.display = 'flex'; }
    const aiBody = document.querySelector('#rpa-ai .rp-acc-body');
    const aiBtn = document.querySelector('#rpa-ai .rp-acc-header');
    if (aiBody) { aiBody.style.display = 'none'; aiBtn.classList.remove('open'); }
    // Reset AI results
    const analysisResult = document.getElementById('rp-analysis-result');
    if (analysisResult) { analysisResult.style.display = 'none'; analysisResult.textContent = ''; }
    const profileEl = document.getElementById('rp-profile-context');
    if (profileEl) profileEl.style.display = 'none';
    document.getElementById('rp-title').textContent = n.name;
    document.getElementById('rp-tags').innerHTML = n.conds.map(c => {
      const d = DIAG_MAP[c]; if(!d) return '';
      return `<span class="rp-tag" style="color:${d.color};border-color:${d.color}">${d.label}</span>`;
    }).join('');
    const aiNote = document.getElementById('rp-ai-note');
    let aiHtml = '';
    if (n.reason) {
      const confColor = { alta:'#2e8c68', media:'#d4953a', baja:'#e05c3a', desconocido:'#aaa090' }[n.confidence]||'#aaa090';
      const confLabel = { alta:'confianza alta', media:'confianza media', baja:'confianza baja', desconocido:'origen incierto' }[n.confidence]||'';
      aiHtml += `<div class="rp-ai-note">✦ ${n.reason}${confLabel?` <span style="color:${confColor};font-style:normal;font-size:0.65rem">[${confLabel}]</span>`:''}`;
      if (n.causeIds && n.causeIds.length > 0) {
        const causeNames = n.causeIds.map(id=>state.nodes.find(nd=>nd.id===id)?.name||'').filter(Boolean);
        aiHtml += `<br><span style="font-size:0.68rem;font-style:normal">← generado por: <strong>${causeNames.join(', ')}</strong></span>`;
      }
      aiHtml += `</div>`;
    } else if (n.floating || n.conds.length===0) {
      aiHtml = `<div class="rp-ai-note" style="border-color:rgba(136,119,102,0.3);background:rgba(136,119,102,0.05)">? Origen desconocido — usa "Analizar origen" para que la IA busque conexiones.</div>`;
    }
    aiNote.innerHTML = aiHtml;
    document.getElementById('rp-context').value = n.context || '';
    document.getElementById('rp-notes').value = n.notes || '';
    // Show promote button only for consequence nodes not yet in main map
    const isConseq = n.causeIds?.length > 0 && !n.inMainMap;
    document.getElementById('rp-promote').style.display = isConseq ? 'block' : 'none';
    rp.classList.add('open');
  } else {
    rp.classList.remove('open');
  }
  renderNodeList();
  draw();
}

function closeRightPanel() {
  selectedId = null;
  multiSelectedIds.clear();
  document.getElementById('right-panel').classList.remove('open');
  renderNodeList();
  draw();
}

function openMultiPanel() {
  const rp = document.getElementById('right-panel');
  rp.classList.add('open');
  document.getElementById('rp-single').style.display = 'none';
  document.getElementById('rp-multi').style.display = 'block';
  const nodes = [...multiSelectedIds].map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean);
  const isEs = lang === 'es';
  document.getElementById('mp-title').textContent = isEs
    ? `${nodes.length} síntomas seleccionados`
    : `${nodes.length} symptoms selected`;
  document.getElementById('mp-names').textContent = nodes.map(n=>n.name).join(' · ');
  document.getElementById('mp-btn-label').textContent = isEs ? '¿Qué tienen en común?' : 'What do they share?';
  document.getElementById('mp-result').style.display = 'none';
}

async function analyzeMulti() {
  const nodes = [...multiSelectedIds].map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean);
  if (nodes.length < 2) return;
  const isEs = lang === 'es';
  showLoading(isEs ? 'Analizando intersección...' : 'Analyzing intersection...');
  const diagLabels = state.selectedDiags.map(d=>DIAG_MAP[d]?.label.replace('\n',' ')||d).join(', ');
  const nodeDescriptions = nodes.map(n =>
    `"${n.name}" (${n.conds.map(c=>DIAG_MAP[c]?.label.replace('\n',' ')||c).join(', ')||'unknown origin'})`
  ).join(', ');

  const prompt = `You are a psychoeducation assistant. The user has these diagnoses: ${diagLabels}.

They selected these symptoms from their map to understand what they have in common: ${nodeDescriptions}.

Explain in 3-4 sentences:
1. What underlying mechanism or experience connects these symptoms
2. Why they appear together in this specific diagnostic profile
3. What this intersection reveals about their experience

Respond in ${isEs ? 'Spanish' : 'English'}. Use warm, non-clinical language. Speak directly to the person (use "you"/"tú").`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role:'user', content: prompt }]
      })
    });
    const data = await res.json();
    const text = data.content.map(b=>b.text||'').join('').trim();
    hideLoading();
    const resultEl = document.getElementById('mp-result');
    resultEl.textContent = text;
    resultEl.style.display = 'block';
  } catch(err) {
    hideLoading();
    showToast('Error: ' + err.message);
  }
}

function saveNote() {
  if (!selectedId) return;
  const n = state.nodes.find(nd=>nd.id===selectedId);
  if (n) {
    n.notes   = document.getElementById('rp-notes').value;
    n.context = document.getElementById('rp-context').value;
  }
  saveState(); draw(); showToast('Guardado');
}

function promoteToMain() {
  if (!selectedId) return;
  const n = state.nodes.find(nd=>nd.id===selectedId);
  if (!n) return;
  n.inMainMap = true;
  // Move it up into the main map area near its causes
  const causes = (n.causeIds||[]).map(id=>state.nodes.find(nd=>nd.id===id)).filter(Boolean);
  if (causes.length > 0) {
    n.x = causes.reduce((s,c)=>s+c.x,0)/causes.length + (Math.random()-0.5)*120;
    n.y = causes.reduce((s,c)=>s+c.y,0)/causes.length + 80;
  }
  document.getElementById('rp-promote').style.display = 'none';
  saveState(); draw();
  showToast(lang==='es' ? 'Movido al mapa principal' : 'Moved to main map');
}

function deleteNode(id) {
  state.nodes = state.nodes.filter(n=>n.id!==id);
  if (selectedId === id) {
    selectedId = null;
    document.getElementById('right-panel').classList.remove('open');
  }
  multiSelectedIds.delete(id);
  saveState(); renderNodeList(); draw();
}

function deleteSelected() {
  if (!selectedId) return;
  state.nodes = state.nodes.filter(n=>n.id!==selectedId);
  selectedId = null;
  document.getElementById('right-panel').classList.remove('open');
  saveState(); renderNodeList(); draw();
}

// ═══════════════════════════════════════════════════════════
// DIAGNOSIS PROFILES — bilingual
// ═══════════════════════════════════════════════════════════
function getDiagProfiles() {
  const es = lang === 'es';
  return {
    tda: {
      title: es ? 'TDA / TDAH' : 'ADHD',
      desc: es ? 'Cuéntame cómo se manifiesta tu TDA para sugerirte síntomas más precisos.'
               : 'Tell me how your ADHD manifests to suggest more precise symptoms.',
      fields: [
        { id:'subtype', type:'chips',
          label: es ? 'Presentación principal' : 'Primary presentation',
          options: es ? ['Inatento predominante','Hiperactivo predominante','Combinado','No sé / mixto']
                     : ['Predominantly inattentive','Predominantly hyperactive','Combined','Not sure / mixed'] },
        { id:'age', type:'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 8' : 'e.g. 8' },
        { id:'triggers', type:'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Estrés','Ruido / ambiente','Tareas largas','Interacciones sociales','Sueño irregular','Pantallas']
                     : ['Stress','Noise / environment','Long tasks','Social interactions','Irregular sleep','Screens'] },
        { id:'known', type:'text',
          label: es ? 'Síntomas que ya sabes que tienes' : 'Symptoms you know you have',
          placeholder: es ? 'ej. procrastinación, hiperfoco, olvidos...' : 'e.g. procrastination, hyperfocus, forgetfulness...' },
      ]
    },
    tlp: {
      title: es ? 'TLP — Borderline' : 'BPD — Borderline',
      desc: es ? 'El TLP se expresa diferente en cada persona. Esto ayuda a personalizar las sugerencias.'
               : 'BPD expresses differently in each person. This helps personalize suggestions.',
      fields: [
        { id:'subtype', type:'chips',
          label: es ? 'Patrón más reconocible en ti' : 'Most recognizable pattern in you',
          options: es ? ['Miedo al abandono intenso','Cambios de identidad','Impulsividad','Vaivenes emocionales rápidos','Relaciones intensas','Disociación frecuente']
                     : ['Intense fear of abandonment','Identity shifts','Impulsivity','Rapid emotional swings','Intense relationships','Frequent dissociation'] },
        { id:'age', type:'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 28' : 'e.g. 28' },
        { id:'triggers', type:'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Rechazo percibido','Conflictos relacionales','Soledad','Estrés laboral','Cambios inesperados','Críticas']
                     : ['Perceived rejection','Relational conflicts','Loneliness','Work stress','Unexpected changes','Criticism'] },
        { id:'known', type:'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. flashbacks emocionales, vergüenza intensa...' : 'e.g. emotional flashbacks, intense shame...' },
      ]
    },
    an: {
      title: es ? 'Anorexia Nerviosa' : 'Anorexia Nervosa',
      desc: es ? 'La AN tiene subtipos muy distintos. Esto es importante para que las sugerencias sean precisas.'
               : 'AN has very distinct subtypes. This is important for accurate suggestions.',
      fields: [
        { id:'subtype', type:'chips',
          label: es ? 'Subtipo que te describe mejor' : 'Subtype that best describes you',
          options: es ? ['Restrictivo','Atracón / purga','Atracón sin purga','Mixto / cambia','Predomina distorsión corporal']
                     : ['Restrictive','Binge / purge','Binge without purge','Mixed / changes','Body image distortion predominant'] },
        { id:'age', type:'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 16' : 'e.g. 16' },
        { id:'triggers', type:'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Estrés emocional','Situaciones sociales','Cambios corporales','Control / incertidumbre','Comentarios externos','Comparaciones']
                     : ['Emotional stress','Social situations','Body changes','Control / uncertainty','External comments','Comparisons'] },
        { id:'known', type:'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. atracones nocturnos, distorsión corporal, rituales...' : 'e.g. nighttime binges, body distortion, rituals...' },
      ]
    },
    aut: {
      title: es ? 'Rasgos Autistas' : 'Autistic Traits',
      desc: es ? 'El perfil autista es muy individual. Tu experiencia específica cambia mucho las sugerencias.'
               : 'Autistic profiles are very individual. Your specific experience greatly shapes suggestions.',
      fields: [
        { id:'subtype', type:'chips',
          label: es ? 'Áreas más presentes en ti' : 'Most present areas in you',
          options: es ? ['Sensorial (hiper/hipo)','Social / comunicación','Rutinas y rigidez','Intereses intensos','Fatiga autista','Enmascaramiento']
                     : ['Sensory (hyper/hypo)','Social / communication','Routines and rigidity','Intense interests','Autistic fatigue','Masking'] },
        { id:'age', type:'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 35' : 'e.g. 35' },
        { id:'triggers', type:'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Sobrecarga sensorial','Cambios de rutina','Interacción social intensa','Imprevistos','Entornos ruidosos','Exigencias sociales']
                     : ['Sensory overload','Routine changes','Intense social interaction','Unexpected events','Noisy environments','Social demands'] },
        { id:'known', type:'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. meltdowns, shutdowns, hipersensibilidad al ruido...' : 'e.g. meltdowns, shutdowns, noise hypersensitivity...' },
      ]
    },
    cptsd: {
      title: 'C-PTSD',
      desc: es ? 'El C-PTSD varía mucho según el tipo de trauma y cómo se procesa. Esto personaliza las sugerencias.'
               : 'C-PTSD varies greatly depending on trauma type and processing. This personalizes suggestions.',
      fields: [
        { id:'subtype', type:'chips',
          label: es ? 'Manifestación más presente' : 'Most present manifestation',
          options: es ? ['Hipervigilancia','Disociación','Flashbacks emocionales','Vergüenza tóxica','Dificultad de confianza','Colapso ante críticas']
                     : ['Hypervigilance','Dissociation','Emotional flashbacks','Toxic shame','Difficulty trusting','Collapse under criticism'] },
        { id:'age', type:'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 32' : 'e.g. 32' },
        { id:'triggers', type:'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Conflictos relacionales','Críticas','Abandono percibido','Estrés acumulado','Sensaciones corporales','Entornos de alta demanda']
                     : ['Relational conflicts','Criticism','Perceived abandonment','Accumulated stress','Body sensations','High-demand environments'] },
        { id:'known', type:'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. disociación bajo estrés, hipervigilancia en grupos...' : 'e.g. dissociation under stress, hypervigilance in groups...' },
      ]
    },
    bi: {
      title: es ? 'Trastorno Bipolar' : 'Bipolar Disorder',
      desc: es ? 'El bipolar I, II y ciclotimia tienen perfiles distintos. Cuéntame cómo se expresa en ti.'
               : 'Bipolar I, II and cyclothymia have distinct profiles. Tell me how it expresses in you.',
      fields: [
        { id:'subtype', type:'chips',
          label: es ? 'Tipo o patrón' : 'Type or pattern',
          options: es ? ['Bipolar I (manía completa)','Bipolar II (hipomanía)','Ciclotimia','Ciclos rápidos','Mixtos frecuentes','No sé el subtipo exacto']
                     : ['Bipolar I (full mania)','Bipolar II (hypomania)','Cyclothymia','Rapid cycling','Frequent mixed states','Not sure of exact subtype'] },
        { id:'age', type:'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 24' : 'e.g. 24' },
        { id:'triggers', type:'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Falta de sueño','Estrés elevado','Cambios de estación','Conflictos','Estimulación excesiva','Cambios hormonales']
                     : ['Lack of sleep','High stress','Seasonal changes','Conflicts','Excessive stimulation','Hormonal changes'] },
        { id:'known', type:'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. hiperfoco en manía, aislamiento en depresión...' : 'e.g. hyperfocus in mania, isolation in depression...' },
      ]
    },
    anx: {
      title: es ? 'Ansiedad Generalizada' : 'Generalized Anxiety',
      desc: es ? 'La ansiedad se expresa diferente en cada persona. Esto ayuda a que las sugerencias sean precisas.'
               : 'Anxiety expresses differently in each person. This helps make suggestions more accurate.',
      fields: [
        { id:'subtype', type:'chips',
          label: es ? 'Cómo se manifiesta más en ti' : 'How it manifests most in you',
          options: es ? ['Rumiación constante','Síntomas físicos (tensión, nauseas)','Evitación','Anticipación catastrófica','Ansiedad social','Ansiedad de rendimiento']
                     : ['Constant rumination','Physical symptoms (tension, nausea)','Avoidance','Catastrophic anticipation','Social anxiety','Performance anxiety'] },
        { id:'age', type:'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 22' : 'e.g. 22' },
        { id:'triggers', type:'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Incertidumbre','Situaciones sociales','Rendimiento / evaluación','Salud','Dinero / trabajo','Relaciones']
                     : ['Uncertainty','Social situations','Performance / evaluation','Health','Money / work','Relationships'] },
        { id:'known', type:'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. insomnio, tensión muscular, preocupación constante...' : 'e.g. insomnia, muscle tension, constant worry...' },
      ]
    },
  };
}

let currentDiagModalId = null;

function openDiagModal(id) {
  const DIAG_PROFILES = getDiagProfiles();
  const profile = DIAG_PROFILES[id];
  if (!profile) return;
  currentDiagModalId = id;
  const diag = DIAG_MAP[id];
  const es = lang === 'es';
  document.getElementById('diagmodal-title').textContent = profile.title;
  document.getElementById('diagmodal-desc').textContent = profile.desc;
  // Update footer buttons
  document.querySelector('.diagmodal-footer .btn-primary').textContent = es ? 'Guardar perfil' : 'Save profile';
  document.querySelector('.diagmodal-footer .btn-secondary').textContent = es ? 'Omitir' : 'Skip';

  const saved = state.diagProfiles?.[id] || {};
  const body = document.getElementById('diagmodal-body');
  body.innerHTML = profile.fields.map(f => {
    if (f.type === 'chips') {
      const chips = f.options.map(o => {
        const on = (saved[f.id]||[]).includes(o);
        return `<span class="chip ${on?'on':''}" style="${on?`background:${diag?.color||'#888'}`:''}"\
          onclick="toggleChip(this,'${diag?.color||'#888'}')">${o}</span>`;
      }).join('');
      return `<div class="profile-field"><label>${f.label}</label><div class="chip-group" data-field="${f.id}">${chips}</div></div>`;
    }
    if (f.type === 'number') {
      return `<div class="profile-field"><label>${f.label}</label>\
        <input type="number" data-field="${f.id}" placeholder="${f.placeholder}" min="1" max="100" value="${saved[f.id]||''}"></div>`;
    }
    return `<div class="profile-field"><label>${f.label}</label>\
      <input type="text" data-field="${f.id}" placeholder="${f.placeholder}" value="${saved[f.id]||''}"></div>`;
  }).join('');

  document.getElementById('diagmodal').classList.add('show');
}

function toggleChip(el, color) {
  el.classList.toggle('on');
  if (el.classList.contains('on')) {
    el.style.background = color; el.style.borderColor = 'transparent'; el.style.color = 'white';
  } else {
    el.style.background = ''; el.style.borderColor = ''; el.style.color = '';
  }
}

function saveDiagProfile() {
  if (!currentDiagModalId) return;
  if (!state.diagProfiles) state.diagProfiles = {};
  const DIAG_PROFILES = getDiagProfiles();
  const profile = DIAG_PROFILES[currentDiagModalId];
  const saved = {};
  if (profile) {
    profile.fields.forEach(f => {
      if (f.type === 'chips') {
        const group = document.querySelector(`[data-field="${f.id}"]`);
        saved[f.id] = [...group.querySelectorAll('.chip.on')].map(c=>c.textContent);
      } else {
        const el = document.querySelector(`input[data-field="${f.id}"]`);
        if (el) saved[f.id] = el.value.trim();
      }
    });
  }
  state.diagProfiles[currentDiagModalId] = saved;
  saveState();
  renderDiagList();
  closeDiagModal();
  showToast(lang==='es' ? 'Perfil guardado — las sugerencias serán más precisas' : 'Profile saved — suggestions will be more accurate');
}

function closeDiagModal() {
  document.getElementById('diagmodal').classList.remove('show');
  currentDiagModalId = null;
}

// ═══════════════════════════════════════════════════════════
// ACCORDION
// ═══════════════════════════════════════════════════════════
function toggleRpAccordion(id) {
  const sec  = document.getElementById(id);
  const btn  = sec.querySelector('.rp-acc-header');
  const body = sec.querySelector('.rp-acc-body');
  const open = btn.classList.toggle('open');
  body.style.display = open ? 'flex' : 'none';
}

async function analyzeCurrentSymptom() {
  if (!selectedId) return;
  const n = state.nodes.find(nd=>nd.id===selectedId);
  if (!n) return;
  const isEs = lang === 'es';

  // Build rich profile context from onboarding answers
  const profileLines = state.selectedDiags.map(id => {
    const p = state.diagProfiles?.[id];
    if (!p) return null;
    const diag = DIAG_MAP[id];
    const parts = [];
    if (p.subtype?.length) parts.push(Array.isArray(p.subtype) ? p.subtype.join(', ') : p.subtype);
    if (p.triggers?.length) parts.push(`triggers: ${Array.isArray(p.triggers) ? p.triggers.join(', ') : p.triggers}`);
    if (p.known) parts.push(`known symptoms: ${p.known}`);
    return parts.length ? `${diag.label.replace('\n',' ')}: ${parts.join(' | ')}` : null;
  }).filter(Boolean);

  // Show profile context in the panel
  const profileEl = document.getElementById('rp-profile-context');
  if (profileLines.length > 0 && profileEl) {
    profileEl.style.display = 'block';
    profileEl.innerHTML = `<strong style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--light)">Profile context</strong><br>${profileLines.join('<br>')}`;
  }

  showLoading(isEs ? 'Analizando síntoma...' : 'Analyzing symptom...');

  const diagLabels = state.selectedDiags.map(d=>DIAG_MAP[d]?.label.replace('\n',' ')||d).join(', ');
  const prompt = `You are a psychoeducation assistant. The user has: ${diagLabels}.
${profileLines.length ? `\nTheir profile:\n${profileLines.join('\n')}` : ''}

They are looking at this symptom: "${n.name}"${n.context ? ` (appears: ${n.context})` : ''}
It is linked to: ${n.conds.map(c=>DIAG_MAP[c]?.label.replace('\n',' ')||c).join(', ')||'unknown'}

In 2-3 warm, non-clinical sentences, explain:
- Why this symptom appears in their specific profile
- How their personal profile (subtypes, triggers) shapes this experience

Respond in ${isEs ? 'Spanish' : 'English'}. Speak directly to them using "you"/"tú".`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:300, messages:[{role:'user',content:prompt}] })
    });
    const data = await res.json();
    const text = data.content.map(b=>b.text||'').join('').trim();
    hideLoading();
    const resultEl = document.getElementById('rp-analysis-result');
    resultEl.textContent = text;
    resultEl.style.display = 'block';
  } catch(err) {
    hideLoading();
    showToast('Error: ' + err.message);
  }
}

function toggleAccordion(id) {
  const sec  = document.getElementById(id);
  const body = sec.querySelector('.accordion-body');
  const open = btn.classList.toggle('open');
  if (id === 'acc-list') {
    body.style.display = open ? 'flex' : 'none';
    body.style.flexDirection = 'column';
    body.style.overflow = 'hidden';
    body.style.flex = open ? '1' : '0';
  } else {
    body.style.display = open ? 'block' : 'none';
  }
}

// ═══════════════════════════════════════════════════════════
// DIAGNOSIS PANEL — multi-select with canvas filter
// ═══════════════════════════════════════════════════════════
function renderDiagList() {
  const el = document.getElementById('diag-list');
  el.innerHTML = DIAGNOSES.map(d => {
    const active     = state.selectedDiags.includes(d.id);
    const highlighted = highlightedDiags.has(d.id);
    const hasProfile = state.diagProfiles?.[d.id] && Object.values(state.diagProfiles[d.id]).some(v=>v?.length>0);
    return `<div class="diag-item ${active?'active':''}" style="justify-content:space-between">
      <div style="display:flex;align-items:center;gap:9px;flex:1" onclick="toggleDiag('${d.id}')">
        <div class="diag-swatch" style="background:${d.color}${active?'':'44'}"></div>
        <span class="diag-name" style="${active?`color:${d.color}`:''}">
          ${d.label.replace('\n',' ')}
        </span>
      </div>
      ${active ? `
        <button onclick="event.stopPropagation();toggleHighlight('${d.id}')"
          title="Filtrar en el mapa"
          style="background:${highlighted?d.color:'none'};border:1px solid ${highlighted?d.color:'var(--border)'};
                 color:${highlighted?'white':'var(--light)'};border-radius:3px;
                 padding:1px 7px;font-size:0.6rem;font-family:'DM Mono',monospace;cursor:pointer;
                 transition:all 0.12s;margin-right:4px">
          ${highlighted?'✓':'○'}
        </button>
        <button onclick="event.stopPropagation();openDiagModal('${d.id}')"
          style="background:none;border:none;cursor:pointer;font-size:0.68rem;
                 padding:2px 4px;color:${hasProfile?d.color:'var(--light)'};font-family:'DM Mono',monospace">
          ${hasProfile?'✎':'…'}
        </button>` : ''}
    </div>`;
  }).join('');

  // Count badge
  const count = state.selectedDiags.length;
  const countEl = document.getElementById('acc-diags-count');
  if (countEl) countEl.textContent = count > 0 ? count : '';

  updateGenBtn();
  renderAddChecks();
}

function toggleHighlight(id) {
  if (highlightedDiags.has(id)) highlightedDiags.delete(id);
  else highlightedDiags.add(id);
  renderDiagList();
  draw();
}

function toggleDiag(id) {
  if (state.selectedDiags.includes(id)) {
    state.selectedDiags = state.selectedDiags.filter(d=>d!==id);
  } else {
    state.selectedDiags.push(id);
    // Auto-open profile modal for new diagnosis
    setTimeout(() => openDiagModal(id), 200);
  }
  const hubIds = state.selectedDiags.map(d=>'hub-'+d);
  state.nodes = state.nodes.filter(n => !n.hub || hubIds.includes(n.id));
  state.selectedDiags.forEach(d => {
    if (!state.nodes.find(n=>n.id==='hub-'+d)) {
      const diag = DIAG_MAP[d];
      state.nodes.push({ id:'hub-'+d, name:diag.label, label:diag.label, conds:[d], hub:true, x:0, y:0, _placed:false });
    }
  });
  initLayout(); saveState(); renderDiagList(); renderNodeList(); draw();
}

function updateGenBtn() {
  const btn = document.getElementById('btn-gen');
  btn.disabled = state.selectedDiags.length === 0;
}

function renderAddChecks() {
  const el = document.getElementById('add-checks');
  el.innerHTML = state.selectedDiags.map(id => {
    const d = DIAG_MAP[id];
    return `<label class="cond-check"><input type="checkbox" value="${id}"><span class="cond-pill p-${id}">${d.label.split(/[—\/]/)[0].trim()}</span></label>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// ADD MANUAL NODE
// ═══════════════════════════════════════════════════════════
function addNodeManual() {
  const name = document.getElementById('inp-name').value.trim();
  if (!name) { showToast('Escribe el nombre del síntoma'); return; }
  const conds = [...document.querySelectorAll('#add-checks input:checked')].map(c=>c.value);
  const context = document.getElementById('inp-context').value.trim();
  const hub = conds.length > 0 ? state.nodes.find(n=>n.hub&&n.conds[0]===conds[0]) : null;
  const node = {
    id: 'n'+(state.idCounter++), name, conds, context,
    floating: conds.length === 0,
    x: (hub ? hub.x : offX) + (Math.random()-0.5)*160,
    y: (hub ? hub.y : offY) + (conds.length > 0 ? 90 + Math.random()*100 : Math.random()*200 - 100),
    _placed: true, fromAI: false, causeIds: [],
  };
  state.nodes.push(node);
  document.getElementById('inp-name').value = '';
  document.getElementById('inp-context').value = '';
  document.getElementById('context-field').classList.remove('open');
  document.querySelectorAll('#add-checks input').forEach(c=>c.checked=false);
  saveState(); renderNodeList(); draw();
  showToast(conds.length === 0 ? 'Nodo flotante agregado' : 'Síntoma agregado');
}

function toggleContextHint(val) {
  document.getElementById('context-field').classList.toggle('open', val.length > 1);
}

// ═══════════════════════════════════════════════════════════
// AI ORIGIN ANALYSIS — find what causes a symptom
// ═══════════════════════════════════════════════════════════
async function addWithAIAnalysis() {
  const name = document.getElementById('inp-name').value.trim();
  if (!name) { showToast('Escribe el nombre del síntoma primero'); return; }
  // First add as floating node
  const nodeId = 'n'+(state.idCounter++);
  const context = document.getElementById('inp-context').value.trim();
  const node = {
    id: nodeId, name, conds: [], floating: true, context,
    x: offX + (Math.random()-0.5)*200,
    y: offY + (Math.random()-0.5)*150,
    _placed: true, fromAI: true, causeIds: [],
  };
  state.nodes.push(node);
  document.getElementById('inp-name').value = '';
  document.getElementById('inp-context').value = '';
  document.getElementById('context-field').classList.remove('open');
  document.querySelectorAll('#add-checks input').forEach(c=>c.checked=false);
  renderNodeList(); draw();

  showLoading(`Analizando origen de "${name}"...`);

  const diagLabels = state.selectedDiags.map(d=>DIAG_MAP[d].label).join(', ');
  const existingSymptoms = state.nodes
    .filter(n=>!n.hub && n.id!==nodeId)
    .map(n=>({ id:n.id, name:n.name, conds:n.conds }));

  const prompt = `Eres un asistente de psicoeducación para personas con diagnósticos de salud mental.

El usuario tiene los siguientes diagnósticos: ${diagLabels}.
${state.diagProfiles?.[state.selectedDiags[0]] ? `Perfil: ${JSON.stringify(state.diagProfiles)}` : ''}

Síntomas actuales en su mapa:
${existingSymptoms.map(s=>`- [${s.id}] "${s.name}"${s.context?` (aparece: ${s.context})`:''} (${s.conds.map(c=>DIAG_MAP[c]?.label||c).join(', ')||'sin diagnóstico'})`).join('\n')}

El usuario acaba de agregar: "${name}"${node.context ? `\nContexto que dio: "${node.context}"` : ''}

Tu tarea: analiza si "${name}" podría ser una CONSECUENCIA de alguno de los síntomas o diagnósticos que ya están en el mapa, y si el/los diagnósticos del usuario pueden explicarlo.

Responde SOLO con JSON válido, sin texto extra:
{
  "analysis": "una o dos frases explicando el origen probable de este síntoma en el contexto de este perfil",
  "causeIds": ["id1","id2"],
  "diagConds": ["tda","cptsd"],
  "confidence": "alta|media|baja|desconocido"
}

- causeIds: IDs de síntomas del mapa que causan o contribuyen a "${name}". Puede ser array vacío.
- diagConds: diagnósticos del usuario que podrían explicar directamente "${name}". Puede ser array vacío.
- Si no hay relación clara, devuelve causeIds:[], diagConds:[], confidence:"desconocido"
- IDs disponibles: ${existingSymptoms.map(s=>s.id).join(', ')}
- Diagnósticos disponibles: ${state.selectedDiags.join(', ')}`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role:'user', content: prompt }]
      })
    });
    const data = await res.json();
    const text = data.content.map(b=>b.text||'').join('').trim().replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(text);

    // Update node with findings
    const n = state.nodes.find(nd=>nd.id===nodeId);
    if (n) {
      n.reason = parsed.analysis;
      n.confidence = parsed.confidence;
      n.causeIds = (parsed.causeIds||[]).filter(id=>state.nodes.find(nd=>nd.id===id));
      if ((parsed.diagConds||[]).length > 0) {
        n.conds = parsed.diagConds.filter(c=>state.selectedDiags.includes(c));
        n.floating = n.conds.length === 0;
      }
    // Position in consequence zone (below divider)
    if (n.causeIds.length > 0) {
      const causes = n.causeIds.map(id=>state.nodes.find(nd=>nd.id===id)).filter(Boolean);
      const avgX = causes.reduce((s,c)=>s+c.x,0)/causes.length;
      n.x = avgX + (Math.random()-0.5)*80;
      n.y = offY + H * 0.38 + Math.random()*60;
    }
    }
    hideLoading();
    saveState(); renderNodeList(); draw();
    selectNode(nodeId);
    // Show therapist notice if no connection found
    if (parsed.confidence === 'desconocido' || (!parsed.causeIds?.length && !parsed.diagConds?.length)) {
      document.getElementById('rp-therapist-notice').style.display = 'block';
    }
    const confLabel = { alta:'alta', media:'media', baja:'baja', desconocido:'incierto' }[parsed.confidence] || '';
    showToast(`Origen analizado — confianza ${confLabel}`);
  } catch(err) {
    hideLoading();
    showToast('Error al analizar: ' + err.message);
    console.error(err);
  }
}
function renderNodeList() {
  const syms = state.nodes.filter(n=>!n.hub);
  const el = document.getElementById('node-list');
  const countEl = document.getElementById('acc-list-count');
  if (countEl) countEl.textContent = syms.length > 0 ? syms.length : '';
  if (syms.length === 0) {
    el.innerHTML = '<p style="font-family:\'DM Mono\',monospace;font-size:0.62rem;color:var(--light);text-align:center;padding:16px">sin síntomas aún</p>';
    return;
  }
  el.innerHTML = syms.map(n=>`
    <div class="node-row ${n.id===selectedId?'selected':''} ${multiSelectedIds.has(n.id)?'multi-selected':''}" onclick="selectNode('${n.id}')">
      <div class="node-row-bar" style="background:${
        (n.floating||n.conds.length===0) ? '#88776666' :
        n.conds.length>1 ? `linear-gradient(180deg,${n.conds.map(c=>DIAG_MAP[c]?.color||'#888').join(',')})` :
        DIAG_MAP[n.conds[0]]?.color||'#888'
      }"></div>
      <div class="node-row-name" style="${(n.floating||n.conds.length===0)?'color:var(--muted)':''}">${n.name}</div>
      <div class="node-row-dots">
        ${n.fromAI?'<span class="ai-dot">✦</span>':''}
        ${(n.floating||n.conds.length===0)?'<span style="font-size:0.55rem;color:#aaa090">?</span>':''}
        ${n.notes?'<span style="font-size:0.55rem;color:var(--ai-glow)">●</span>':''}
        ${n.conds.map(c=>`<div class="dot-xs" style="background:${DIAG_MAP[c]?.color||'#888'}"></div>`).join('')}
      </div>
      <button class="node-row-delete" onclick="event.stopPropagation();deleteNode('${n.id}')" title="Eliminar">×</button>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════
// AI GENERATION
// ═══════════════════════════════════════════════════════════
async function generateWithAI() {
  if (state.selectedDiags.length === 0) { showToast('Selecciona al menos un diagnóstico'); return; }

  showLoading('Consultando IA...');

  const diagLabels = state.selectedDiags.map(d=>DIAG_MAP[d].label).join(', ');
  const existingSymptoms = state.nodes.filter(n=>!n.hub);
  const existingNames = existingSymptoms.map(n=>n.name+(n.context?` (aparece: ${n.context})`:''));

  // Build rich profile context
  const profileContext = state.selectedDiags.map(id => {
    const p = state.diagProfiles?.[id];
    if (!p) return null;
    const diag = DIAG_MAP[id];
    const parts = [];
    if (p.subtype?.length)  parts.push(`subtipo/patrón: ${Array.isArray(p.subtype)?p.subtype.join(', '):p.subtype}`);
    if (p.age)              parts.push(`diagnosticado a los ${p.age} años`);
    if (p.triggers?.length) parts.push(`detonadores: ${Array.isArray(p.triggers)?p.triggers.join(', '):p.triggers}`);
    if (p.known)            parts.push(`síntomas conocidos propios: ${p.known}`);
    return parts.length ? `${diag.label}: ${parts.join(' | ')}` : null;
  }).filter(Boolean).join('\n');

  const prompt = `Eres un asistente de psicoeducación para personas que YA tienen diagnósticos de salud mental confirmados por profesionales.

PERFIL DEL USUARIO:
Diagnósticos: ${diagLabels}.
${profileContext ? `\nInformación específica por diagnóstico:\n${profileContext}` : ''}

Síntomas que ya tiene en su mapa:
${existingNames.length ? existingNames.map(n=>`- ${n}`).join('\n') : '- ninguno aún'}

Tu tarea: sugerir 8-12 síntomas o experiencias relevantes para ESTE perfil diagnóstico específico. 
- Enfócate en los puntos de intersección entre sus diagnósticos.
- Usa la información de perfil (subtipo, detonadores, síntomas conocidos) para ser preciso.
- NO repitas síntomas que ya existen en el mapa.
- Si el perfil indica un subtipo específico (ej. AN con atracones, no restrictiva), ajusta las sugerencias a ese subtipo.

Responde SOLO con JSON válido, sin texto adicional:
{
  "symptoms": [
    {
      "name": "nombre corto (máx 4 palabras)",
      "conds": ["id1","id2"],
      "reason": "frase corta explicando por qué aparece en este perfil específico"
    }
  ]
}

IDs válidos: ${state.selectedDiags.join(', ')}.
Cada síntoma debe tener 1-3 condiciones.
Usa lenguaje de primera persona, no patologizante.
Enfócate en experiencias reales: emocionales, cognitivas, corporales, relacionales.`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role:'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Error de API');
    }

    const data = await res.json();
    const text = data.content.map(b=>b.text||'').join('').trim();
    const cleaned = text.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(cleaned);

    pendingSuggestions = (parsed.symptoms || []).filter(s =>
      s.name && s.conds && s.conds.length > 0 &&
      !state.nodes.find(n=>!n.hub && n.name.toLowerCase()===s.name.toLowerCase())
    );

    hideLoading();
    showReviewPanel();
  } catch(err) {
    hideLoading();
    showToast('Error: ' + err.message);
    console.error(err);
  }
}

// ═══════════════════════════════════════════════════════════
// REVIEW PANEL
// ═══════════════════════════════════════════════════════════
function showReviewPanel() {
  const el = document.getElementById('review-list');
  if (pendingSuggestions.length === 0) { showToast('No hay sugerencias nuevas'); return; }
  el.innerHTML = pendingSuggestions.map((s,i) => {
    const tags = s.conds.map(c=>{
      const d=DIAG_MAP[c]; if(!d) return '';
      return `<span class="rp-tag" style="color:${d.color};border-color:${d.color};font-size:0.58rem">${d.label.split(/[—\/]/)[0].trim()}</span>`;
    }).join('');
    return `
    <div class="suggest-item" id="sug-${i}">
      <div class="suggest-name">${s.name}</div>
      <div class="suggest-reason">${s.reason}</div>
      <div class="suggest-conds">${tags}</div>
      <div class="suggest-actions">
        <button class="btn-accept" onclick="acceptSuggestion(${i})">✓ Aceptar</button>
        <button class="btn-reject" onclick="rejectSuggestion(${i})">✗ Rechazar</button>
      </div>
    </div>`;
  }).join('');
  document.getElementById('review-panel').classList.add('show');
}

function closeReview() {
  document.getElementById('review-panel').classList.remove('show');
}

function acceptSuggestion(i) {
  const s = pendingSuggestions[i];
  if (!s) return;
  const validConds = s.conds.filter(c=>state.selectedDiags.includes(c));
  if (validConds.length === 0) { rejectSuggestion(i); return; }
  const hub = state.nodes.find(n=>n.hub&&n.conds[0]===validConds[0]);
  const node = {
    id: 'n'+(state.idCounter++), name: s.name,
    conds: validConds, fromAI: true, reason: s.reason,
    x: (hub?hub.x:offX) + (Math.random()-0.5)*160,
    y: (hub?hub.y:offY) + 90 + Math.random()*120,
    _placed: true,
  };
  state.nodes.push(node);
  document.getElementById('sug-'+i).style.opacity = '0.3';
  document.getElementById('sug-'+i).style.pointerEvents = 'none';
  pendingSuggestions[i] = null;
  saveState(); renderNodeList(); draw();
}

function rejectSuggestion(i) {
  document.getElementById('sug-'+i).style.opacity = '0.3';
  document.getElementById('sug-'+i).style.pointerEvents = 'none';
  pendingSuggestions[i] = null;
}

function acceptAll() {
  pendingSuggestions.forEach((_,i) => { if(pendingSuggestions[i]) acceptSuggestion(i); });
  setTimeout(closeReview, 300);
}

// ═══════════════════════════════════════════════════════════
// API KEY MODAL
// ═══════════════════════════════════════════════════════════
function openApiModal() {
  const saved = localStorage.getItem('sm_apikey');
  if (saved) document.getElementById('api-input').value = saved;
  document.getElementById('apimodal').classList.add('show');
}
function closeApiModal() { document.getElementById('apimodal').classList.remove('show'); }
function saveApiKey() {
  const key = document.getElementById('api-input').value.trim();
  if (!key.startsWith('sk-ant')) { showToast('Key inválida — debe empezar con sk-ant'); return; }
  localStorage.setItem('sm_apikey', key);
  closeApiModal();
  showToast('API key guardada');
}

// ═══════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════
function saveState() {
  try { localStorage.setItem('sm_state', JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const s = localStorage.getItem('sm_state');
    return s ? JSON.parse(s) : null;
  } catch(e) { return null; }
}

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════
function exportMap() {
  const link = document.createElement('a');
  link.download = 'symptommap.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Mapa exportado como imagen');
}

// ═══════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════
function showLoading(msg) {
  document.getElementById('loading-msg').textContent = msg || 'Cargando...';
  document.getElementById('loading').classList.add('show');
}
function hideLoading() { document.getElementById('loading').classList.remove('show'); }

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ═══════════════════════════════════════════════════════════
// i18n
// ═══════════════════════════════════════════════════════════
const STRINGS = {
  en: {
    tagline: 'A tool to map how your diagnoses connect through shared symptoms — not to diagnose, but to understand.',
    disclaimer: 'This tool is for people who already have one or more mental health diagnoses confirmed by a professional. It is not a diagnostic tool.',
    howTitle: 'How it works',
    h1:'Select your diagnoses', b1:'From the left panel. Each one you add will ask a few questions to personalize your map.',
    h2:'Generate suggestions',  b2:'The AI will suggest symptoms based on your specific profile. Accept, reject, or edit each one.',
    h3:'Make it yours',         b3:'Add your own symptoms, move nodes freely, and double-click any node to open its notes.',
    back:'← Back', start:'Start →', next:'→',
    myDiags: 'My diagnoses', addSymptom: 'Add symptom',
    namePlaceholder: 'e.g. nausea, insomnia...',
    whenLabel: 'When / how does it appear? (optional)',
    whenPlaceholder: 'e.g. in crowded places, after eating, when waking up...',
    condLabel: 'Condition(s) — optional',
    btnAdd: '+ Add', btnAnalyze: '✦ Analyze origin',
    addHint: 'No condition → floating node.  "Analyze origin" → AI finds what generates it.',
    suggestedTitle: 'Suggested symptoms',
    acceptAll: 'Accept all', close: 'Close',
    saveNote: 'Save', delete: 'Delete',
    whenNote: 'When / how does it appear?',
    notesLabel: 'Notes',
    notesPlaceholder: 'What triggers it? How does it feel...',
    legTitle: 'Legend', legHub: 'Diagnosis', legSym: 'Symptom (1 diagnosis)',
    legMulti: 'Symptom (shared)', legFloat: 'Unknown origin',
    legThin: 'Individual connection', legThick: 'Shared connection', legDash: 'Consequence →',
    legBtn: '? legend',
    topHint: 'click · move  ·  double-click · open notes',
    loading: 'Consulting AI...', analyzing: 'Analyzing origin...',
    profileSaved: 'Profile saved — suggestions will be more accurate',
    noteSaved: 'Saved', nodeAdded: 'Symptom added', floatAdded: 'Floating node added',
    needName: 'Enter a symptom name', needDiag: 'Select at least one diagnosis',
    originAnalyzed: 'Origin analyzed — confidence',
  },
  es: {
    tagline: 'Una herramienta para mapear cómo tus diagnósticos se conectan a través de síntomas compartidos — no para diagnosticar, sino para entenderte.',
    disclaimer: 'Esta herramienta está diseñada para personas que ya tienen uno o más diagnósticos de salud mental confirmados por un profesional. No es una herramienta diagnóstica.',
    howTitle: 'Cómo funciona',
    h1:'Selecciona tus diagnósticos', b1:'Desde el panel izquierdo. Cada uno que agregues incluirá preguntas para personalizar tu mapa.',
    h2:'Genera sugerencias',          b2:'La IA sugerirá síntomas según tu perfil específico. Acepta, rechaza o edita cada uno.',
    h3:'Hazlo tuyo',                  b3:'Agrega tus propios síntomas, mueve los nodos libremente, y doble click en cualquier nodo para abrir sus notas.',
    back:'← Volver', start:'Empezar →', next:'→',
    myDiags: 'Mis diagnósticos', addSymptom: 'Agregar síntoma',
    namePlaceholder: 'ej. náuseas, insomnio...',
    whenLabel: '¿Cuándo / cómo aparece? (opcional)',
    whenPlaceholder: 'ej. en espacios con mucha gente, después de comer, al despertar...',
    condLabel: 'Condición(es) — opcional',
    btnAdd: '+ Agregar', btnAnalyze: '✦ Analizar origen',
    addHint: 'Sin condición → nodo flotante.  "Analizar origen" → la IA busca qué síntomas lo generan.',
    suggestedTitle: 'Síntomas sugeridos',
    acceptAll: 'Aceptar todos', close: 'Cerrar',
    saveNote: 'Guardar', delete: 'Eliminar',
    whenNote: '¿Cuándo / cómo aparece?',
    notesLabel: 'Notas',
    notesPlaceholder: '¿Qué lo detona? ¿Cómo se siente...',
    legTitle: 'Leyenda', legHub: 'Diagnóstico', legSym: 'Síntoma (1 diagnóstico)',
    legMulti: 'Síntoma (compartido)', legFloat: 'Origen desconocido',
    legThin: 'Conexión individual', legThick: 'Conexión compartida', legDash: 'Consecuencia →',
    legBtn: '? leyenda',
    topHint: 'click · mover  ·  doble click · abrir notas',
    loading: 'Consultando IA...', analyzing: 'Analizando origen...',
    profileSaved: 'Perfil guardado — las sugerencias serán más precisas',
    noteSaved: 'Guardado', nodeAdded: 'Síntoma agregado', floatAdded: 'Nodo flotante agregado',
    needName: 'Escribe el nombre del síntoma', needDiag: 'Selecciona al menos un diagnóstico',
    originAnalyzed: 'Origen analizado — confianza',
  }
};

let lang = state.lang || 'en';

function t(key) { return STRINGS[lang]?.[key] || STRINGS.en[key] || key; }

function applyLang() {
  const es = lang === 'es';

  // Onboarding
  const obTagline = document.getElementById('ob-tagline');
  if (obTagline) obTagline.textContent = t('tagline');
  const obDisc = document.getElementById('ob-disclaimer');
  if (obDisc) obDisc.textContent = t('disclaimer');
  const obHowTitle = document.getElementById('ob-how-title');
  if (obHowTitle) obHowTitle.textContent = t('howTitle');
  ['h1','h2','h3','b1','b2','b3'].forEach(k => {
    const el = document.getElementById('ob-'+k); if(el) el.textContent = t(k);
  });
  ['ob-back','ob-back2','ob-start','ob-next','ob-next2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'ob-back' || id === 'ob-back2') el.textContent = es ? '← Volver' : '← Back';
      if (id === 'ob-start') el.textContent = es ? 'Empezar →' : 'Start →';
      if (id === 'ob-next' || id === 'ob-next2') el.textContent = '→';
    }
  });

  // Accordion headers
  const diagLabel = document.getElementById('acc-diags-label');
  if (diagLabel) diagLabel.textContent = es ? 'Mis diagnósticos' : 'My diagnoses';
  const addLabel = document.getElementById('acc-add-label');
  if (addLabel) addLabel.textContent = es ? 'Agregar síntoma' : 'Add symptom';
  const listLabel = document.getElementById('acc-list-label');
  if (listLabel) listLabel.textContent = es ? 'Síntomas' : 'Symptoms';

  // Generate button
  const genLabel = document.getElementById('btn-gen-label');
  if (genLabel) genLabel.textContent = es ? 'Sugerir síntomas' : 'Suggest symptoms';

  // Add symptom form
  const condLabel = document.getElementById('add-cond-label');
  if (condLabel) condLabel.textContent = es ? 'Condición(es) — opcional' : 'Condition(s) — optional';
  const btnAddManual = document.getElementById('btn-add-manual');
  if (btnAddManual) btnAddManual.textContent = es ? '+ Agregar' : '+ Add';
  const btnAnalyze = document.getElementById('btn-analyze');
  if (btnAnalyze) btnAnalyze.textContent = es ? '✦ Analizar origen' : '✦ Analyze origin';
  const addHint = document.getElementById('add-hint');
  if (addHint) addHint.textContent = es
    ? 'Sin condición → nodo flotante. "Analizar origen" → la IA busca qué síntomas lo generan.'
    : 'No condition → floating node. "Analyze origin" → AI finds what generates it.';

  // Right panel accordion labels
  const rpaDetail = document.getElementById('rpa-detail-label');
  if (rpaDetail) rpaDetail.textContent = es ? 'Detalle del síntoma' : 'Symptom detail';
  const rpaAi = document.getElementById('rpa-ai-label');
  if (rpaAi) rpaAi.textContent = es ? 'Análisis IA' : 'AI Analysis';
  const rpAnalyzeBtn = document.getElementById('rp-analyze-label');
  if (rpAnalyzeBtn) rpAnalyzeBtn.textContent = es ? 'Analizar este síntoma' : 'Analyze this symptom';

  // Right panel labels
  const rpWhen = document.getElementById('rp-when-label');
  if (rpWhen) rpWhen.textContent = es ? '¿Cuándo / cómo aparece?' : 'When / how does it appear?';
  const rpNotesLbl = document.getElementById('rp-notes-label');
  if (rpNotesLbl) rpNotesLbl.textContent = es ? 'Notas' : 'Notes';
  const btnSaveNote = document.getElementById('btn-save-note');
  if (btnSaveNote) btnSaveNote.textContent = es ? 'Guardar' : 'Save';
  const btnDeleteNode = document.getElementById('btn-delete-node');
  if (btnDeleteNode) btnDeleteNode.textContent = es ? 'Eliminar' : 'Delete';
  const btnPromote = document.getElementById('btn-promote');
  if (btnPromote) btnPromote.textContent = es ? '↑ Mover al mapa principal' : '↑ Move to main map';

  // Therapist notice
  const tnTitle = document.getElementById('rp-therapist-title');
  if (tnTitle) tnTitle.textContent = es ? '💬 Para explorar con tu terapeuta' : '💬 Worth exploring with your therapist';
  const tnBody = document.getElementById('rp-therapist-body');
  if (tnBody) tnBody.textContent = es
    ? 'No encontramos una conexión clara de este síntoma con tus diagnósticos. Puede ser algo importante para explorar con tu médico o terapeuta.'
    : "We couldn't find a clear connection between this symptom and your diagnoses. It may be worth exploring with your doctor or therapist.";

  // Multi panel
  const mpBtn = document.getElementById('mp-btn-label');
  if (mpBtn) mpBtn.textContent = es ? '¿Qué tienen en común?' : 'What do they share?';

  // Add symptom form context field label
  const ctxLabel = document.querySelector('#context-field .form-label');
  if (ctxLabel) ctxLabel.textContent = es ? '¿Cuándo / cómo aparece? (opcional)' : 'When / how does it appear? (optional)';
  const inpName = document.getElementById('inp-name');
  if (inpName) inpName.placeholder = es ? 'ej. náuseas, insomnio...' : 'e.g. nausea, insomnia...';
  const ctxField = document.getElementById('inp-context');
  if (ctxField) ctxField.placeholder = es ? 'ej. cuando hay mucha gente, después de comer...' : 'e.g. in crowded places, after eating...';

  // Form labels inside accordion
  document.querySelectorAll('.form-label').forEach(el => {
    if (el.id === 'add-when-label') el.textContent = es ? '¿Cuándo / cómo aparece? (opcional)' : 'When / how does it appear? (optional)';
    if (el.id === 'add-cond-label') el.textContent = es ? 'Condición(es) — opcional' : 'Condition(s) — optional';
  });

  // Add buttons
  document.querySelectorAll('.btn-add').forEach((btn, i) => {
    if (btn.onclick?.toString().includes('addNodeManual')) {
      btn.textContent = es ? '+ Agregar' : '+ Add';
    }
  });
  const analyzeBtn = document.querySelector('[onclick="addWithAIAnalysis()"]');
  if (analyzeBtn) analyzeBtn.textContent = es ? '✦ Analizar origen' : '✦ Analyze origin';

  // Right panel
  const rpCtx = document.getElementById('rp-context');
  if (rpCtx) rpCtx.placeholder = es ? 'ej. cuando hay mucha gente, al despertar...' : 'e.g. in crowded spaces, when waking up...';
  const rpNotes = document.getElementById('rp-notes');
  if (rpNotes) rpNotes.placeholder = es ? '¿Qué lo detona? ¿Cómo se siente...' : 'What triggers it? How does it feel...';
  const rpWhenLabel = document.querySelector('.rp-section-label');
  // Update all rp section labels
  document.querySelectorAll('.rp-section-label').forEach((el, i) => {
    if (i === 0) el.textContent = es ? '¿Cuándo / cómo aparece?' : 'When / how does it appear?';
    if (i === 1) el.textContent = es ? 'Notas' : 'Notes';
  });
  const btnSave = document.querySelector('.btn-save');
  if (btnSave) btnSave.textContent = es ? 'Guardar' : 'Save';
  const btnDel = document.querySelector('.btn-del');
  if (btnDel) btnDel.textContent = es ? 'Eliminar' : 'Delete';
  const rpPromote = document.querySelector('#rp-promote button');
  if (rpPromote) rpPromote.textContent = es ? '↑ Mover al mapa principal' : '↑ Move to main map';

  // Therapist notice
  const tn = document.querySelector('.therapist-notice strong');
  if (tn) tn.textContent = es ? '💬 Para explorar con tu terapeuta' : '💬 Worth exploring with your therapist';
  const tnP = document.querySelector('.therapist-notice');
  if (tnP) {
    const strong = tnP.querySelector('strong');
    if (strong) {
      tnP.innerHTML = `<strong>${es ? '💬 Para explorar con tu terapeuta' : '💬 Worth exploring with your therapist'}</strong>${
        es ? 'No encontramos una conexión clara de este síntoma con tus diagnósticos. Puede ser algo importante para explorar con tu médico o terapeuta.'
           : "We couldn't find a clear connection between this symptom and your diagnoses. It may be worth exploring with your doctor or therapist."
      }`;
    }
  }

  // Review panel
  const reviewH3 = document.querySelector('#review-panel h3');
  if (reviewH3) reviewH3.textContent = es ? 'Síntomas sugeridos' : 'Suggested symptoms';
  const acceptAllBtn = document.querySelector('.review-footer .btn-primary');
  if (acceptAllBtn) acceptAllBtn.textContent = es ? 'Aceptar todos' : 'Accept all';
  const closeReviewBtn = document.querySelector('.review-footer .btn-secondary');
  if (closeReviewBtn) closeReviewBtn.textContent = es ? 'Cerrar' : 'Close';

  // Legend
  const legIds = ['leg-title','leg-hub','leg-sym','leg-multi','leg-float','leg-thin','leg-thick','leg-dash'];
  const legKeys = ['legTitle','legHub','legSym','legMulti','legFloat','legThin','legThick','legDash'];
  legIds.forEach((id,i) => { const el=document.getElementById(id); if(el) el.textContent=t(legKeys[i]); });
  const legBtn = document.getElementById('legend-toggle');
  if (legBtn) legBtn.textContent = es ? '? leyenda' : '? legend';

  // HTML lang attribute
  document.documentElement.lang = lang;
}

// ═══════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════
let obCurrentStep = 1;

function setLang(l) {
  lang = l;
  // Visual selected state
  document.getElementById('lang-en').classList.toggle('selected', l==='en');
  document.getElementById('lang-es').classList.toggle('selected', l==='es');
  // Hint text
  const hint = document.getElementById('lang-hint');
  const hintText = document.getElementById('lang-hint-text');
  hintText.textContent = l === 'es' ? 'Idioma seleccionado — puedes continuar' : 'Language selected — you can continue';
  hint.style.opacity = '1';
  document.getElementById('ob-next').disabled = false;
  applyLang();
}

function updateNameBtn() {
  const val = document.getElementById('inp-username').value.trim();
  document.getElementById('ob-next2').disabled = val.length === 0;
}

function obNext() {
  document.getElementById('ob-step-1').classList.remove('active');
  document.getElementById('ob-step-2').classList.add('active');
  // Update name placeholder based on lang
  const inp = document.getElementById('inp-username');
  inp.placeholder = lang === 'es' ? 'Tu nombre o apodo' : 'Your name or nickname';
  document.getElementById('ob-name-title').textContent = lang === 'es' ? '¿Cómo te llamamos?' : 'What should we call you?';
  document.getElementById('ob-disclaimer').textContent = lang === 'es'
    ? 'Esta herramienta es para personas que ya tienen uno o más diagnósticos de salud mental confirmados por un profesional. Si ya tienes un diagnóstico, esto te ayuda a mapear y entender tus síntomas — no es una herramienta de autodiagnóstico.'
    : 'This tool is for people who already have one or more mental health diagnoses confirmed by a professional. If you already have a diagnosis, this helps you map and understand your symptoms — it is not a tool for self-diagnosis.';
  // Restore if name already entered
  if (document.getElementById('inp-username').value.trim()) {
    document.getElementById('ob-next2').disabled = false;
  }
}

function obNext2() {
  document.getElementById('ob-step-2').classList.remove('active');
  document.getElementById('ob-step-3').classList.add('active');
}

function obBack() {
  document.getElementById('ob-step-2').classList.remove('active');
  document.getElementById('ob-step-1').classList.add('active');
}

function obBack2() {
  document.getElementById('ob-step-3').classList.remove('active');
  document.getElementById('ob-step-2').classList.add('active');
}

function startApp() {
  const username = document.getElementById('inp-username').value.trim();
  state.lang = lang;
  state.username = username;
  saveState();
  applyLang(); // apply full translation now that lang is confirmed
  if (username) {
    const mapLabel = lang === 'es' ? `mapa de ${username}` : `${username}'s map`;
    document.getElementById('map-name').textContent = mapLabel;
  }
  const ob = document.getElementById('onboarding');
  ob.classList.add('hide');
  setTimeout(() => ob.style.display='none', 400);
  document.getElementById('legend').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════
// CUSTOM DIAGNOSIS
// ═══════════════════════════════════════════════════════════
const CUSTOM_COLORS = ['#e05c3a','#3d7ab8','#1aabb0','#7c6ab0','#d4953a','#6aaa4a','#c0622a','#b84a8a','#2a8060','#7a3a20'];
let customColor = CUSTOM_COLORS[0];

function openCustomModal() {
  const isEs = lang === 'es';
  document.getElementById('cm-title').textContent = isEs ? 'Agregar diagnóstico' : 'Add a diagnosis';
  document.getElementById('cm-desc').textContent = isEs
    ? 'Escribe el nombre de tu diagnóstico. La IA sugerirá síntomas comunes para él.'
    : 'Enter the name of your diagnosis. The AI will suggest common symptoms for it.';
  document.getElementById('cm-name-label').textContent = isEs ? 'Nombre del diagnóstico' : 'Diagnosis name';
  document.getElementById('cm-color-label').textContent = isEs ? 'Elige un color' : 'Choose a color';
  document.getElementById('cm-cancel').textContent = isEs ? 'Cancelar' : 'Cancel';
  document.getElementById('cm-name').value = '';
  document.getElementById('cm-name').placeholder = isEs ? 'ej. Fibromialgia, TOC...' : 'e.g. Fibromyalgia, OCD...';
  document.getElementById('cm-btn').disabled = true;
  customColor = CUSTOM_COLORS[0];

  const picker = document.getElementById('cm-colors');
  picker.innerHTML = CUSTOM_COLORS.map((c,i) =>
    `<div class="color-swatch ${i===0?'selected':''}" style="background:${c}" onclick="selectCustomColor('${c}',this)"></div>`
  ).join('');

  document.getElementById('custommodal').classList.add('show');
  setTimeout(() => document.getElementById('cm-name').focus(), 200);
}

function selectCustomColor(color, el) {
  customColor = color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

function updateCustomBtn() {
  const val = document.getElementById('cm-name').value.trim();
  document.getElementById('cm-btn').disabled = val.length < 2;
}

function closeCustomModal() {
  document.getElementById('custommodal').classList.remove('show');
}

async function saveCustomDiag() {
  const name = document.getElementById('cm-name').value.trim();
  if (!name) return;
  const isEs = lang === 'es';
  closeCustomModal();

  // Create custom id
  const customId = 'custom_' + Date.now();
  const customDiag = { id: customId, label: name, color: customColor, custom: true };

  // Add to DIAGNOSES and DIAG_MAP
  DIAGNOSES.push(customDiag);
  DIAG_MAP[customId] = customDiag;

  // Select it
  state.selectedDiags.push(customId);
  state.nodes.push({ id:'hub-'+customId, name, label: name, conds:[customId], hub:true, x:0, y:0, _placed:false });
  initLayout(); saveState(); renderDiagList(); renderNodeList(); draw();

  // Ask AI to suggest symptoms for this diagnosis
  showLoading(isEs ? `Buscando síntomas de ${name}...` : `Finding symptoms for ${name}...`);

  const prompt = `You are a psychoeducation assistant.

The user has been diagnosed with: ${name}
They also have these other diagnoses: ${state.selectedDiags.filter(d=>d!==customId).map(d=>DIAG_MAP[d]?.label||d).join(', ')||'none'}.

Suggest 6-8 common symptoms or experiences for "${name}", focusing on intersections with their other diagnoses if applicable.

Respond ONLY with valid JSON:
{
  "symptoms": [
    { "name": "short symptom name (max 4 words)", "reason": "brief explanation why it appears" }
  ]
}`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:800, messages:[{role:'user',content:prompt}] })
    });
    const data = await res.json();
    const text = data.content.map(b=>b.text||'').join('').trim().replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(text);

    pendingSuggestions = (parsed.symptoms||[]).map((s,i) => ({
      name: s.name,
      conds: [customId],
      reason: s.reason,
      _idx: i
    }));
    hideLoading();
    showReviewPanel();
  } catch(err) {
    hideLoading();
    showToast('Error: ' + err.message);
  }
}
function legendHover(type) {
  legendHighlight = type;
  draw();
}
function legendHoverEnd() {
  legendHighlight = null;
  draw();
}

// ═══════════════════════════════════════════════════════════
// LEGEND TOGGLE
// ═══════════════════════════════════════════════════════════
function toggleLegend() {
  const leg = document.getElementById('legend');
  const btn = document.getElementById('legend-toggle');
  const hidden = leg.classList.toggle('hidden');
  btn.style.display = hidden ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

// Set lang FIRST from saved state before anything renders
if (state.lang) lang = state.lang;
else lang = 'es';

window.addEventListener('resize', resize);
resize();
renderDiagList();
renderNodeList();
applyLang();

const ob = document.getElementById('onboarding');
if (!localStorage.getItem('sm_state_v2')) {
  ob.style.display = 'flex';
  document.getElementById('legend').classList.add('hidden');
} else {
  ob.style.display = 'none';
}
document.getElementById('legend').classList.remove('hidden');
if (state.username) {
  const mapLabel = lang === 'es' ? `mapa de ${state.username}` : `${state.username}'s map`;
  document.getElementById('map-name').textContent = mapLabel;
}

if (state.nodes.length > 0) {
  state.nodes.forEach(n => { if (!n._placed) n._placed = false; });
  initLayout();
  draw();
}
// Exponer funciones globales para el onboarding
window.setLang    = setLang
window.obNext     = obNext
window.obNext2    = obNext2
window.obBack     = obBack
window.obBack2    = obBack2
window.startApp   = startApp
window.toggleLegend = toggleLegend
window.updateNameBtn = updateNameBtn
window.openApiModal = () => document.getElementById('apimodal')?.classList.add('show')