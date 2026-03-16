import { KPIEntry, RATING_LABELS } from '@/types/evaluation';
import { cn } from '@/lib/utils';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  entry: KPIEntry;
  index: number;
  onChange: (updated: KPIEntry) => void;
  showTitle?: boolean;
  titleEditable?: boolean;
}

export function KPICard({ entry, index, onChange, showTitle = true, titleEditable = true }: Props) {
  const [showComment, setShowComment] = useState(false);

  return (
    <div className="surface-card p-4">
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Title section - 8 cols */}
        <div className="col-span-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-data text-[10px] text-muted-foreground">#{index + 1}</span>
            {showTitle && (
              titleEditable ? (
                <input
                  value={entry.title}
                  onChange={e => onChange({ ...entry, title: e.target.value })}
                  placeholder="Enter KPI title..."
                  className="input-inset flex-1"
                />
              ) : (
                <span className="text-sm font-medium text-foreground">{entry.title}</span>
              )
            )}
          </div>
        </div>

        {/* Rating section - 4 cols */}
        <div className="col-span-4">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rating</p>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5].map(r => (
              <button
                key={r}
                onClick={() => onChange({ ...entry, rating: r })}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-sm text-xs font-semibold transition-mechanical',
                  entry.rating === r
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-accent'
                )}
                title={RATING_LABELS[r]}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {RATING_LABELS[entry.rating]}
          </p>
        </div>
      </div>

      {/* Weighted score indicator */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <button
          onClick={() => setShowComment(!showComment)}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground transition-mechanical hover:text-foreground"
        >
          <MessageSquare className="h-3 w-3" />
          {showComment ? 'Hide' : 'Add'} Comment
          {showComment ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <span className="text-data text-xs text-muted-foreground">
          Score: <span className="font-semibold text-foreground">{entry.rating}</span>/5
        </span>
      </div>

      <AnimatePresence>
        {showComment && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <textarea
              value={entry.comment}
              onChange={e => onChange({ ...entry, comment: e.target.value })}
              placeholder="Add remarks or justification..."
              className="input-inset mt-2 w-full resize-none prose-constrained"
              rows={2}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
