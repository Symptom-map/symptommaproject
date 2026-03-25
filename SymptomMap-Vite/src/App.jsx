import { useState } from 'react';
import SymptomGraph from './components/SymptomGraph';

const DIAGNOSES = [
  { id: 'tda', label: 'TDA/TDAH', color: '#3b82f6' },
  { id: 'tlp', label: 'TLP Borderline', color: '#a855f7' },
  { id: 'an', label: 'Anorexia Nerviosa', color: '#fb7185' },
  { id: 'aut', label: 'Rasgos Autistas', color: '#10b981' },
  { id: 'cptsd', label: 'C-PTSD', color: '#f59e0b' },
  { id: 'bi', label: 'Trastorno Bipolar', color: '#6366f1' },
  { id: 'anx', label: 'Ansiedad Generalizada', color: '#84cc16' },
];

function App() {
  const [selectedDiags, setSelectedDiags] = useState([]);
  const [nodes, setNodes] = useState([]);

  const toggleDiag = (diagId) => {
    let newSelected;
    if (selectedDiags.includes(diagId)) {
      // Deseleccionar
      newSelected = selectedDiags.filter(d => d !== diagId);
    } else {
      // Seleccionar
      newSelected = [...selectedDiags, diagId];
    }
    setSelectedDiags(newSelected);

    // Crear nodos (solo hubs por ahora)
    const newNodes = newSelected.map(id => {
      const diag = DIAGNOSES.find(d => d.id === id);
      return {
        id: `hub-${id}`,
        name: diag.label,
        label: diag.label.replace(' ', '\n'),
        conds: [id],
        hub: true,
        x: 0,
        y: 0,
        _placed: false
      };
    });
    setNodes(newNodes);
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)'
    }}>
      {/* Panel izquierdo */}
      <div style={{
        width: '280px',
        background: 'white',
        borderRight: '1px solid #e5e7eb',
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1f2937'
        }}>
          MIS DIAGNÓSTICOS
        </h2>
        {DIAGNOSES.map(diag => (
          <label 
            key={diag.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              marginBottom: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: selectedDiags.includes(diag.id) ? '#f3f4f6' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <input
              type="checkbox"
              checked={selectedDiags.includes(diag.id)}
              onChange={() => toggleDiag(diag.id)}
              style={{ cursor: 'pointer' }}
            />
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                background: diag.color 
              }} 
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              {diag.label}
            </span>
          </label>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <SymptomGraph nodes={nodes} />
      </div>
    </div>
  );
}

export default App;
