import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const SetupWizard: React.FC = () => {
  const { setup, isSetupRequired, isAuthenticated, isLoading } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-center font-heading text-white">LOADING SETUP...</div>;
  }

  if (!isSetupRequired && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSetupRequired && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Please enter an administrator username.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleStep2Next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await setup(username.trim(), password);
      setStep(3);
      toastSuccess('Administrator and sudo accounts initialized!', 'Setup Complete');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to complete setup.';
      setErrorMsg(msg);
      toastError(msg, 'Setup Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-6 bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] select-none">
      {/* Wizard Steps indicator */}
      <div className="flex items-center justify-between mb-6 px-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 flex items-center justify-center font-heading text-xs border-2 border-[#141415] ${
                step === s
                  ? 'bg-[#3c8527] text-white shadow-[inset_1px_1px_0_#5db53b]'
                  : step > s
                  ? 'bg-[#218306] text-white'
                  : 'bg-[#1e1e1f] text-[#888888]'
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 sm:w-24 h-1 mx-2 border-y border-[#141415] ${
                  step > s ? 'bg-[#3c8527]' : 'bg-[#1e1e1f]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <div className="inline-flex p-3 bg-[#1e1e1f] border-2 border-[#141415] text-[#55ff55] mb-2 shadow-[inset_1px_1px_0_#2b2b2c]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-heading text-white tracking-wider">
          SERVER SETUP WIZARD
        </h2>
        <p className="text-xs font-mono text-[#aaaaaa] mt-1">
          Configure security credentials for your Minecraft 26.2 Server
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-[#421414] border-2 border-[#ff5555] text-[#ff5555] text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleStep1Next} className="space-y-4">
          <div className="form-group mb-3">
            <label className="form-label text-xs font-heading text-[#d0d1d4]">
              ADMIN USERNAME
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#888888] absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="form-input pl-9 text-xs"
              />
            </div>
          </div>

          <div className="p-3 bg-[#1a1a1b] border-2 border-[#141415] text-xs font-mono text-[#aaaaaa] space-y-1">
            <p className="text-white font-heading text-[11px]">INITIALIZED ACCOUNTS:</p>
            <p>· Administrator: <span className="text-[#55ff55]">{username || 'admin'}</span></p>
            <p>· Superuser: <span className="text-[#fdaa00]">sudo</span> (Console command executor)</p>
          </div>

          <button
            type="submit"
            className="button button-primary w-full py-2 text-sm font-heading"
          >
            CONTINUE TO PASSWORD
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2Next} className="space-y-4">
          <div className="form-group mb-3">
            <label className="form-label text-xs font-heading text-[#d0d1d4]">
              PASSWORD (MINIMUM 6 CHARACTERS)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#888888] absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input pl-9 text-xs"
              />
            </div>
          </div>

          <div className="form-group mb-4">
            <label className="form-label text-xs font-heading text-[#d0d1d4]">
              CONFIRM PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#888888] absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input pl-9 text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={submitting}
              className="mc-btn flex-1 py-2 text-xs"
            >
              BACK
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="button button-primary flex-1 py-2 text-xs"
            >
              {submitting ? 'SAVING...' : 'COMPLETE SETUP'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 mx-auto bg-[#3c8527] border-2 border-[#141415] text-white flex items-center justify-center font-heading text-lg">
            ✓
          </div>
          <h3 className="text-lg font-heading text-white">SETUP COMPLETE!</h3>
          <p className="text-xs font-mono text-[#aaaaaa]">
            Redirecting to server dashboard...
          </p>
        </div>
      )}
    </div>
  );
};
