// src/App.jsx - CON MODAL DE PERFIL INTEGRADO
import { useState, useEffect } from 'react';
import { LanguageProvider } from './hooks/useTranslation';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useClaudeAPI } from './hooks/useClaudeAPI';
import { DIAGNOSES, DIAG_MAP, CUSTOM_COLORS } from './utils/constants';

import Onboarding from './components/Onboarding/Onboarding';
import Topbar from './components/Layout/Topbar';
import LeftPanel from './components/LeftPanel/LeftPanel';
import RightPanel from './components/RightPanel/RightPanel';
import SymptomGraph from './components/Canvas/SymptomGraph';
import Legend from './components/Canvas/Legend';
import CustomDiagnosisModal from './components/Modals/CustomDiagnosisModal';
import DiagnosisProfileModal from './components/Modals/DiagnosisProfileModal';
import Toast from './components/Modals/Toast';
import LoadingOverlay from './components/Modals/LoadingOverlay';

// Make DIAG_MAP globally accessible for hooks
window.DIAG_MAP = DIAG_MAP;

function App() {
  const { state, updateState, addNode, removeNode, toggleDiagnosis, addCustomDiagnosis, saveDiagProfile } = useLocalStorage();
  const { generateSuggestions, generateCustomSymptoms, loading: apiLoading } = useClaudeAPI();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentProfileDiagId, setCurrentProfileDiagId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [allDiagnoses, setAllDiagnoses] = useState([...DIAGNOSES]);

  // Check if first time user
  useEffect(() => {
    const isFirstTime = state.nodes.length === 0 && state.selectedDiags.length === 0 && !state.username;
    setShowOnboarding(isFirstTime);
  }, []);

  // Sync custom diagnoses with DIAG_MAP
  useEffect(() => {
    allDiagnoses.forEach(diag => {
      if (!window.DIAG_MAP[diag.id]) {
        window.DIAG_MAP[diag.id] = diag;
      }
    });
  }, [allDiagnoses]);

  const handleOnboardingComplete = (data) => {
    updateState({
      lang: data.lang,
      username: data.username
    });
    setShowOnboarding(false);
  };

  const handleToggleDiagnosis = (diagId) => {
    const isCurrentlySelected = state.selectedDiags.includes(diagId);
    
    // If selecting (not deselecting), open profile modal
    if (!isCurrentlySelected) {
      toggleDiagnosis(diagId);
      setCurrentProfileDiagId(diagId);
      setShowProfileModal(true);
    } else {
      toggleDiagnosis(diagId);
    }
  };

  const handleOpenProfile = (diagId) => {
    setCurrentProfileDiagId(diagId);
    setShowProfileModal(true);
  };

  const handleSaveProfile = (diagId, profileData) => {
    saveDiagProfile(diagId, profileData);
    setShowProfileModal(false);
    setCurrentProfileDiagId(null);
    setToastMessage(state.lang === 'es' 
      ? 'Perfil guardado — las sugerencias serán más precisas' 
      : 'Profile saved — suggestions will be more accurate');
  };

  const handleSkipProfile = () => {
    setShowProfileModal(false);
    setCurrentProfileDiagId(null);
  };

  const handleGenerateSymptoms = async () => {
    if (state.selectedDiags.length === 0) {
      setToastMessage(state.lang === 'es' ? 'Selecciona al menos un diagnóstico primero' : 'Select at least one diagnosis first');
      return;
    }

    setLoadingMessage(state.lang === 'es' ? 'Generando sugerencias...' : 'Generating suggestions...');

    try {
      const newSuggestions = await generateSuggestions(
        state.selectedDiags,
        state.nodes,
        window.DIAG_MAP,
        state.diagProfiles
      );
      
      setSuggestions(newSuggestions);
      setLoadingMessage('');
    } catch (error) {
      setLoadingMessage('');
      setToastMessage(state.lang === 'es' ? 'Error al generar sugerencias' : 'Error generating suggestions');
    }
  };

  const handleAcceptSuggestion = (index) => {
    const symptom = suggestions[index];
    addNode({
      id: `sym-${Date.now()}-${Math.random()}`,
      name: symptom.name,
      desc: symptom.reason,
      conds: symptom.conds,
      x: 0,
      y: 0,
      _placed: false
    });

    setSuggestions(prev => prev.filter((_, i) => i !== index));
    setToastMessage(state.lang === 'es' ? 'Síntoma agregado' : 'Symptom added');
  };

  const handleRejectSuggestion = (index) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleAcceptAll = () => {
    suggestions.forEach(symptom => {
      addNode({
        id: `sym-${Date.now()}-${Math.random()}`,
        name: symptom.name,
        desc: symptom.reason,
        conds: symptom.conds,
        x: 0,
        y: 0,
        _placed: false
      });
    });

    setSuggestions([]);
    setToastMessage(state.lang === 'es' ? 'Todos los síntomas aceptados' : 'All symptoms accepted');
  };

  const handleAddCustomDiagnosis = async (customDiag) => {
    // Add to local list and global map
    setAllDiagnoses(prev => [...prev, customDiag]);
    window.DIAG_MAP[customDiag.id] = customDiag;
    
    // Add to state
    addCustomDiagnosis(customDiag);

    // Generate symptoms for it
    setLoadingMessage(state.lang === 'es' ? `Buscando síntomas de ${customDiag.label}...` : `Finding symptoms for ${customDiag.label}...`);

    try {
      const customSymptoms = await generateCustomSymptoms(
        customDiag.label,
        state.selectedDiags.filter(d => d !== customDiag.id),
        window.DIAG_MAP
      );

      const formattedSuggestions = customSymptoms.map((s, i) => ({
        name: s.name,
        reason: s.reason,
        conds: [customDiag.id],
        _idx: i
      }));

      setSuggestions(formattedSuggestions);
      setLoadingMessage('');
    } catch (error) {
      setLoadingMessage('');
      setToastMessage(state.lang === 'es' ? 'Error al generar síntomas' : 'Error generating symptoms');
    }
  };

  const handleSymptomClick = (symptom) => {
    // Could be used to center on node, show details, etc.
    console.log('Clicked symptom:', symptom);
  };

  return (
    <LanguageProvider initialLang={state.lang}>
      <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Onboarding */}
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

        {/* Main App */}
        {!showOnboarding && (
          <>
            <Topbar 
              username={state.username} 
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            <div className="flex flex-1 overflow-hidden">
              {/* Left Panel */}
              <LeftPanel
                diagnoses={allDiagnoses}
                selectedDiags={state.selectedDiags}
                symptoms={state.nodes}
                diagMap={window.DIAG_MAP}
                diagProfiles={state.diagProfiles}
                onToggleDiagnosis={handleToggleDiagnosis}
                onAddCustomDiagnosis={() => setShowCustomModal(true)}
                onOpenProfile={handleOpenProfile}
                onAddSymptom={addNode}
                onDeleteSymptom={removeNode}
                onSymptomClick={handleSymptomClick}
                onGenerateSymptoms={handleGenerateSymptoms}
                isGenerating={apiLoading}
                isCollapsed={sidebarCollapsed}
              />

              {/* Canvas */}
              <div className="flex-1 relative overflow-hidden">
                <SymptomGraph
                  nodes={state.nodes}
                  diagMap={window.DIAG_MAP}
                  onNodeClick={handleSymptomClick}
                />

                {/* Legend */}
                <Legend />
              </div>

              {/* Right Panel */}
              <RightPanel
                suggestions={suggestions}
                diagMap={window.DIAG_MAP}
                onAccept={handleAcceptSuggestion}
                onReject={handleRejectSuggestion}
                onAcceptAll={handleAcceptAll}
                onClose={() => setSuggestions([])}
              />
            </div>
          </>
        )}

        {/* Modals & Overlays */}
        <CustomDiagnosisModal
          isOpen={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          onSave={handleAddCustomDiagnosis}
        />

        <DiagnosisProfileModal
          isOpen={showProfileModal}
          diagnosisId={currentProfileDiagId}
          diagMap={window.DIAG_MAP}
          savedProfile={state.diagProfiles?.[currentProfileDiagId]}
          onSave={handleSaveProfile}
          onSkip={handleSkipProfile}
        />

        {toastMessage && (
          <Toast
            message={toastMessage}
            onClose={() => setToastMessage('')}
          />
        )}

        {loadingMessage && (
          <LoadingOverlay message={loadingMessage} />
        )}
      </div>
    </LanguageProvider>
  );
}

export default App;
