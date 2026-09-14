import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, User, Server, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const Login: React.FC = () => {
  const { login, isAuthenticated, isSetupRequired, isLoading } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-center text-slate-400">Loading...</div>;
  }

  if (isSetupRequired) {
    return <Navigate to="/setup" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please provide both username and password.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Invalid username or password.';
      setErrorMsg(msg);
      toastError(msg, 'Authentication Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-white/10">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-cyan flex items-center justify-center text-white shadow-xl shadow-brand-500/20 mb-4">
          <Server className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Server Dashboard</h2>
        <p className="text-sm text-slate-400 mt-1">Sign in to manage your Minecraft server</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Username
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-dark-950 font-bold text-sm tracking-wide shadow-lg shadow-brand-500/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
