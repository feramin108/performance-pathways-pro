import { KPIEntry, calculateCategoryScore, getClassificationColor } from '@/types/evaluation';
import { ScoreDisplay } from '../ScoreDisplay';

interface Props {
  primaryA1: KPIEntry[];
  primaryA2: KPIEntry[];
  secondaryKPIs: KPIEntry[];
  genericKPIs: KPIEntry[];
  isSalesStaff: boolean;
  totalScore: number;
  classification: string;
}

export function FinalizeStep({ primaryA1, primaryA2, secondaryKPIs, genericKPIs, isSalesStaff, totalScore, classification }: Props) {
  const a1Weight = isSalesStaff ? 50 : 60;
  const a2Weight = isSalesStaff ? 25 : 15;

  const categories = [
    { label: 'Primary A1', entries: primaryA1, weight: a1Weight, score: calculateCategoryScore(primaryA1) },
    { label: 'Primary A2 (WIG)', entries: primaryA2, weight: a2Weight, score: calculateCategoryScore(primaryA2) },
    { label: 'Secondary KPIs', entries: secondaryKPIs, weight: 10, score: calculateCategoryScore(secondaryKPIs) },
    { label: 'Generic KPIs', entries: genericKPIs, weight: 15, score: calculateCategoryScore(genericKPIs) },
  ];

  const colorClass = getClassificationColor(classification);

  // Validation checks
  const validations = [
    { label: 'Primary A1: 5–7 KPIs', valid: primaryA1.length >= 5 && primaryA1.length <= 7 },
    { label: 'Primary A1: All titled', valid: primaryA1.every(k => k.title.trim()) },
    { label: 'Primary A2: Max 1 KPI', valid: primaryA2.length === 1 },
    { label: 'Secondary: 2–3 KPIs', valid: secondaryKPIs.length >= 2 && secondaryKPIs.length <= 3 },
    { label: 'Generic: 3–4 KPIs', valid: genericKPIs.length >= 3 && genericKPIs.length <= 4 },
  ];

  const allValid = validations.every(v => v.valid);

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold tracking-tight">Finalize & Submit</h2>
      <p className="mb-6 text-xs text-muted-foreground">
        Review your evaluation summary before submitting.
      </p>

      {/* Score Summary */}
      <div className="mb-6 surface-card p-6 text-center">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Final Score</p>
        <div className="my-2">
          <ScoreDisplay score={totalScore} size="lg" />
        </div>
        <p className={`text-lg font-semibold ${colorClass}`}>{classification}</p>
      </div>

      {/* Category Breakdown */}
      <div className="mb-6 surface-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">KPIs</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Raw Score</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Weight</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Weighted</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.label} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm font-medium">{cat.label}</td>
                <td className="px-4 py-3 text-right text-data text-sm">{cat.entries.length}</td>
                <td className="px-4 py-3 text-right text-data text-sm">{Math.round(cat.score)}</td>
                <td className="px-4 py-3 text-right text-data text-sm">{cat.weight}%</td>
                <td className="px-4 py-3 text-right text-data text-sm font-semibold">{Math.round(cat.score * cat.weight / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Validation Checklist */}
      <div className="surface-card p-4">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Validation Checklist
        </p>
        <div className="space-y-2">
          {validations.map(v => (
            <div key={v.label} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${v.valid ? 'bg-success' : 'bg-destructive'}`} />
              <span className="text-xs text-muted-foreground">{v.label}</span>
            </div>
          ))}
        </div>
        {!allValid && (
          <p className="mt-3 text-xs text-destructive">
            Please resolve all validation issues before submitting.
          </p>
        )}
      </div>
    </div>
  );
}
