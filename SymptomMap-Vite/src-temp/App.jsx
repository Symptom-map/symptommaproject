import { useState, useCallback } from 'react'
import SymptomGraph, { DIAGNOSES, DIAG_MAP } from './components/SymptomGraph'

export default function App() {
  const [highlightedDiags, setHighlightedDiags] = useState(new Set())
  const [selectedNode,     setSelectedNode]     = useState(null)

  const toggleHighlight = (diagId) => {
    setHighlightedDiags(prev => {
      const next = new Set(prev)
      next.has(diagId) ? next.delete(diagId) : next.add(diagId)
      return next
    })
  }

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden"
      style={{
        background: '#f0f4f8',
        backgroundImage: `
          radial-gradient(ellipse at 15% 15%, rgba(56,182,255,0.08) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 85%, rgba(157,80,187,0.07) 0%, transparent 55%)
        `,
        fontFamily: "'Outfit', sans-serif",
        color: '#1e293b',
        userSelect: 'none',
      }}
    >
      {/* SIDEBAR */}
      <aside className="w-80 h-full flex-shrink-0 flex flex-col overflow-hidden"
        style={{
          borderRight: '1px solid rgba(148,163,184,0.25)',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
          <div style={{
            fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #38b6ff 0%, #9d50bb 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            SymptomMap
          </div>
          <p className="text-xs mt-1" style={{ color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
            mapa de síntomas interactivo
          </p>
        </div>

        <div className="p-4 border-b" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: '0.6rem',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: '#94a3b8', marginBottom: 10,
          }}>
            Diagnósticos
          </div>
          <div className="flex flex-col gap-1">
            {DIAGNOSES.map(d => {
              const isHighlit = highlightedDiags.has(d.id)
              return (
                <button key={d.id} onClick={() => toggleHighlight(d.id)}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all"
                  style={{
                    border: `1px solid ${isHighlit ? d.color + '66' : 'transparent'}`,
                    background: isHighlit ? d.color + '12' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                    background: d.color, opacity: isHighlit ? 1 : 0.45,
                  }} />
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: isHighlit ? 600 : 400,
                    color: isHighlit ? '#1e293b' : '#64748b',
                  }}>
                    {d.label.replace('\n', ' ')}
                  </span>
                </button>
              )
            })}
          </div>
          {highlightedDiags.size > 0 && (
            <button onClick={() => setHighlightedDiags(new Set())}
              className="mt-3 w-full py-1.5 rounded-lg text-xs"
              style={{ border: '1.5px solid #cbd5e1', color: '#64748b', background: 'transparent', cursor: 'pointer' }}
            >
              Limpiar filtro
            </button>
          )}
        </div>

        {selectedNode && !selectedNode.hub && (
          <div className="p-4 border-b" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: '0.6rem',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: '#94a3b8', marginBottom: 8,
            }}>
              Síntoma seleccionado
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8 }}>
              {selectedNode.name}
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedNode.conds?.map(c => {
                const d = DIAG_MAP[c]
                return d ? (
                  <span key={c} style={{
                    padding: '2px 10px', borderRadius: 20,
                    fontSize: '0.62rem', fontWeight: 500,
                    border: `1.5px solid ${d.color}`, color: d.color,
                  }}>
                    {d.label.replace('\n', ' ')}
                  </span>
                ) : null
              })}
            </div>
            {selectedNode.conds?.length > 1 && (
              <div style={{
                padding: '8px 12px', background: 'rgba(56,182,255,0.07)',
                border: '1px solid rgba(56,182,255,0.2)', borderRadius: 8,
                fontSize: '0.75rem', color: '#64748b', lineHeight: 1.6,
              }}>
                ✦ Aparece en <strong>{selectedNode.conds.length} diagnósticos</strong> — intersección.
              </div>
            )}
            <button onClick={() => setSelectedNode(null)}
              className="mt-3 w-full py-1.5 rounded-lg text-xs"
              style={{ border: '1.5px solid #cbd5e1', color: '#64748b', background: 'transparent', cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="p-4 mt-auto">
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.62rem', color: '#94a3b8', lineHeight: 1.7 }}>
            Arrastra nodos · Scroll para zoom · Clic en diagnóstico para filtrar
          </p>
        </div>
      </aside>

      {/* GRAFO */}
      <SymptomGraph
        highlightedDiags={highlightedDiags}
        selectedId={selectedNode?.id ?? null}
        onNodeSelect={handleNodeSelect}
      />
    </div>
  )
}