interface ScoreBoxProps {
  label: string;
  scoreOn100: number | null;
  weightLabel: string;
  weighted: number | null;
  highlight?: boolean;
}

export function ScoreBox({ label, scoreOn100, weightLabel, weighted, highlight }: ScoreBoxProps) {
  const fmt = (v: number | null) => v != null && v > 0 ? v.toFixed(2) : '--';
  
  return (
    <div className={`rounded-lg border p-3.5 font-mono text-sm ${
      highlight 
        ? 'bg-card border-primary/50 border-2' 
        : 'bg-surface-raised border-border'
    }`}>
      <div className="flex justify-between text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground text-data">{fmt(scoreOn100)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground mt-1">
        <span>Actual weight of the KPIs:</span>
        <span className="text-foreground">{weightLabel}</span>
      </div>
      <div className="flex justify-between text-muted-foreground mt-1">
        <span>Net weighted rating:</span>
        <span className="text-foreground text-data font-semibold">{fmt(weighted)}</span>
      </div>
    </div>
  );
}
