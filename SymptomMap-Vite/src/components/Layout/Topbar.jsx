// src/components/Layout/Topbar.jsx - DISEÑO ORIGINAL RESTAURADO
import { useTranslation } from '../../hooks/useTranslation';

export default function Topbar({ username, onToggleSidebar }) {
  const { t, lang } = useTranslation();

  const displayName = username 
    ? t('mapName', { username }) 
    : '';

  return (
    <div className="topbar">
      {/* Toggle sidebar button */}
      <button
        onClick={onToggleSidebar}
        className="btn-icon"
      >
        ☰
      </button>

      {/* Logo - ORIGINAL: "Symptom" gris + "Map" azul */}
      <div className="logo">
        <span className="logo-symptom">Symptom</span>
        <span className="logo-map">Map</span>
      </div>

      {/* Spacer */}
      <div className="topbar-sep" />

      {/* User's map name */}
      {displayName && (
        <div className="map-name">
          {displayName}
        </div>
      )}

      {/* Language indicator */}
      <div style={{
        fontSize: '0.7rem',
        color: 'var(--light)',
        fontFamily: "'DM Mono', monospace",
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {lang}
      </div>
    </div>
  );
}
