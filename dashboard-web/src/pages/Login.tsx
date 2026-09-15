import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, User, Server, AlertCircle } from 'lucide-react';
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
    return (
      <div className="text-center font-heading text-lg text-white">
        LOADING SERVER DASHBOARD...
      </div>
    );
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
    <div className="card p-6 bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] select-none">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 bg-[#3c8527] border-2 border-[#141415] shadow-[inset_2px_2px_0_#5db53b,inset_-2px_-2px_0_#1d4d13] flex items-center justify-center text-white mb-3">
          <Server className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-heading text-white tracking-wider">
          SERVER DASHBOARD
        </h2>
        <p className="text-xs font-mono text-[#aaaaaa] mt-1">
          Authenticate to manage Minecraft 26.2 Server
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-[#421414] border-2 border-[#ff5555] text-[#ff5555] text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group mb-3">
          <label className="form-label text-xs font-heading text-[#d0d1d4] uppercase">
            Username
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#888888] absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin or sudo"
              required
              className="form-input pl-9 text-xs"
            />
          </div>
          <span className="text-[10px] text-[#888888] font-mono mt-1 block">
            Tip: Log in as 'sudo' for console command privileges.
          </span>
        </div>

        <div className="form-group mb-4">
          <label className="form-label text-xs font-heading text-[#d0d1d4] uppercase">
            Password
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

        <button
          type="submit"
          disabled={submitting}
          className="button button-primary w-full py-2 text-sm font-heading tracking-wider"
        >
          {submitting ? 'AUTHENTICATING...' : 'ENTER DASHBOARD'}
        </button>
      </form>
    </div>
  );
};
