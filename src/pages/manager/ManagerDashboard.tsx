import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useManagerEvaluations } from '@/hooks/useSupabaseQueries';
import { Clock, RotateCcw, CheckCircle, Send, AlertTriangle } from 'lucide-react';

const ACCENT = 'hsl(38, 93%, 50%)';

export default function ManagerDashboard() {
  const { data: evaluations, isLoading } = useManagerEvaluations();

  const pending = evaluations?.filter((e: any) => e.status === 'submitted').length || 0;
  const revision = evaluations?.filter((e: any) => e.status === 'revision_requested').length || 0;
  const approved = evaluations?.filter((e: any) => e.status === 'first_manager_approved').length || 0;
  const sentToHC = evaluations?.filter((e: any) => e.status === 'sent_to_hc').length || 0;

  const pendingEvals = evaluations?.filter((e: any) => e.status === 'submitted') || [];

  function getDaysWaiting(stageSubmittedAt: string | null) {
    if (!stageSubmittedAt) return 0;
    return Math.floor((Date.now() - new Date(stageSubmittedAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <DashboardLayout pageTitle="Manager Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Review" value={pending} icon={Clock} accentColor={ACCENT} pulse={pending > 0} />
        <StatCard label="Revision Requested" value={revision} icon={RotateCcw} accentColor={ACCENT} />
        <StatCard label="Approved" value={approved} icon={CheckCircle} accentColor={ACCENT} />
        <StatCard label="Sent to HC" value={sentToHC} icon={Send} accentColor={ACCENT} />
      </div>

      <div className="surface-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Submissions Awaiting Review</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : pendingEvals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Dept</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Branch</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Days Waiting</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingEvals.map((ev: any) => {
                  const days = getDaysWaiting(ev.stage_submitted_at);
                  const daysClass = days >= 10 ? 'text-destructive' : days >= 5 ? 'text-warning' : 'text-success';
                  const employeeName = ev.employee?.full_name || 'Unknown';
                  const dept = ev.employee?.department || '—';
                  const branch = ev.employee?.branch || '—';
                  return (
                    <tr key={ev.id} className="border-b border-border/50 hover:bg-card/50 transition-fast">
                      <td className="px-5 py-3 font-medium text-foreground">{employeeName}</td>
                      <td className="px-5 py-3 text-muted-foreground">{dept}</td>
                      <td className="px-5 py-3 text-muted-foreground">{branch}</td>
                      <td className={`px-5 py-3 font-medium text-tabular ${daysClass}`}>
                        {days >= 5 && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                        {days} days
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                      <td className="px-5 py-3 text-data text-foreground">{ev.final_score ? Number(ev.final_score).toFixed(2) : '—'}</td>
                      <td className="px-5 py-3">
                        <button className="text-warning hover:underline text-xs font-medium transition-fast">Review</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <CheckCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No submissions awaiting review.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
