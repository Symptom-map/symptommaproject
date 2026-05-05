// ─────────────────────────────────────────────────────────────
// graph.js — motor de dibujo y física del canvas
// Toda la lógica de D3 y canvas vive aquí.
// ─────────────────────────────────────────────────────────────

import { DIAG_MAP } from './data.js'

const HUB_R = 46
const SYM_R = 6

// Estado interno del canvas
let canvas, ctx, W, H
let offX = 0, offY = 0, scale = 1
let highlightedDiags = new Set()
let selectedId  = null
let hoveredId   = null

// ── Inicializar canvas ────────────────────────────────────────
export function initCanvas(canvasEl) {
  canvas = canvasEl
  ctx    = canvas.getContext('2d')
  resize()
}

export function resize() {
  const wrap = canvas.parentElement
  W = canvas.width  = wrap.clientWidth
  H = canvas.height = wrap.clientHeight
}

// ── Setters de estado ─────────────────────────────────────────
export function setSelected(id)          { selectedId = id }
export function setHovered(id)           { hoveredId  = id }
export function setHighlightedDiags(set) { highlightedDiags = set }
export function getScale()               { return scale }
export function getOffset()              { return { offX, offY } }
export function getSize()                { return { W, H } }

// ── Conversión coordenadas ────────────────────────────────────
export function worldToScreen(wx, wy) {
  return {
    x: (wx - offX) * scale + W / 2,
    y: (wy - offY) * scale + H / 2,
  }
}

export function screenToWorld(sx, sy) {
  return {
    x: (sx - W / 2) / scale + offX,
    y: (sy - H / 2) / scale + offY,
  }
}

// ── Layout inicial de nodos ───────────────────────────────────
export function initLayout(nodes) {
  const hubs    = nodes.filter(n => n.hub)
  const syms    = nodes.filter(n => !n.hub)
  if (!hubs.length) return

  const spacing = Math.max(130, Math.min(W * 0.18, 200))
  const totalW  = spacing * (hubs.length - 1)
  const startX  = offX - totalW / 2
  const y       = offY - H * 0.08

  hubs.forEach((h, i) => {
    if (!h._placed) {
      h.x = startX + i * spacing
      h.y = y
      h._placed = true
    }
  })

  syms.forEach((n, i, arr) => {
    if (!n._placed) {
      const hub = nodes.find(h => h.hub && h.conds[0] === n.conds[0])
      const ang = (i / Math.max(arr.length, 1)) * Math.PI * 2
      n.x = (hub ? hub.x : offX) + Math.cos(ang) * 100
      n.y = (hub ? hub.y : offY) + 90 + Math.abs(Math.sin(ang)) * 80
      n._placed = true
    }
  })
}

// ── Hit test ──────────────────────────────────────────────────
export function nodeAt(nodes, sx, sy) {
  for (const n of [...nodes].reverse()) {
    const r = (n.hub ? HUB_R + 4 : SYM_R + 10) * scale
    const p = worldToScreen(n.x, n.y)
    if ((sx - p.x) ** 2 + (sy - p.y) ** 2 < r * r) return n
  }
  return null
}

// ── Pan y zoom ────────────────────────────────────────────────
export function pan(dx, dy) {
  offX -= dx / scale
  offY -= dy / scale
}

export function zoom(factor, cx, cy) {
  const before = screenToWorld(cx, cy)
  scale = Math.max(0.3, Math.min(3, scale * factor))
  const after  = screenToWorld(cx, cy)
  offX += before.x - after.x
  offY += before.y - after.y
}

// ── Dibujo principal ──────────────────────────────────────────
export function draw(nodes, multiSelectedIds = new Set()) {
  ctx.clearRect(0, 0, W, H)

  // Cuadrícula sutil
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.025)'
  ctx.lineWidth = 1
  for (let y = 0; y < H; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }
  ctx.restore()

  if (!nodes.length) {
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '14px Outfit, sans-serif'
    ctx.fillText('Selecciona tus diagnósticos y genera síntomas →', W / 2, H / 2)
    return
  }

  const hubs = nodes.filter(n => n.hub)
  const syms = nodes.filter(n => !n.hub)

  _drawHubEdges(hubs)
  _drawSymptomEdges(syms, nodes)
  _drawConsequenceEdges(nodes)
  _drawNodes(nodes, multiSelectedIds)
}

// ── Aristas entre hubs ────────────────────────────────────────
function _drawHubEdges(hubs) {
  for (let i = 0; i < hubs.length - 1; i++) {
    const pa = worldToScreen(hubs[i].x, hubs[i].y)
    const pb = worldToScreen(hubs[i + 1].x, hubs[i + 1].y)
    const from = _edgePt(pa.x, pa.y, HUB_R * scale, pb.x, pb.y)
    const to   = _edgePt(pb.x, pb.y, HUB_R * scale, pa.x, pa.y)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = '#1c1a1633'
    ctx.lineWidth = 1.5 * scale
    ctx.stroke()
  }
}

// ── Aristas entre síntomas y hubs ────────────────────────────
function _drawSymptomEdges(syms, nodes) {
  ;[false, true].forEach(drawShared => {
    syms.forEach(sym => {
      const isShared = sym.conds.length > 1
      if (isShared !== drawShared) return

      const active   = sym.id === selectedId || sym.id === hoveredId
      const inFilter = highlightedDiags.size === 0 || sym.conds.some(c => highlightedDiags.has(c))
      const dimmed   = !inFilter && highlightedDiags.size > 0

      const opacity   = dimmed ? 0.04 : active ? 0.9 : isShared ? 0.55 : 0.18
      const lineWidth = dimmed ? 0.5  : active ? 2.5 : isShared ? 2.0  : 1.0

      sym.conds.forEach((c, ci) => {
        const hub = nodes.find(h => h.hub && h.conds[0] === c)
        if (!hub) return
        const ps  = worldToScreen(sym.x, sym.y)
        const ph  = worldToScreen(hub.x, hub.y)
        const col = DIAG_MAP[c]?.color || '#888'
        const from = _edgePt(ps.x, ps.y, SYM_R * scale + 2, ph.x, ph.y)
        const to   = _edgePt(ph.x, ph.y, HUB_R * scale, ps.x, ps.y)

        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2
        const nx = -(to.y - from.y)
        const ny = (to.x - from.x)
        const nl = Math.sqrt(nx * nx + ny * ny) || 1
        const curve = isShared ? (ci % 2 === 0 ? 1 : -1) * 18 * scale : 0

        const hexOp = Math.round(opacity * 255).toString(16).padStart(2, '0')
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.quadraticCurveTo(
          mx + (nx / nl) * curve,
          my + (ny / nl) * curve,
          to.x, to.y
        )
        ctx.strokeStyle = col + hexOp
        ctx.lineWidth = lineWidth * scale
        ctx.lineCap = 'round'
        ctx.stroke()
      })
    })
  })
}

// ── Aristas de consecuencia ───────────────────────────────────
function _drawConsequenceEdges(nodes) {
  nodes.filter(n => n.causeIds?.length).forEach(conseq => {
    conseq.causeIds.forEach(causeId => {
      const cause = nodes.find(nd => nd.id === causeId)
      if (!cause) return
      const pc  = worldToScreen(cause.x, cause.y)
      const pq  = worldToScreen(conseq.x, conseq.y)
      const sel = conseq.id === selectedId || cause.id === selectedId
      const fromR = cause.hub ? HUB_R * scale : SYM_R * scale + 2
      const from  = _edgePt(pc.x, pc.y, fromR, pq.x, pq.y)
      const to    = _edgePt(pq.x, pq.y, SYM_R * scale + 2, pc.x, pc.y)
      const mx = (from.x + to.x) / 2
      const my = (from.y + to.y) / 2
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.quadraticCurveTo(mx, my - 20 * scale, to.x, to.y)
      ctx.strokeStyle = sel ? '#1c1a1699' : '#1c1a1630'
      ctx.lineWidth = (sel ? 1.5 : 1) * scale
      ctx.lineCap = 'round'
      ctx.setLineDash([3 * scale, 4 * scale])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    })
  })
}

// ── Dibujo de nodos ───────────────────────────────────────────
function _drawNodes(nodes, multiSelectedIds) {
  nodes.forEach(n => {
    const p   = worldToScreen(n.x, n.y)
    const sel = n.id === selectedId
    const hov = n.id === hoveredId
    const inFilter = n.hub
      ? (highlightedDiags.size === 0 || highlightedDiags.has(n.conds[0]))
      : (highlightedDiags.size === 0 || n.conds.some(c => highlightedDiags.has(c)))

    ctx.globalAlpha = (!inFilter && highlightedDiags.size > 0) ? 0.1 : 1

    if (multiSelectedIds.has(n.id)) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, (n.hub ? HUB_R : SYM_R + 4) * scale + 6, 0, Math.PI * 2)
      ctx.strokeStyle = '#3d7ab855'
      ctx.lineWidth = 2.5 * scale
      ctx.stroke()
    }

    if (n.hub)                              _drawHub(n, p, sel, hov)
    else if (n.causeIds?.length)            _drawConsequence(n, p, sel, hov)
    else if (n.floating || !n.conds.length) _drawFloating(n, p, sel, hov)
    else                                    _drawSymptom(n, p, sel, hov)

    ctx.globalAlpha = 1
  })
}

function _edgePt(cx, cy, r, tx, ty) {
  const dx = tx - cx, dy = ty - cy
  const d  = Math.sqrt(dx * dx + dy * dy) || 1
  return { x: cx + dx / d * r, y: cy + dy / d * r }
}

function _drawHub(n, p, sel, hov) {
  const col = DIAG_MAP[n.conds[0]]?.color || '#888'
  const r   = HUB_R * scale
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  ctx.fillStyle   = col + '1a'; ctx.fill()
  ctx.strokeStyle = sel ? col : col + (hov ? 'dd' : '99')
  ctx.lineWidth   = (sel ? 2.8 : 2) * scale; ctx.stroke()
  ctx.save()
  ctx.beginPath(); ctx.arc(p.x, p.y, r - 4 * scale, 0, Math.PI * 2); ctx.clip()
  const lines    = (n.label || n.name).split('\n')
  const fontSize = Math.max(8, Math.min(12, r * 0.26))
  const lineH    = fontSize * scale * 1.3
  const maxW     = (r - 8 * scale) * 2
  ctx.fillStyle    = col
  ctx.textAlign    = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `600 ${fontSize * scale}px 'Outfit', sans-serif`
  lines.forEach((l, i) =>
    ctx.fillText(l, p.x, p.y + (i - (lines.length - 1) / 2) * lineH, maxW)
  )
  ctx.restore()
}

function _drawSymptom(n, p, sel, hov) {
  const r = SYM_R * scale
  if (n.conds.length > 1) {
    n.conds.forEach((c, i) => {
      const a0 = (i / n.conds.length) * Math.PI * 2 - Math.PI / 2
      const a1 = ((i + 1) / n.conds.length) * Math.PI * 2 - Math.PI / 2
      ctx.beginPath(); ctx.arc(p.x, p.y, r, a0, a1)
      ctx.strokeStyle = DIAG_MAP[c]?.color || '#888'
      ctx.lineWidth = 2.5 * scale; ctx.stroke()
    })
  } else {
    const col = DIAG_MAP[n.conds[0]]?.color || '#888'
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = sel || hov ? col : col + 'bb'; ctx.fill()
  }
  _drawLabel(n.name, p, r, sel ? '#1c1a16' : '#3a3530')
}

function _drawConsequence(n, p, sel, hov) {
  const r = (SYM_R + 2) * scale
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y)
  ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r, p.y)
  ctx.closePath()
  ctx.fillStyle   = sel || hov ? '#e8e4dc' : '#f0ede6'; ctx.fill()
  ctx.strokeStyle = sel ? '#1c1a16cc' : '#1c1a1655'
  ctx.lineWidth   = (sel ? 1.8 : 1.2) * scale; ctx.stroke()
  ctx.restore()
  _drawLabel(n.name, p, r, sel ? '#1c1a16' : '#6a6258')
}

function _drawFloating(n, p, sel, hov) {
  const r = SYM_R * scale
  ctx.save()
  ctx.setLineDash([3 * scale, 3 * scale])
  ctx.beginPath(); ctx.arc(p.x, p.y, r + 1, 0, Math.PI * 2)
  ctx.strokeStyle = sel ? '#887766cc' : '#88776688'
  ctx.lineWidth = 1.8 * scale; ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath(); ctx.arc(p.x, p.y, r - 1, 0, Math.PI * 2)
  ctx.fillStyle = sel ? '#88776630' : '#88776615'; ctx.fill()
  ctx.restore()
  _drawLabel(n.name, p, r, sel ? '#5a5040' : '#887766')
}

function _drawLabel(name, p, r, color) {
  const words = name.split(' ')
  const lines = []
  let cur = ''
  words.forEach(w => {
    if ((cur + ' ' + w).trim().length > 16) {
      lines.push(cur.trim()); cur = w
    } else {
      cur = (cur + ' ' + w).trim()
    }
  })
  if (cur) lines.push(cur.trim())
  ctx.fillStyle    = color
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `500 ${Math.max(7, 9 * scale)}px 'Outfit', sans-serif`
  const lh = 11 * scale
  lines.forEach((l, i) =>
    ctx.fillText(l, p.x, p.y + r + 5 * scale + i * lh)
  )
}