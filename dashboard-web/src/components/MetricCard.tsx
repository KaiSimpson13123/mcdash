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
      bar: 'bg-[#3c8527]',
      iconBorder: 'border-[#3c8527]',
      textColor: 'text-[#55ff55]',
    },
    cyan: {
      bar: 'bg-[#4dedf4]',
      iconBorder: 'border-[#4dedf4]',
      textColor: 'text-[#55ffff]',
    },
    amber: {
      bar: 'bg-[#ffaa00]',
      iconBorder: 'border-[#ffaa00]',
      textColor: 'text-[#ffaa00]',
    },
    rose: {
      bar: 'bg-[#a82323]',
      iconBorder: 'border-[#a82323]',
      textColor: 'text-[#ff5555]',
    },
    indigo: {
      bar: 'bg-[#7345e5]',
      iconBorder: 'border-[#7345e5]',
      textColor: 'text-[#a855f7]',
    },
  }[chosenColor];

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComp = icon as LucideIcon;
    return <IconComp className="w-5 h-5 text-white" />;
  };

  const displaySubtitle = subtitle || change;

  return (
    <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 select-none">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-heading uppercase tracking-wider text-[#aaaaaa] mb-1">
            {title}
          </p>
          <div className="flex items-baseline space-x-1.5">
            <h3 className={`text-2xl font-heading tracking-tight ${colorStyles.textColor} drop-shadow-[2px_2px_0_#000000]`}>
              {value}
            </h3>
            {unit && <span className="text-xs font-mono text-[#aaaaaa]">{unit}</span>}
          </div>
        </div>

        <div className={`w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] shadow-[inset_2px_2px_0_#111112,inset_-2px_-2px_0_#38393a] flex items-center justify-center ${colorStyles.iconBorder}`}>
          {renderIcon()}
        </div>
      </div>

      {(displaySubtitle || trend || progressPercent !== undefined) && (
        <div className="mt-3 pt-2.5 border-t border-[#242425] flex flex-col space-y-1.5">
          {progressPercent !== undefined && (
            <div className="w-full bg-[#1a1a1b] border border-[#111112] shadow-[inset_1px_1px_0_#000] h-2">
              <div
                className={`h-full ${colorStyles.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] font-mono text-[#aaaaaa]">
            <span>{displaySubtitle}</span>
            {trend && <span className="text-white font-heading">{trend}</span>}
          </div>
        </div>
      )}
    </div>
  );
};
