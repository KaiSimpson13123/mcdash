import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Lock,
  Key,
  CheckCircle,
  Terminal,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Skeleton } from '../components/Skeleton';

export const Settings: React.FC = () => {
  const { user, isSudo } = useAuth();
  const { addToast } = useToast();
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password reset state (locked to currently logged-in account)
  const activeUser = user || (isSudo ? 'sudo' : 'admin');
  const [currentPassword, setCurrentPassword] = useState('');
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
    if (!currentPassword) {
      addToast('error', 'Please enter your current password');
      return;
    }
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
      const res = await api.changePassword({
        username: activeUser,
        currentPassword,
        newPassword,
      });
      addToast('success', res?.message || `Password for ${activeUser} updated successfully!`);
      setCurrentPassword('');
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
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="bg-[#2e2f30] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4">
        <h1 className="text-2xl font-heading tracking-wide text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[#ffaa00]" />
          SETTINGS & CONFIGURATION
        </h1>
        <p className="text-xs font-mono text-[#aaaaaa] mt-1">
          Server authentication, operator accounts, security policies, and feature modules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Security & Password Card */}
        <div className="bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] p-5 space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-[#222223] pb-3">
            <div className="w-9 h-9 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center text-[#55ff55]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-heading text-white">CREDENTIALS MANAGEMENT</h2>
              <p className="text-xs font-mono text-[#aaaaaa]">
                Logged in as: <span className="text-[#55ff55] font-bold">{activeUser}</span> {isSudo && '(sudo operator)'}
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-3">
            <div className="p-2.5 bg-[#1a1a1b] border-2 border-[#141415] text-xs font-mono text-[#aaaaaa] space-y-1">
              <div className="flex items-center justify-between">
                <span>ACTIVE ACCOUNT:</span>
                <span className="text-[#55ff55] font-bold uppercase">{activeUser}</span>
              </div>
              <div className="text-[10px] text-[#888888] pt-1 border-t border-[#2a2a2b]">
                Policy: You can only change the password for your own logged-in account ({activeUser}).
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading text-[#d0d1d4] uppercase mb-1">
                CURRENT PASSWORD
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password..."
                className="form-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-heading text-[#d0d1d4] uppercase mb-1">
                NEW PASSWORD
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters..."
                className="form-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-heading text-[#d0d1d4] uppercase mb-1">
                CONFIRM NEW PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retype new password..."
                className="form-input text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={changingPass || !newPassword || !currentPassword}
              className="button button-primary w-full py-2 text-xs font-heading flex items-center justify-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              {changingPass ? 'UPDATING...' : `UPDATE ${activeUser.toUpperCase()} PASSWORD`}
            </button>
          </form>

          <div className="pt-3 border-t border-[#242425] space-y-1 text-xs font-mono text-[#aaaaaa]">
            <div className="flex items-center gap-1.5 text-[#55ff55]">
              <CheckCircle className="w-3.5 h-3.5" /> BCrypt 12-round salted hashing
            </div>
            <div className="flex items-center gap-1.5 text-[#55ff55]">
              <CheckCircle className="w-3.5 h-3.5" /> HttpOnly SameSite Session Cookies
            </div>
            <div className="flex items-center gap-1.5 text-[#55ff55]">
              <CheckCircle className="w-3.5 h-3.5" /> sudo console command privilege enforced
            </div>
          </div>
        </div>

        {/* Configuration Overview Card */}
        <div className="lg:col-span-2 bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] p-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#222223] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center text-[#ffaa00]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-heading text-white">MOD SERVER PROPERTIES</h2>
                <p className="text-xs font-mono text-[#aaaaaa]">Configuration from mc-webdashboard.json</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-[#1e3816] text-[#55ff55] border border-[#11240c] text-[10px] font-heading">
              RUNNING
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#1a1a1b] border-2 border-[#141415] space-y-1">
              <p className="text-[#888888]">HTTP BIND HOST</p>
              <p className="text-white font-bold">0.0.0.0 (All interfaces)</p>
            </div>

            <div className="p-3 bg-[#1a1a1b] border-2 border-[#141415] space-y-1">
              <p className="text-[#888888]">HTTP & WEBSOCKET PORT</p>
              <p className="text-white font-bold">{window.location.port || '10019'}</p>
            </div>

            <div className="p-3 bg-[#1a1a1b] border-2 border-[#141415] space-y-1">
              <p className="text-[#888888]">CONSOLE LOG BUFFER</p>
              <p className="text-white font-bold">500 entries</p>
            </div>

            <div className="p-3 bg-[#1a1a1b] border-2 border-[#141415] space-y-1">
              <p className="text-[#888888]">SESSION TIMEOUT</p>
              <p className="text-white font-bold">1440 minutes (24 hours)</p>
            </div>
          </div>

          {/* Module Feature Flags */}
          <div>
            <h3 className="text-xs font-heading text-[#d0d1d4] uppercase tracking-wider mb-2">
              ACTIVE FEATURE MODULES
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { name: 'Whitelist Management', desc: 'Add-only server whitelist control' },
                { name: 'Console Execution', desc: 'Privileged command execution for sudo' },
                { name: 'Live Chat Feed', desc: 'Bi-directional synchronized in-game chat' },
                { name: 'Player Tracking', desc: 'Real-time coordinates and telemetry' },
                { name: 'Metrics Collector', desc: '1s rolling TPS and MSPT telemetry' },
                { name: 'LuckPerms Integration', desc: 'Group hierarchy & permissions' },
              ].map((mod) => (
                <div key={mod.name} className="p-2.5 bg-[#1a1a1b] border border-[#272728] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading text-white">{mod.name}</span>
                    <span className="w-2 h-2 bg-[#55ff55] border border-black" />
                  </div>
                  <p className="text-[10px] font-mono text-[#888888]">{mod.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Information */}
          <div className="pt-3 border-t border-[#242425] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2 bg-[#1a1a1b] border border-[#272728]">
              <p className="text-[#888888] text-[10px]">MINECRAFT</p>
              <p className="text-white font-bold font-mono">{serverInfo?.minecraftVersion || '26.2'}</p>
            </div>
            <div className="p-2 bg-[#1a1a1b] border border-[#272728]">
              <p className="text-[#888888] text-[10px]">JAVA RUNTIME</p>
              <p className="text-white font-bold font-mono">{serverInfo?.javaVersion || '25'}</p>
            </div>
            <div className="p-2 bg-[#1a1a1b] border border-[#272728]">
              <p className="text-[#888888] text-[10px]">FABRIC LOADER</p>
              <p className="text-white font-bold font-mono">{serverInfo?.fabricLoaderVersion || '0.19.3'}</p>
            </div>
            <div className="p-2 bg-[#1a1a1b] border border-[#272728]">
              <p className="text-[#888888] text-[10px]">WEB ENGINE</p>
              <p className="text-white font-bold font-mono">Javalin 6.4.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
