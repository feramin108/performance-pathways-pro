import { KPIEntry } from '@/types/evaluation';
import { KPICard } from '../KPICard';

interface Props {
  entries: KPIEntry[];
  setEntries: (entries: KPIEntry[]) => void;
  isSalesStaff: boolean;
}

export function PrimaryA2Step({ entries, setEntries, isSalesStaff }: Props) {
  const weight = isSalesStaff ? '25%' : '15%';

  const updateEntry = (updated: KPIEntry) => {
    setEntries([updated]);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Primary KPI A2 — WIG</h2>
        <span className="text-data rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          Weight: {weight}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Wildly Important Goal. Maximum 1 KPI. Ensure alignment with departmental WIGs before submission.
      </p>

      {entries[0] && (
        <KPICard
          entry={entries[0]}
          index={0}
          onChange={updateEntry}
        />
      )}
    </div>
  );
}
