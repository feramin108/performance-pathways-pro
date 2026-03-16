import { KPIEntry } from '@/types/evaluation';
import { KPICard } from '../KPICard';
import { Plus, Trash2 } from 'lucide-react';
import { GENERIC_KPI_TEMPLATES } from '@/store/mockData';

interface Props {
  entries: KPIEntry[];
  setEntries: (entries: KPIEntry[]) => void;
}

export function GenericStep({ entries, setEntries }: Props) {
  const addEntry = () => {
    if (entries.length >= 4) return;
    const usedTitles = entries.map(e => e.title);
    const nextTitle = GENERIC_KPI_TEMPLATES.find(t => !usedTitles.includes(t)) || '';
    setEntries([...entries, { id: `kpi_${Date.now()}`, title: nextTitle, rating: 0, comment: '' }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 3) return;
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, updated: KPIEntry) => {
    setEntries(entries.map(e => e.id === id ? updated : e));
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Generic KPIs</h2>
        <span className="text-data rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          Weight: 15%
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Minimum 3, maximum 4 KPIs. Standard competencies applicable to all roles.
      </p>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.id} className="relative">
            <KPICard entry={entry} index={index} onChange={(u) => updateEntry(entry.id, u)} titleEditable={false} />
            {entries.length > 3 && (
              <button onClick={() => removeEntry(entry.id)} className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground transition-mechanical hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {entries.length < 4 && (
        <button onClick={addEntry} className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border py-3 text-xs font-medium text-muted-foreground transition-mechanical hover:border-primary hover:text-primary">
          <Plus className="h-3 w-3" />
          Add KPI ({entries.length}/4)
        </button>
      )}
    </div>
  );
}
