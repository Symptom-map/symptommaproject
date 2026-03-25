// src/components/Onboarding/Onboarding.jsx
import { useState } from 'react';
import Step1Language from './Step1Language';
import Step2Name from './Step2Name';
import Step3Tutorial from './Step3Tutorial';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState(null);
  const [username, setUsername] = useState('');

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
  };

  const handleNameChange = (name) => {
    setUsername(name);
  };

  const handleComplete = () => {
    onComplete({
      lang: language,
      username: username.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50">
      {step === 1 && (
        <Step1Language
          onNext={() => setStep(2)}
          onLanguageSelect={handleLanguageSelect}
        />
      )}

      {step === 2 && (
        <Step2Name
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
          onNameChange={handleNameChange}
        />
      )}

      {step === 3 && (
        <Step3Tutorial
          onStart={handleComplete}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
