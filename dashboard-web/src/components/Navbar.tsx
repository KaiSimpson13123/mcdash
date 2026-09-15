import React from 'react';
import { LogOut, User, Users, Cpu, HardDrive, ShieldCheck, Terminal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocketData } from '../contexts/WebSocketContext';
import { StatusBadge } from './StatusBadge';

export const Navbar: React.FC = () => {
  const { user, isSudo, logout } = useAuth();
  const { liveStats } = useWebSocketData();

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
  };

  return (
    <header className="h-14 bg-[#2e2f30] border-b-4 border-[#141415] shadow-[inset_0_-2px_0_#454647] flex items-center justify-between px-6 sticky top-0 z-20 select-none">
      <div className="flex items-center space-x-3">
        <StatusBadge status="ONLINE" size="sm" />
        {liveStats && (
          <div className="hidden sm:flex items-center space-x-3 text-xs font-mono text-[#d0d1d4] border-l-2 border-[#1e1e1f] pl-3">
            <div className="flex items-center space-x-1.5 bg-[#1a1a1b] px-2 py-0.5 border border-[#141415]">
              <Users className="w-3.5 h-3.5 text-[#55ff55]" />
              <span className="text-white font-bold">{liveStats.onlinePlayers}</span>
              <span className="text-[#888]">/</span>
              <span>{liveStats.maxPlayers}</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-[#1a1a1b] px-2 py-0.5 border border-[#141415]">
              <Cpu className="w-3.5 h-3.5 text-[#ffaa00]" />
              <span className="text-white">{liveStats.cpuProcess.toFixed(0)}%</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-[#1a1a1b] px-2 py-0.5 border border-[#141415]">
              <HardDrive className="w-3.5 h-3.5 text-[#55ffff]" />
              <span className="text-white">{formatMemory(liveStats.heapUsed)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* User Info with Sudo badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#1a1a1b] border-2 border-[#111112] shadow-[inset_1px_1px_0_#0f0f10,inset_-1px_-1px_0_#313233] text-xs">
          {isSudo ? (
            <Terminal className="w-3.5 h-3.5 text-[#fdaa00]" />
          ) : (
            <User className="w-3.5 h-3.5 text-[#55ff55]" />
          )}
          <span className="font-heading text-white">{user || 'Admin'}</span>
          {isSudo ? (
            <span className="px-1 py-0.2 bg-[#7345e5] text-white text-[10px] font-heading border border-[#4a1cac]">
              SUDO
            </span>
          ) : (
            <span className="px-1 py-0.2 bg-[#3c8527] text-white text-[10px] font-heading border border-[#1d4d13]">
              ADMIN
            </span>
          )}
        </div>

        {/* Minecraft Logout Button */}
        <button
          onClick={logout}
          title="Log out"
          className="mc-btn px-2.5 py-1 text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>EXIT</span>
        </button>
      </div>
    </header>
  );
};
