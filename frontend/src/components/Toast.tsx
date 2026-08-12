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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm flex items-center gap-3 max-w-sm"
        >
          <span>⚠️</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="ml-auto text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
