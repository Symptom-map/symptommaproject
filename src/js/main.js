// ─────────────────────────────────────────────────────────────
// main.js — orquestador principal
// Conecta todos los módulos y maneja eventos del canvas.
// ─────────────────────────────────────────────────────────────

import { state, saveState }    from './state.js'
import { DIAG_MAP, DIAGNOSES } from './data.js'
import {
  initCanvas, resize, draw, initLayout,
  nodeAt, pan, zoom,
  setSelected, setHovered, setHighlightedDiags,
  getScale,
} from './graph.js'
import { suggestSymptoms, analyzeSymptomOrigin, analyzeSymptomDetail } from './ai.js'

// ── Canvas ────────────────────────────────────────────────────
const canvas = document.getElementById('graph')
initCanvas(canvas)
window.addEventListener('resize', () => { resize(); redraw() })

// ── Estado de interacción ─────────────────────────────────────
let dragging     = false
let dragNodeId   = null
let dragMoved    = false
let isPanning    = false
let lastMx = 0, lastMy = 0
let highlightedDiags = new Set()
let multiSelectedIds = new Set()
export let selectedId = null

// ── Redraw ────────────────────────────────────────────────────
export function redraw() {
  initLayout(state.nodes)
  draw(state.nodes, multiSelectedIds)
}

// ── Selección de nodo ─────────────────────────────────────────
export function selectNodeById(id) {
  selectedId = id
  setSelected(id)
  multiSelectedIds.clear()
  redraw()
  renderRightPanel()
}

export function clearSelection() {
  selectedId = null
  setSelected(null)
  redraw()
  renderRightPanel()
}

// ── Diagnósticos ──────────────────────────────────────────────
export function toggleDiag(id) {
  if (state.selectedDiags.includes(id)) {
    state.selectedDiags = state.selectedDiags.filter(d => d !== id)
    state.nodes = state.nodes.filter(n => !n.hub || n.conds[0] !== id)
  } else {
    state.selectedDiags.push(id)
    if (!state.nodes.find(n => n.id === 'hub-' + id)) {
      const d = DIAG_MAP[id]
      state.nodes.push({
        id: 'hub-' + id, name: d.label, label: d.label,
        conds: [id], hub: true, x: 0, y: 0, _placed: false,
      })
    }
  }
  saveState(state)
  refreshAll()
}

export function toggleHighlight(id) {
  if (highlightedDiags.has(id)) highlightedDiags.delete(id)
  else highlightedDiags.add(id)
  setHighlightedDiags(highlightedDiags)
  redraw()
  renderLeftPanel()
}

// ── Nodos ─────────────────────────────────────────────────────
export function addNodeManual(name, context, conds) {
  if (!name) return showToast('Escribe el nombre del síntoma')
  const hub = conds.length
    ? state.nodes.find(n => n.hub && n.conds[0] === conds[0])
    : null
  state.nodes.push({
    id: 'n' + (state.idCounter++), name, conds, context,
    floating: !conds.length,
    x: (hub?.x ?? 0) + (Math.random() - .5) * 160,
    y: (hub?.y ?? 0) + (conds.length ? 90 + Math.random() * 100 : (Math.random() - .5) * 200),
    _placed: true, fromAI: false, causeIds: [],
  })
  saveState(state)
  refreshAll()
  showToast(conds.length ? 'Síntoma agregado' : 'Nodo flotante agregado')
}

export function deleteNode(id) {
  state.nodes = state.nodes.filter(n => n.id !== id)
  state.nodes.forEach(n => {
    if (n.causeIds) n.causeIds = n.causeIds.filter(c => c !== id)
  })
  if (selectedId === id) clearSelection()
  saveState(state)
  refreshAll()
}

export function saveNodeNote(id, context, notes) {
  const node = state.nodes.find(n => n.id === id)
  if (!node) return
  node.context = context
  node.notes   = notes
  saveState(state)
  showToast('Guardado')
}

export function acceptSuggestion(s) {
  const conds = (s.conds || []).filter(c => state.selectedDiags.includes(c))
  if (!conds.length) return
  const hub = state.nodes.find(n => n.hub && n.conds[0] === conds[0])
  state.nodes.push({
    id: 'n' + (state.idCounter++), name: s.name,
    conds, fromAI: true, reason: s.reason,
    x: (hub?.x ?? 0) + (Math.random() - .5) * 160,
    y: (hub?.y ?? 0) + 90 + Math.random() * 120,
    _placed: true, causeIds: [],
  })
  saveState(state)
  refreshAll()
}

// ── IA ────────────────────────────────────────────────────────
export async function generateWithAI() {
  if (!state.selectedDiags.length) return showToast('Selecciona al menos un diagnóstico')
  showLoading('Consultando IA...')
  try {
    const diagLabels    = state.selectedDiags.map(d => DIAG_MAP[d].label)
    const existingNames = state.nodes.filter(n => !n.hub).map(n => n.name)
    const suggestions   = await suggestSymptoms({
      diagLabels, diagProfiles: state.diagProfiles,
      existingNames, lang: state.lang,
    })
    hideLoading()
    suggestions.length
      ? showReviewPanel(suggestions)
      : showToast('Sin sugerencias nuevas')
  } catch (err) {
    hideLoading()
    showToast('Error: ' + err.message)
  }
}

export async function analyzeNode(id) {
  const node = state.nodes.find(n => n.id === id)
  if (!node) return
  showLoading('Analizando síntoma...')
  try {
    const diagLabels = state.selectedDiags.map(d => DIAG_MAP[d].label)
    const analysis   = await analyzeSymptomDetail({ node, diagLabels, lang: state.lang })
    hideLoading()
    node.aiAnalysis = analysis
    saveState(state)
    renderRightPanel()
  } catch (err) {
    hideLoading()
    showToast('Error: ' + err.message)
  }
}

// ── Refresh global ────────────────────────────────────────────
export function refreshAll() {
  renderLeftPanel()
  renderRightPanel()
  redraw()
}

// ── Toast y loading ───────────────────────────────────────────
let toastTimer
export function showToast(msg) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800)
}

export function showLoading(msg = 'Cargando...') {
  document.getElementById('loading-msg').textContent = msg
  document.getElementById('loading').classList.add('show')
}

export function hideLoading() {
  document.getElementById('loading').classList.remove('show')
}

// ── Render paneles (stubs — se expanden después) ──────────────
function renderLeftPanel()  { window.__renderLeft  && window.__renderLeft() }
function renderRightPanel() { window.__renderRight && window.__renderRight() }
function showReviewPanel(s) { window.__showReview  && window.__showReview(s) }

// ── Eventos del canvas ────────────────────────────────────────
canvas.addEventListener('mousedown', e => {
  const n = nodeAt(state.nodes, e.offsetX, e.offsetY)
  dragMoved = false
  if (n) {
    dragNodeId = n.id; dragging = true
    lastMx = e.offsetX; lastMy = e.offsetY
    selectNodeById(n.id)
  } else {
    dragNodeId = null; dragging = true; isPanning = true
    lastMx = e.offsetX; lastMy = e.offsetY
    clearSelection()
  }
})

canvas.addEventListener('mousemove', e => {
  const dx = e.offsetX - lastMx
  const dy = e.offsetY - lastMy
  lastMx = e.offsetX; lastMy = e.offsetY
  if (!dragging) {
    const n = nodeAt(state.nodes, e.offsetX, e.offsetY)
    setHovered(n?.id ?? null)
    canvas.style.cursor = n ? 'pointer' : 'default'
    redraw(); return
  }
  dragMoved = true
  if (dragNodeId) {
    const node = state.nodes.find(n => n.id === dragNodeId)
    if (node) { node.x += dx / getScale(); node.y += dy / getScale() }
    redraw()
  } else if (isPanning) {
    pan(dx, dy); redraw()
  }
})

canvas.addEventListener('mouseup', () => {
  if (dragNodeId && dragMoved) saveState(state)
  dragging = false; dragNodeId = null; isPanning = false
})

canvas.addEventListener('dblclick', e => {
  const n = nodeAt(state.nodes, e.offsetX, e.offsetY)
  if (n) selectNodeById(n.id)
})

canvas.addEventListener('wheel', e => {
  e.preventDefault()
  zoom(e.deltaY < 0 ? 1.1 : 0.9, e.offsetX, e.offsetY)
  redraw()
}, { passive: false })

// ── Init ──────────────────────────────────────────────────────
state.nodes.forEach(n => { if (!n._placed) n._placed = false })
refreshAll()