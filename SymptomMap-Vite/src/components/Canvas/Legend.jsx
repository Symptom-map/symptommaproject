// src/components/Canvas/Legend.jsx - DISEÑO ORIGINAL RESTAURADO
import { useState } from 'react';

const Legend = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    // Botón pequeño para volver a abrir
    return (
      <div 
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '8px',
          padding: '10px',
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={() => setIsOpen(true)}
      >
        <span style={{ fontSize: '16px' }}>📖</span>
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '8px',
        padding: '10px 20px 10px 12px',
        fontFamily: "'DM Mono', monospace",
        fontSize: '0.6rem',
        color: '#64748b',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        backdropFilter: 'blur(8px)'
      }}
    >
      {/* Header con botón de cerrar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
          Leyenda
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '16px',
            padding: 0,
            lineHeight: 1
          }}
          title="Cerrar leyenda"
        >
          ✕
        </button>
      </div>

      {/* Items de la leyenda */}
      {[
        { label: 'Diagnóstico (hub)', el: <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #64748b', flexShrink: 0 }} /> },
        { label: 'Síntoma individual', el: <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748b', flexShrink: 0 }} /> },
        { label: 'Síntoma compartido', el: <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #64748b', flexShrink: 0 }} /> },
        { label: 'Conexión fuerte', el: <div style={{ width: 22, height: 3, background: '#64748b', borderRadius: 1, flexShrink: 0, opacity: 0.9 }} /> },
        { label: 'Conexión tenue', el: <div style={{ width: 22, height: 1, background: '#64748b', borderRadius: 1, flexShrink: 0, opacity: 0.4 }} /> },
      ].map(({ label, el }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {el}
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
};

export default Legend;