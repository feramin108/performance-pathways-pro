import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useMyEvaluations } from '@/hooks/useSupabaseQueries';
import { FileText, Edit, Clock, CheckCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ACCENT = 'hsl(217, 91%, 60%)';

export default function EmployeeDashboard() {
  const { data: evaluations, isLoading } = useMyEvaluations();
  const navigate = useNavigate();

  const total = evaluations?.length || 0;
  const drafts = evaluations?.filter((e: any) => e.status === 'draft').length || 0;
  const awaiting = evaluations?.filter((e: any) => ['submitted', 'first_manager_approved', 'sent_to_hc'].includes(e.status)).length || 0;
  const completed = evaluations?.filter((e: any) => ['hc_validated', 'archived'].includes(e.status)).length || 0;

  return (
    <DashboardLayout pageTitle="My Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Evaluations" value={total} icon={FileText} accentColor={ACCENT} />
        <StatCard label="Drafts" value={drafts} icon={Edit} accentColor={ACCENT} />
        <StatCard label="Awaiting Review" value={awaiting} icon={Clock} accentColor={ACCENT} />
        <StatCard label="Completed" value={completed} icon={CheckCircle} accentColor={ACCENT} />
      </div>

      {/* Table */}
      <div className="surface-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">My Evaluations</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading evaluations...</div>
        ) : evaluations && evaluations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Year</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Cycle</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Submitted</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev: any) => (
                  <tr key={ev.id} className="border-b border-border/50 hover:bg-card/50 transition-fast">
                    <td className="px-5 py-3 text-tabular text-foreground">2025</td>
                    <td className="px-5 py-3 text-foreground">Annual Appraisal</td>
                    <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-5 py-3 text-data text-foreground">{ev.final_score ? Number(ev.final_score).toFixed(2) : '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{ev.submitted_at ? new Date(ev.submitted_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3">
                      <button className="text-primary hover:underline text-xs font-medium transition-fast">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No evaluations yet — click <strong className="text-foreground">New Evaluation</strong> to begin your 2025 appraisal.
            </p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/employee/evaluation/new')}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-fast z-10"
      >
        <Plus className="h-4 w-4" />
        New Evaluation
      </button>
    </DashboardLayout>
  );
}
