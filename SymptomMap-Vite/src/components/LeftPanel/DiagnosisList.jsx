// src/components/LeftPanel/DiagnosisList.jsx - CON MODAL DE PERFIL
import { useTranslation } from '../../hooks/useTranslation';

export default function DiagnosisList({ 
  diagnoses, 
  selectedDiags, 
  diagProfiles,
  onToggle, 
  onAddCustom,
  onOpenProfile
}) {
  const { t } = useTranslation();

  return (
    <div className="panel-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <label className="panel-label">
          {t('myDiagnoses')}
        </label>
        <button
          onClick={onAddCustom}
          style={{
            fontSize: '0.7rem',
            color: 'var(--brand-from)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'opacity 0.15s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.7'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          {t('addCustom')}
        </button>
      </div>

      <div className="diag-list">
        {diagnoses.map((diag) => {
          const isActive = selectedDiags.includes(diag.id);
          const hasProfile = diagProfiles?.[diag.id] && 
            Object.values(diagProfiles[diag.id]).some(v => v?.length > 0);
          
          return (
            <div
              key={diag.id}
              className={`diag-item ${isActive ? 'active' : ''}`}
              style={{ justifyContent: 'space-between' }}
            >
              {/* Main area - toggle diagnosis */}
              <div
                onClick={() => onToggle(diag.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  flex: 1,
                  cursor: 'pointer'
                }}
              >
                {/* Color swatch */}
                <div
                  className="diag-swatch"
                  style={{ backgroundColor: diag.color }}
                />

                {/* Label */}
                <span className="diag-name">
                  {diag.label}
                </span>
              </div>

              {/* Profile button (only if active) */}
              {isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProfile(diag.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    color: hasProfile ? diag.color : 'var(--light)',
                    fontFamily: "'DM Mono', monospace",
                    transition: 'opacity 0.15s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                  title={hasProfile ? 'Edit profile' : 'Add profile'}
                >
                  {hasProfile ? '✎' : '…'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
