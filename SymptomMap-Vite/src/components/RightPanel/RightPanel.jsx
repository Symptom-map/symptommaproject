// src/components/RightPanel/RightPanel.jsx - DISEÑO ORIGINAL RESTAURADO
import { useTranslation } from '../../hooks/useTranslation';
import SymptomCard from './SymptomCard';

export default function RightPanel({ 
  suggestions, 
  diagMap, 
  onAccept, 
  onReject, 
  onAcceptAll, 
  onClose 
}) {
  const { t } = useTranslation();

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="right-panel">
      {/* Header */}
      <div className="review-header">
        <h3>
          <span className="ai-badge">IA</span>
          {t('suggestedSymptoms')}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--light)',
            fontSize: '1.1rem',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
            transition: 'color 0.15s'
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--ink)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--light)'}
        >
          ✕
        </button>
      </div>

      {/* Suggestions List */}
      <div className="review-list">
        {suggestions.map((symptom, idx) => (
          <SymptomCard
            key={symptom._idx ?? idx}
            symptom={symptom}
            diagMap={diagMap}
            onAccept={() => onAccept(idx)}
            onReject={() => onReject(idx)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="review-footer">
        <button
          onClick={onAcceptAll}
          className="btn-primary"
        >
          {t('acceptAll')}
        </button>
        <button
          onClick={onClose}
          className="btn-secondary"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}
