import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  requireReason?: boolean;
  onConfirm: (reason?: string) => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  variant,
  isLoading = false,
  requireReason = false,
  onConfirm,
  onClose,
}) => {
  const isDanger = isDestructive || variant === 'danger';
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(requireReason ? reason : undefined);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border border-white/10 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className={`p-2.5 rounded-xl border ${isDanger ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-brand-500/10 text-brand-400 border-brand-500/20'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        </div>

        <div className="text-sm text-slate-300 mb-5 leading-relaxed">{message}</div>

        {requireReason && (
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transition-all disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                : 'bg-brand-500 hover:bg-brand-400 text-dark-950 shadow-brand-500/20'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
