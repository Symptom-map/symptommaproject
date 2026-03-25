import { useEffect, useRef } from 'react';

const DIAGNOSES = [
  { id: 'tda', label: 'TDA\nTDAH', color: '#3b82f6' },
  { id: 'tlp', label: 'TLP\nBorderline', color: '#a855f7' },
  { id: 'an', label: 'Anorexia\nNerviosa', color: '#fb7185' },
  { id: 'aut', label: 'Rasgos\nAutistas', color: '#10b981' },
  { id: 'cptsd', label: 'C-PTSD', color: '#f59e0b' },
  { id: 'bi', label: 'Trastorno\nBipolar', color: '#6366f1' },
  { id: 'anx', label: 'Ansiedad\nGeneralizada', color: '#84cc16' },
];

const DIAG_MAP = Object.fromEntries(DIAGNOSES.map(d => [d.id, d]));
const HUB_R = 46;
const SYM_R = 6;

export default function SymptomGraph({ nodes, diagMap, onNodeClick }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    let W, H;
    let offX = 0, offY = 0, scale = 1;
    let dragging = false;
    let dragNodeId = null;
    let selectedId = null;
    let hoveredId = null;
    let lastMx = 0, lastMy = 0;

    // Use nodes prop or create hubs from DIAGNOSES
    const currentNodes = nodes?.length > 0 
      ? nodes 
      : DIAGNOSES.map(d => ({
          id: `hub-${d.id}`,
          name: d.label.replace('\n', ' '),
          label: d.label,
          conds: [d.id],
          hub: true,
          x: 0,
          y: 0,
          _placed: false
        }));

    function resize() {
      W = canvas.width = wrap.clientWidth;
      H = canvas.height = wrap.clientHeight;
      if (currentNodes.some(n => !n._placed)) initLayout();
      draw();
    }

    function initLayout() {
      const hubs = currentNodes.filter(n => n.hub);
      if (hubs.length === 0) return;
      const spacing = Math.max(130, Math.min(W * 0.18, 200));
      const totalW = spacing * (hubs.length - 1);
      let startX = offX - totalW / 2;
      const y = offY - H * 0.08;
      hubs.forEach((h, i) => {
        if (!h._placed) {
          h.x = startX + i * spacing;
          h.y = y;
          h._placed = true;
        }
      });
      const syms = currentNodes.filter(n => !n.hub && !n._placed);
      syms.forEach((n, i) => {
        const hub = currentNodes.find(h => h.hub && h.conds[0] === n.conds[0]);
        const ang = (i / Math.max(syms.length, 1)) * Math.PI * 2;
        n.x = (hub ? hub.x : offX) + Math.cos(ang) * 100;
        n.y = (hub ? hub.y : offY) + 90 + Math.abs(Math.sin(ang)) * 80;
        n._placed = true;
      });
    }

    function edgePt(cx, cy, r, tx, ty) {
      const dx = tx - cx, dy = ty - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: cx + dx / d * r, y: cy + dy / d * r };
    }

    function w2s(wx, wy) {
      return { x: (wx - offX) * scale + W / 2, y: (wy - offY) * scale + H / 2 };
    }

    function s2w(sx, sy) {
      return { x: (sx - W / 2) / scale + offX, y: (sy - H / 2) / scale + offY };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Paper lines background
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.025)';
      ctx.lineWidth = 1;
      for (let y = 0; y < H; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();

      if (currentNodes.length === 0) {
        ctx.fillStyle = '#aaa090';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '14px Poppins, sans-serif';
        ctx.fillText('Selecciona tus diagnósticos y genera síntomas →', W / 2, H / 2);
        return;
      }

      const hubs = currentNodes.filter(n => n.hub);

      // Hub-to-hub lines
      for (let i = 0; i < hubs.length - 1; i++) {
        const pa = w2s(hubs[i].x, hubs[i].y);
        const pb = w2s(hubs[i + 1].x, hubs[i + 1].y);
        const from = edgePt(pa.x, pa.y, HUB_R * scale, pb.x, pb.y);
        const to = edgePt(pb.x, pb.y, HUB_R * scale, pa.x, pa.y);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = '#1c1a1633';
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
      }

      // Symptom edges
      const syms = currentNodes.filter(n => !n.hub);
      [false, true].forEach(drawShared => {
        syms.forEach(sym => {
          const isShared = sym.conds?.length > 1;
          if (isShared !== drawShared) return;

          const active = sym.id === selectedId || sym.id === hoveredId;
          const opacity = active ? 0.9 : isShared ? 0.55 : 0.18;
          const lineWidth = active ? 2.5 : isShared ? 2.0 : 1.0;

          sym.conds?.forEach((c, ci) => {
            const hub = currentNodes.find(h => h.hub && h.conds[0] === c);
            if (!hub) return;
            const hubActive = hub.id === selectedId || hub.id === hoveredId;
            const edgeOpacity = (active || hubActive) ? 0.9 : opacity;
            const edgeWidth = (active || hubActive) ? 2.5 : lineWidth;

            const ps = w2s(sym.x, sym.y), ph = w2s(hub.x, hub.y);
            const col = DIAG_MAP[c]?.color || '#888';
            const from = edgePt(ps.x, ps.y, SYM_R * scale + 2, ph.x, ph.y);
            const to = edgePt(ph.x, ph.y, HUB_R * scale, ps.x, ps.y);

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
            ctx.lineWidth = edgeWidth * scale;
            ctx.lineCap = 'round';
            ctx.stroke();
          });
        });
      });

      // Draw nodes
      currentNodes.forEach(n => {
        const p = w2s(n.x, n.y);
        const sel = n.id === selectedId;
        const hov = n.id === hoveredId;

        if (n.hub) {
          // Draw hub
          const col = DIAG_MAP[n.conds[0]]?.color || '#6495ED';
          if (sel || hov) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, HUB_R * scale + 8, 0, Math.PI * 2);
            const g = ctx.createRadialGradient(p.x, p.y, HUB_R * scale, p.x, p.y, HUB_R * scale + 12);
            g.addColorStop(0, col + '40');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, HUB_R * scale, 0, Math.PI * 2);
          ctx.fillStyle = col + '1a';
          ctx.fill();
          ctx.strokeStyle = sel ? col : col + (hov ? 'dd' : '99');
          ctx.lineWidth = (sel ? 2.8 : 2) * scale;
          ctx.stroke();

          // Hub label
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, HUB_R * scale - 4 * scale, 0, Math.PI * 2);
          ctx.clip();
          const lines = (n.label || n.name).split('\n');
          const fontSize = Math.max(8, Math.min(12, HUB_R * scale * 0.26));
          const lineH = fontSize * scale * 1.3;
          const maxW = (HUB_R * scale - 8 * scale) * 2;
          ctx.fillStyle = col;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `600 ${fontSize * scale}px 'Outfit', sans-serif`;
          lines.forEach((l, i) => {
            ctx.fillText(l, p.x, p.y + (i - (lines.length - 1) / 2) * lineH, maxW);
          });
          ctx.restore();
        } else {
          // Draw symptom
          const r = SYM_R * scale;
          if (sel || hov) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#1c1a1622';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          if (n.conds?.length > 1) {
            n.conds.forEach((c, i) => {
              const a0 = (i / n.conds.length) * Math.PI * 2 - Math.PI / 2;
              const a1 = ((i + 1) / n.conds.length) * Math.PI * 2 - Math.PI / 2;
              ctx.beginPath();
              ctx.arc(p.x, p.y, r, a0, a1);
              ctx.strokeStyle = DIAG_MAP[c]?.color || '#888';
              ctx.lineWidth = 2.5 * scale;
              ctx.stroke();
            });
          } else {
            const col = DIAG_MAP[n.conds?.[0]]?.color || '#888';
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = sel || hov ? col : col + 'bb';
            ctx.fill();
          }

          // Symptom label
          const words = n.name.split(' ');
          const lns = [];
          let cur = '';
          words.forEach(w => {
            if ((cur + ' ' + w).trim().length > 16) {
              lns.push(cur.trim());
              cur = w;
            } else {
              cur = (cur + ' ' + w).trim();
            }
          });
          if (cur) lns.push(cur.trim());
          ctx.fillStyle = sel ? '#1c1a16' : '#3a3530';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.font = `500 ${Math.max(7, 9 * scale)}px 'Outfit', sans-serif`;
          lns.forEach((l, i) => {
            ctx.fillText(l, p.x, p.y + r + 5 * scale + i * 11 * scale);
          });
        }
      });
    }

    function nodeAt(sx, sy) {
      for (const n of [...currentNodes].reverse()) {
        const r = (n.hub ? HUB_R + 4 : SYM_R + 10) * scale;
        const p = w2s(n.x, n.y);
        if ((sx - p.x) ** 2 + (sy - p.y) ** 2 < r * r) return n;
      }
      return null;
    }

    const onDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const n = nodeAt(sx, sy);
      if (n) {
        dragNodeId = n.id;
        selectedId = n.id;
        if (onNodeClick) onNodeClick(n);
      } else {
        dragNodeId = null;
        selectedId = null;
      }
      dragging = true;
      lastMx = sx;
      lastMy = sy;
      draw();
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (dragging) {
        const dx = sx - lastMx;
        const dy = sy - lastMy;
        if (dragNodeId) {
          const n = currentNodes.find(nd => nd.id === dragNodeId);
          if (n) {
            n.x += dx / scale;
            n.y += dy / scale;
          }
        } else {
          offX -= dx / scale;
          offY -= dy / scale;
        }
        lastMx = sx;
        lastMy = sy;
        draw();
      } else {
        const n = nodeAt(sx, sy);
        const prev = hoveredId;
        hoveredId = n ? n.id : null;
        canvas.style.cursor = n ? 'pointer' : 'default';
        if (hoveredId !== prev) draw();
      }
    };

    const onUp = () => {
      dragging = false;
      dragNodeId = null;
    };

    const onLeave = () => {
      dragging = false;
      dragNodeId = null;
      hoveredId = null;
      draw();
    };

    const onWheel = (e) => {
      e.preventDefault();
      scale = Math.max(0.2, Math.min(3, scale * (e.deltaY > 0 ? 0.9 : 1.1)));
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      ro.disconnect();
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [nodes, diagMap, onNodeClick]);

  return (
    <div ref={wrapRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />
    </div>
  );
}
