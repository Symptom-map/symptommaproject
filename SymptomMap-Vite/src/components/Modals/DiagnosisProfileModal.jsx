// src/components/Modals/DiagnosisProfileModal.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export default function DiagnosisProfileModal({ 
  isOpen, 
  diagnosisId, 
  diagMap,
  savedProfile,
  onSave, 
  onSkip 
}) {
  const { t, lang } = useTranslation();
  const [formData, setFormData] = useState({});

  const diagnosis = diagMap[diagnosisId];
  const profile = getDiagnosisProfile(diagnosisId, lang);

  useEffect(() => {
    if (savedProfile) {
      setFormData(savedProfile);
    } else {
      setFormData({});
    }
  }, [diagnosisId, savedProfile]);

  if (!isOpen || !diagnosis || !profile) return null;

  const handleChipToggle = (fieldId, option) => {
    setFormData(prev => {
      const current = prev[fieldId] || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [fieldId]: updated };
    });
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSave = () => {
    onSave(diagnosisId, formData);
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onSkip}>
      <div 
        className="diagmodal-box" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="diagmodal-header">
          <h2>{profile.title}</h2>
          <p>{profile.desc}</p>
        </div>

        {/* Body */}
        <div className="diagmodal-body">
          {profile.fields.map((field) => (
            <div key={field.id} className="profile-field">
              <label>{field.label}</label>
              
              {field.type === 'chips' && (
                <div className="chip-group">
                  {field.options.map((option) => {
                    const isSelected = (formData[field.id] || []).includes(option);
                    return (
                      <span
                        key={option}
                        className={`chip ${isSelected ? 'on' : ''}`}
                        style={isSelected ? {
                          background: diagnosis.color,
                          borderColor: 'transparent',
                          color: 'white'
                        } : {}}
                        onClick={() => handleChipToggle(field.id, option)}
                      >
                        {option}
                      </span>
                    );
                  })}
                </div>
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  placeholder={field.placeholder}
                  min="1"
                  max="100"
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
              )}

              {field.type === 'text' && (
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="diagmodal-footer">
          <button className="btn-primary" onClick={handleSave}>
            {lang === 'es' ? 'Guardar perfil' : 'Save profile'}
          </button>
          <button className="btn-secondary" onClick={onSkip}>
            {lang === 'es' ? 'Omitir' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to get diagnosis profile structure
function getDiagnosisProfile(diagnosisId, lang) {
  const es = lang === 'es';
  
  const profiles = {
    tda: {
      title: es ? 'TDA / TDAH' : 'ADHD',
      desc: es ? 'Cuéntame cómo se manifiesta tu TDA para sugerirte síntomas más precisos.'
                : 'Tell me how your ADHD manifests to suggest more precise symptoms.',
      fields: [
        { 
          id: 'subtype', 
          type: 'chips',
          label: es ? 'Presentación principal' : 'Primary presentation',
          options: es 
            ? ['Inatento predominante','Hiperactivo predominante','Combinado','No sé / mixto']
            : ['Predominantly inattentive','Predominantly hyperactive','Combined','Not sure / mixed'] 
        },
        { 
          id: 'age', 
          type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 8' : 'e.g. 8' 
        },
        { 
          id: 'triggers', 
          type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es 
            ? ['Estrés','Ruido / ambiente','Tareas largas','Interacciones sociales','Sueño irregular','Pantallas']
            : ['Stress','Noise / environment','Long tasks','Social interactions','Irregular sleep','Screens'] 
        },
        { 
          id: 'known', 
          type: 'text',
          label: es ? 'Síntomas que ya sabes que tienes' : 'Symptoms you know you have',
          placeholder: es ? 'ej. procrastinación, hiperfoco, olvidos...' : 'e.g. procrastination, hyperfocus, forgetfulness...' 
        },
      ]
    },
    tlp: {
      title: es ? 'TLP — Borderline' : 'BPD — Borderline',
      desc: es ? 'El TLP se expresa diferente en cada persona. Esto ayuda a personalizar las sugerencias.'
                : 'BPD expresses differently in each person. This helps personalize suggestions.',
      fields: [
        { 
          id: 'subtype', 
          type: 'chips',
          label: es ? 'Patrón más reconocible en ti' : 'Most recognizable pattern in you',
          options: es 
            ? ['Miedo al abandono intenso','Cambios de identidad','Impulsividad','Vaivenes emocionales rápidos','Relaciones intensas','Disociación frecuente']
            : ['Intense fear of abandonment','Identity shifts','Impulsivity','Rapid emotional swings','Intense relationships','Frequent dissociation'] 
        },
        { 
          id: 'age', 
          type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 28' : 'e.g. 28' 
        },
        { 
          id: 'triggers', 
          type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es 
            ? ['Rechazo percibido','Conflictos relacionales','Soledad','Estrés laboral','Cambios inesperados','Críticas']
            : ['Perceived rejection','Relational conflicts','Loneliness','Work stress','Unexpected changes','Criticism'] 
        },
        { 
          id: 'known', 
          type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. flashbacks emocionales, vergüenza intensa...' : 'e.g. emotional flashbacks, intense shame...' 
        },
      ]
    },
    an: {
      title: es ? 'Anorexia Nerviosa' : 'Anorexia Nervosa',
      desc: es ? 'La AN tiene subtipos muy distintos. Esto es importante para que las sugerencias sean precisas.'
                : 'AN has very distinct subtypes. This is important for accurate suggestions.',
      fields: [
        { 
          id: 'subtype', 
          type: 'chips',
          label: es ? 'Subtipo que te describe mejor' : 'Subtype that best describes you',
          options: es 
            ? ['Restrictivo','Atracón / purga','Atracón sin purga','Mixto / cambia','Predomina distorsión corporal']
            : ['Restrictive','Binge / purge','Binge without purge','Mixed / changes','Body image distortion predominant'] 
        },
        { 
          id: 'age', 
          type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 16' : 'e.g. 16' 
        },
        { 
          id: 'triggers', 
          type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es 
            ? ['Estrés emocional','Situaciones sociales','Cambios corporales','Control / incertidumbre','Comentarios externos','Comparaciones']
            : ['Emotional stress','Social situations','Body changes','Control / uncertainty','External comments','Comparisons'] 
        },
        { 
          id: 'known', 
          type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. atracones nocturnos, distorsión corporal, rituales...' : 'e.g. nighttime binges, body distortion, rituals...' 
        },
      ]
    },
    aut: {
      title: es ? 'Rasgos Autistas' : 'Autistic Traits',
      desc: es ? 'El perfil autista es muy individual. Tu experiencia específica cambia mucho las sugerencias.'
                : 'Autistic profiles are very individual. Your specific experience greatly shapes suggestions.',
      fields: [
        { 
          id: 'subtype', 
          type: 'chips',
          label: es ? 'Áreas más presentes en ti' : 'Most present areas in you',
          options: es 
            ? ['Sensorial (hiper/hipo)','Social / comunicación','Rutinas y rigidez','Intereses intensos','Fatiga autista','Enmascaramiento']
            : ['Sensory (hyper/hypo)','Social / communication','Routines and rigidity','Intense interests','Autistic fatigue','Masking'] 
        },
        { 
          id: 'age', 
          type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 35' : 'e.g. 35' 
        },
        { 
          id: 'triggers', 
          type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es 
            ? ['Sobrecarga sensorial','Cambios de rutina','Interacción social intensa','Imprevistos','Entornos ruidosos','Exigencias sociales']
            : ['Sensory overload','Routine changes','Intense social interaction','Unexpected events','Noisy environments','Social demands'] 
        },
        { 
          id: 'known', 
          type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. meltdowns, shutdowns, hipersensibilidad al ruido...' : 'e.g. meltdowns, shutdowns, noise hypersensitivity...' 
        },
      ]
    },
    cptsd: {
      title: 'C-PTSD',
      desc: es ? 'El C-PTSD varía mucho según el tipo de trauma y cómo se procesa. Esto personaliza las sugerencias.'
                : 'C-PTSD varies greatly depending on trauma type and processing. This personalizes suggestions.',
      fields: [
        { 
          id: 'subtype', 
          type: 'chips',
          label: es ? 'Manifestación más presente' : 'Most present manifestation',
          options: es 
            ? ['Hipervigilancia','Disociación','Flashbacks emocionales','Vergüenza tóxica','Dificultad de confianza','Colapso ante críticas']
            : ['Hypervigilance','Dissociation','Emotional flashbacks','Toxic shame','Difficulty trusting','Collapse under criticism'] 
        },
        { 
          id: 'age', 
          type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 32' : 'e.g. 32' 
        },
        { 
          id: 'triggers', 
          type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es 
            ? ['Conflictos relacionales','Críticas','Abandono percibido','Estrés acumulado','Sensaciones corporales','Entornos de alta demanda']
            : ['Relational conflicts','Criticism','Perceived abandonment','Accumulated stress','Body sensations','High-demand environments'] 
        },
        { 
          id: 'known', 
          type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. disociación bajo estrés, hipervigilancia en grupos...' : 'e.g. dissociation under stress, hypervigilance in groups...' 
        },
      ]
    },
    bi: {
      title: es ? 'Trastorno Bipolar' : 'Bipolar Disorder',
      desc: es ? 'El bipolar I, II y ciclotimia tienen perfiles distintos. Cuéntame cómo se expresa en ti.'
                : 'Bipolar I, II and cyclothymia have distinct profiles. Tell me how it expresses in you.',
      fields: [
        { 
          id: 'subtype', 
          type: 'chips',
          label: es ? 'Tipo o patrón' : 'Type or pattern',
          options: es 
            ? ['Bipolar I (manía completa)','Bipolar II (hipomanía)','Ciclotimia','Ciclos rápidos','Mixtos frecuentes','No sé el subtipo exacto']
            : ['Bipolar I (full mania)','Bipolar II (hypomania)','Cyclothymia','Rapid cycling','Frequent mixed states','Not sure of exact subtype'] 
        },
        { 
          id: 'age', 
          type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 24' : 'e.g. 24' 
        },
        { 
          id: 'triggers', 
          type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es 
            ? ['Falta de sueño','Estrés elevado','Cambios de estación','Conflictos','Estimulación excesiva','Cambios hormonales']
            : ['Lack of sleep','High stress','Seasonal changes','Conflicts','Excessive stimulation','Hormonal changes'] 
        },
        { 
          id: 'known', 
          type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. hiperfoco en manía, aislamiento en depresión...' : 'e.g. hyperfocus in mania, isolation in depression...' 
        },
      ]
    },
    anx: {
      title: es ? 'Ansiedad Generalizada' : 'Generalized Anxiety',
      desc: es ? 'La ansiedad se expresa diferente en cada persona. Esto ayuda a que las sugerencias sean precisas.'
                : 'Anxiety expresses differently in each person. This helps make suggestions more accurate.',
      fields: [
        { 
          id: 'subtype', 
          type: 'chips',
          label: es ? 'Cómo se manifiesta más en ti' : 'How it manifests most in you',
          options: es 
            ? ['Rumiación constante','Síntomas físicos (tensión, nauseas)','Evitación','Anticipación catastrófica','Ansiedad social','Ansiedad de rendimiento']
            : ['Constant rumination','Physical symptoms (tension, nausea)','Avoidance','Catastrophic anticipation','Social anxiety','Performance anxiety'] 
        },
        { 
          id: 'age', 
          type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 22' : 'e.g. 22' 
        },
        { 
          id: 'triggers', 
          type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es 
            ? ['Incertidumbre','Situaciones sociales','Rendimiento / evaluación','Salud','Dinero / trabajo','Relaciones']
            : ['Uncertainty','Social situations','Performance / evaluation','Health','Money / work','Relationships'] 
        },
        { 
          id: 'known', 
          type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. insomnio, tensión muscular, preocupación constante...' : 'e.g. insomnia, muscle tension, constant worry...' 
        },
      ]
    },
  };

  return profiles[diagnosisId] || null;
}
