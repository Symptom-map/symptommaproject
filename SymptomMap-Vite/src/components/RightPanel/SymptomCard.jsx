// src/components/RightPanel/SymptomCard.jsx - DISEÑO ORIGINAL RESTAURADO
import { useTranslation } from '../../hooks/useTranslation';

export default function SymptomCard({ 
  symptom, 
  diagMap, 
  onAccept, 
  onReject 
}) {
  const { t } = useTranslation();

  return (
    <div className="symptom-card">
      {/* Name */}
      <h4>{symptom.name}</h4>

      {/* Reason */}
      <p className="symptom-reason">
        {symptom.reason}
      </p>

      {/* Diagnosis tags */}
      <div className="symptom-tags">
        {symptom.conds?.map((condId) => {
          const diag = diagMap[condId];
          if (!diag) return null;

          return (
            <span
              key={condId}
              className="symptom-tag"
              style={{
                backgroundColor: `${diag.color}20`,
                color: diag.color,
                border: `1px solid ${diag.color}40`
              }}
            >
              {diag.label}
            </span>
          );
        })}
      </div>

      {/* Actions */}
      <div className="symptom-actions">
        <button
          onClick={onAccept}
          className="btn-accept"
        >
          {t('accept')}
        </button>
        <button
          onClick={onReject}
          className="btn-reject"
        >
          ✗
        </button>
      </div>
    </div>
  );
}
