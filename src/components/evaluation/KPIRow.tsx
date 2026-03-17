import { RatingPills } from './RatingPills';
import { Trash2 } from 'lucide-react';

interface KPIRowProps {
  title: string;
  isCustom?: boolean;
  rating: number | null;
  comment: string;
  goalStatement?: string | null;
  goalTarget?: number | null;
  onRatingChange: (val: number) => void;
  onCommentChange: (val: string) => void;
  onTitleChange?: (val: string) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  readOnly?: boolean;
}

export function KPIRow({
  title, isCustom, rating, comment,
  goalStatement, goalTarget,
  onRatingChange, onCommentChange, onTitleChange, onDelete, canDelete,
  readOnly,
}: KPIRowProps) {
  return (
    <div className={`surface-card p-4 mb-3 ${isCustom ? 'border-l-[3px] border-l-warning' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        {isCustom && onTitleChange ? (
          <input
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            placeholder="Custom KPI title..."
            className="input-field flex-1 mr-2"
            readOnly={readOnly}
          />
        ) : (
          <h4 className="text-sm font-medium text-foreground flex-1">{title}</h4>
        )}
        {canDelete && !readOnly && onDelete && (
          <button type="button" onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-fast p-1">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {goalStatement && (
        <div className="mb-3 px-3 py-2 rounded-md bg-surface-raised border border-border text-xs text-muted-foreground">
          <span className="text-primary font-medium">Goal target: {goalTarget ?? '—'}</span> — {goalStatement}
        </div>
      )}

      <div className="mb-3">
        <label className="text-xs text-muted-foreground mb-1.5 block">Your Rating</label>
        <RatingPills value={rating} onChange={readOnly ? undefined : onRatingChange} readOnly={readOnly} />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Comments</label>
        <textarea
          value={comment}
          onChange={e => onCommentChange(e.target.value)}
          placeholder="Justify your rating with specific examples..."
          rows={2}
          className="input-field w-full h-auto resize-none"
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
