// src/components/Modals/LoadingOverlay.jsx

export default function LoadingOverlay({ message = 'Cargando...' }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        
        {/* Message */}
        <p className="text-gray-700 font-medium text-center">{message}</p>
      </div>
    </div>
  );
}
