// ─────────────────────────────────────────────────────────────
// data.js — fuente central de diagnósticos
// Para agregar un diagnóstico nuevo: añade un objeto aquí.
// El resto de la app lo detecta automáticamente.
// ─────────────────────────────────────────────────────────────

export const DIAGNOSES = [
  { id: 'tda',    label: 'TDA / TDAH',            color: '#3b82f6' },
  { id: 'tlp',    label: 'TLP / Borderline',       color: '#a855f7' },
  { id: 'an',     label: 'Anorexia Nerviosa',      color: '#fb7185' },
  { id: 'aut',    label: 'Rasgos Autistas',         color: '#10b981' },
  { id: 'cptsd',  label: 'C-PTSD',                 color: '#f59e0b' },
  { id: 'bi',     label: 'Trastorno Bipolar',       color: '#6366f1' },
  { id: 'anx',    label: 'Ansiedad Generalizada',   color: '#84cc16' },
]

// Lookup rápido: DIAG_MAP['tda'] → { id, label, color }
export const DIAG_MAP = Object.fromEntries(
  DIAGNOSES.map(d => [d.id, d])
)

// Diagnósticos pre-seleccionados por defecto
export const DEFAULT_SELECTED = ['tda', 'tlp', 'an', 'aut']