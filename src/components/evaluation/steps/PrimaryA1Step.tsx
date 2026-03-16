import { KPIEntry } from '@/types/evaluation';
import { KPICard } from '../KPICard';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  entries: KPIEntry[];
  setEntries: (entries: KPIEntry[]) => void;
  isSalesStaff: boolean;
}

export function PrimaryA1Step({ entries, setEntries, isSalesStaff }: Props) {
  const weight = isSalesStaff ? '50%' : '60%';

  const addEntry = () => {
    if (entries.length >= 7) return;
    setEntries([...entries, { id: `kpi_${Date.now()}`, title: '', rating: 0, comment: '' }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 5) return;
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, updated: KPIEntry) => {
    setEntries(entries.map(e => e.id === id ? updated : e));
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Primary KPI A1</h2>
        <span className="text-data rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          Weight: {weight}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Minimum 5, maximum 7 KPIs. Each must include a title, rating (0–5), and optional comment.
      </p>

      {entries.length < 5 && (
        <div className="mb-4 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {5 - entries.length} more KPI(s) required to meet minimum of 5.
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.id} className="relative">
            <KPICard
              entry={entry}
              index={index}
              onChange={(updated) => updateEntry(entry.id, updated)}
            />
            {entries.length > 5 && (
              <button
                onClick={() => removeEntry(entry.id)}
                className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground transition-mechanical hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {entries.length < 7 && (
        <button
          onClick={addEntry}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border py-3 text-xs font-medium text-muted-foreground transition-mechanical hover:border-primary hover:text-primary"
        >
          <Plus className="h-3 w-3" />
          Add KPI ({entries.length}/7)
        </button>
      )}
    </div>
  );
}
