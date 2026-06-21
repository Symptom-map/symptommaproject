// ─────────────────────────────────────────────────────────────
// data.js — fuente central de diagnósticos
// Para agregar un diagnóstico nuevo: añade un objeto aquí.
// El resto de la app lo detecta automáticamente.
// ─────────────────────────────────────────────────────────────

export const DIAGNOSES = [
  // Neurodivergencia
  { id: 'tda',      label: 'TDA / TDAH',                         labelEn: 'ADHD / ADD',                        color: '#3b82f6' },
  { id: 'aut',      label: 'Rasgos Autistas / TEA',              labelEn: 'Autistic Traits / ASD',             color: '#10b981' },
  { id: 'dislexia', label: 'Dislexia',                           labelEn: 'Dyslexia',                          color: '#06b6d4' },
  { id: 'discalc',  label: 'Discalculia',                        labelEn: 'Dyscalculia',                       color: '#0891b2' },
  { id: 'disprax',  label: 'Dispraxia / TDC',                    labelEn: 'Dyspraxia / DCD',                   color: '#0e7490' },
  // Estado del ánimo
  { id: 'depresion',label: 'Depresión Mayor',                    labelEn: 'Major Depression',                  color: '#6366f1' },
  { id: 'bi1',      label: 'Trastorno Bipolar I',                labelEn: 'Bipolar Disorder I',                color: '#7c3aed' },
  { id: 'bi2',      label: 'Trastorno Bipolar II',               labelEn: 'Bipolar Disorder II',               color: '#8b5cf6' },
  { id: 'distimia', label: 'Distimia / Dep. persistente',        labelEn: 'Dysthymia / Persistent Depression', color: '#a78bfa' },
  { id: 'ciclotimia',label: 'Ciclotimia',                        labelEn: 'Cyclothymia',                       color: '#c4b5fd' },
  // Ansiedad
  { id: 'anx',      label: 'Ansiedad Generalizada',              labelEn: 'Generalized Anxiety Disorder',      color: '#84cc16' },
  { id: 'panico',   label: 'Trastorno de Pánico',                labelEn: 'Panic Disorder',                    color: '#65a30d' },
  { id: 'fobia',    label: 'Fobia Social / Ansiedad Social',     labelEn: 'Social Anxiety Disorder',           color: '#4d7c0f' },
  { id: 'agoraf',   label: 'Agorafobia',                         labelEn: 'Agoraphobia',                       color: '#3f6212' },
  { id: 'toc',      label: 'TOC / Obsesivo-Compulsivo',          labelEn: 'OCD / Obsessive-Compulsive',        color: '#f59e0b' },
  // Trauma
  { id: 'tept',     label: 'TEPT / PTSD',                        labelEn: 'PTSD',                              color: '#dc2626' },
  { id: 'cptsd',    label: 'C-PTSD / TEPT Complejo',             labelEn: 'C-PTSD / Complex PTSD',            color: '#b91c1c' },
  { id: 'disoc',    label: 'Trastorno Disociativo',              labelEn: 'Dissociative Disorder',             color: '#991b1b' },
  // Personalidad
  { id: 'tlp',      label: 'TLP / Borderline',                   labelEn: 'BPD / Borderline',                  color: '#a855f7' },
  { id: 'evit',     label: 'T. Personalidad Evitativa',          labelEn: 'Avoidant Personality Disorder',     color: '#9333ea' },
  { id: 'dep_per',  label: 'T. Personalidad Dependiente',        labelEn: 'Dependent Personality Disorder',    color: '#7e22ce' },
  // Alimentación
  { id: 'an',       label: 'Anorexia Nerviosa',                  labelEn: 'Anorexia Nervosa',                  color: '#fb7185' },
  { id: 'bulimia',  label: 'Bulimia Nerviosa',                   labelEn: 'Bulimia Nervosa',                   color: '#f43f5e' },
  { id: 'atrac',    label: 'Trastorno por Atracón',              labelEn: 'Binge Eating Disorder',             color: '#e11d48' },
  { id: 'arfid',    label: 'ARFID',                              labelEn: 'ARFID',                             color: '#be123c' },
  // Cuerpo / crónico
  { id: 'insomnio', label: 'Insomnio Crónico',                   labelEn: 'Chronic Insomnia',                  color: '#64748b' },
  { id: 'fatiga',   label: 'Sínd. de Fatiga Crónica',            labelEn: 'Chronic Fatigue Syndrome',          color: '#475569' },
  { id: 'fibro',    label: 'Fibromialgia',                       labelEn: 'Fibromyalgia',                      color: '#334155' },
  { id: 'tdpm',     label: 'TDPM / Sínd. Disfórico Premenstrual',labelEn: 'PMDD',                             color: '#ec4899' },
]

// Lookup rápido: DIAG_MAP['tda'] → { id, label, labelEn, color }
export const DIAG_MAP = Object.fromEntries(
  DIAGNOSES.map(d => [d.id, d])
)

// Mantener DEFAULT_SELECTED vacío — el usuario elige desde el panel
export const DEFAULT_SELECTED = []
