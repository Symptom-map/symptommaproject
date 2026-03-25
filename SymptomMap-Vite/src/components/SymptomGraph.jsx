import { useEffect, useRef } from 'react';

const DIAG_MAP = {
  tda: { id: 'tda', label: 'TDA\nTDAH', color: '#3b82f6' },
  tlp: { id: 'tlp', label: 'TLP\nBorderline', color: '#a855f7' },
  an: { id: 'an', label: 'Anorexia\nNerviosa', color: '#fb7185' },
  aut: { id: 'aut', label: 'Rasgos\nAutistas', color: '#10b981' },
  cptsd: { id: 'cptsd', label: 'C-PTSD', color: '#f59e0b' },
  bi: { id: 'bi', label: 'Trastorno\nBipolar', color: '#6366f1' },
  anx: { id: 'anx', label: 'Ansiedad\nGeneralizada', color: '#84cc16' },
};

const HUB_R = 46;
const SYM_R = 6;

export default function SymptomGraph({ nodes = [] }) {
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
    let lastMx = 0, lastMy = 0;

    function resize() {
      W = canvas.width = wrap.clientWidth;
      H = canvas.height = wrap.clientHeight;
      if (nodes.length > 0 && nodes.some(n => !n._placed)) initLayout();
      draw();
    }

    function initLayout() {
      const hubs = nodes.filter(n => n.hub);
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
      const syms = nodes.filter(n => !n.hub && !n._placed);
      syms.forEach((n, i) => {
        const hub = nodes.find(h => h.hub && h.conds && h.conds[0] === (n.conds ? n.conds[0] : null));
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

      // Si no hay nodos, mostrar mensaje
      if (nodes.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '14px Outfit, sans-serif';
        ctx.fillText('Selecciona diagnósticos en el panel izquierdo', W / 2, H / 2);
        return;
      }

      const hubs = nodes.filter(n => n.hub);

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
      const syms = nodes.filter(n => !n.hub);
      [false, true].forEach(drawShared => {
        syms.forEach(sym => {
          const isShared = sym.conds?.length > 1;
          if (isShared !== drawShared) return;

          const opacity = isShared ? 0.55 : 0.18;
          const lineWidth = isShared ? 2.0 : 1.0;

          sym.conds?.forEach((c, ci) => {
            const hub = nodes.find(h => h.hub && h.conds && h.conds[0] === c);
            if (!hub) return;

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

            const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.quadraticCurveTo(cpX, cpY, to.x, to.y);
            ctx.strokeStyle = col + hexOpacity;
            ctx.lineWidth = lineWidth * scale;
            ctx.lineCap = 'round';
            ctx.stroke();
          });
        });
      });

      // Draw hubs
      nodes.filter(n => n.hub).forEach(n => {
        const p = w2s(n.x, n.y);
        const diagId = n.conds ? n.conds[0] : null;
        const col = DIAG_MAP[diagId]?.color || '#6495ED';
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, HUB_R * scale, 0, Math.PI * 2);
        ctx.fillStyle = col + '1a';
        ctx.fill();
        ctx.strokeStyle = col + '99';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();

        // Hub label
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, HUB_R * scale - 4 * scale, 0, Math.PI * 2);
        ctx.clip();
        const label = n.label || DIAG_MAP[diagId]?.label || n.name || '';
        const lines = label.split('\n');
        const fontSize = Math.max(8, Math.min(12, HUB_R * scale * 0.26));
        const lineH = fontSize * scale * 1.3;
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `600 ${fontSize * scale}px 'Outfit', sans-serif`;
        lines.forEach((l, i) => {
          ctx.fillText(l, p.x, p.y + (i - (lines.length - 1) / 2) * lineH);
        });
        ctx.restore();
      });

      // Draw symptoms
      nodes.filter(n => !n.hub).forEach(n => {
        const p = w2s(n.x, n.y);
        const r = SYM_R * scale;

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
          ctx.fillStyle = col + 'bb';
          ctx.fill();
        }

        // Label
        const words = (n.name || '').split(' ');
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
        ctx.fillStyle = '#3a3530';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `500 ${Math.max(7, 9 * scale)}px 'Outfit', sans-serif`;
        lns.forEach((l, i) => {
          ctx.fillText(l, p.x, p.y + r + 5 * scale + i * 11 * scale);
        });
      });
    }

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (dragging) {
        const dx = sx - lastMx;
        const dy = sy - lastMy;
        offX -= dx / scale;
        offY -= dy / scale;
        lastMx = sx;
        lastMy = sy;
        draw();
      }
    };

    const onDown = (e) => {
      dragging = true;
      const rect = canvas.getBoundingClientRect();
      lastMx = e.clientX - rect.left;
      lastMy = e.clientY - rect.top;
    };

    const onUp = () => {
      dragging = false;
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
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      ro.disconnect();
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [nodes]);

  return (
    <div ref={wrapRef} style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    }}>
      <canvas ref={canvasRef} style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        display: 'block',
        width: '100%',
        height: '100%'
      }} />
    </div>
  );
}
