import { ScoreResult, getClassificationBg } from '@/lib/scoreEngine';
import { cn } from '@/lib/utils';

interface StickyScoreHeaderProps {
  scores: ScoreResult | null;
}

export function StickyScoreHeader({ scores }: StickyScoreHeaderProps) {
  const fmt = (v: number) => Number.isFinite(v) && v > 0 ? v.toFixed(2) : '--';
  const classification = scores?.classification || '--';
  const classBg = scores ? getClassificationBg(classification) : 'bg-card text-muted-foreground';

  return (
    <div className="bg-surface-raised border-b border-border px-6 py-2.5">
      <div className="flex items-center justify-between max-w-4xl mx-auto text-sm">
        <div className="flex items-center gap-4 text-data">
          <span className="text-muted-foreground">A1: <span className="text-foreground">{fmt(scores?.a1.weighted ?? 0)}</span></span>
          <span className="text-border">│</span>
          <span className="text-muted-foreground">A2: <span className="text-foreground">{fmt(scores?.a2.weighted ?? 0)}</span></span>
          <span className="text-border">│</span>
          <span className="text-muted-foreground">Sec: <span className="text-foreground">{fmt(scores?.secondary.weighted ?? 0)}</span></span>
          <span className="text-border">│</span>
          <span className="text-muted-foreground">Gen: <span className="text-foreground">{fmt(scores?.generic.weighted ?? 0)}</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-data font-semibold text-foreground">
            TOTAL: {fmt(scores?.finalScore ?? 0)} / 100
          </span>
          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium', classBg)}>
            ● {classification}
          </span>
        </div>
      </div>
    </div>
  );
}
