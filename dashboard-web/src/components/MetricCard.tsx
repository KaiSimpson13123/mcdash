import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  change?: string;
  status?: 'healthy' | 'warning' | 'danger';
  icon: LucideIcon | React.ReactNode;
  color?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'indigo';
  trend?: string;
  progressPercent?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  change,
  status,
  icon,
  color,
  trend,
  progressPercent,
}) => {
  const chosenColor =
    color ||
    (status === 'healthy'
      ? 'emerald'
      : status === 'warning'
      ? 'amber'
      : status === 'danger'
      ? 'rose'
      : 'cyan');
  const colorStyles = {
    emerald: {
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      accentGlow: 'hover:border-emerald-500/30',
      bar: 'bg-emerald-500',
    },
    cyan: {
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      accentGlow: 'hover:border-cyan-500/30',
      bar: 'bg-cyan-500',
    },
    amber: {
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      accentGlow: 'hover:border-amber-500/30',
      bar: 'bg-amber-500',
    },
    rose: {
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      accentGlow: 'hover:border-rose-500/30',
      bar: 'bg-rose-500',
    },
    indigo: {
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      accentGlow: 'hover:border-indigo-500/30',
      bar: 'bg-indigo-500',
    },
  }[chosenColor];

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComp = icon as LucideIcon;
    return <IconComp className="w-5 h-5" />;
  };

  const displaySubtitle = subtitle || change;

  return (
    <div className={`glass-card p-5 rounded-2xl relative overflow-hidden transition-all duration-300 ${colorStyles.accentGlow}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <div className="flex items-baseline space-x-1.5">
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-mono">{value}</h3>
            {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
          </div>
        </div>
        <div className={`p-3 rounded-xl border ${colorStyles.iconBg}`}>
          {renderIcon()}
        </div>
      </div>

      {(displaySubtitle || trend || progressPercent !== undefined) && (
        <div className="mt-4 pt-3 border-t border-white/5 flex flex-col space-y-2">
          {progressPercent !== undefined && (
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorStyles.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-slate-400">
            {displaySubtitle && <span>{displaySubtitle}</span>}
            {trend && <span className="font-medium text-emerald-400">{trend}</span>}
          </div>
        </div>
      )}
    </div>
  );
};
