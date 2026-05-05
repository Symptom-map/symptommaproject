// ─────────────────────────────────────────────────────────────
// state.js — estado global de la aplicación
// Todo lo que se guarda entre sesiones vive aquí.
// ─────────────────────────────────────────────────────────────

import { DIAG_MAP, DEFAULT_SELECTED } from './data.js'

const STORAGE_KEY = 'sm_state_v2'

function createDefaultState() {
  const hubs = DEFAULT_SELECTED.map(id => {
    const d = DIAG_MAP[id]
    return {
      id: 'hub-' + id,
      name: d.label,
      label: d.label,
      conds: [id],
      hub: true,
      x: 0, y: 0,
      _placed: false,
    }
  })

  return {
    lang:          'es',
    username:      '',
    selectedDiags: [...DEFAULT_SELECTED],
    diagProfiles:  {},
    nodes:         hubs,
    idCounter:     1,
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* storage lleno */ }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY)
}

// Estado activo — se carga al inicio
export const state = loadState() || createDefaultState()