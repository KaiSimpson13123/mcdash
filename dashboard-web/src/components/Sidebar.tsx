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
} from 'lucide-react';
import { useWebSocketData } from '../contexts/WebSocketContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/players', label: 'Players', icon: Users },
  { path: '/groups', label: 'Groups', icon: Shield },
  { path: '/world', label: 'World', icon: Globe },
  { path: '/performance', label: 'Performance', icon: Activity },
  { path: '/logs', label: 'Logs', icon: Terminal },
  { path: '/activity', label: 'Activity', icon: Clock },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { isConnected, liveStats } = useWebSocketData();

  return (
    <aside className="w-64 bg-dark-900/90 border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-30 backdrop-blur-xl">
      {/* Brand header */}
      <div className="p-6 flex items-center space-x-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            MC-Dashboard
            <span className="text-[10px] px-1.5 py-0.2 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded font-mono">26.2</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Fabric Server Admin</p>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`
            }
          >
            <item.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Live status footer */}
      <div className="p-4 border-t border-white/5 bg-dark-950/40">
        <div className="glass-card p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <div>
              <p className="text-xs font-semibold text-white leading-none">
                {isConnected ? 'Connected' : 'Reconnecting...'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                {liveStats ? `${liveStats.tps.toFixed(1)} TPS · ${liveStats.mspt.toFixed(1)} MSPT` : 'Live Stream'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
