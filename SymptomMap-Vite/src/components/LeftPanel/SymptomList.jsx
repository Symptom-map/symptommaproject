// src/components/LeftPanel/SymptomList.jsx - DISEÑO ORIGINAL RESTAURADO
import { useTranslation } from '../../hooks/useTranslation';

export default function SymptomList({ 
  symptoms, 
  diagMap, 
  onDelete, 
  onSymptomClick 
}) {
  const { t } = useTranslation();

  // Filter out hub nodes
  const regularSymptoms = symptoms.filter(n => !n.hub);

  return (
    <div className="node-scroll">
      <div style={{ marginBottom: '12px' }}>
        <label className="panel-label">
          {t('symptoms')} <span style={{ color: 'var(--muted)' }}>{regularSymptoms.length}</span>
        </label>
      </div>

      <div>
        {regularSymptoms.length === 0 ? (
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--light)',
            textAlign: 'center',
            padding: '32px 0'
          }}>
            {t('lang') === 'es' 
              ? 'No hay síntomas aún' 
              : 'No symptoms yet'}
          </p>
        ) : (
          regularSymptoms.map(symptom => (
            <div
              key={symptom.id}
              className="node-row"
              onClick={() => onSymptomClick?.(symptom)}
            >
              {/* Color dots */}
              <div className="node-dots">
                {symptom.conds?.slice(0, 3).map((condId, idx) => {
                  const diag = diagMap[condId];
                  if (!diag) return null;

                  return (
                    <div
                      key={idx}
                      className="node-dot"
                      style={{ backgroundColor: diag.color }}
                      title={diag.label}
                    />
                  );
                })}
                {symptom.conds?.length > 3 && (
                  <span style={{
                    fontSize: '0.6rem',
                    color: 'var(--light)',
                    marginLeft: '2px'
                  }}>
                    +{symptom.conds.length - 3}
                  </span>
                )}
              </div>

              {/* Name */}
              <span className="node-name">
                {symptom.name}
              </span>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(symptom.id);
                }}
                className="node-del"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
