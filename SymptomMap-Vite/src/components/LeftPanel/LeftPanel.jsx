// src/components/LeftPanel/LeftPanel.jsx - CON BOTÓN OSCURO Y MODAL
import { useTranslation } from '../../hooks/useTranslation';
import DiagnosisList from './DiagnosisList';
import AddSymptomForm from './AddSymptomForm';
import SymptomList from './SymptomList';

export default function LeftPanel({
  diagnoses,
  selectedDiags,
  symptoms,
  diagMap,
  diagProfiles,
  onToggleDiagnosis,
  onAddCustomDiagnosis,
  onOpenProfile,
  onAddSymptom,
  onDeleteSymptom,
  onSymptomClick,
  onGenerateSymptoms,
  isGenerating,
  isCollapsed
}) {
  const { t } = useTranslation();

  return (
    <div className={`left-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: '290px' }}>
        {/* Diagnoses List */}
        <DiagnosisList
          diagnoses={diagnoses}
          selectedDiags={selectedDiags}
          diagProfiles={diagProfiles}
          onToggle={onToggleDiagnosis}
          onAddCustom={onAddCustomDiagnosis}
          onOpenProfile={onOpenProfile}
        />

        {/* Generate Button - OSCURO COMO EL ORIGINAL */}
        {selectedDiags.length > 0 && (
          <div className="panel-section">
            <button
              onClick={onGenerateSymptoms}
              disabled={isGenerating}
              className="btn-generate"
            >
              {isGenerating ? (
                <>
                  <div className="spinner" style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderWidth: '2px',
                    borderTopColor: 'white'
                  }} />
                  {t('aiGenerating')}
                </>
              ) : (
                <>
                  <span className="ai-badge">IA</span>
                  {t('generateSymptoms')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Add Symptom Form */}
        <AddSymptomForm
          selectedDiags={selectedDiags}
          diagMap={diagMap}
          onAdd={onAddSymptom}
        />

        {/* Symptom List */}
        <SymptomList
          symptoms={symptoms}
          diagMap={diagMap}
          onDelete={onDeleteSymptom}
          onSymptomClick={onSymptomClick}
        />
      </div>
    </div>
  );
}
