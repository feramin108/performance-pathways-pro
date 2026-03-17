import { cn } from '@/lib/utils';

type EvalStatus = string;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft:                    { label: 'Draft',                   bg: 'bg-border',          text: 'text-muted-foreground' },
  submitted:                { label: 'Submitted',               bg: 'bg-role-manager-bg', text: 'text-role-manager-text' },
  revision_requested:       { label: 'Revision Requested',      bg: 'bg-role-hc-bg',      text: 'text-role-hc-text' },
  first_manager_approved:   { label: '1st Manager Approved',    bg: 'bg-role-employee-bg', text: 'text-role-employee-text' },
  second_manager_review:    { label: '2nd Manager Review',      bg: 'bg-primary/15',      text: 'text-primary' },
  second_manager_approved:  { label: '2nd Manager Approved',    bg: 'bg-primary/15',      text: 'text-primary' },
  sent_to_hc:               { label: 'Sent to HC',             bg: 'bg-accent',          text: 'text-accent-foreground' },
  hc_validated:             { label: 'HC Validated',            bg: 'bg-success/15',      text: 'text-success' },
  archived:                 { label: 'Archived',                bg: 'bg-card',            text: 'text-muted-foreground' },
};

export function StatusBadge({ status }: { status: EvalStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, bg: 'bg-border', text: 'text-muted-foreground' };
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium', config.bg, config.text)}>
      {config.label}
    </span>
  );
}
