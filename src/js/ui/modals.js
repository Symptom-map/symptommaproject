// ═══════════════════════════════════════════════════════════
// MODALES — perfil de diagnóstico, API key, diagnóstico personalizado
// ═══════════════════════════════════════════════════════════
let _d;
let currentDiagModalId = null;

const CUSTOM_COLORS = ['#071332', '#5a00cc', '#8c52ff', '#a78bfa', '#9d50bb', '#38b6ff', '#00c4cc', '#57fff0', '#a6a6a6', '#d8e6ed', '#ff4343', '#ffbd59', '#ffde59', '#7ed957'];
let customColor = CUSTOM_COLORS[0];

export function init(deps) { _d = deps; }

// ── Perfiles de diagnóstico bilingues ───────────────────────
function getDiagProfiles() {
  const es = _d.lang === 'es';
  return {
    tda: {
      title: es ? 'TDA / TDAH' : 'ADHD',
      desc: es ? 'Cuéntame cómo se manifiesta tu TDA para sugerirte síntomas más precisos.'
               : 'Tell me how your ADHD manifests to suggest more precise symptoms.',
      fields: [
        { id: 'subtype', type: 'chips',
          label: es ? 'Presentación principal' : 'Primary presentation',
          options: es ? ['Inatento predominante', 'Hiperactivo predominante', 'Combinado', 'No sé / mixto']
                     : ['Predominantly inattentive', 'Predominantly hyperactive', 'Combined', 'Not sure / mixed'] },
        { id: 'age', type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 8' : 'e.g. 8' },
        { id: 'triggers', type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Estrés', 'Ruido / ambiente', 'Tareas largas', 'Interacciones sociales', 'Sueño irregular', 'Pantallas']
                     : ['Stress', 'Noise / environment', 'Long tasks', 'Social interactions', 'Irregular sleep', 'Screens'] },
        { id: 'known', type: 'text',
          label: es ? 'Síntomas que ya sabes que tienes' : 'Symptoms you know you have',
          placeholder: es ? 'ej. procrastinación, hiperfoco, olvidos...' : 'e.g. procrastination, hyperfocus, forgetfulness...' },
      ]
    },
    tlp: {
      title: es ? 'TLP — Borderline' : 'BPD — Borderline',
      desc: es ? 'El TLP se expresa diferente en cada persona. Esto ayuda a personalizar las sugerencias.'
               : 'BPD expresses differently in each person. This helps personalize suggestions.',
      fields: [
        { id: 'subtype', type: 'chips',
          label: es ? 'Patrón más reconocible en ti' : 'Most recognizable pattern in you',
          options: es ? ['Miedo al abandono intenso', 'Cambios de identidad', 'Impulsividad', 'Vaivenes emocionales rápidos', 'Relaciones intensas', 'Disociación frecuente']
                     : ['Intense fear of abandonment', 'Identity shifts', 'Impulsivity', 'Rapid emotional swings', 'Intense relationships', 'Frequent dissociation'] },
        { id: 'age', type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 28' : 'e.g. 28' },
        { id: 'triggers', type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Rechazo percibido', 'Conflictos relacionales', 'Soledad', 'Estrés laboral', 'Cambios inesperados', 'Críticas']
                     : ['Perceived rejection', 'Relational conflicts', 'Loneliness', 'Work stress', 'Unexpected changes', 'Criticism'] },
        { id: 'known', type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. flashbacks emocionales, vergüenza intensa...' : 'e.g. emotional flashbacks, intense shame...' },
      ]
    },
    an: {
      title: es ? 'Anorexia Nerviosa' : 'Anorexia Nervosa',
      desc: es ? 'La AN tiene subtipos muy distintos. Esto es importante para que las sugerencias sean precisas.'
               : 'AN has very distinct subtypes. This is important for accurate suggestions.',
      fields: [
        { id: 'subtype', type: 'chips',
          label: es ? 'Subtipo que te describe mejor' : 'Subtype that best describes you',
          options: es ? ['Restrictivo', 'Atracón / purga', 'Atracón sin purga', 'Mixto / cambia', 'Predomina distorsión corporal']
                     : ['Restrictive', 'Binge / purge', 'Binge without purge', 'Mixed / changes', 'Body image distortion predominant'] },
        { id: 'age', type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 16' : 'e.g. 16' },
        { id: 'triggers', type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Estrés emocional', 'Situaciones sociales', 'Cambios corporales', 'Control / incertidumbre', 'Comentarios externos', 'Comparaciones']
                     : ['Emotional stress', 'Social situations', 'Body changes', 'Control / uncertainty', 'External comments', 'Comparisons'] },
        { id: 'known', type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. atracones nocturnos, distorsión corporal, rituales...' : 'e.g. nighttime binges, body distortion, rituals...' },
      ]
    },
    aut: {
      title: es ? 'Rasgos Autistas' : 'Autistic Traits',
      desc: es ? 'El perfil autista es muy individual. Tu experiencia específica cambia mucho las sugerencias.'
               : 'Autistic profiles are very individual. Your specific experience greatly shapes suggestions.',
      fields: [
        { id: 'subtype', type: 'chips',
          label: es ? 'Áreas más presentes en ti' : 'Most present areas in you',
          options: es ? ['Sensorial (hiper/hipo)', 'Social / comunicación', 'Rutinas y rigidez', 'Intereses intensos', 'Fatiga autista', 'Enmascaramiento']
                     : ['Sensory (hyper/hypo)', 'Social / communication', 'Routines and rigidity', 'Intense interests', 'Autistic fatigue', 'Masking'] },
        { id: 'age', type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 35' : 'e.g. 35' },
        { id: 'triggers', type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Sobrecarga sensorial', 'Cambios de rutina', 'Interacción social intensa', 'Imprevistos', 'Entornos ruidosos', 'Exigencias sociales']
                     : ['Sensory overload', 'Routine changes', 'Intense social interaction', 'Unexpected events', 'Noisy environments', 'Social demands'] },
        { id: 'known', type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. meltdowns, shutdowns, hipersensibilidad al ruido...' : 'e.g. meltdowns, shutdowns, noise hypersensitivity...' },
      ]
    },
    cptsd: {
      title: 'C-PTSD',
      desc: es ? 'El C-PTSD varía mucho según el tipo de trauma y cómo se procesa. Esto personaliza las sugerencias.'
               : 'C-PTSD varies greatly depending on trauma type and processing. This personalizes suggestions.',
      fields: [
        { id: 'subtype', type: 'chips',
          label: es ? 'Manifestación más presente' : 'Most present manifestation',
          options: es ? ['Hipervigilancia', 'Disociación', 'Flashbacks emocionales', 'Vergüenza tóxica', 'Dificultad de confianza', 'Colapso ante críticas']
                     : ['Hypervigilance', 'Dissociation', 'Emotional flashbacks', 'Toxic shame', 'Difficulty trusting', 'Collapse under criticism'] },
        { id: 'age', type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 32' : 'e.g. 32' },
        { id: 'triggers', type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Conflictos relacionales', 'Críticas', 'Abandono percibido', 'Estrés acumulado', 'Sensaciones corporales', 'Entornos de alta demanda']
                     : ['Relational conflicts', 'Criticism', 'Perceived abandonment', 'Accumulated stress', 'Body sensations', 'High-demand environments'] },
        { id: 'known', type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. disociación bajo estrés, hipervigilancia en grupos...' : 'e.g. dissociation under stress, hypervigilance in groups...' },
      ]
    },
    bi: {
      title: es ? 'Trastorno Bipolar' : 'Bipolar Disorder',
      desc: es ? 'El bipolar I, II y ciclotimia tienen perfiles distintos. Cuéntame cómo se expresa en ti.'
               : 'Bipolar I, II and cyclothymia have distinct profiles. Tell me how it expresses in you.',
      fields: [
        { id: 'subtype', type: 'chips',
          label: es ? 'Tipo o patrón' : 'Type or pattern',
          options: es ? ['Bipolar I (manía completa)', 'Bipolar II (hipomanía)', 'Ciclotimia', 'Ciclos rápidos', 'Mixtos frecuentes', 'No sé el subtipo exacto']
                     : ['Bipolar I (full mania)', 'Bipolar II (hypomania)', 'Cyclothymia', 'Rapid cycling', 'Frequent mixed states', 'Not sure of exact subtype'] },
        { id: 'age', type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 24' : 'e.g. 24' },
        { id: 'triggers', type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Falta de sueño', 'Estrés elevado', 'Cambios de estación', 'Conflictos', 'Estimulación excesiva', 'Cambios hormonales']
                     : ['Lack of sleep', 'High stress', 'Seasonal changes', 'Conflicts', 'Excessive stimulation', 'Hormonal changes'] },
        { id: 'known', type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. hiperfoco en manía, aislamiento en depresión...' : 'e.g. hyperfocus in mania, isolation in depression...' },
      ]
    },
    anx: {
      title: es ? 'Ansiedad Generalizada' : 'Generalized Anxiety',
      desc: es ? 'La ansiedad se expresa diferente en cada persona. Esto ayuda a que las sugerencias sean precisas.'
               : 'Anxiety expresses differently in each person. This helps make suggestions more accurate.',
      fields: [
        { id: 'subtype', type: 'chips',
          label: es ? 'Cómo se manifiesta más en ti' : 'How it manifests most in you',
          options: es ? ['Rumiación constante', 'Síntomas físicos (tensión, nauseas)', 'Evitación', 'Anticipación catastrófica', 'Ansiedad social', 'Ansiedad de rendimiento']
                     : ['Constant rumination', 'Physical symptoms (tension, nausea)', 'Avoidance', 'Catastrophic anticipation', 'Social anxiety', 'Performance anxiety'] },
        { id: 'age', type: 'number',
          label: es ? 'Edad de diagnóstico' : 'Age of diagnosis',
          placeholder: es ? 'ej. 22' : 'e.g. 22' },
        { id: 'triggers', type: 'chips',
          label: es ? 'Detonadores frecuentes' : 'Frequent triggers',
          options: es ? ['Incertidumbre', 'Situaciones sociales', 'Rendimiento / evaluación', 'Salud', 'Dinero / trabajo', 'Relaciones']
                     : ['Uncertainty', 'Social situations', 'Performance / evaluation', 'Health', 'Money / work', 'Relationships'] },
        { id: 'known', type: 'text',
          label: es ? 'Síntomas que reconoces en ti' : 'Symptoms you recognize in yourself',
          placeholder: es ? 'ej. insomnio, tensión muscular, preocupación constante...' : 'e.g. insomnia, muscle tension, constant worry...' },
      ]
    },
  };
}

// ── Modal de perfil de diagnóstico ──────────────────────────
export function openDiagModal(id) {
  const DIAG_PROFILES = getDiagProfiles();
  const profile = DIAG_PROFILES[id];
  if (!profile) return;
  currentDiagModalId = id;
  const diag = _d.DIAG_MAP[id];
  const es   = _d.lang === 'es';
  document.getElementById('diagmodal-title').textContent = profile.title;
  document.getElementById('diagmodal-desc').textContent  = profile.desc;
  document.querySelector('.diagmodal-footer .btn-primary').textContent   = es ? 'Guardar perfil' : 'Save profile';
  document.querySelector('.diagmodal-footer .btn-secondary').textContent = es ? 'Omitir'         : 'Skip';

  const saved = _d.state.diagProfiles?.[id] || {};
  const body  = document.getElementById('diagmodal-body');
  body.innerHTML = profile.fields.map(f => {
    if (f.type === 'chips') {
      const chips = f.options.map(o => {
        const on = (saved[f.id] || []).includes(o);
        return `<span class="chip ${on ? 'on' : ''}" style="${on ? `background:${diag?.color || '#888'}` : ''}" onclick="toggleChip(this,'${diag?.color || '#888'}')">${o}</span>`;
      }).join('');
      return `<div class="profile-field"><label>${f.label}</label><div class="chip-group" data-field="${f.id}">${chips}</div></div>`;
    }
    if (f.type === 'number') {
      return `<div class="profile-field"><label>${f.label}</label><input type="number" data-field="${f.id}" placeholder="${f.placeholder}" min="1" max="100" value="${saved[f.id] || ''}"></div>`;
    }
    return `<div class="profile-field"><label>${f.label}</label><input type="text" data-field="${f.id}" placeholder="${f.placeholder}" value="${saved[f.id] || ''}"></div>`;
  }).join('');

  document.getElementById('diagmodal').classList.add('show');
}

export function toggleChip(el, color) {
  el.classList.toggle('on');
  if (el.classList.contains('on')) {
    el.style.background  = color; el.style.borderColor = 'transparent'; el.style.color = 'white';
  } else {
    el.style.background  = ''; el.style.borderColor = ''; el.style.color = '';
  }
}

export function saveDiagProfile() {
  if (!currentDiagModalId) return;
  if (!_d.state.diagProfiles) _d.state.diagProfiles = {};
  const DIAG_PROFILES = getDiagProfiles();
  const profile = DIAG_PROFILES[currentDiagModalId];
  const saved   = {};
  if (profile) {
    profile.fields.forEach(f => {
      if (f.type === 'chips') {
        const group = document.querySelector(`[data-field="${f.id}"]`);
        saved[f.id] = [...group.querySelectorAll('.chip.on')].map(c => c.textContent);
      } else {
        const el = document.querySelector(`input[data-field="${f.id}"]`);
        if (el) saved[f.id] = el.value.trim();
      }
    });
  }
  _d.state.diagProfiles[currentDiagModalId] = saved;
  _d.saveState();
  _d.renderDiagList();
  closeDiagModal();
  _d.showToast(_d.lang === 'es' ? 'Perfil guardado — las sugerencias serán más precisas' : 'Profile saved — suggestions will be more accurate');
}

export function closeDiagModal() {
  document.getElementById('diagmodal').classList.remove('show');
  currentDiagModalId = null;
}

// ── Modal de API key — deshabilitado: la key vive en el servidor (Vercel env) ──
export function openApiModal()  {}
export function closeApiModal() {}
export function saveApiKey()    {}

// ── Modal de diagnóstico personalizado ──────────────────────
export function openCustomModal() {
  const isEs = _d.lang === 'es';
  document.getElementById('cm-title').textContent      = isEs ? 'Agregar diagnóstico'  : 'Add a diagnosis';
  document.getElementById('cm-desc').textContent       = isEs
    ? 'Escribe el nombre de tu diagnóstico. La IA sugerirá síntomas comunes para él.'
    : 'Enter the name of your diagnosis. The AI will suggest common symptoms for it.';
  document.getElementById('cm-name-label').textContent  = isEs ? 'Nombre del diagnóstico' : 'Diagnosis name';
  document.getElementById('cm-color-label').textContent = isEs ? 'Elige un color'         : 'Choose a color';
  document.getElementById('cm-cancel').textContent      = isEs ? 'Cancelar'               : 'Cancel';
  document.getElementById('cm-name').value              = '';
  document.getElementById('cm-name').placeholder        = isEs ? 'ej. Fibromialgia, TOC...' : 'e.g. Fibromyalgia, OCD...';
  document.getElementById('cm-btn').disabled            = true;
  customColor = CUSTOM_COLORS[0];

  const picker = document.getElementById('cm-colors');
  picker.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:6px';
  picker.innerHTML = CUSTOM_COLORS.map((c, i) =>
    `<div class="color-swatch" style="background:${c};width:24px;height:24px;border-radius:50%;cursor:pointer;flex-shrink:0;
      box-shadow:${i === 0 ? `0 0 0 2px white,0 0 0 4px ${c}` : 'none'}"
      onclick="selectCustomColor('${c}',this)"></div>`
  ).join('');

  document.getElementById('custommodal').classList.add('show');
  setTimeout(() => document.getElementById('cm-name').focus(), 200);
}

export function selectCustomColor(color, el) {
  customColor = color;
  document.querySelectorAll('.color-swatch').forEach(s => s.style.boxShadow = 'none');
  el.style.boxShadow = `0 0 0 2px white, 0 0 0 4px ${color}`;
}

export function updateCustomBtn() {
  const val = document.getElementById('cm-name').value.trim();
  document.getElementById('cm-btn').disabled = val.length < 2;
}

export function closeCustomModal() {
  document.getElementById('custommodal').classList.remove('show');
}

export async function saveCustomDiag() {
  const name = document.getElementById('cm-name').value.trim();
  if (!name) return;
  const isEs = _d.lang === 'es';
  closeCustomModal();

  const customId   = 'custom_' + Date.now();
  const customDiag = { id: customId, label: name, color: customColor, custom: true };

  // Registrar en las estructuras globales
  _d.DIAGNOSES.push(customDiag);
  _d.DIAG_MAP[customId] = customDiag;

  _d.state.selectedDiags.push(customId);
  _d.state.nodes.push({ id: 'hub-' + customId, name, label: name, conds: [customId], hub: true, x: 0, y: 0, _placed: false });
  _d.initLayout(); _d.saveState(); _d.renderDiagList(); _d.renderNodeList(); _d.draw();

  _d.showLoading(isEs ? `Buscando síntomas de ${name}...` : `Finding symptoms for ${name}...`);

  const prompt = `You are a psychoeducation assistant.

The user has been diagnosed with: ${name}
They also have these other diagnoses: ${_d.state.selectedDiags.filter(d => d !== customId).map(d => _d.DIAG_MAP[d]?.label || d).join(', ') || 'none'}.

Suggest 6-8 common symptoms or experiences for "${name}", focusing on intersections with their other diagnoses if applicable.

Respond ONLY with valid JSON:
{
  "symptoms": [
    { "name": "short symptom name (max 4 words)", "reason": "brief explanation why it appears" }
  ]
}`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    });
    const data   = await res.json();
    const text   = data.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    _d.pendingSuggestions = (parsed.symptoms || []).map((s, i) => ({
      name: s.name, conds: [customId], reason: s.reason, _idx: i
    }));
    _d.hideLoading();
    _d.showReviewPanel();
  } catch (err) {
    _d.hideLoading();
    _d.showToast('Error: ' + err.message);
  }
}
