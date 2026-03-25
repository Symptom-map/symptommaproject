// src/utils/translations.js

export const translations = {
  es: {
    // Topbar
    mapName: 'mapa de {username}',
    
    // Onboarding
    welcomeTitle: '¡Bienvenidx!',
    selectLanguage: 'Selecciona tu idioma',
    languageHint: 'Idioma seleccionado — puedes continuar',
    next: 'Siguiente',
    back: 'Atrás',
    nameTitle: '¿Cómo te llamamos?',
    namePlaceholder: 'Tu nombre o apodo',
    disclaimer: 'Esta herramienta es para personas que ya tienen uno o más diagnósticos de salud mental confirmados por un profesional. Si ya tienes un diagnóstico, esto te ayuda a mapear y entender tus síntomas — no es una herramienta de autodiagnóstico.',
    tutorialTitle: '¿Cómo funciona?',
    tutorialStep1: '1. Selecciona tus diagnósticos',
    tutorialStep2: '2. Genera sugerencias con IA o agrega síntomas manualmente',
    tutorialStep3: '3. Explora conexiones entre síntomas',
    startApp: 'Comenzar',
    
    // Left Panel
    myDiagnoses: 'MIS DIAGNÓSTICOS',
    addCustom: '+ Agregar otro',
    generateSymptoms: 'Sugerir síntomas',
    aiGenerating: '✨ Generando...',
    addSymptom: 'AGREGAR SÍNTOMA',
    symptomName: 'Nombre del síntoma',
    symptomDesc: 'Descripción (opcional)',
    symptomPlaceholder: 'ej. Fatiga crónica',
    descPlaceholder: 'Breve descripción del síntoma',
    diagnosesLabel: 'Diagnósticos asociados',
    addButton: '+ Agregar',
    symptoms: 'SÍNTOMAS',
    
    // Right Panel
    suggestedSymptoms: 'Síntomas sugeridos',
    acceptAll: 'Aceptar todos',
    close: 'Cerrar',
    accept: '✓ Aceptar',
    reject: '✗ Rechazar',
    
    // Custom Diagnosis Modal
    addDiagnosis: 'Agregar diagnóstico',
    customDiagDesc: 'Escribe el nombre de tu diagnóstico. La IA sugerirá síntomas comunes para él.',
    diagnosisName: 'Nombre del diagnóstico',
    diagnosisPlaceholder: 'ej. Fibromialgia, TOC...',
    chooseColor: 'Elige un color',
    cancel: 'Cancelar',
    save: 'Guardar',
    
    // Legend
    legTitle: 'Leyenda',
    legHub: 'Diagnóstico (hub)',
    legSym: 'Síntoma individual',
    legMulti: 'Síntoma compartido',
    legFloat: 'Síntoma flotante',
    legThin: 'Conexión simple',
    legThick: 'Conexión fuerte',
    legDash: 'Conexión tenue',
    legendToggle: '? leyenda',
    
    // Instructions
    instructions: 'Arrastra nodos — Scroll para zoom — Clic en diagnóstico para filtrar',
    
    // Toasts & Messages
    noActiveDiag: 'Selecciona al menos un diagnóstico primero',
    symptomAdded: 'Síntoma agregado',
    symptomDeleted: 'Síntoma eliminado',
    allAccepted: 'Todos los síntomas aceptados',
    errorOccurred: 'Ocurrió un error',
    loadingSymptoms: 'Buscando síntomas...',
    generating: 'Generando sugerencias...',
  },
  
  en: {
    // Topbar
    mapName: "{username}'s map",
    
    // Onboarding
    welcomeTitle: 'Welcome!',
    selectLanguage: 'Select your language',
    languageHint: 'Language selected — you can continue',
    next: 'Next',
    back: 'Back',
    nameTitle: 'What should we call you?',
    namePlaceholder: 'Your name or nickname',
    disclaimer: 'This tool is for people who already have one or more mental health diagnoses confirmed by a professional. If you already have a diagnosis, this helps you map and understand your symptoms — it is not a tool for self-diagnosis.',
    tutorialTitle: 'How does it work?',
    tutorialStep1: '1. Select your diagnoses',
    tutorialStep2: '2. Generate AI suggestions or add symptoms manually',
    tutorialStep3: '3. Explore connections between symptoms',
    startApp: 'Start',
    
    // Left Panel
    myDiagnoses: 'MY DIAGNOSES',
    addCustom: '+ Add another',
    generateSymptoms: 'Suggest symptoms',
    aiGenerating: '✨ Generating...',
    addSymptom: 'ADD SYMPTOM',
    symptomName: 'Symptom name',
    symptomDesc: 'Description (optional)',
    symptomPlaceholder: 'e.g. Chronic fatigue',
    descPlaceholder: 'Brief description of the symptom',
    diagnosesLabel: 'Associated diagnoses',
    addButton: '+ Add',
    symptoms: 'SYMPTOMS',
    
    // Right Panel
    suggestedSymptoms: 'Suggested symptoms',
    acceptAll: 'Accept all',
    close: 'Close',
    accept: '✓ Accept',
    reject: '✗ Reject',
    
    // Custom Diagnosis Modal
    addDiagnosis: 'Add a diagnosis',
    customDiagDesc: 'Enter the name of your diagnosis. The AI will suggest common symptoms for it.',
    diagnosisName: 'Diagnosis name',
    diagnosisPlaceholder: 'e.g. Fibromyalgia, OCD...',
    chooseColor: 'Choose a color',
    cancel: 'Cancel',
    save: 'Save',
    
    // Legend
    legTitle: 'Legend',
    legHub: 'Diagnosis (hub)',
    legSym: 'Individual symptom',
    legMulti: 'Shared symptom',
    legFloat: 'Floating symptom',
    legThin: 'Simple connection',
    legThick: 'Strong connection',
    legDash: 'Weak connection',
    legendToggle: '? legend',
    
    // Instructions
    instructions: 'Drag nodes — Scroll to zoom — Click diagnosis to filter',
    
    // Toasts & Messages
    noActiveDiag: 'Select at least one diagnosis first',
    symptomAdded: 'Symptom added',
    symptomDeleted: 'Symptom deleted',
    allAccepted: 'All symptoms accepted',
    errorOccurred: 'An error occurred',
    loadingSymptoms: 'Finding symptoms...',
    generating: 'Generating suggestions...',
  }
};

export const t = (key, lang = 'es', vars = {}) => {
  let text = translations[lang]?.[key] || translations.es[key] || key;
  
  // Replace variables like {username}
  Object.keys(vars).forEach(varKey => {
    text = text.replace(`{${varKey}}`, vars[varKey]);
  });
  
  return text;
};
