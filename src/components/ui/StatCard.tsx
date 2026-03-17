import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accentColor: string;
  pulse?: boolean;
  sublabel?: string;
}

export function StatCard({ label, value, icon: Icon, accentColor, pulse, sublabel }: StatCardProps) {
  return (
    <div
      className={cn('surface-card p-5 relative overflow-hidden', pulse && 'animate-stat-pulse')}
      style={{
        borderTopWidth: '3px',
        borderTopColor: accentColor,
        ...(pulse ? { '--pulse-color': `${accentColor}40` } as React.CSSProperties : {}),
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[28px] font-semibold text-tabular text-foreground leading-none">
            {value}
          </p>
          <p className="text-[13px] text-muted-foreground mt-2">{label}</p>
          {sublabel && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sublabel}</p>}
        </div>
        <Icon className="h-5 w-5 flex-shrink-0" style={{ color: accentColor }} />
      </div>
    </div>
  );
}
