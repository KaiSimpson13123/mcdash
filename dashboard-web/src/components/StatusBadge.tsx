import React from 'react';

interface StatusBadgeProps {
  status: string;
  text?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, size = 'sm', pulse = false }) => {
  const norm = status.toUpperCase();

  let styles = 'bg-[#3b3c3d] text-[#c6c6c6] border-[#1e1e1f] shadow-[inset_1px_1px_0_#4f5051,inset_-1px_-1px_0_#222223]';
  let dotColor = 'bg-[#aaaaaa]';

  if (['ONLINE', 'SUCCESS', 'INFO', 'SURVIVAL', 'OVERWORLD'].includes(norm)) {
    styles = 'bg-[#1e3816] text-[#55ff55] border-[#11240c] shadow-[inset_1px_1px_0_#386328,inset_-1px_-1px_0_#0a1706]';
    dotColor = 'bg-[#55ff55]';
  } else if (['WARN', 'WARNING', 'CREATIVE', 'NETHER', 'THE_NETHER'].includes(norm)) {
    styles = 'bg-[#47340b] text-[#ffff55] border-[#291e04] shadow-[inset_1px_1px_0_#755610,inset_-1px_-1px_0_#171102]';
    dotColor = 'bg-[#ffff55]';
  } else if (['ERROR', 'OFFLINE', 'DEAD', 'HARDCORE', 'ADVENTURE'].includes(norm)) {
    styles = 'bg-[#421414] text-[#ff5555] border-[#260a0a] shadow-[inset_1px_1px_0_#752323,inset_-1px_-1px_0_#140505]';
    dotColor = 'bg-[#ff5555]';
  } else if (['DEBUG', 'SPECTATOR', 'END', 'THE_END'].includes(norm)) {
    styles = 'bg-[#2b1947] text-[#ff55ff] border-[#180d29] shadow-[inset_1px_1px_0_#522f87,inset_-1px_-1px_0_#0f081a]';
    dotColor = 'bg-[#ff55ff]';
  }

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 border font-heading tracking-wide uppercase ${sizeStyles} ${styles}`}>
      <span className={`w-2 h-2 border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.4)] ${dotColor} ${pulse ? 'animate-ping' : ''}`} />
      {text || status}
    </span>
  );
};
