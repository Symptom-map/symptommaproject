// ═══════════════════════════════════════════════════════════
// PANEL DE REVISIÓN — sugerencias de IA pendientes
// ═══════════════════════════════════════════════════════════
let _d;

export function init(deps) { _d = deps; }

export function showReviewPanel() {
  const el = document.getElementById('review-list');
  const pending = _d.pendingSuggestions;
  if (pending.length === 0) { _d.showToast('No hay sugerencias nuevas'); return; }
  el.innerHTML = pending.map((s, i) => {
    const tags = s.conds.map(c => {
      const d = _d.DIAG_MAP[c]; if (!d) return '';
      return `<span class="rp-tag" style="color:${d.color};border-color:${d.color};font-size:0.58rem">${d.label.split(/[—\/]/)[0].trim()}</span>`;
    }).join('');
    return `
    <div class="suggest-item" id="sug-${i}">
      <div class="suggest-name">${s.name}</div>
      <div class="suggest-reason">${s.reason}</div>
      <div class="suggest-conds">${tags}</div>
      <div class="suggest-actions">
        <button class="btn-accept" onclick="acceptSuggestion(${i})">✓ Aceptar</button>
        <button class="btn-reject" onclick="rejectSuggestion(${i})">✗ Rechazar</button>
      </div>
    </div>`;
  }).join('');
  document.getElementById('review-panel').classList.add('show');
}

export function closeReview() {
  document.getElementById('review-panel').classList.remove('show');
}

export function acceptSuggestion(i) {
  const pending = _d.pendingSuggestions;
  const s = pending[i];
  if (!s) return;
  const validConds = s.conds.filter(c => _d.state.selectedDiags.includes(c));
  if (validConds.length === 0) { rejectSuggestion(i); return; }
  const hub = _d.state.nodes.find(n => n.hub && n.conds[0] === validConds[0]);
  const node = {
    id: 'n' + (_d.state.idCounter++), name: s.name,
    conds: validConds, fromAI: true, reason: s.reason,
    x: (hub ? hub.x : _d.offX) + (Math.random() - 0.5) * 160,
    y: (hub ? hub.y : _d.offY) + 90 + Math.random() * 120,
    _placed: true,
  };
  _d.state.nodes.push(node);
  document.getElementById('sug-' + i).style.opacity = '0.3';
  document.getElementById('sug-' + i).style.pointerEvents = 'none';
  pending[i] = null;
  _d.saveState(); _d.renderNodeList(); _d.draw();
}

export function rejectSuggestion(i) {
  document.getElementById('sug-' + i).style.opacity = '0.3';
  document.getElementById('sug-' + i).style.pointerEvents = 'none';
  _d.pendingSuggestions[i] = null;
}

export function acceptAll() {
  const pending = _d.pendingSuggestions;
  pending.forEach((_, i) => { if (pending[i]) acceptSuggestion(i); });
  setTimeout(closeReview, 300);
}
