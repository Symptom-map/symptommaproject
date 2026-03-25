// src/components/Onboarding/Step1Language.jsx
import { useState } from 'react';

export default function Step1Language({ onNext, onLanguageSelect }) {
  const [selectedLang, setSelectedLang] = useState(null);

  const handleSelect = (lang) => {
    setSelectedLang(lang);
    onLanguageSelect(lang);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            SymptomMap
          </h1>
          <p className="text-gray-600 text-lg">
            {selectedLang === 'es' ? '¡Bienvenidx!' : selectedLang === 'en' ? 'Welcome!' : 'Welcome! / ¡Bienvenidx!'}
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-4">
          <h2 className="text-center text-gray-700 font-semibold">
            {selectedLang === 'es' ? 'Selecciona tu idioma' : 'Select your language'}
          </h2>
          
          <div className="flex gap-4">
            <button
              onClick={() => handleSelect('es')}
              className={`flex-1 p-6 rounded-2xl border-2 transition-all ${
                selectedLang === 'es'
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-2">🇪🇸</div>
              <div className="font-bold text-gray-900">Español</div>
            </button>

            <button
              onClick={() => handleSelect('en')}
              className={`flex-1 p-6 rounded-2xl border-2 transition-all ${
                selectedLang === 'en'
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-2">🇬🇧</div>
              <div className="font-bold text-gray-900">English</div>
            </button>
          </div>
        </div>

        {/* Hint */}
        {selectedLang && (
          <div className="text-center text-sm text-green-600 font-medium animate-fade-in">
            {selectedLang === 'es' 
              ? 'Idioma seleccionado — puedes continuar' 
              : 'Language selected — you can continue'}
          </div>
        )}

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={!selectedLang}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl transition-all transform hover:-translate-y-0.5"
        >
          {selectedLang === 'es' ? 'Siguiente →' : selectedLang === 'en' ? 'Next →' : 'Next / Siguiente →'}
        </button>
      </div>
    </div>
  );
}
