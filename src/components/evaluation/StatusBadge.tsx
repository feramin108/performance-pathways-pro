import { EvaluationStatus } from '@/types/evaluation';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<EvaluationStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-secondary text-muted-foreground' },
  submitted: { label: 'Submitted', className: 'bg-primary/10 text-primary' },
  under_review: { label: 'Under Review', className: 'bg-warning/10 text-warning' },
  changes_requested: { label: 'Changes Requested', className: 'bg-destructive/10 text-destructive' },
  approved: { label: 'Approved', className: 'bg-success/10 text-success' },
  validated: { label: 'Validated', className: 'bg-success/10 text-success' },
  archived: { label: 'Archived', className: 'bg-secondary text-muted-foreground' },
};

export function StatusBadge({ status }: { status: EvaluationStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex rounded-sm px-2 py-0.5 text-[10px] font-medium', config.className)}>
      {config.label}
    </span>
  );
}
