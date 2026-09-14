import React from 'react';

interface StatusBadgeProps {
  status: string;
  text?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, size = 'sm', pulse = false }) => {
  const norm = status.toUpperCase();

  let styles = 'bg-slate-800/80 text-slate-300 border-slate-700/50';
  let dotColor = 'bg-slate-400';

  if (['ONLINE', 'SUCCESS', 'INFO', 'SURVIVAL', 'OVERWORLD'].includes(norm)) {
    styles = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
    dotColor = 'bg-emerald-400';
  } else if (['WARN', 'WARNING', 'CREATIVE', 'NETHER', 'THE_NETHER'].includes(norm)) {
    styles = 'bg-amber-950/60 text-amber-300 border-amber-500/30';
    dotColor = 'bg-amber-400';
  } else if (['ERROR', 'OFFLINE', 'DEAD', 'HARDCORE', 'ADVENTURE'].includes(norm)) {
    styles = 'bg-rose-950/60 text-rose-300 border-rose-500/30';
    dotColor = 'bg-rose-400';
  } else if (['DEBUG', 'SPECTATOR', 'END', 'THE_END'].includes(norm)) {
    styles = 'bg-purple-950/60 text-purple-300 border-purple-500/30';
    dotColor = 'bg-purple-400';
  }

  const sizeStyles = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm font-mono tracking-wide uppercase ${sizeStyles} ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse ? 'animate-ping' : ''}`} />
      {text || status}
    </span>
  );
};
