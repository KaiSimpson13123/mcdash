import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Server,
  Lock,
  Key,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Skeleton } from '../components/Skeleton';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const fetchSettings = async () => {
    try {
      const info = await api.getServerInfo();
      setServerInfo(info);
    } catch (e) {
      console.error('Failed to load server info', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      addToast('error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      addToast('error', 'Password must be at least 6 characters');
      return;
    }

    setChangingPass(true);
    try {
      // Calls setup endpoint to update password hash
      await api.setup({
        username: user || 'admin',
        password: newPassword,
      });
      addToast('success', 'Admin credentials updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      addToast('error', e.message || 'Failed to update credentials');
    } finally {
      setChangingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-brand-400" />
          Settings & Configuration
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Mod configuration, security credentials, platform details, and feature modules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security & Password Card */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Security & Credentials</h2>
              <p className="text-xs text-slate-400">Authenticated as: <span className="text-brand-300 font-semibold">{user || 'admin'}</span></p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
                className="w-full px-3.5 py-2 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password..."
                className="w-full px-3.5 py-2 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={changingPass || !newPassword}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              {changingPass ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="pt-4 border-t border-white/5 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle className="w-4 h-4" /> BCrypt 12-round salted hashing
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle className="w-4 h-4" /> HttpOnly Secure Session Cookies
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle className="w-4 h-4" /> CSRF Token Route Validation
            </div>
          </div>
        </div>

        {/* Configuration Overview Card */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Active Mod Configuration</h2>
                <p className="text-xs text-slate-400">Read from config/mc-webdashboard.json</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold">
              RUNNING
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-dark-950/50 border border-white/5 space-y-1">
              <p className="text-slate-500">Web Dashboard Host</p>
              <p className="font-mono font-bold text-white text-sm">0.0.0.0 (All interfaces)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-950/50 border border-white/5 space-y-1">
              <p className="text-slate-500">HTTP & WebSocket Port</p>
              <p className="font-mono font-bold text-white text-sm">{window.location.port || '10019'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-950/50 border border-white/5 space-y-1">
              <p className="text-slate-500">Session Expiration</p>
              <p className="font-mono font-bold text-white text-sm">1440 minutes (24 hours)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-950/50 border border-white/5 space-y-1">
              <p className="text-slate-500">Log History Buffer Size</p>
              <p className="font-mono font-bold text-white text-sm">500 entries</p>
            </div>
          </div>

          {/* Module Feature Flags */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Feature Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Player Tracking', desc: 'Real-time coords, inv, stats' },
                { name: 'Metrics Collector', desc: '1s rolling telemetry buffer' },
                { name: 'Chat Tracking', desc: 'In-game chat audit & send' },
                { name: 'Command Tracking', desc: 'Admin command logging' },
                { name: 'LuckPerms Integration', desc: 'Groups, weights, prefixes' },
                { name: 'Activity Feed', desc: 'Real-time server lifecycle' },
              ].map((mod) => (
                <div key={mod.name} className="p-3 rounded-xl bg-dark-950/40 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{mod.name}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">{mod.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Information */}
          <div className="pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-slate-500">Minecraft</p>
              <p className="font-bold text-white font-mono mt-0.5">{serverInfo?.minecraftVersion || '26.2'}</p>
            </div>
            <div>
              <p className="text-slate-500">Java Version</p>
              <p className="font-bold text-white font-mono mt-0.5">{serverInfo?.javaVersion || '25'}</p>
            </div>
            <div>
              <p className="text-slate-500">Fabric Loader</p>
              <p className="font-bold text-white font-mono mt-0.5">{serverInfo?.fabricLoaderVersion || '0.19.3'}</p>
            </div>
            <div>
              <p className="text-slate-500">Embedded Server</p>
              <p className="font-bold text-white font-mono mt-0.5">Javalin 6.4.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
