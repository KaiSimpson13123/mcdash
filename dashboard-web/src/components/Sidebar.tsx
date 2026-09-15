import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shield,
  Globe,
  Activity,
  Terminal,
  Clock,
  MessageSquare,
  Settings,
  Server,
  FolderOpen,
} from 'lucide-react';
import { useWebSocketData as useWS } from '../contexts/WebSocketContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/players', label: 'Players', icon: Users },
  { path: '/groups', label: 'Groups', icon: Shield },
  { path: '/world', label: 'World', icon: Globe },
  { path: '/performance', label: 'Performance', icon: Activity },
  { path: '/logs', label: 'Console / Logs', icon: Terminal },
  { path: '/activity', label: 'Activity', icon: Clock },
  { path: '/chat', label: 'Server Chat', icon: MessageSquare },
  { path: '/files', label: 'File Explorer', icon: FolderOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { isConnected, liveStats } = useWS();

  return (
    <aside className="w-64 bg-[#2e2f30] border-r-4 border-[#141415] shadow-[inset_-2px_0_0_#454647] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand header */}
      <div className="p-4 flex items-center space-x-3 border-b-4 border-[#141415] bg-[#242425]">
        <div className="w-10 h-10 bg-[#3c8527] border-2 border-[#141415] shadow-[inset_2px_2px_0_#5db53b,inset_-2px_-2px_0_#1d4d13] flex items-center justify-center text-white font-bold">
          <Server className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-heading text-sm text-white tracking-wider flex items-center gap-1">
            MC-DASHBOARD
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] px-1 bg-[#1a1a1b] text-[#55ff55] border border-[#141415] font-mono">
              26.2 FABRIC
            </span>
          </div>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center space-x-2.5 px-3 py-2 text-xs font-heading tracking-wide transition-none ${
                isActive
                  ? 'bg-[#3c8527] text-white border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#4f913c,inset_-2px_-2px_0_#1d4d13]'
                  : 'bg-[#3b3c3d] text-[#d0d1d4] border border-[#1e1e1f] shadow-[inset_1px_1px_0_#4f5051,inset_-1px_-1px_0_#242526] hover:bg-[#218306] hover:text-white hover:border-white'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Live status footer */}
      <div className="p-3 border-t-4 border-[#141415] bg-[#242425]">
        <div className="bg-[#1a1a1b] border-2 border-[#111112] shadow-[inset_2px_2px_0_#0f0f10,inset_-2px_-2px_0_#313233] p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-3 h-3 border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.4)] ${
                isConnected ? 'bg-[#55ff55]' : 'bg-[#ff5555]'
              }`}
            />
            <div>
              <p className="text-[11px] font-heading text-white leading-none">
                {isConnected ? 'ONLINE' : 'CONNECTING...'}
              </p>
              <p className="text-[10px] text-[#aaaaaa] mt-1 font-mono">
                {liveStats
                  ? `${liveStats.tps.toFixed(1)} TPS · ${liveStats.mspt.toFixed(1)} MSPT`
                  : 'LIVE METRICS'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
