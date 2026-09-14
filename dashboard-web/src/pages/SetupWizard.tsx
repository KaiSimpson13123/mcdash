import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, Check, ArrowRight, ArrowLeft } from 'lucide-react';
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
    return <div className="text-center text-slate-400">Loading...</div>;
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
      toastSuccess('Administrator account created successfully!', 'Setup Complete');
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
    <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-white/10">
      {/* Wizard Steps indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                step === s
                  ? 'bg-brand-500 text-dark-950 ring-4 ring-brand-500/20 shadow-lg shadow-brand-500/30'
                  : step > s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 sm:w-24 h-0.5 mx-2 transition-all ${
                  step > s ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Initial Setup Wizard</h2>
        <p className="text-xs text-slate-400 mt-1">Configure initial credentials to secure your server dashboard</p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleStep1Next} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Administrator Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                placeholder="admin"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">This user will have full dashboard administrative rights.</p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-sm tracking-wide shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center space-x-2 mt-4"
          >
            <span>Next: Set Password</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2Next} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Dashboard Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Re-enter password"
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-3 px-4 rounded-xl text-slate-400 hover:text-white bg-slate-800/40 text-sm font-medium transition-colors flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-sm tracking-wide shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Generating BCrypt Hash...' : 'Complete Setup'}</span>
              <Check className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Setup Complete!</h3>
          <p className="text-xs text-slate-400 mb-4">Credentials saved with BCrypt. Redirecting to your dashboard...</p>
        </div>
      )}
    </div>
  );
};
