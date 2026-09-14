import React from 'react';
import { LogOut, User, Users, Cpu, HardDrive } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocketData } from '../contexts/WebSocketContext';
import { StatusBadge } from './StatusBadge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { liveStats } = useWebSocketData();

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
  };

  return (
    <header className="h-16 bg-dark-900/60 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-xl sticky top-0 z-20">
      <div className="flex items-center space-x-4">
        <StatusBadge status="ONLINE" size="sm" />
        {liveStats && (
          <div className="hidden sm:flex items-center space-x-3 text-xs font-mono text-slate-400 border-l border-white/10 pl-4">
            <div className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-white font-semibold">{liveStats.onlinePlayers}</span>
              <span>/</span>
              <span>{liveStats.maxPlayers}</span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-white">{liveStats.cpuProcess.toFixed(0)}%</span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-white">{formatMemory(liveStats.heapUsed)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-white/5 text-xs">
          <User className="w-3.5 h-3.5 text-brand-400" />
          <span className="font-medium text-slate-200">{user || 'Admin'}</span>
        </div>

        <button
          onClick={logout}
          title="Log out"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
