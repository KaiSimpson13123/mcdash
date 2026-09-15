import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string) => void;
  addToast: (type: ToastType, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((msg: string, title?: string) => showToast('success', msg, title), [showToast]);
  const error = useCallback((msg: string, title?: string) => showToast('error', msg, title), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast('info', msg, title), [showToast]);
  const warning = useCallback((msg: string, title?: string) => showToast('warning', msg, title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, addToast: showToast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-md w-full font-minecraft">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3 border-2 shadow-[2px_2px_0_#000000] transition-all duration-200 ${
              toast.type === 'success'
                ? 'bg-[#1b2b1b] border-[#55ff55] text-[#aaffaa]'
                : toast.type === 'error'
                ? 'bg-[#2b1b1b] border-[#ff5555] text-[#ffaaff]'
                : toast.type === 'warning'
                ? 'bg-[#2b251b] border-[#ffaa00] text-[#ffffaa]'
                : 'bg-[#1b252b] border-[#55ffff] text-[#aaffff]'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#55ff55]" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#ff5555]" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[#ffaa00]" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-[#55ffff]" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <h5 className="font-minecraft text-xs font-bold leading-tight mb-0.5 text-white">{toast.title}</h5>}
              <p className="text-xs font-minecraft leading-relaxed opacity-95">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#888888] hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
