// src/components/Modals/CustomDiagnosisModal.jsx
import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { CUSTOM_COLORS } from '../../utils/constants';

export default function CustomDiagnosisModal({ isOpen, onClose, onSave }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CUSTOM_COLORS[0]);

  const handleSave = () => {
    if (name.trim().length < 2) return;
    
    onSave({
      id: `custom_${Date.now()}`,
      label: name.trim(),
      color: selectedColor,
      custom: true
    });

    // Reset and close
    setName('');
    setSelectedColor(CUSTOM_COLORS[0]);
    onClose();
  };

  const handleCancel = () => {
    setName('');
    setSelectedColor(CUSTOM_COLORS[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t('addDiagnosis')}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {t('customDiagDesc')}
        </p>

        {/* Name Input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            {t('diagnosisName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('diagnosisPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            autoFocus
          />
        </div>

        {/* Color Picker */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-700 mb-3">
            {t('chooseColor')}
          </label>
          <div className="flex flex-wrap gap-3">
            {CUSTOM_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-10 h-10 rounded-lg transition-all ${
                  selectedColor === color
                    ? 'ring-4 ring-offset-2 ring-gray-400 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={name.trim().length < 2}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
