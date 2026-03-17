import { useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useMyEvaluations, useActiveCycle } from '@/hooks/useSupabaseQueries';
import { useAuth } from '@/contexts/AuthContext';
import { getClassificationBg } from '@/lib/scoreEngine';
import { FileText, Edit, Clock, CheckCircle, Plus, AlertTriangle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function EmployeeDashboard() {
  const { data: evaluations, isLoading } = useMyEvaluations();
  const { data: activeCycle } = useActiveCycle();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const total = evaluations?.length || 0;
  const drafts = evaluations?.filter((e: any) => e.status === 'draft').length || 0;
  const awaiting = evaluations?.filter((e: any) => ['submitted', 'revision_requested'].includes(e.status)).length || 0;
  const completed = evaluations?.filter((e: any) => e.status === 'archived').length || 0;

  // Deadline
  const deadline = useMemo(() => {
    if (!activeCycle) return null;
    const end = new Date((activeCycle as any).end_date);
    const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days > 30 || days < 0) return null;
    // Hide if already submitted
    const hasSubmitted = evaluations?.some((e: any) => e.cycle_id === (activeCycle as any).id && !['draft'].includes(e.status));
    if (hasSubmitted) return null;
    const draftEval = evaluations?.find((e: any) => e.cycle_id === (activeCycle as any).id && e.status === 'draft');
    return { days, draftId: draftEval?.id };
  }, [activeCycle, evaluations]);

  // Trend data
  const trendData = useMemo(() => {
    if (!evaluations) return [];
    return evaluations
      .filter((e: any) => e.final_score)
      .map((e: any) => ({ year: new Date(e.created_at).getFullYear(), score: Number(e.final_score), classification: e.final_classification }))
      .sort((a: any, b: any) => a.year - b.year);
  }, [evaluations]);

  const getDeadlineBanner = () => {
    if (!deadline) return null;
    const { days, draftId } = deadline;
    let cls = 'bg-role-employee-bg text-role-employee-text';
    let msg = `Annual Appraisal ${(activeCycle as any)?.year || ''} closes in ${days} days — complete your evaluation before the deadline.`;
    if (days <= 3) {
      cls = 'bg-[#7c2d12] text-[#fca5a5] animate-deadline-pulse border border-destructive/50';
      msg = `⚠ URGENT — ${days} days until cycle closes.`;
    } else if (days <= 7) {
      cls = 'bg-[#7c2d12] text-[#fca5a5]';
      msg = `⚑ ${days} days left — submit your evaluation now.`;
    } else if (days <= 14) {
      cls = 'bg-role-manager-bg text-role-manager-text';
      msg = `⚑ ${days} days remaining — your evaluation is due soon.`;
    }
    return (
      <div className={`rounded-lg p-3 mb-6 text-sm ${cls}`}>
        {msg}
        {draftId && (
          <button onClick={() => navigate(`/employee/evaluation/${draftId}/edit`)} className="ml-2 underline font-medium">
            Continue your draft →
          </button>
        )}
      </div>
    );
  };

  const getActionButton = (ev: any) => {
    if (ev.status === 'draft') return <button onClick={() => navigate(`/employee/evaluation/${ev.id}/edit`)} className="text-primary hover:underline text-xs font-medium">Continue</button>;
    if (ev.status === 'revision_requested') return <button onClick={() => navigate(`/employee/evaluation/${ev.id}/edit`)} className="text-warning hover:underline text-xs font-medium animate-pulse">Revise</button>;
    return <button onClick={() => navigate(`/employee/evaluation/${ev.id}`)} className="text-muted-foreground hover:text-foreground text-xs font-medium border border-border px-2 py-0.5 rounded">View</button>;
  };

  return (
    <DashboardLayout pageTitle="My Dashboard">
      {getDeadlineBanner()}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Evaluations" value={total} icon={FileText} accentColor="hsl(var(--primary))" />
        <StatCard label="Drafts" value={drafts} icon={Edit} accentColor="hsl(var(--warning))" pulse={drafts > 0} />
        <StatCard label="Awaiting Review" value={awaiting} icon={Clock} accentColor="hsl(var(--primary))" />
        <StatCard label="Completed" value={completed} icon={CheckCircle} accentColor="hsl(var(--success))" />
      </div>

      {/* Trend Chart */}
      <div className="surface-card p-5 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> My Performance Trend
        </h2>
        {trendData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 27%)" />
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13 }}
                  formatter={(v: any, _: any, item: any) => [`${v} — ${item.payload.classification}`, 'Score']}
                />
                <ReferenceLine y={35} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={49} stroke="#f97316" strokeDasharray="3 3" />
                <ReferenceLine y={65} stroke="#eab308" strokeDasharray="3 3" />
                <ReferenceLine y={80} stroke="#3b82f6" strokeDasharray="3 3" />
                <ReferenceLine y={95} stroke="#a855f7" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            {trendData.length === 1 && (
              <p className="text-xs text-muted-foreground text-center mt-2">More data available after next cycle.</p>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Your performance trend will appear here after your first completed evaluation.</p>
          </div>
        )}
      </div>

      {/* Evaluations Table */}
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
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Classification</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Submitted</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev: any) => (
                  <tr key={ev.id} className="border-b border-border/50 hover:bg-card/50 transition-fast">
                    <td className="px-5 py-3 text-foreground">{new Date(ev.created_at).getFullYear()}</td>
                    <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-5 py-3 text-data text-foreground">{ev.final_score ? Number(ev.final_score).toFixed(2) : '—'}</td>
                    <td className="px-5 py-3">
                      {ev.final_classification ? (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getClassificationBg(ev.final_classification)}`}>
                          {ev.final_classification}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{ev.submitted_at ? new Date(ev.submitted_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3">{getActionButton(ev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No evaluations yet. Start your {(activeCycle as any)?.year || new Date().getFullYear()} appraisal below.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/employee/evaluation/new')}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-fast z-10"
      >
        <Plus className="h-4 w-4" /> New Evaluation
      </button>
    </DashboardLayout>
  );
}
