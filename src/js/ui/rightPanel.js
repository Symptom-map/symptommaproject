// ═══════════════════════════════════════════════════════════
// PANEL DERECHO — detalle de nodo, multi-selección, análisis IA
// ═══════════════════════════════════════════════════════════
let _d;

export function init(deps) { _d = deps; }

export function selectNode(id, openPanel = true) {
  _d.selectedId = id;
  const n = _d.state.nodes.find(nd => nd.id === id);
  const rp = document.getElementById('right-panel');
  if (n && !n.hub && openPanel) {
    document.getElementById('rp-single').style.display = 'block';
    document.getElementById('rp-multi').style.display = 'none';
    document.getElementById('rp-therapist-notice').style.display = 'none';
    // Abrir acordeón de detalle, cerrar el de IA
    const detailBtn  = document.querySelector('#rpa-detail .rp-acc-header');
    const detailBody = document.querySelector('#rpa-detail .rp-acc-body');
    if (detailBtn)  { detailBtn.classList.add('open'); detailBody.style.display = 'flex'; }
    const aiBody = document.querySelector('#rpa-ai .rp-acc-body');
    const aiBtn  = document.querySelector('#rpa-ai .rp-acc-header');
    if (aiBody) { aiBody.style.display = 'none'; aiBtn.classList.remove('open'); }
    // Limpiar resultado previo de IA
    const analysisResult = document.getElementById('rp-analysis-result');
    if (analysisResult) { analysisResult.style.display = 'none'; analysisResult.textContent = ''; }
    const profileEl = document.getElementById('rp-profile-context');
    if (profileEl) profileEl.style.display = 'none';
    // Rellenar encabezado
    document.getElementById('rp-title').textContent = n.name;
    document.getElementById('rp-tags').innerHTML = n.conds.map(c => {
      const d = _d.DIAG_MAP[c]; if (!d) return '';
      return `<span class="rp-tag" style="color:${d.color};border-color:${d.color}">${d.label}</span>`;
    }).join('');
    // Nota de IA / origen desconocido
    const aiNote = document.getElementById('rp-ai-note');
    let aiHtml = '';
    if (n.reason) {
      const confColor = { alta: '#2e8c68', media: '#d4953a', baja: '#e05c3a', desconocido: '#aaa090' }[n.confidence] || '#aaa090';
      const confLabel = { alta: 'confianza alta', media: 'confianza media', baja: 'confianza baja', desconocido: 'origen incierto' }[n.confidence] || '';
      aiHtml += `<div class="rp-ai-note">✦ ${n.reason}${confLabel ? ` <span style="color:${confColor};font-style:normal;font-size:0.65rem">[${confLabel}]</span>` : ''}`;
      if (n.causeIds && n.causeIds.length > 0) {
        const causeNames = n.causeIds.map(id => _d.state.nodes.find(nd => nd.id === id)?.name || '').filter(Boolean);
        aiHtml += `<br><span style="font-size:0.68rem;font-style:normal">← generado por: <strong>${causeNames.join(', ')}</strong></span>`;
      }
      aiHtml += `</div>`;
    } else if (n.floating || n.conds.length === 0) {
      aiHtml = `<div class="rp-ai-note" style="border-color:rgba(136,119,102,0.3);background:rgba(136,119,102,0.05)">? Origen desconocido — usa "Analizar origen" para que la IA busque conexiones.</div>`;
    }
    aiNote.innerHTML = aiHtml;
    document.getElementById('rp-context').value = n.context || '';
    document.getElementById('rp-notes').value   = n.notes   || '';
    // Botón de promover: solo para nodos consecuencia que aún no están en el mapa principal
    const isConseq = n.causeIds?.length > 0 && !n.inMainMap;
    document.getElementById('rp-promote').style.display = isConseq ? 'block' : 'none';
    rp.classList.add('open');
  } else {
    rp.classList.remove('open');
  }
  _d.renderNodeList();
  _d.draw();
}

export function closeRightPanel() {
  _d.selectedId = null;
  _d.multiSelectedIds.clear();
  document.getElementById('right-panel').classList.remove('open');
  _d.renderNodeList();
  _d.draw();
}

export function openMultiPanel() {
  const rp = document.getElementById('right-panel');
  rp.classList.add('open');
  document.getElementById('rp-single').style.display = 'none';
  document.getElementById('rp-multi').style.display  = 'block';
  const nodes = [..._d.multiSelectedIds].map(id => _d.state.nodes.find(n => n.id === id)).filter(Boolean);
  const isEs  = _d.lang === 'es';
  document.getElementById('mp-title').textContent    = isEs ? `${nodes.length} síntomas seleccionados` : `${nodes.length} symptoms selected`;
  document.getElementById('mp-names').textContent    = nodes.map(n => n.name).join(' · ');
  document.getElementById('mp-btn-label').textContent = isEs ? '¿Qué tienen en común?' : 'What do they share?';
  document.getElementById('mp-result').style.display = 'none';
}

export async function analyzeMulti() {
  const nodes = [..._d.multiSelectedIds].map(id => _d.state.nodes.find(n => n.id === id)).filter(Boolean);
  if (nodes.length < 2) return;
  const isEs = _d.lang === 'es';
  _d.showLoading(isEs ? 'Analizando intersección...' : 'Analyzing intersection...');
  const diagLabels = _d.state.selectedDiags.map(d => _d.DIAG_MAP[d]?.label.replace('\n', ' ') || d).join(', ');
  const nodeDescriptions = nodes.map(n =>
    `"${n.name}" (${n.conds.map(c => _d.DIAG_MAP[c]?.label.replace('\n', ' ') || c).join(', ') || 'unknown origin'})`
  ).join(', ');

  const prompt = `You are a psychoeducation assistant. The user has these diagnoses: ${diagLabels}.

They selected these symptoms from their map to understand what they have in common: ${nodeDescriptions}.

Explain in 3-4 sentences:
1. What underlying mechanism or experience connects these symptoms
2. Why they appear together in this specific diagnostic profile
3. What this intersection reveals about their experience

Respond in ${isEs ? 'Spanish' : 'English'}. Use warm, non-clinical language. Speak directly to the person (use "you"/"tú").`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    const text = data.content.map(b => b.text || '').join('').trim();
    _d.hideLoading();
    const resultEl = document.getElementById('mp-result');
    resultEl.textContent = text;
    resultEl.style.display = 'block';
  } catch (err) {
    _d.hideLoading();
    _d.showToast('Error: ' + err.message);
  }
}

export function saveNote() {
  if (!_d.selectedId) return;
  const n = _d.state.nodes.find(nd => nd.id === _d.selectedId);
  if (n) {
    n.notes   = document.getElementById('rp-notes').value;
    n.context = document.getElementById('rp-context').value;
  }
  _d.saveState(); _d.draw(); _d.showToast('Guardado');
}

export function promoteToMain() {
  if (!_d.selectedId) return;
  const n = _d.state.nodes.find(nd => nd.id === _d.selectedId);
  if (!n) return;
  n.inMainMap = true;
  // Reposicionar cerca de sus causas
  const causes = (n.causeIds || []).map(id => _d.state.nodes.find(nd => nd.id === id)).filter(Boolean);
  if (causes.length > 0) {
    n.x = causes.reduce((s, c) => s + c.x, 0) / causes.length + (Math.random() - 0.5) * 120;
    n.y = causes.reduce((s, c) => s + c.y, 0) / causes.length + 80;
  }
  document.getElementById('rp-promote').style.display = 'none';
  _d.saveState(); _d.draw();
  _d.showToast(_d.lang === 'es' ? 'Movido al mapa principal' : 'Moved to main map');
}

export function deleteNode(id) {
  _d.state.nodes = _d.state.nodes.filter(n => n.id !== id);
  if (_d.selectedId === id) {
    _d.selectedId = null;
    document.getElementById('right-panel').classList.remove('open');
  }
  _d.multiSelectedIds.delete(id);
  _d.saveState(); _d.renderNodeList(); _d.draw();
}

export function deleteSelected() {
  if (!_d.selectedId) return;
  _d.state.nodes = _d.state.nodes.filter(n => n.id !== _d.selectedId);
  _d.selectedId = null;
  document.getElementById('right-panel').classList.remove('open');
  _d.saveState(); _d.renderNodeList(); _d.draw();
}

export function toggleRpAccordion(id) {
  const sec  = document.getElementById(id);
  const btn  = sec.querySelector('.rp-acc-header');
  const body = sec.querySelector('.rp-acc-body');
  const open = btn.classList.toggle('open');
  body.style.display = open ? 'flex' : 'none';
}

export async function analyzeCurrentSymptom() {
  if (!_d.selectedId) return;
  const n = _d.state.nodes.find(nd => nd.id === _d.selectedId);
  if (!n) return;
  const isEs = _d.lang === 'es';

  // Construir contexto de perfil desde las respuestas del onboarding
  const profileLines = _d.state.selectedDiags.map(id => {
    const p = _d.state.diagProfiles?.[id];
    if (!p) return null;
    const diag = _d.DIAG_MAP[id];
    const parts = [];
    if (p.subtype?.length)  parts.push(Array.isArray(p.subtype)  ? p.subtype.join(', ')  : p.subtype);
    if (p.triggers?.length) parts.push(`triggers: ${Array.isArray(p.triggers) ? p.triggers.join(', ') : p.triggers}`);
    if (p.known)            parts.push(`known symptoms: ${p.known}`);
    return parts.length ? `${diag.label.replace('\n', ' ')}: ${parts.join(' | ')}` : null;
  }).filter(Boolean);

  const profileEl = document.getElementById('rp-profile-context');
  if (profileLines.length > 0 && profileEl) {
    profileEl.style.display = 'block';
    profileEl.innerHTML = `<strong style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--light)">Profile context</strong><br>${profileLines.join('<br>')}`;
  }

  _d.showLoading(isEs ? 'Analizando síntoma...' : 'Analyzing symptom...');

  const diagLabels = _d.state.selectedDiags.map(d => _d.DIAG_MAP[d]?.label.replace('\n', ' ') || d).join(', ');
  const prompt = `You are a psychoeducation assistant. The user has: ${diagLabels}.
${profileLines.length ? `\nTheir profile:\n${profileLines.join('\n')}` : ''}

They are looking at this symptom: "${n.name}"${n.context ? ` (appears: ${n.context})` : ''}
It is linked to: ${n.conds.map(c => _d.DIAG_MAP[c]?.label.replace('\n', ' ') || c).join(', ') || 'unknown'}

In 2-3 warm, non-clinical sentences, explain:
- Why this symptom appears in their specific profile
- How their personal profile (subtypes, triggers) shapes this experience

Respond in ${isEs ? 'Spanish' : 'English'}. Speak directly to them using "you"/"tú".`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    const text = data.content.map(b => b.text || '').join('').trim();
    _d.hideLoading();
    const resultEl = document.getElementById('rp-analysis-result');
    resultEl.textContent = text;
    resultEl.style.display = 'block';
  } catch (err) {
    _d.hideLoading();
    _d.showToast('Error: ' + err.message);
  }
}

// Bug preexistente conservado sin tocar — `btn` no está definido en este scope
export function toggleAccordion(id) {
  const sec  = document.getElementById(id);
  const body = sec.querySelector('.accordion-body');
  const open = btn.classList.toggle('open');
  if (id === 'acc-list') {
    body.style.display    = open ? 'flex'   : 'none';
    body.style.flexDirection = 'column';
    body.style.overflow   = 'hidden';
    body.style.flex       = open ? '1' : '0';
  } else {
    body.style.display = open ? 'block' : 'none';
  }
}
