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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none animate-in fade-in duration-100">
      <div className="bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[#aaaaaa] hover:text-white p-1 hover:bg-[#48494a] border border-[#1e1e1f]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-4 border-b-2 border-[#222223] pb-3">
          <div className={`p-2 border-2 border-[#141415] ${isDanger ? 'bg-[#a82323] text-white shadow-[inset_1px_1px_0_#d44d4d]' : 'bg-[#3c8527] text-white shadow-[inset_1px_1px_0_#4f913c]'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-heading text-white tracking-wide">{title}</h3>
        </div>

        <div className="text-xs font-mono text-[#d0d1d4] mb-5 leading-relaxed bg-[#1a1a1b] p-3 border-2 border-[#141415] shadow-[inset_2px_2px_0_#0f0f10]">
          {message}
        </div>

        {requireReason && (
          <div className="mb-5">
            <label className="block text-xs font-heading uppercase tracking-wider text-[#aaaaaa] mb-1.5">
              REASON FOR ACTION
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              className="mc-input w-full px-3 py-2 text-xs font-mono"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="mc-btn px-4 py-1.5 text-xs"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-1.5 text-xs font-heading ${
              isDanger
                ? 'mc-btn-danger'
                : 'mc-btn-primary'
            }`}
          >
            {isLoading ? 'WORKING...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
