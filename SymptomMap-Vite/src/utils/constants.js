// src/utils/constants.js

export const DIAGNOSES = [
  { id: 'tda', label: 'TDA/TDAH', color: '#3b82f6' },
  { id: 'tlp', label: 'TLP/Borderline', color: '#a855f7' },
  { id: 'an', label: 'Anorexia Nerviosa', color: '#fb7185' },
  { id: 'aut', label: 'Rasgos Autistas', color: '#10b981' },
  { id: 'cptsd', label: 'C-PTSD', color: '#f59e0b' },
  { id: 'bi', label: 'Trastorno Bipolar', color: '#6366f1' },
  { id: 'anx', label: 'Ansiedad Generalizada', color: '#84cc16' },
];

export const DIAG_MAP = DIAGNOSES.reduce((acc, d) => {
  acc[d.id] = d;
  return acc;
}, {});

export const CUSTOM_COLORS = [
  '#e05c3a', '#3d7ab8', '#1aabb0', '#7c6ab0', '#d4953a',
  '#6aaa4a', '#c0622a', '#b84a8a', '#2a8060', '#7a3a20'
];

export const CANVAS_CONFIG = {
  NODE_RADIUS: 65,
  HUB_RADIUS: 90,
  FONT_SIZE: 13,
  HUB_FONT_SIZE: 15,
  LINE_WIDTH: 1.5,
  HUB_LINE_WIDTH: 3,
  DASH_PATTERN: [6, 4],
};

export const GRAPH_PHYSICS = {
  REPULSION: 8000,
  ATTRACTION: 0.002,
  DAMPING: 0.85,
  MIN_DISTANCE: 150,
  CENTER_PULL: 0.001,
};
