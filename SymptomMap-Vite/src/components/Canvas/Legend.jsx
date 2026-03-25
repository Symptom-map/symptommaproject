// src/components/Canvas/Legend.jsx - DISEÑO ORIGINAL RESTAURADO
import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export default function Legend() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="legend-toggle-btn"
      >
        {t('legendToggle')}
      </button>
    );
  }

  return (
    <div className="legend">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 className="legend-title">
          {t('legTitle')}
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--light)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            padding: '2px',
            lineHeight: 1,
            transition: 'color 0.15s'
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--ink)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--light)'}
        >
          ✕
        </button>
      </div>

      {/* Legend items */}
      <div style={{ fontSize: '0.75rem' }}>
        {/* Hub */}
        <div className="legend-item">
          <div style={{
            width: '48px',
            height: '24px',
            border: '2px solid var(--border-solid)',
            borderRadius: '50%',
            flexShrink: 0
          }} />
          <span>{t('legHub')}</span>
        </div>

        {/* Individual symptom */}
        <div className="legend-item">
          <div style={{
            width: '24px',
            height: '24px',
            background: 'var(--border-solid)',
            borderRadius: '50%',
            flexShrink: 0
          }} />
          <span>{t('legSym')}</span>
        </div>

        {/* Shared symptom */}
        <div className="legend-item">
          <div style={{
            width: '24px',
            height: '24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
            borderRadius: '50%',
            flexShrink: 0
          }} />
          <span>{t('legMulti')}</span>
        </div>

        {/* Divider */}
        <div style={{
          borderTop: '1px solid var(--border)',
          margin: '10px 0'
        }} />

        {/* Strong connection */}
        <div className="legend-item">
          <div style={{
            width: '48px',
            height: '2px',
            background: 'var(--ink)',
            flexShrink: 0
          }} />
          <span>{t('legThick')}</span>
        </div>

        {/* Weak connection */}
        <div className="legend-item">
          <div style={{
            width: '48px',
            height: '1px',
            background: 'var(--light)',
            flexShrink: 0,
            backgroundImage: 'linear-gradient(to right, var(--light) 50%, transparent 50%)',
            backgroundSize: '8px 1px',
            backgroundRepeat: 'repeat-x'
          }} />
          <span>{t('legDash')}</span>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '14px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border)'
      }}>
        <p style={{
          fontSize: '0.65rem',
          color: 'var(--muted)',
          lineHeight: 1.6
        }}>
          {t('instructions')}
        </p>
      </div>
    </div>
  );
}
