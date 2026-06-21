import { DIAGNOSES, DIAG_MAP } from './data.js';
import { init as initReviewPanel, showReviewPanel, closeReview, acceptSuggestion, rejectSuggestion, acceptAll } from './ui/reviewPanel.js';
import { init as initRightPanel, selectNode, closeRightPanel, openMultiPanel, analyzeMulti, saveNote, promoteToMain, deleteNode, deleteSelected, toggleRpAccordion, analyzeCurrentSymptom, toggleAccordion } from './ui/rightPanel.js';
import { init as initLeftPanel, renderDiagList, toggleHighlight, toggleDiag, updateGenBtn, renderAddChecks, addNodeManual, toggleContextHint, addWithAIAnalysis, renderNodeList, generateWithAI, toggleDiagDropdown, closeDiagDropdown, addDiagFromDropdown, filterDiagDropdown } from './ui/leftPanel.js';
import { init as initModals, openDiagModal, toggleChip, saveDiagProfile, closeDiagModal, openApiModal, closeApiModal, saveApiKey, openCustomModal, selectCustomColor, updateCustomBtn, closeCustomModal, saveCustomDiag } from './ui/modals.js';

// ═══════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════
const HUB_R    = 46;
const SYM_R    = 6;
const AI_COLOR = '#38b6ff';

// ═══════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════
let state = loadState() || {
  lang: 'es',
  username: '',
  selectedDiags: [],
  nodes: [],
  idCounter: 1,
};

let selectedId       = null;
let hoveredId        = null;
let dragging         = false;
let dragNodeId       = null;
let lastMx = 0, lastMy = 0;
let offX = 0, offY = 0, scale = 1;
let W, H;
let pendingSuggestions = [];
let highlightedDiags   = new Set();
let legendHighlight    = null;
let multiSelectedIds   = new Set();

// ═══════════════════════════════════════════════════════════
// CANVAS
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
  const startX  = offX - totalW / 2;
  const y       = offY - H * 0.08;
  hubs.forEach((h, i) => {
    if (!h._placed) { h.x = startX + i * spacing; h.y = y; h._placed = true; }
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
// DIBUJO
// ═══════════════════════════════════════════════════════════
function edgePt(cx, cy, r, tx, ty) {
  const dx = tx - cx, dy = ty - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: cx + dx / d * r, y: cy + dy / d * r };
}

function w2s(wx, wy) { return { x: (wx - offX) * scale + W / 2, y: (wy - offY) * scale + H / 2 }; }
function s2w(sx, sy) { return { x: (sx - W / 2) / scale + offX, y: (sy - H / 2) / scale + offY }; }

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Líneas de papel de fondo
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.025)';
  ctx.lineWidth   = 1;
  for (let y = 0; y < H; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();

  if (state.nodes.length === 0) {
    ctx.fillStyle    = '#aaa090';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px Poppins, sans-serif';
    ctx.fillText(lang === 'es' ? 'Selecciona tus diagnósticos y genera síntomas →' : 'Select your diagnoses and generate symptoms →', W / 2, H / 2);
    return;
  }

  const hubs = state.nodes.filter(n => n.hub);

  // Líneas entre hubs
  for (let i = 0; i < hubs.length - 1; i++) {
    const pa   = w2s(hubs[i].x, hubs[i].y);
    const pb   = w2s(hubs[i + 1].x, hubs[i + 1].y);
    const from = edgePt(pa.x, pa.y, HUB_R * scale, pb.x, pb.y);
    const to   = edgePt(pb.x, pb.y, HUB_R * scale, pa.x, pa.y);
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = '#1c1a1633'; ctx.lineWidth = 1.5 * scale; ctx.stroke();
  }

  // Aristas de síntomas — individuales primero (debajo), compartidas encima
  const syms = state.nodes.filter(n => !n.hub);
  [false, true].forEach(drawShared => {
    syms.forEach(sym => {
      const isShared = sym.conds.length > 1;
      if (isShared !== drawShared) return;

      const active   = sym.id === selectedId || sym.id === hoveredId;
      const inFilter = highlightedDiags.size === 0 || sym.conds.some(c => highlightedDiags.has(c));
      const dimmed   = !inFilter && highlightedDiags.size > 0;

      let legEdgeDim = false;
      if (legendHighlight) {
        if (legendHighlight === 'thin'  &&  isShared) legEdgeDim = true;
        if (legendHighlight === 'thick' && !isShared) legEdgeDim = true;
        if (['hub', 'sym', 'multi', 'float', 'dash'].includes(legendHighlight)) legEdgeDim = true;
      }

      const opacity   = (dimmed || legEdgeDim) ? 0.04 : active ? 0.9  : isShared ? 0.55 : 0.18;
      const lineWidth = (dimmed || legEdgeDim) ? 0.5  : active ? 2.5  : isShared ? 2.0  : 1.0;

      sym.conds.forEach((c, ci) => {
        const hub = state.nodes.find(h => h.hub && h.conds[0] === c);
        if (!hub) return;
        const hubActive  = hub.id === selectedId || hub.id === hoveredId;
        const edgeOpacity = (active || hubActive) ? 0.9 : opacity;
        const edgeWidth   = (active || hubActive) ? 2.5 : lineWidth;

        const ps   = w2s(sym.x, sym.y), ph = w2s(hub.x, hub.y);
        const col  = DIAG_MAP[c]?.color || '#888';
        const from = edgePt(ps.x, ps.y, SYM_R * scale + 2, ph.x, ph.y);
        const to   = edgePt(ph.x, ph.y, HUB_R * scale,     ps.x, ps.y);

        // Aristas compartidas con curvatura para que no se superpongan
        const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
        const nx = -(to.y - from.y), ny = (to.x - from.x);
        const nl = Math.sqrt(nx * nx + ny * ny) || 1;
        const curve = isShared ? (ci % 2 === 0 ? 1 : -1) * 18 * scale : 0;
        const cpX = mx + (nx / nl) * curve;
        const cpY = my + (ny / nl) * curve;

        const hexOpacity = Math.round(edgeOpacity * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(cpX, cpY, to.x, to.y);
        ctx.strokeStyle = col + hexOpacity;
        ctx.lineWidth   = edgeWidth * scale;
        ctx.lineCap     = 'round';
        ctx.stroke();
      });
    });
  });

  // Zona de consecuencias — debajo del mapa principal
  const ZONE_Y_WORLD = offY + H * 0.32;
  const zoneY        = w2s(0, ZONE_Y_WORLD).y;
  const hasConseqs   = state.nodes.some(n => n.causeIds?.length > 0 && !n.inMainMap);

  if (hasConseqs) {
    ctx.save();
    ctx.setLineDash([6 * scale, 8 * scale]);
    ctx.beginPath(); ctx.moveTo(0, zoneY); ctx.lineTo(W, zoneY);
    ctx.strokeStyle = '#1c1a1622'; ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle    = '#1c1a1628';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.max(8, 10 * scale)}px DM Mono, monospace`;
    ctx.fillText(lang === 'es' ? 'consecuencias' : 'secondary effects', 20, zoneY + 14 * scale);
    ctx.restore();
  }

  // Aristas causa → consecuencia (punteadas)
  state.nodes.filter(n => n.causeIds?.length > 0).forEach(conseq => {
    conseq.causeIds.forEach(causeId => {
      const cause = state.nodes.find(nd => nd.id === causeId);
      if (!cause) return;
      const pc  = w2s(cause.x, cause.y), pq = w2s(conseq.x, conseq.y);
      const sel = conseq.id === selectedId || cause.id === selectedId || conseq.id === hoveredId || cause.id === hoveredId;
      const fromR = cause.hub ? HUB_R * scale : SYM_R * scale + 2;
      const toR   = SYM_R * scale + 2;
      const from  = edgePt(pc.x, pc.y, fromR, pq.x, pq.y);
      const to    = edgePt(pq.x, pq.y, toR,   pc.x, pc.y);
      const legDashDim = legendHighlight && legendHighlight !== 'dash';
      ctx.globalAlpha = legDashDim ? 0.04 : 1;

      const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(mx, my - 20 * scale, to.x, to.y);
      ctx.strokeStyle = sel ? '#1c1a1699' : '#1c1a1630';
      ctx.lineWidth   = (sel ? 1.5 : 1) * scale;
      ctx.lineCap     = 'round';
      ctx.setLineDash([3 * scale, 4 * scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();
    });
  });

  // Nodos
  state.nodes.forEach(n => {
    const p       = w2s(n.x, n.y);
    const sel     = n.id === selectedId;
    const hov     = n.id === hoveredId;
    const inFilter = n.hub
      ? (highlightedDiags.size === 0 || highlightedDiags.has(n.conds[0]))
      : (highlightedDiags.size === 0 || n.conds.some(c => highlightedDiags.has(c)));
    const diagDimmed = !inFilter && highlightedDiags.size > 0;

    let legDimmed = false;
    if (legendHighlight) {
      const isHub   = n.hub;
      const isSym   = !n.hub && !n.floating && n.conds.length === 1;
      const isMulti = !n.hub && !n.floating && n.conds.length > 1;
      const isFloat = n.floating || (!n.hub && n.conds.length === 0);
      if (legendHighlight === 'hub'   && !isHub)   legDimmed = true;
      if (legendHighlight === 'sym'   && !isSym)   legDimmed = true;
      if (legendHighlight === 'multi' && !isMulti) legDimmed = true;
      if (legendHighlight === 'float' && !isFloat) legDimmed = true;
      if (['thin', 'thick', 'dash'].includes(legendHighlight)) legDimmed = true;
    }

    const isConseq  = !n.hub && n.causeIds?.length > 0 && !n.inMainMap;
    const isMultiSel = multiSelectedIds.has(n.id);
    ctx.globalAlpha = (diagDimmed || legDimmed) ? 0.1 : 1;
    if (isMultiSel) {
      const p2 = w2s(n.x, n.y);
      ctx.beginPath(); ctx.arc(p2.x, p2.y, (n.hub ? HUB_R : SYM_R + 4) * scale + 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#3d7ab855'; ctx.lineWidth = 2.5 * scale; ctx.stroke();
    }
    if (n.hub)           drawHub(n, p, sel, hov);
    else if (isConseq)   drawConsequence(n, p, sel, hov);
    else if (n.floating || n.conds.length === 0) drawFloating(n, p, sel, hov);
    else                 drawSymptom(n, p, sel || isMultiSel, hov);
    ctx.globalAlpha = 1;
  });
}

function drawHub(n, p, sel, hov) {
  const col = DIAG_MAP[n.conds[0]]?.color || '#888';
  const r   = HUB_R * scale;
  if (sel || hov) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r + 8, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(p.x, p.y, r, p.x, p.y, r + 12);
    g.addColorStop(0, col + '40'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle   = col + '1a'; ctx.fill();
  ctx.strokeStyle = sel ? col : col + (hov ? 'dd' : '99');
  ctx.lineWidth   = (sel ? 2.8 : 2) * scale; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(p.x, p.y, r - 4 * scale, 0, Math.PI * 2); ctx.clip();
  const lines    = (n.label || n.name).split('\n');
  const fontSize = Math.max(8, Math.min(12, r * 0.26));
  const lineH    = fontSize * scale * 1.3;
  const maxW     = (r - 8 * scale) * 2;
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
  if (sel || hov) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#1c1a1622'; ctx.lineWidth = 1; ctx.stroke();
  }
  if (n.fromAI) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = AI_COLOR + '55'; ctx.lineWidth = 1.5 * scale; ctx.stroke();
  }
  if (n.conds.length > 1) {
    n.conds.forEach((c, i) => {
      const a0 = (i / n.conds.length) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / n.conds.length) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, a0, a1);
      ctx.strokeStyle = DIAG_MAP[c]?.color || '#888';
      ctx.lineWidth   = 2.5 * scale; ctx.stroke();
    });
  } else {
    const col = DIAG_MAP[n.conds[0]]?.color || '#888';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = sel || hov ? col : col + 'bb'; ctx.fill();
  }
  const words = n.name.split(' ');
  const lns = []; let cur = '';
  words.forEach(w => {
    if ((cur + ' ' + w).trim().length > 16) { lns.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
  });
  if (cur) lns.push(cur.trim());
  ctx.fillStyle    = sel ? '#1c1a16' : '#3a3530';
  ctx.textAlign    = 'center'; ctx.textBaseline = 'top';
  ctx.font = `500 ${Math.max(7, 9 * scale)}px Poppins, sans-serif`;
  const lh = 11 * scale;
  lns.forEach((l, i) => ctx.fillText(l, p.x, p.y + r + 5 * scale + i * lh));
  if (n.notes) {
    ctx.fillStyle = '#4a8060';
    ctx.font = `${Math.max(7, 8 * scale)}px DM Mono, monospace`;
    ctx.fillText('●', p.x + r + 4 * scale, p.y - r - 2 * scale);
  }
}

function drawConsequence(n, p, sel, hov) {
  const r = (SYM_R + 2) * scale;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y);
  ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r, p.y);
  ctx.closePath();
  ctx.fillStyle   = sel || hov ? '#e8e4dc' : '#f0ede6'; ctx.fill();
  ctx.strokeStyle = sel ? '#1c1a16cc' : '#1c1a1655';
  ctx.lineWidth   = (sel ? 1.8 : 1.2) * scale; ctx.stroke();
  ctx.restore();
  if (n.notes) {
    ctx.fillStyle    = AI_COLOR;
    ctx.font = `${Math.max(6, 7 * scale)}px DM Mono, monospace`;
    ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('●', p.x + r + 3 * scale, p.y - r);
  }
  const words = n.name.split(' ');
  const lns = []; let cur = '';
  words.forEach(w => {
    if ((cur + ' ' + w).trim().length > 16) { lns.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
  });
  if (cur) lns.push(cur.trim());
  ctx.fillStyle    = sel ? '#1c1a16' : '#6a6258';
  ctx.textAlign    = 'center'; ctx.textBaseline = 'top';
  ctx.font = `400 ${Math.max(7, 9 * scale)}px Poppins, sans-serif`;
  lns.forEach((l, i) => ctx.fillText(l, p.x, p.y + r + 5 * scale + i * 11 * scale));
}

function drawFloating(n, p, sel, hov) {
  const r = SYM_R * scale;
  if (sel || hov) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r + 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#88776633'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.save();
  ctx.setLineDash([3 * scale, 3 * scale]);
  ctx.beginPath(); ctx.arc(p.x, p.y, r + 1, 0, Math.PI * 2);
  ctx.strokeStyle = sel ? '#887766cc' : '#88776688';
  ctx.lineWidth   = 1.8 * scale; ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(p.x, p.y, r - 1, 0, Math.PI * 2);
  ctx.fillStyle = sel ? '#88776630' : '#88776615'; ctx.fill();
  ctx.restore();
  if (n.confidence) {
    const cCol = { alta: '#2e8c68', media: '#d4953a', baja: '#e05c3a', desconocido: '#aaa090' }[n.confidence] || '#aaa090';
    ctx.beginPath(); ctx.arc(p.x + r + 3, p.y - r - 2, 3.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = cCol; ctx.fill();
  }
  const words = n.name.split(' ');
  const lns = []; let cur = '';
  words.forEach(w => {
    if ((cur + ' ' + w).trim().length > 16) { lns.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
  });
  if (cur) lns.push(cur.trim());
  ctx.fillStyle    = sel ? '#5a5040' : '#887766';
  ctx.textAlign    = 'center'; ctx.textBaseline = 'top';
  ctx.font = `500 ${Math.max(7, 9 * scale)}px Poppins, sans-serif`;
  lns.forEach((l, i) => ctx.fillText(l, p.x, p.y + r + 5 * scale + i * 11 * scale));
  if (n.notes) {
    ctx.fillStyle = AI_COLOR;
    ctx.font = `${Math.max(7, 8 * scale)}px DM Mono, monospace`;
    ctx.fillText('●', p.x + r + 4 * scale, p.y - r - 2 * scale);
  }
}

// ═══════════════════════════════════════════════════════════
// HIT TEST
// ═══════════════════════════════════════════════════════════
function nodeAt(sx, sy) {
  for (const n of [...state.nodes].reverse()) {
    const r = (n.hub ? HUB_R + 4 : SYM_R + 10) * scale;
    const p = w2s(n.x, n.y);
    if ((sx - p.x) ** 2 + (sy - p.y) ** 2 < r * r) return n;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// INTERACCIÓN CON EL CANVAS
// ═══════════════════════════════════════════════════════════
let dragMoved = false;

canvas.addEventListener('mousedown', e => {
  const n = nodeAt(e.offsetX, e.offsetY);
  if (n) {
    if (!n.hub && (e.ctrlKey || e.metaKey)) {
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
    multiSelectedIds.clear();
    dragNodeId = n.id;
    selectedId = n.id;
    renderNodeList(); draw();
  } else {
    multiSelectedIds.clear();
    dragNodeId = null;
    selectedId = null;
    closeRightPanel();
  }
  dragging  = true;
  dragMoved = false;
  lastMx = e.offsetX; lastMy = e.offsetY;
});

canvas.addEventListener('mousemove', e => {
  const sx = e.offsetX, sy = e.offsetY;
  if (dragging) {
    const dx = sx - lastMx, dy = sy - lastMy;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true;
    if (dragNodeId) {
      const n = state.nodes.find(nd => nd.id === dragNodeId);
      if (n) { n.x += dx / scale; n.y += dy / scale; }
    } else { offX -= dx / scale; offY -= dy / scale; }
    lastMx = sx; lastMy = sy; draw();
  } else {
    const n    = nodeAt(sx, sy);
    const prev = hoveredId; hoveredId = n ? n.id : null;
    if (n && !n.hub) showTooltip(n, e.clientX, e.clientY);
    else hideTooltip();
    canvas.style.cursor = n ? 'pointer' : 'default';
    if (hoveredId !== prev) draw();
  }
});

canvas.addEventListener('mouseup',    () => { dragging = false; dragNodeId = null; saveState(); });
canvas.addEventListener('mouseleave', () => { dragging = false; dragNodeId = null; hoveredId = null; hideTooltip(); draw(); });

canvas.addEventListener('dblclick', e => {
  const n = nodeAt(e.offsetX, e.offsetY);
  if (n && !n.hub) selectNode(n.id);
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  scale = Math.max(0.25, Math.min(4, scale * (e.deltaY > 0 ? 0.92 : 1.09)));
  draw();
}, { passive: false });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0], r = canvas.getBoundingClientRect();
  const sx = t.clientX - r.left, sy = t.clientY - r.top;
  const n = nodeAt(sx, sy);
  if (n) { dragNodeId = n.id; selectNode(n.id); } else dragNodeId = null;
  dragging = true; lastMx = sx; lastMy = sy;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0], r = canvas.getBoundingClientRect();
  const sx = t.clientX - r.left, sy = t.clientY - r.top;
  const dx = sx - lastMx, dy = sy - lastMy;
  if (dragNodeId) {
    const n = state.nodes.find(nd => nd.id === dragNodeId);
    if (n) { n.x += dx / scale; n.y += dy / scale; }
  } else { offX -= dx / scale; offY -= dy / scale; }
  lastMx = sx; lastMy = sy; draw();
}, { passive: false });

canvas.addEventListener('touchend', () => { dragging = false; dragNodeId = null; saveState(); });

// ═══════════════════════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════════════════════
const tooltip = document.getElementById('tooltip');
function showTooltip(n, cx, cy) {
  const tags = n.conds.map(c => DIAG_MAP[c]?.label.replace('\n', ' ') || c).join(' · ');
  tooltip.textContent = n.name + (tags ? `  —  ${tags}` : '') + (lang === 'es' ? '  ·  doble click para abrir' : '  ·  double click to open');
  tooltip.style.left  = (cx + 12) + 'px'; tooltip.style.top = (cy - 10) + 'px';
  tooltip.classList.add('show');
}
function hideTooltip() { tooltip.classList.remove('show'); }

// ═══════════════════════════════════════════════════════════
// PERSISTENCIA
// ═══════════════════════════════════════════════════════════
function saveState() {
  try { localStorage.setItem('sm_state', JSON.stringify(state)); } catch (e) {}
}

function loadState() {
  try {
    const s = localStorage.getItem('sm_state');
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}

// ═══════════════════════════════════════════════════════════
// EXPORTAR
// ═══════════════════════════════════════════════════════════
function exportMap() {
  const link = document.createElement('a');
  link.download = 'symptommap.png';
  link.href     = canvas.toDataURL('image/png');
  link.click();
  showToast('Mapa exportado como imagen');
}

// ═══════════════════════════════════════════════════════════
// HELPERS DE UI
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
    tagline:    'A tool to map how your diagnoses connect through shared symptoms — not to diagnose, but to understand.',
    disclaimer: 'This tool is for people who already have one or more mental health diagnoses confirmed by a professional. It is not a diagnostic tool.',
    howTitle:   'How it works',
    h1: 'Select your diagnoses', b1: 'From the left panel. Each one you add will ask a few questions to personalize your map.',
    h2: 'Generate suggestions',  b2: 'The AI will suggest symptoms based on your specific profile. Accept, reject, or edit each one.',
    h3: 'Make it yours',         b3: 'Add your own symptoms, move nodes freely, and double-click any node to open its notes.',
    back: '← Back', start: 'Start →', next: '→',
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
    notesLabel: 'Notes', notesPlaceholder: 'What triggers it? How does it feel...',
    legTitle: 'Legend', legHub: 'Diagnosis', legSym: 'Symptom (1 diagnosis)',
    legMulti: 'Symptom (shared)', legFloat: 'Unknown origin',
    legThin: 'Individual connection', legThick: 'Shared connection', legDash: 'Consequence →',
    legBtn: '? legend',
    topHint: 'click · move  ·  double-click · open notes',
  },
  es: {
    tagline:    'Una herramienta para mapear cómo tus diagnósticos se conectan a través de síntomas compartidos — no para diagnosticar, sino para entenderte.',
    disclaimer: 'Esta herramienta está diseñada para personas que ya tienen uno o más diagnósticos de salud mental confirmados por un profesional. No es una herramienta diagnóstica.',
    howTitle:   'Cómo funciona',
    h1: 'Selecciona tus diagnósticos', b1: 'Desde el panel izquierdo. Cada uno que agregues incluirá preguntas para personalizar tu mapa.',
    h2: 'Genera sugerencias',          b2: 'La IA sugerirá síntomas según tu perfil específico. Acepta, rechaza o edita cada uno.',
    h3: 'Hazlo tuyo',                  b3: 'Agrega tus propios síntomas, mueve los nodos libremente, y doble click en cualquier nodo para abrir sus notas.',
    back: '← Volver', start: 'Empezar →', next: '→',
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
    notesLabel: 'Notas', notesPlaceholder: '¿Qué lo detona? ¿Cómo se siente...',
    legTitle: 'Leyenda', legHub: 'Diagnóstico', legSym: 'Síntoma (1 diagnóstico)',
    legMulti: 'Síntoma (compartido)', legFloat: 'Origen desconocido',
    legThin: 'Conexión individual', legThick: 'Conexión compartida', legDash: 'Consecuencia →',
    legBtn: '? leyenda',
    topHint: 'click · mover  ·  doble click · abrir notas',
  }
};

let lang = state.lang || 'es';
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
  ['h1', 'h2', 'h3', 'b1', 'b2', 'b3'].forEach(k => {
    const el = document.getElementById('ob-' + k); if (el) el.textContent = t(k);
  });
  ['ob-back', 'ob-back2', 'ob-start', 'ob-next', 'ob-next2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'ob-back' || id === 'ob-back2') el.textContent = es ? '← Volver' : '← Back';
      if (id === 'ob-start')                     el.textContent = es ? 'Empezar →' : 'Start →';
      if (id === 'ob-next' || id === 'ob-next2') el.textContent = '→';
    }
  });

  // Encabezados de acordeón
  const diagLabel = document.getElementById('acc-diags-label');
  if (diagLabel) diagLabel.textContent = es ? 'Mis diagnósticos' : 'My diagnoses';
  const addLabel  = document.getElementById('acc-add-label');
  if (addLabel)  addLabel.textContent  = es ? 'Agregar síntoma'  : 'Add symptom';
  const listLabel = document.getElementById('acc-list-label');
  if (listLabel) listLabel.textContent = es ? 'Síntomas'         : 'Symptoms';

  // Botón generar
  const genLabel = document.getElementById('btn-gen-label');
  if (genLabel) genLabel.textContent = es ? 'Sugerir síntomas' : 'Suggest symptoms';

  // Formulario de agregar síntoma
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

  // Etiquetas del panel derecho
  const rpaDetail = document.getElementById('rpa-detail-label');
  if (rpaDetail) rpaDetail.textContent = es ? 'Detalle del síntoma' : 'Symptom detail';
  const rpaAi = document.getElementById('rpa-ai-label');
  if (rpaAi) rpaAi.textContent = es ? 'Análisis IA' : 'AI Analysis';
  const rpAnalyzeBtn = document.getElementById('rp-analyze-label');
  if (rpAnalyzeBtn) rpAnalyzeBtn.textContent = es ? 'Analizar este síntoma' : 'Analyze this symptom';
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

  // Aviso de terapeuta
  const tnTitle = document.getElementById('rp-therapist-title');
  if (tnTitle) tnTitle.textContent = es ? '💬 Para explorar con tu terapeuta' : '💬 Worth exploring with your therapist';
  const tnBody = document.getElementById('rp-therapist-body');
  if (tnBody) tnBody.textContent = es
    ? 'No encontramos una conexión clara de este síntoma con tus diagnósticos. Puede ser algo importante para explorar con tu médico o terapeuta.'
    : "We couldn't find a clear connection between this symptom and your diagnoses. It may be worth exploring with your doctor or therapist.";

  // Panel multi-selección
  const mpBtn = document.getElementById('mp-btn-label');
  if (mpBtn) mpBtn.textContent = es ? '¿Qué tienen en común?' : 'What do they share?';

  // Campo de contexto en el formulario
  const ctxLabel = document.querySelector('#context-field .form-label');
  if (ctxLabel) ctxLabel.textContent = es ? '¿Cuándo / cómo aparece? (opcional)' : 'When / how does it appear? (optional)';
  const inpName = document.getElementById('inp-name');
  if (inpName) inpName.placeholder = es ? 'ej. náuseas, insomnio...' : 'e.g. nausea, insomnia...';
  const ctxField = document.getElementById('inp-context');
  if (ctxField) ctxField.placeholder = es ? 'ej. cuando hay mucha gente, después de comer...' : 'e.g. in crowded places, after eating...';

  // Etiquetas genéricas del formulario
  document.querySelectorAll('.form-label').forEach(el => {
    if (el.id === 'add-when-label') el.textContent = es ? '¿Cuándo / cómo aparece? (opcional)' : 'When / how does it appear? (optional)';
    if (el.id === 'add-cond-label') el.textContent = es ? 'Condición(es) — opcional' : 'Condition(s) — optional';
  });

  // Placeholders del panel derecho
  const rpCtx = document.getElementById('rp-context');
  if (rpCtx) rpCtx.placeholder = es ? 'ej. cuando hay mucha gente, al despertar...' : 'e.g. in crowded spaces, when waking up...';
  const rpNotes = document.getElementById('rp-notes');
  if (rpNotes) rpNotes.placeholder = es ? '¿Qué lo detona? ¿Cómo se siente...' : 'What triggers it? How does it feel...';
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

  // Aviso de terapeuta (versión alternativa en DOM)
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

  // Panel de revisión
  const reviewH3 = document.querySelector('#review-panel h3');
  if (reviewH3) reviewH3.textContent = es ? 'Síntomas sugeridos' : 'Suggested symptoms';
  const acceptAllBtn = document.querySelector('.review-footer .btn-primary');
  if (acceptAllBtn) acceptAllBtn.textContent = es ? 'Aceptar todos' : 'Accept all';
  const closeReviewBtn = document.querySelector('.review-footer .btn-secondary');
  if (closeReviewBtn) closeReviewBtn.textContent = es ? 'Cerrar' : 'Close';

  // Leyenda
  const legIds  = ['leg-title', 'leg-hub', 'leg-sym', 'leg-multi', 'leg-float', 'leg-thin', 'leg-thick', 'leg-dash'];
  const legKeys = ['legTitle',  'legHub',  'legSym',  'legMulti',  'legFloat',  'legThin',  'legThick',  'legDash'];
  legIds.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = t(legKeys[i]); });
  const legBtn = document.getElementById('legend-toggle');
  if (legBtn) legBtn.textContent = es ? '? leyenda' : '? legend';

  document.documentElement.lang = lang;
}

// ═══════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════
function setLang(l) {
  lang = l;
  document.getElementById('lang-en').classList.toggle('selected', l === 'en');
  document.getElementById('lang-es').classList.toggle('selected', l === 'es');
  const hintText = document.getElementById('lang-hint-text');
  hintText.textContent = l === 'es' ? 'Idioma seleccionado — puedes continuar' : 'Language selected — you can continue';
  document.getElementById('lang-hint').style.opacity = '1';
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
  const inp = document.getElementById('inp-username');
  inp.placeholder = lang === 'es' ? 'Tu nombre o apodo' : 'Your name or nickname';
  document.getElementById('ob-name-title').textContent = lang === 'es' ? '¿Cómo te llamamos?' : 'What should we call you?';
  document.getElementById('ob-disclaimer').textContent = lang === 'es'
    ? 'Esta herramienta es para personas que ya tienen uno o más diagnósticos de salud mental confirmados por un profesional. Si ya tienes un diagnóstico, esto te ayuda a mapear y entender tus síntomas — no es una herramienta de autodiagnóstico.'
    : 'This tool is for people who already have one or more mental health diagnoses confirmed by a professional. If you already have a diagnosis, this helps you map and understand your symptoms — it is not a tool for self-diagnosis.';
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
  state.lang     = lang;
  state.username = username;
  saveState();
  applyLang();
  if (username) {
    const mapLabel = lang === 'es' ? `mapa de ${username}` : `${username}'s map`;
    document.getElementById('map-name').textContent = mapLabel;
  }
  const ob = document.getElementById('onboarding');
  ob.classList.add('hide');
  setTimeout(() => ob.style.display = 'none', 400);
  document.getElementById('legend').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════
// LEYENDA
// ═══════════════════════════════════════════════════════════
function legendHover(type) { legendHighlight = type; draw(); }
function legendHoverEnd()  { legendHighlight = null;  draw(); }

function toggleLegend() {
  const leg    = document.getElementById('legend');
  const btn    = document.getElementById('legend-toggle');
  const hidden = leg.classList.toggle('hidden');
  btn.style.display = hidden ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════

// Establecer idioma desde el estado guardado antes de renderizar
if (state.lang) lang = state.lang; else lang = 'es';

// Objeto de dependencias compartidas — los módulos UI leen y escriben aquí
const deps = {
  DIAGNOSES,
  DIAG_MAP,
  HUB_R,
  SYM_R,
  AI_COLOR,
  get state()              { return state; },
  get lang()               { return lang; },
  set lang(v)              { lang = v; },
  get pendingSuggestions() { return pendingSuggestions; },
  set pendingSuggestions(v){ pendingSuggestions = v; },
  get selectedId()         { return selectedId; },
  set selectedId(v)        { selectedId = v; },
  get multiSelectedIds()   { return multiSelectedIds; },
  get highlightedDiags()   { return highlightedDiags; },
  get offX()               { return offX; },
  get offY()               { return offY; },
  get H()                  { return H; },
  draw,
  initLayout,
  saveState,
  showToast,
  showLoading,
  hideLoading,
  // Referencias cruzadas entre módulos — se completan después de todos los inits
  renderNodeList:  null,
  renderDiagList:  null,
  selectNode:      null,
  openDiagModal:   null,
  showReviewPanel: null,
};

// Inicializar módulos pasando deps por referencia
initReviewPanel(deps);
initRightPanel(deps);
initLeftPanel(deps);
initModals(deps);

// Completar referencias cruzadas ahora que todos los módulos están listos
deps.renderNodeList  = renderNodeList;
deps.renderDiagList  = renderDiagList;
deps.selectNode      = selectNode;
deps.openDiagModal   = openDiagModal;
deps.showReviewPanel = showReviewPanel;

window.addEventListener('resize', resize);
// Segunda llamada en load garantiza dimensiones correctas tras carga de fuentes web
window.addEventListener('load', resize);
resize();
renderDiagList();
renderNodeList();
applyLang();

// Mostrar u ocultar onboarding según si hay estado guardado
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

// ── Exponer en window — requerido por los onclick="" del HTML ──
window.setLang            = setLang;
window.obNext             = obNext;
window.obNext2            = obNext2;
window.obBack             = obBack;
window.obBack2            = obBack2;
window.startApp           = startApp;
window.updateNameBtn      = updateNameBtn;
window.toggleLegend       = toggleLegend;
window.legendHover        = legendHover;
window.legendHoverEnd     = legendHoverEnd;
window.exportMap          = exportMap;
// leftPanel
window.toggleDiag            = toggleDiag;
window.toggleHighlight        = toggleHighlight;
window.addNodeManual          = addNodeManual;
window.addWithAIAnalysis      = addWithAIAnalysis;
window.toggleContextHint      = toggleContextHint;
window.generateWithAI         = generateWithAI;
window.toggleDiagDropdown     = toggleDiagDropdown;
window.closeDiagDropdown      = closeDiagDropdown;
window.addDiagFromDropdown    = addDiagFromDropdown;
window.filterDiagDropdown     = filterDiagDropdown;
// rightPanel
window.selectNode         = selectNode;
window.closeRightPanel    = closeRightPanel;
window.openMultiPanel     = openMultiPanel;
window.analyzeMulti       = analyzeMulti;
window.saveNote           = saveNote;
window.promoteToMain      = promoteToMain;
window.deleteNode         = deleteNode;
window.deleteSelected     = deleteSelected;
window.analyzeCurrentSymptom = analyzeCurrentSymptom;
window.toggleRpAccordion  = toggleRpAccordion;
window.toggleAccordion    = toggleAccordion;
// reviewPanel
window.acceptSuggestion   = acceptSuggestion;
window.rejectSuggestion   = rejectSuggestion;
window.acceptAll          = acceptAll;
window.closeReview        = closeReview;
// modals
window.openDiagModal      = openDiagModal;
window.closeDiagModal     = closeDiagModal;
window.saveDiagProfile    = saveDiagProfile;
window.toggleChip         = toggleChip;
window.openApiModal       = openApiModal;
window.closeApiModal      = closeApiModal;
window.saveApiKey         = saveApiKey;
window.openCustomModal         = toggleDiagDropdown;   // + button → selector
window.openRealCustomDiagModal = openCustomModal;      // "not in list" → custom modal
window.closeCustomModal   = closeCustomModal;
window.saveCustomDiag     = saveCustomDiag;
window.updateCustomBtn    = updateCustomBtn;
window.selectCustomColor  = selectCustomColor;
