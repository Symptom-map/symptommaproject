// src/components/Onboarding/Step3Tutorial.jsx
import { useTranslation } from '../../hooks/useTranslation';

export default function Step3Tutorial({ onStart, onBack }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl w-full space-y-8 animate-fade-in">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('tutorialTitle')}
          </h2>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              1
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">
                {t('tutorialStep1')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('lang') === 'es' 
                  ? 'Marca los diagnósticos de salud mental que tienes confirmados por un profesional.'
                  : 'Check the mental health diagnoses you have confirmed by a professional.'}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              2
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">
                {t('tutorialStep2')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('lang') === 'es'
                  ? 'Usa el botón de IA para recibir sugerencias personalizadas, o agrega síntomas manualmente.'
                  : 'Use the AI button to get personalized suggestions, or add symptoms manually.'}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              3
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">
                {t('tutorialStep3')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('lang') === 'es'
                  ? 'Visualiza cómo los síntomas se conectan entre tus diagnósticos. Arrastra para reorganizar.'
                  : 'Visualize how symptoms connect across your diagnoses. Drag to reorganize.'}
              </p>
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
            onClick={onStart}
            className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-lg"
          >
            🚀 {t('startApp')}
          </button>
        </div>
      </div>
    </div>
  );
}
