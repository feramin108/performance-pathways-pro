import { getClassificationColor } from '@/types/evaluation';
import { ScoreDisplay } from './ScoreDisplay';
import { Save, Clock } from 'lucide-react';

interface Props {
  score: number;
  classification: string;
  lastSaved: string | null;
  onSaveDraft: () => void;
}

export function StickyScoreHeader({ score, classification, lastSaved, onSaveDraft }: Props) {
  const colorClass = getClassificationColor(classification);

  return (
    <div className="mb-4 flex items-center justify-between rounded-sm border border-border bg-card p-3">
      <div className="flex items-center gap-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Running Total</p>
          <ScoreDisplay score={score} size="lg" />
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Classification</p>
          <p className={`text-sm font-semibold ${colorClass}`}>{classification}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {lastSaved && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Draft saved at {lastSaved}
          </div>
        )}
        <button
          onClick={onSaveDraft}
          className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-mechanical hover:bg-secondary"
        >
          <Save className="h-3 w-3" />
          Save Draft
        </button>
      </div>
    </div>
  );
}
