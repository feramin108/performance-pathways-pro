import { cn } from '@/lib/utils';

type EvalStatus = string;
type StatusBadgeTone = 'default' | 'muted';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; mutedBg?: string; mutedText?: string }> = {
  draft: { label: 'Draft', bg: 'bg-border', text: 'text-muted-foreground' },
  submitted: { label: 'Submitted', bg: 'bg-role-manager-bg', text: 'text-role-manager-text', mutedBg: 'bg-muted', mutedText: 'text-muted-foreground' },
  revision_requested: { label: 'Revision Requested', bg: 'bg-role-hc-bg', text: 'text-role-hc-text', mutedBg: 'bg-muted', mutedText: 'text-muted-foreground' },
  first_manager_approved: { label: '1st Manager Approved', bg: 'bg-role-employee-bg', text: 'text-role-employee-text', mutedBg: 'bg-muted', mutedText: 'text-muted-foreground' },
  second_manager_review: { label: '2nd Manager Review', bg: 'bg-primary/15', text: 'text-primary', mutedBg: 'bg-muted', mutedText: 'text-muted-foreground' },
  second_manager_approved: { label: '2nd Manager Approved', bg: 'bg-primary/15', text: 'text-primary', mutedBg: 'bg-muted', mutedText: 'text-muted-foreground' },
  sent_to_hc: { label: 'Sent to HC', bg: 'bg-accent', text: 'text-accent-foreground', mutedBg: 'bg-muted', mutedText: 'text-muted-foreground' },
  hc_validated: { label: 'HC Validated', bg: 'bg-success/15', text: 'text-success', mutedBg: 'bg-muted', mutedText: 'text-muted-foreground' },
  archived: { label: 'Archived', bg: 'bg-card', text: 'text-muted-foreground', mutedBg: 'bg-muted', mutedText: 'text-muted-foreground' },
};

export function StatusBadge({ status, tone = 'default' }: { status: EvalStatus; tone?: StatusBadgeTone }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-border',
    text: 'text-muted-foreground',
    mutedBg: 'bg-muted',
    mutedText: 'text-muted-foreground',
  };

  const bg = tone === 'muted' ? (config.mutedBg || 'bg-muted') : config.bg;
  const text = tone === 'muted' ? (config.mutedText || 'text-muted-foreground') : config.text;

  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium', bg, text)}>
      {config.label}
    </span>
  );
}
