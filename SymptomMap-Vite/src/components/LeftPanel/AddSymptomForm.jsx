// src/components/LeftPanel/AddSymptomForm.jsx - DISEÑO ORIGINAL RESTAURADO
import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export default function AddSymptomForm({ 
  selectedDiags, 
  diagMap, 
  onAdd 
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedConds, setSelectedConds] = useState([]);

  const handleAdd = () => {
    if (!name.trim() || selectedConds.length === 0) return;

    onAdd({
      id: `sym-${Date.now()}`,
      name: name.trim(),
      desc: desc.trim(),
      conds: selectedConds,
      x: 0,
      y: 0,
      _placed: false
    });

    // Reset form
    setName('');
    setDesc('');
    setSelectedConds([]);
  };

  const toggleCond = (diagId) => {
    setSelectedConds(prev =>
      prev.includes(diagId)
        ? prev.filter(id => id !== diagId)
        : [...prev, diagId]
    );
  };

  return (
    <div className="panel-section">
      <label className="panel-label">
        {t('addSymptom')}
      </label>

      {/* Name Input */}
      <div style={{ marginBottom: '8px' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('symptomPlaceholder')}
          className="input-field"
        />
      </div>

      {/* Description (optional) */}
      <div style={{ marginBottom: '12px' }}>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={t('descPlaceholder')}
          className="input-field"
          style={{ height: '60px' }}
        />
      </div>

      {/* Diagnosis checkboxes */}
      {selectedDiags.length > 0 && (
        <>
          <label className="form-label">
            {t('diagnosesLabel')}
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '6px', 
            marginBottom: '12px' 
          }}>
            {selectedDiags.map(diagId => {
              const diag = diagMap[diagId];
              if (!diag) return null;

              const isSelected = selectedConds.includes(diagId);

              return (
                <label
                  key={diagId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255,252,248,0.8)' : 'transparent',
                    transition: 'background 0.12s'
                  }}
                  onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(240,244,248,0.6)')}
                  onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'transparent')}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCond(diagId)}
                    style={{
                      width: '14px',
                      height: '14px',
                      cursor: 'pointer',
                      accentColor: diag.color
                    }}
                  />
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      backgroundColor: diag.color
                    }}
                  />
                  <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--ink)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {diag.label}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}

      {/* Add Button */}
      <button
        onClick={handleAdd}
        disabled={!name.trim() || selectedConds.length === 0}
        className="btn-add"
        style={{
          opacity: (!name.trim() || selectedConds.length === 0) ? 0.4 : 1
        }}
      >
        {t('addButton')}
      </button>
    </div>
  );
}
