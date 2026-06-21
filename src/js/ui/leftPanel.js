// ═══════════════════════════════════════════════════════════
// PANEL IZQUIERDO — diagnósticos, lista de síntomas, agregar nodo
// ═══════════════════════════════════════════════════════════
let _d;
let _dropdownOpen = false;

export function init(deps) { _d = deps; }

// Devuelve el label del diagnóstico según el idioma activo
function diagLabel(d) {
  return (_d.lang === 'en' && d.labelEn) ? d.labelEn : d.label;
}

export function renderDiagList() {
  const el       = document.getElementById('diag-list');
  const selected = _d.state.selectedDiags;
  const isEs     = _d.lang === 'es';

  const selectedHtml = selected.length === 0
    ? `<p style="font-family:'DM Mono',monospace;font-size:0.62rem;color:var(--light);
                 text-align:center;padding:8px 0">
         ${isEs ? 'Sin diagnósticos — usa + para agregar' : 'No diagnoses — use + to add'}
       </p>`
    : selected.map(id => {
        const d = _d.DIAG_MAP[id];
        if (!d) return '';
        const lbl         = diagLabel(d);
        const highlighted = _d.highlightedDiags.has(id);
        const hasProfile  = _d.state.diagProfiles?.[id] && Object.values(_d.state.diagProfiles[id]).some(v => v?.length > 0);
        return `<div class="diag-item active" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:9px;flex:1" onclick="toggleDiag('${id}')">
            <div class="diag-swatch" style="background:${d.color}"></div>
            <span class="diag-name" style="color:${d.color}">${lbl.replace('\n', ' ')}</span>
          </div>
          <button onclick="event.stopPropagation();toggleHighlight('${id}')"
            title="${isEs ? 'Filtrar en el mapa' : 'Filter on map'}"
            style="background:${highlighted ? d.color : 'none'};border:1px solid ${highlighted ? d.color : 'var(--border)'};
                   color:${highlighted ? 'white' : 'var(--light)'};border-radius:3px;
                   padding:1px 7px;font-size:0.6rem;font-family:'DM Mono',monospace;cursor:pointer;
                   transition:all 0.12s;margin-right:4px">
            ${highlighted ? '✓' : '○'}
          </button>
          <button onclick="event.stopPropagation();openDiagModal('${id}')"
            style="background:none;border:none;cursor:pointer;font-size:0.68rem;
                   padding:2px 4px;color:${hasProfile ? d.color : 'var(--light)'};font-family:'DM Mono',monospace">
            ${hasProfile ? '✎' : '…'}
          </button>
        </div>`;
      }).join('');

  el.innerHTML = `
    ${selectedHtml}
    <button id="btn-add-diag" onclick="toggleDiagDropdown()"
      style="width:100%;background:none;border:1px dashed var(--border);border-radius:var(--r-btn);
             padding:6px;font-size:0.68rem;font-family:'DM Mono',monospace;color:var(--light);
             cursor:pointer;transition:all 0.12s;margin-top:4px"
      onmouseenter="this.style.borderColor='var(--ink)';this.style.color='var(--ink)'"
      onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--light)'">
      ${isEs ? '+ agregar diagnóstico' : '+ add diagnosis'}
    </button>`;

  const count   = _d.state.selectedDiags.length;
  const countEl = document.getElementById('acc-diags-count');
  if (countEl) countEl.textContent = count > 0 ? count : '';

  updateGenBtn();
  renderAddChecks();
}

// --- Dropdown: se crea en document.body para escapar overflow:hidden del panel ---

function _buildDropdownItems() {
  const selected = _d.state.selectedDiags;
  return _d.DIAGNOSES.map(d => {
    const alreadySel = selected.includes(d.id);
    const lbl        = diagLabel(d);
    return `<div class="dd-diag-item" data-id="${d.id}" data-label="${lbl.toLowerCase()}"
         onclick="${alreadySel ? `toggleDiag('${d.id}')` : `addDiagFromDropdown('${d.id}')`}"
         style="display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;
                font-size:0.72rem;font-family:'DM Mono',monospace;
                color:${alreadySel ? 'var(--light)' : 'var(--ink)'}"
         onmouseenter="this.style.background='var(--border)'"
         onmouseleave="this.style.background='none'">
           <div style="width:8px;height:8px;border-radius:50%;background:${d.color};flex-shrink:0"></div>
           <span>${lbl.replace('\n', ' ')}</span>
           ${alreadySel ? '<span style="margin-left:auto;font-size:0.55rem">✓</span>' : ''}
         </div>`;
  }).join('');
}

function _renderDropdown() {
  const btn = document.getElementById('btn-add-diag');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const isEs = _d.lang === 'es';

  const dd = document.createElement('div');
  dd.id = 'diag-dropdown';
  dd.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;width:${rect.width}px;
    background:var(--surface);border:1px solid var(--border);border-radius:var(--r);
    box-shadow:var(--shadow);z-index:500;overflow:hidden;
    max-height:min(340px,60vh);display:flex;flex-direction:column`;

  dd.innerHTML = `
    <div style="padding:8px 10px 5px;font-size:0.62rem;font-family:'DM Mono',monospace;
                font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--light);
                border-bottom:1px solid var(--border);flex-shrink:0">
      ${isEs ? 'Agregar diagnóstico' : 'Add a diagnosis'}
    </div>
    <div style="padding:6px 8px;border-bottom:1px solid var(--border);flex-shrink:0">
      <input id="diag-search" type="text" autocomplete="off"
        placeholder="${isEs ? 'Buscar...' : 'Search...'}"
        oninput="filterDiagDropdown()"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:4px;
               padding:5px 8px;font-size:0.7rem;font-family:'DM Mono',monospace;color:var(--ink)">
    </div>
    <div id="diag-dropdown-list" style="overflow-y:auto;flex:1">
      ${_buildDropdownItems()}
    </div>
    <div onclick="openRealCustomDiagModal();closeDiagDropdown()"
         style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;
                font-size:0.68rem;font-family:'DM Mono',monospace;
                border-top:1px solid var(--border);color:var(--light);flex-shrink:0"
         onmouseenter="this.style.background='var(--border)'"
         onmouseleave="this.style.background='none'">
      ＋ ${isEs ? 'Mi diagnóstico no está aquí' : 'My diagnosis is not here'}
    </div>`;

  document.body.appendChild(dd);
}

function _destroyDropdown() {
  document.getElementById('diag-dropdown')?.remove();
}

function _outsideClick(e) {
  const dd  = document.getElementById('diag-dropdown');
  const btn = document.getElementById('btn-add-diag');
  if (dd && !dd.contains(e.target) && btn && !btn.contains(e.target)) {
    closeDiagDropdown();
  }
}

export function toggleDiagDropdown() {
  if (_dropdownOpen) { closeDiagDropdown(); return; }
  _dropdownOpen = true;
  _renderDropdown();
  setTimeout(() => {
    const s = document.getElementById('diag-search');
    if (s) { s.value = ''; s.focus(); }
    document.addEventListener('click', _outsideClick);
  }, 0);
}

export function closeDiagDropdown() {
  _dropdownOpen = false;
  _destroyDropdown();
  document.removeEventListener('click', _outsideClick);
}

export function addDiagFromDropdown(id) {
  closeDiagDropdown();
  toggleDiag(id);
}

export function filterDiagDropdown() {
  const q = (document.getElementById('diag-search')?.value || '').toLowerCase().trim();
  document.querySelectorAll('#diag-dropdown-list .dd-diag-item').forEach(el => {
    const match = !q || el.dataset.label.includes(q) || el.dataset.id.includes(q);
    el.style.display = match ? 'flex' : 'none';
  });
}

export function toggleHighlight(id) {
  if (_d.highlightedDiags.has(id)) _d.highlightedDiags.delete(id);
  else _d.highlightedDiags.add(id);
  renderDiagList();
  _d.draw();
}

export function toggleDiag(id) {
  if (_d.state.selectedDiags.includes(id)) {
    _d.state.selectedDiags = _d.state.selectedDiags.filter(d => d !== id);
  } else {
    _d.state.selectedDiags.push(id);
    // Abrir modal de perfil automáticamente al agregar un diagnóstico nuevo
    setTimeout(() => _d.openDiagModal(id), 200);
  }
  const hubIds = _d.state.selectedDiags.map(d => 'hub-' + d);
  _d.state.nodes = _d.state.nodes.filter(n => !n.hub || hubIds.includes(n.id));
  _d.state.selectedDiags.forEach(d => {
    if (!_d.state.nodes.find(n => n.id === 'hub-' + d)) {
      const diag     = _d.DIAG_MAP[d];
      const hubLabel = diagLabel(diag);
      _d.state.nodes.push({ id: 'hub-' + d, name: hubLabel, label: hubLabel, conds: [d], hub: true, x: 0, y: 0, _placed: false });
    }
  });
  _d.initLayout(); _d.saveState(); renderDiagList(); renderNodeList(); _d.draw();
}

export function updateGenBtn() {
  const btn = document.getElementById('btn-gen');
  btn.disabled = _d.state.selectedDiags.length === 0;
}

export function renderAddChecks() {
  const el = document.getElementById('add-checks');
  el.innerHTML = _d.state.selectedDiags.map(id => {
    const d = _d.DIAG_MAP[id];
    return `<label class="cond-check"><input type="checkbox" value="${id}"><span class="cond-pill p-${id}">${d.label.split(/[—\/]/)[0].trim()}</span></label>`;
  }).join('');
}

export function addNodeManual() {
  const name = document.getElementById('inp-name').value.trim();
  if (!name) { _d.showToast('Escribe el nombre del síntoma'); return; }
  const conds   = [...document.querySelectorAll('#add-checks input:checked')].map(c => c.value);
  const context = document.getElementById('inp-context').value.trim();
  const hub  = conds.length > 0 ? _d.state.nodes.find(n => n.hub && n.conds[0] === conds[0]) : null;
  const node = {
    id: 'n' + (_d.state.idCounter++), name, conds, context,
    floating: conds.length === 0,
    x: (hub ? hub.x : _d.offX) + (Math.random() - 0.5) * 160,
    y: (hub ? hub.y : _d.offY) + (conds.length > 0 ? 90 + Math.random() * 100 : Math.random() * 200 - 100),
    _placed: true, fromAI: false, causeIds: [],
  };
  _d.state.nodes.push(node);
  document.getElementById('inp-name').value    = '';
  document.getElementById('inp-context').value = '';
  document.getElementById('context-field').classList.remove('open');
  document.querySelectorAll('#add-checks input').forEach(c => c.checked = false);
  _d.saveState(); renderNodeList(); _d.draw();
  _d.showToast(conds.length === 0
    ? (_d.lang === 'es' ? 'Nodo flotante agregado' : 'Floating node added')
    : (_d.lang === 'es' ? 'Síntoma agregado' : 'Symptom added'));
}

export function toggleContextHint(val) {
  document.getElementById('context-field').classList.toggle('open', val.length > 1);
}

export async function addWithAIAnalysis() {
  const name = document.getElementById('inp-name').value.trim();
  if (!name) { _d.showToast('Escribe el nombre del síntoma primero'); return; }

  // Agregar como nodo flotante mientras se analiza
  const nodeId  = 'n' + (_d.state.idCounter++);
  const context = document.getElementById('inp-context').value.trim();
  const node = {
    id: nodeId, name, conds: [], floating: true, context,
    x: _d.offX + (Math.random() - 0.5) * 200,
    y: _d.offY + (Math.random() - 0.5) * 150,
    _placed: true, fromAI: true, causeIds: [],
  };
  _d.state.nodes.push(node);
  document.getElementById('inp-name').value    = '';
  document.getElementById('inp-context').value = '';
  document.getElementById('context-field').classList.remove('open');
  document.querySelectorAll('#add-checks input').forEach(c => c.checked = false);
  renderNodeList(); _d.draw();

  _d.showLoading(`Analizando origen de "${name}"...`);

  const diagLabels       = _d.state.selectedDiags.map(d => _d.DIAG_MAP[d].label).join(', ');
  const existingSymptoms = _d.state.nodes
    .filter(n => !n.hub && n.id !== nodeId)
    .map(n => ({ id: n.id, name: n.name, conds: n.conds }));

  const prompt = `Eres un asistente de psicoeducación para personas con diagnósticos de salud mental.

El usuario tiene los siguientes diagnósticos: ${diagLabels}.
${_d.state.diagProfiles?.[_d.state.selectedDiags[0]] ? `Perfil: ${JSON.stringify(_d.state.diagProfiles)}` : ''}

Síntomas actuales en su mapa:
${existingSymptoms.map(s => `- [${s.id}] "${s.name}"${s.context ? ` (aparece: ${s.context})` : ''} (${s.conds.map(c => _d.DIAG_MAP[c]?.label || c).join(', ') || 'sin diagnóstico'})`).join('\n')}

El usuario acaba de agregar: "${name}"${node.context ? `\nContexto que dio: "${node.context}"` : ''}

Tu tarea: analiza si "${name}" podría ser una CONSECUENCIA de alguno de los síntomas o diagnósticos que ya están en el mapa, y si el/los diagnósticos del usuario pueden explicarlo.

Responde SOLO con JSON válido, sin texto extra:
{
  "analysis": "una o dos frases explicando el origen probable de este síntoma en el contexto de este perfil",
  "causeIds": ["id1","id2"],
  "diagConds": ["tda","cptsd"],
  "confidence": "alta|media|baja|desconocido"
}

- causeIds: IDs de síntomas del mapa que causan o contribuyen a "${name}". Puede ser array vacío.
- diagConds: diagnósticos del usuario que podrían explicar directamente "${name}". Puede ser array vacío.
- Si no hay relación clara, devuelve causeIds:[], diagConds:[], confidence:"desconocido"
- IDs disponibles: ${existingSymptoms.map(s => s.id).join(', ')}
- Diagnósticos disponibles: ${_d.state.selectedDiags.join(', ')}`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
    });
    const data   = await res.json();
    const text   = data.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    const n = _d.state.nodes.find(nd => nd.id === nodeId);
    if (n) {
      n.reason     = parsed.analysis;
      n.confidence = parsed.confidence;
      n.causeIds   = (parsed.causeIds || []).filter(id => _d.state.nodes.find(nd => nd.id === id));
      if ((parsed.diagConds || []).length > 0) {
        n.conds    = parsed.diagConds.filter(c => _d.state.selectedDiags.includes(c));
        n.floating = n.conds.length === 0;
      }
      // Posicionar en la zona de consecuencias si tiene causas identificadas
      if (n.causeIds.length > 0) {
        const causes = n.causeIds.map(id => _d.state.nodes.find(nd => nd.id === id)).filter(Boolean);
        const avgX   = causes.reduce((s, c) => s + c.x, 0) / causes.length;
        n.x = avgX + (Math.random() - 0.5) * 80;
        n.y = _d.offY + _d.H * 0.38 + Math.random() * 60;
      }
    }
    _d.hideLoading();
    _d.saveState(); renderNodeList(); _d.draw();
    _d.selectNode(nodeId);
    if (parsed.confidence === 'desconocido' || (!parsed.causeIds?.length && !parsed.diagConds?.length)) {
      document.getElementById('rp-therapist-notice').style.display = 'block';
    }
    const confLabel = { alta: 'alta', media: 'media', baja: 'baja', desconocido: 'incierto' }[parsed.confidence] || '';
    _d.showToast(`Origen analizado — confianza ${confLabel}`);
  } catch (err) {
    _d.hideLoading();
    _d.showToast('Error al analizar: ' + err.message);
    console.error(err);
  }
}

export function renderNodeList() {
  const syms    = _d.state.nodes.filter(n => !n.hub);
  const el      = document.getElementById('node-list');
  const countEl = document.getElementById('acc-list-count');
  if (countEl) countEl.textContent = syms.length > 0 ? syms.length : '';
  if (syms.length === 0) {
    el.innerHTML = `<p style="font-family:'DM Mono',monospace;font-size:0.62rem;color:var(--light);text-align:center;padding:16px">${_d.lang === 'es' ? 'sin síntomas aún' : 'no symptoms yet'}</p>`;
    return;
  }
  el.innerHTML = syms.map(n => `
    <div class="node-row ${n.id === _d.selectedId ? 'selected' : ''} ${_d.multiSelectedIds.has(n.id) ? 'multi-selected' : ''}" onclick="selectNode('${n.id}')">
      <div class="node-row-bar" style="background:${
        (n.floating || n.conds.length === 0) ? '#88776666' :
        n.conds.length > 1 ? `linear-gradient(180deg,${n.conds.map(c => _d.DIAG_MAP[c]?.color || '#888').join(',')})` :
        _d.DIAG_MAP[n.conds[0]]?.color || '#888'
      }"></div>
      <div class="node-row-name" style="${(n.floating || n.conds.length === 0) ? 'color:var(--muted)' : ''}">${n.name}</div>
      <div class="node-row-dots">
        ${n.fromAI ? '<span class="ai-dot">✦</span>' : ''}
        ${(n.floating || n.conds.length === 0) ? '<span style="font-size:0.55rem;color:#aaa090">?</span>' : ''}
        ${n.notes ? '<span style="font-size:0.55rem;color:var(--ai-glow)">●</span>' : ''}
        ${n.conds.map(c => `<div class="dot-xs" style="background:${_d.DIAG_MAP[c]?.color || '#888'}"></div>`).join('')}
      </div>
      <button class="node-row-delete" onclick="event.stopPropagation();deleteNode('${n.id}')" title="Eliminar">×</button>
    </div>
  `).join('');
}

export async function generateWithAI() {
  if (_d.state.selectedDiags.length === 0) { _d.showToast('Selecciona al menos un diagnóstico'); return; }

  _d.showLoading('Consultando IA...');

  const diagLabels       = _d.state.selectedDiags.map(d => _d.DIAG_MAP[d].label).join(', ');
  const existingSymptoms = _d.state.nodes.filter(n => !n.hub);
  const existingNames    = existingSymptoms.map(n => n.name + (n.context ? ` (aparece: ${n.context})` : ''));

  const profileContext = _d.state.selectedDiags.map(id => {
    const p = _d.state.diagProfiles?.[id];
    if (!p) return null;
    const diag  = _d.DIAG_MAP[id];
    const parts = [];
    if (p.subtype?.length)  parts.push(`subtipo/patrón: ${Array.isArray(p.subtype)  ? p.subtype.join(', ')  : p.subtype}`);
    if (p.age)              parts.push(`diagnosticado a los ${p.age} años`);
    if (p.triggers?.length) parts.push(`detonadores: ${Array.isArray(p.triggers) ? p.triggers.join(', ') : p.triggers}`);
    if (p.known)            parts.push(`síntomas conocidos propios: ${p.known}`);
    return parts.length ? `${diag.label}: ${parts.join(' | ')}` : null;
  }).filter(Boolean).join('\n');

  const prompt = `Eres un asistente de psicoeducación para personas que YA tienen diagnósticos de salud mental confirmados por profesionales.

PERFIL DEL USUARIO:
Diagnósticos: ${diagLabels}.
${profileContext ? `\nInformación específica por diagnóstico:\n${profileContext}` : ''}

Síntomas que ya tiene en su mapa:
${existingNames.length ? existingNames.map(n => `- ${n}`).join('\n') : '- ninguno aún'}

Tu tarea: sugerir 8-12 síntomas o experiencias relevantes para ESTE perfil diagnóstico específico.
- Enfócate en los puntos de intersección entre sus diagnósticos.
- Usa la información de perfil (subtipo, detonadores, síntomas conocidos) para ser preciso.
- NO repitas síntomas que ya existen en el mapa.
- Si el perfil indica un subtipo específico (ej. AN con atracones, no restrictiva), ajusta las sugerencias a ese subtipo.

Responde SOLO con JSON válido, sin texto adicional:
{
  "symptoms": [
    {
      "name": "nombre corto (máx 4 palabras)",
      "conds": ["id1","id2"],
      "reason": "frase corta explicando por qué aparece en este perfil específico"
    }
  ]
}

IDs válidos: ${_d.state.selectedDiags.join(', ')}.
Cada síntoma debe tener 1-3 condiciones.
Usa lenguaje de primera persona, no patologizante.
Enfócate en experiencias reales: emocionales, cognitivas, corporales, relacionales.`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Error de API');
    }

    const data    = await res.json();
    const text    = data.content.map(b => b.text || '').join('').trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed  = JSON.parse(cleaned);

    _d.pendingSuggestions = (parsed.symptoms || []).filter(s =>
      s.name && s.conds && s.conds.length > 0 &&
      !_d.state.nodes.find(n => !n.hub && n.name.toLowerCase() === s.name.toLowerCase())
    );

    _d.hideLoading();
    _d.showReviewPanel();
  } catch (err) {
    _d.hideLoading();
    _d.showToast('Error: ' + err.message);
    console.error(err);
  }
}
