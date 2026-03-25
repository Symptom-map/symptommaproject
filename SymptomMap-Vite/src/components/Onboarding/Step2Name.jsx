// src/components/Onboarding/Step2Name.jsx
import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export default function Step2Name({ onNext, onBack, onNameChange }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setName(value);
    onNameChange(value);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-md w-full space-y-6 animate-fade-in">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('nameTitle')}
          </h2>
        </div>

        {/* Name Input */}
        <div>
          <input
            type="text"
            value={name}
            onChange={handleChange}
            placeholder={t('namePlaceholder')}
            className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none transition"
            autoFocus
          />
        </div>

        {/* DISCLAIMER - CRÍTICO */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">⚠️</div>
            <div className="text-sm text-gray-700 leading-relaxed">
              {t('disclaimer')}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-6 py-4 border-2 border-gray-300 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            ← {t('back')}
          </button>
          
          <button
            onClick={onNext}
            disabled={name.trim().length === 0}
            className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            {t('next')} →
          </button>
        </div>
      </div>
    </div>
  );
}
