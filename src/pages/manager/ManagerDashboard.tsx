import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useManagerEvaluations } from '@/hooks/useSupabaseQueries';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, RotateCcw, CheckCircle, Send, AlertTriangle, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getClassification } from '@/lib/scoreEngine';
import { getEvaluationStatus } from '@/lib/evaluationAudit';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ACCENT = '#f59e0b';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: evaluations, isLoading, refetch } = useManagerEvaluations();
  const [dismissedSLA, setDismissedSLA] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const myId = user?.id;

  const pending = useMemo(() =>
    (evaluations || []).filter((e: any) =>
      (e.status === 'submitted' && e.first_manager_id === myId) ||
      (e.status === 'second_manager_review' && e.second_manager_id === myId)
    ), [evaluations, myId]);

  const revisionCount = (evaluations || []).filter((e: any) => e.status === 'revision_requested' && e.first_manager_id === myId).length;
  const approvedCount = (evaluations || []).filter((e: any) =>
    ['first_manager_approved', 'second_manager_approved', 'sent_to_hc', 'hc_validated', 'archived'].includes(e.status) &&
    (e.first_manager_id === myId || e.second_manager_id === myId)
  ).length;
  const sentToHCCount = (evaluations || []).filter((e: any) =>
    ['sent_to_hc', 'hc_validated', 'archived'].includes(e.status) && e.first_manager_id === myId
  ).length;

  function getDaysWaiting(ev: any) {
    if (ev.status === 'second_manager_review' && ev.stage_second_manager_started_at) {
      return Math.floor((Date.now() - new Date(ev.stage_second_manager_started_at).getTime()) / 86400000);
    }
    if (ev.stage_submitted_at) {
      return Math.floor((Date.now() - new Date(ev.stage_submitted_at).getTime()) / 86400000);
    }
    return 0;
  }

  const overdueCount = pending.filter((e: any) => getDaysWaiting(e) >= 5).length;

  // Distribution chart data
  const distributionData = useMemo(() => {
    const bands = ['Very Poor', 'Poor', 'Fairly Good', 'Good', 'Excellent', 'Exceptional'];
    const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#a855f7', '#f59e0b'];
    const completed = (evaluations || []).filter((e: any) => ['archived', 'hc_validated'].includes(e.status) && e.final_score != null);
    return bands.map((band, i) => ({
      name: band,
      count: completed.filter((e: any) => getClassification(Number(e.final_score)).label === band).length,
      fill: colors[i],
    }));
  }, [evaluations]);

  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleBulkApprove = async () => {
    if (!myId || selected.length === 0) return;
    setBulkProcessing(true);
    try {
      for (const evalId of selected) {
        await supabase.from('evaluations').update({
          status: 'first_manager_approved',
          first_manager_reviewed_at: new Date().toISOString(),
        } as any).eq('id', evalId);
        await supabase.from('audit_logs').insert({
          evaluation_id: evalId, actor_id: myId, actor_role: 'manager',
          action: 'Bulk approved by manager', old_status: 'submitted', new_status: 'first_manager_approved',
        } as any);
      }
      toast.success(`${selected.length} evaluations approved.`);
      setSelected([]);
      refetch();
    } catch { toast.error('Bulk approve failed'); }
    finally { setBulkProcessing(false); }
  };

  return (
    <DashboardLayout pageTitle="Manager Dashboard">
      {/* SLA Alert */}
      {!dismissedSLA && overdueCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border-l-4 border-l-warning bg-[#78350f] px-4 py-3 text-sm text-[#fde68a]">
          <span>⚑ {overdueCount} evaluation(s) have been waiting for your review for more than 5 days. <button onClick={() => navigate('/manager/pending')} className="underline font-medium">Review now →</button></span>
          <button onClick={() => setDismissedSLA(true)} className="p-1 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending My Review" value={pending.length} icon={Clock} accentColor={ACCENT} pulse={pending.length > 0}
          sublabel={overdueCount > 0 ? `${overdueCount} overdue (5+ days)` : undefined} />
        <StatCard label="Revision Requested" value={revisionCount} icon={RotateCcw} accentColor="#ef4444"
          sublabel="Awaiting employee resubmission" />
        <StatCard label="Approved by Me" value={approvedCount} icon={CheckCircle} accentColor="#22c55e" />
        <StatCard label="Sent to HC" value={sentToHCCount} icon={Send} accentColor="#a855f7" />
      </div>

      {/* Distribution Chart */}
      <div className="surface-card p-5 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Team Score Distribution — 2025</h2>
        {distributionData.some(d => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distributionData}>
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distributionData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Distribution will appear after evaluations are completed.</p>
        )}
      </div>

      {/* Pending Table */}
      <div className="surface-card">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-sm font-medium text-foreground">Submissions Awaiting My Review</h2>
            <p className="text-xs text-muted-foreground">Sorted by days waiting — longest first.</p>
          </div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : pending.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-5 py-3 w-8"><input type="checkbox" checked={selected.length === pending.length && pending.length > 0}
                    onChange={() => setSelected(selected.length === pending.length ? [] : pending.map((e: any) => e.id))}
                    className="rounded border-border" /></th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Dept</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Days Waiting</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">My Role</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...pending].sort((a: any, b: any) => getDaysWaiting(b) - getDaysWaiting(a)).map((ev: any) => {
                  const days = getDaysWaiting(ev);
                  const daysBg = days >= 10 ? 'bg-[#7c2d12] text-[#fca5a5]' : days >= 5 ? 'bg-[#78350f] text-[#fde68a]' : 'bg-[#14532d] text-[#86efac]';
                  const role = ev.second_manager_id === myId && ev.status === 'second_manager_review' ? '2nd Manager' : 'First Manager';
                  return (
                    <tr key={ev.id} className={`border-b border-border/50 hover:bg-card/50 transition-fast ${days >= 10 ? 'animate-pulse' : ''}`}>
                      <td className="px-5 py-3"><input type="checkbox" checked={selected.includes(ev.id)} onChange={() => toggleSelect(ev.id)} className="rounded border-border" /></td>
                      <td className="px-5 py-3 font-medium text-foreground">{ev.employee?.full_name || 'Unknown'}</td>
                      <td className="px-5 py-3 text-muted-foreground">{ev.employee?.department || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${daysBg}`}>
                          {days >= 5 && '⚑ '}{days}d
                        </span>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                      <td className="px-5 py-3 font-mono text-foreground">{ev.final_score ? Number(ev.final_score).toFixed(2) : '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${role === '2nd Manager' ? 'bg-[#1c2d5f] text-[#a5b4fc]' : 'bg-[#3f2a00] text-[#fde68a]'}`}>{role}</span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => navigate(`/manager/review/${ev.id}`)} className="text-warning hover:underline text-xs font-medium">Review</button>
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

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-[220px] right-0 z-50 bg-card border-t border-border px-6 py-3 flex items-center justify-between animate-in slide-in-from-bottom">
          <span className="text-sm text-foreground font-medium">{selected.length} evaluation(s) selected</span>
          <div className="flex gap-3">
            <button onClick={() => setSelected([])} className="text-sm text-muted-foreground hover:text-foreground">Clear Selection</button>
            <button onClick={handleBulkApprove} disabled={bulkProcessing}
              className="px-4 py-2 rounded-lg bg-[#14532d] text-[#86efac] text-sm font-medium hover:bg-[#14532d]/80 disabled:opacity-50">
              {bulkProcessing ? 'Approving...' : 'Approve All Selected'}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
