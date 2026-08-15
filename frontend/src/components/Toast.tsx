import { useState, useEffect } from 'react';

interface ToastMessage {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

let toastId = 0;

export function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function handleServerError(e: Event) {
      const detail = (e as CustomEvent).detail;
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message: detail.message, type: 'error' }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    }

    window.addEventListener('api:server-error', handleServerError);
    return () => window.removeEventListener('api:server-error', handleServerError);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-red-600 text-white px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm flex items-center gap-3 border border-red-700 animate-in slide-in-from-bottom-2"
        >
          <span className="text-base">⚠️</span>
          <span className="flex-1 leading-tight">{toast.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-white/80 hover:text-white p-1 text-sm font-bold"
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
