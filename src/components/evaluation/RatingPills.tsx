import { cn } from '@/lib/utils';

interface RatingPillsProps {
  value: number | null;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}

const LABELS = ['Very Poor', 'Poor', 'Fairly Good', 'Good', 'Excellent', 'Exceptional'];

export function RatingPills({ value, onChange, readOnly, size = 'md' }: RatingPillsProps) {
  const h = size === 'sm' ? 'h-8 min-w-[34px] text-xs' : 'h-[38px] min-w-[42px] text-sm';
  
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          title={LABELS[n]}
          className={cn(
            h,
            'rounded-lg font-medium transition-fast flex items-center justify-center',
            value === n
              ? 'bg-primary border-primary text-primary-foreground scale-[1.08] font-semibold'
              : 'bg-surface-raised border border-border text-muted-foreground hover:bg-accent hover:text-foreground',
            readOnly && 'pointer-events-none',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
