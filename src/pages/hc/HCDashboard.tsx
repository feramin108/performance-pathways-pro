import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { useHCEvaluations, useAllProfiles } from '@/hooks/useSupabaseQueries';
import { Clock, CheckCircle, AlertTriangle, Users, Flag } from 'lucide-react';

const ACCENT = 'hsl(0, 84%, 60%)';

export default function HCDashboard() {
  const { data: evaluations } = useHCEvaluations();
  const { data: profiles } = useAllProfiles();

  const received = evaluations?.filter((e: any) => e.status === 'sent_to_hc').length || 0;
  const validated = evaluations?.filter((e: any) => e.status === 'hc_validated').length || 0;
  const managementPending = evaluations?.filter((e: any) => e.hc_decision === 'management_action').length || 0;
  const activeEmployees = profiles?.filter((p: any) => p.is_active).length || 0;

  // SLA check: evaluations sitting in a stage > 5 days
  const slaExceeded = evaluations?.filter((e: any) => {
    const checkField = e.stage_hc_review_started_at || e.stage_submitted_at;
    if (!checkField || ['hc_validated', 'archived', 'draft'].includes(e.status)) return false;
    const days = Math.floor((Date.now() - new Date(checkField).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 5;
  }).length || 0;

  return (
    <DashboardLayout pageTitle="HC Dashboard">
      {/* SLA Alert Banner */}
      {slaExceeded > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-role-manager-bg border-l-[3px] border-l-warning px-4 py-3">
          <Flag className="h-4 w-4 text-warning flex-shrink-0" />
          <p className="text-sm text-role-manager-text">
            <strong>{slaExceeded}</strong> evaluation{slaExceeded > 1 ? 's have' : ' has'} exceeded SLA thresholds.{' '}
            <button className="underline hover:no-underline font-medium">View SLA details →</button>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Received from Managers" value={received} icon={Clock} accentColor={ACCENT} />
        <StatCard label="HC Validated" value={validated} icon={CheckCircle} accentColor={ACCENT} />
        <StatCard label="Management Action Pending" value={managementPending} icon={AlertTriangle} accentColor={ACCENT} />
        <StatCard label="Active Employees" value={activeEmployees} icon={Users} accentColor={ACCENT} />
      </div>

      <div className="surface-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Pending HC Validation</h2>
        </div>
        <div className="p-12 text-center">
          <CheckCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No evaluations pending HC validation.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
