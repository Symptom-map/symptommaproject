// src/components/Modals/Toast.jsx
import { useEffect } from 'react';

export default function Toast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-gray-800 text-white px-6 py-3 rounded-2xl shadow-lg backdrop-blur-sm">
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
