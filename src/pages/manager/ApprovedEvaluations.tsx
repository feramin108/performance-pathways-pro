import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useManagerEvaluations } from '@/hooks/useSupabaseQueries';
import { useAuth } from '@/contexts/AuthContext';
import { getClassificationBg, getClassification } from '@/lib/scoreEngine';
import { getEvaluationStatus } from '@/lib/evaluationAudit';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, CheckCircle, BarChart3, Trophy, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ApprovedEvaluations() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: evaluations, isLoading, refetch } = useManagerEvaluations();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const myId = user?.id;

  const approved = useMemo(() =>
    (evaluations || []).filter((e: any) =>
      ['first_manager_approved', 'second_manager_approved', 'sent_to_hc', 'hc_validated', 'archived'].includes(e.status) &&
      (e.first_manager_id === myId || e.second_manager_id === myId)
    ), [evaluations, myId]);

  const readyForHC = useMemo(() =>
    approved.filter((e: any) => e.status === 'first_manager_approved' && !e.second_manager_required)
  , [approved]);

  const handleSendAllToHC = async () => {
    setSending(true);
    try {
      for (const ev of readyForHC) {
        await supabase.from('evaluations').update({
          status: 'sent_to_hc',
          stage_hc_review_started_at: new Date().toISOString(),
        } as any).eq('id', (ev as any).id);
        await supabase.from('audit_logs').insert({
          evaluation_id: (ev as any).id, actor_id: myId, actor_role: 'manager',
          actor_username: profile?.full_name,
          action: 'Batch sent to HC by manager', old_status: 'first_manager_approved', new_status: 'sent_to_hc',
        } as any);
      }
      toast.success(`${readyForHC.length} evaluations sent to HC.`);
      refetch();
    } catch { toast.error('Failed'); }
    finally { setSending(false); }
  };

  // Analytics
  const topPerformers = useMemo(() =>
    approved.filter((e: any) => e.final_score != null && ['archived', 'hc_validated'].includes(e.status))
      .sort((a: any, b: any) => Number(b.final_score) - Number(a.final_score))
      .slice(0, 5)
  , [approved]);

  const needsAttention = useMemo(() =>
    approved.filter((e: any) => e.final_score != null && Number(e.final_score) < 50)
  , [approved]);

  // Category averages (simplified)
  const distributionData = useMemo(() => {
    const bands = ['Very Poor', 'Poor', 'Fairly Good', 'Good', 'Excellent', 'Exceptional'];
    const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#a855f7', '#f59e0b'];
    const completed = approved.filter((e: any) => e.final_score != null);
    return bands.map((band, i) => ({
      name: band,
      count: completed.filter((e: any) => getClassification(Number(e.final_score)).label === band).length,
      fill: colors[i],
    }));
  }, [approved]);

  return (
    <DashboardLayout pageTitle="Approved Evaluations">
      {/* Batch Send Banner */}
      {readyForHC.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border-l-4 border-l-primary bg-role-employee-bg px-4 py-3 text-sm text-role-employee-text">
          <span>Ready to send to HC: {readyForHC.length} approved evaluation(s).</span>
          <div className="flex gap-2">
            <button onClick={() => setSelectMode(!selectMode)}
              className="px-3 py-1.5 rounded text-xs border border-border text-foreground hover:bg-card/50">
              {selectMode ? 'Cancel Select' : 'Select & Send'}
            </button>
            <button onClick={handleSendAllToHC} disabled={sending}
              className="px-3 py-1.5 rounded text-xs bg-primary text-primary-foreground font-medium disabled:opacity-50">
              {sending ? 'Sending...' : 'Send All to HC'}
            </button>
          </div>
        </div>
      )}

      <div className="surface-card mb-6">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : approved.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {selectMode && <th className="px-5 py-3 w-8"></th>}
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Classification</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">2nd Manager</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((ev: any) => {
                  const score = ev.final_score ? Number(ev.final_score) : null;
                  const cls = score ? getClassification(score).label : null;
                  return (
                    <tr key={ev.id} className="border-b border-border/50 hover:bg-card/50 transition-fast">
                      {selectMode && (
                        <td className="px-5 py-3">
                          {ev.status === 'first_manager_approved' && !ev.second_manager_required && (
                            <input type="checkbox" checked={selected.includes(ev.id)}
                              onChange={() => setSelected(s => s.includes(ev.id) ? s.filter(x => x !== ev.id) : [...s, ev.id])}
                              className="rounded border-border" />
                          )}
                        </td>
                      )}
                      <td className="px-5 py-3 font-medium text-foreground">{ev.employee?.full_name || 'Unknown'}</td>
                      <td className="px-5 py-3 font-mono text-foreground">{score ? score.toFixed(2) : '—'}</td>
                      <td className="px-5 py-3">{cls && <span className={`px-2 py-0.5 rounded text-xs font-medium ${getClassificationBg(cls)}`}>{cls}</span>}</td>
                      <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                      <td className="px-5 py-3">{ev.second_manager_required && <span className="px-1.5 py-0.5 bg-[#1c2d5f] text-[#a5b4fc] rounded text-[10px]">Required</span>}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => navigate(`/manager/review/${ev.id}`)} className="text-warning hover:underline text-xs font-medium">View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">No approved evaluations yet.</div>
        )}
      </div>

      {/* Score Distribution */}
      <div className="surface-card p-5 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Team Score Distribution</h2>
        {distributionData.some(d => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
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
          <p className="text-sm text-muted-foreground text-center py-6">No data yet.</p>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surface-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-warning" /> KPI Category Averages</h3>
          <p className="text-xs text-muted-foreground">Available after evaluations are archived.</p>
        </div>
        <div className="surface-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> Top Performers</h3>
          {topPerformers.length > 0 ? (
            <div className="space-y-2">
              {topPerformers.map((ev: any, i: number) => {
                const score = Number(ev.final_score);
                const cls = getClassification(score).label;
                return (
                  <div key={ev.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{i + 1}. {ev.employee?.full_name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getClassificationBg(cls)}`}>{score.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No completed evaluations.</p>
          )}
        </div>
        <div className="surface-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Needs Attention</h3>
          {needsAttention.length > 0 ? (
            <div className="space-y-2">
              {needsAttention.map((ev: any) => {
                const score = Number(ev.final_score);
                const cls = getClassification(score).label;
                return (
                  <div key={ev.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{ev.employee?.full_name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getClassificationBg(cls)}`}>{score.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">All team members performing satisfactorily.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
