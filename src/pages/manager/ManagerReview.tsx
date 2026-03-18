import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RatingPills } from '@/components/evaluation/RatingPills';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateScores, getClassificationBg, getClassification } from '@/lib/scoreEngine';
import { getEvaluationStatus } from '@/lib/evaluationAudit';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, RotateCcw, X, Download } from 'lucide-react';

interface KPIEntryData {
  id: string;
  category: string;
  custom_title: string | null;
  employee_rating: number | null;
  manager_rating: number | null;
  employee_comment: string | null;
  manager_comment: string | null;
  sort_order: number;
  anomaly_flagged: boolean;
  rating_gap: number | null;
  kpi_goal_id: string | null;
}

const STATUS_PIPELINE = ['submitted', 'first_manager_approved', 'second_manager_review', 'second_manager_approved', 'sent_to_hc', 'hc_validated', 'archived'];

export default function ManagerReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [evaluation, setEvaluation] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [kpiEntries, setKpiEntries] = useState<KPIEntryData[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [remarks, setRemarks] = useState('');
  const [requireSecondManager, setRequireSecondManager] = useState(false);
  const [secondManagerId, setSecondManagerId] = useState('');
  const [managers, setManagers] = useState<any[]>([]);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: ev }, { data: entries }, { data: logs }] = await Promise.all([
        supabase.from('evaluations').select('*').eq('id', id).single(),
        supabase.from('kpi_entries').select('*').eq('evaluation_id', id).order('sort_order'),
        supabase.from('audit_logs').select('*').eq('evaluation_id', id).order('created_at', { ascending: false }),
      ]);
      if (ev) {
        setEvaluation(ev);
        setRequireSecondManager((ev as any).second_manager_required || false);
        setSecondManagerId((ev as any).second_manager_id || '');
        const { data: emp } = await supabase.from('profiles').select('*').eq('id', (ev as any).employee_id).single();
        if (emp) setEmployee(emp);
      }
      if (entries) setKpiEntries(entries as any);
      if (logs) setAuditLogs(logs as any);
      
      // Load managers for second manager dropdown
      const { data: mgrProfiles } = await supabase.from('profiles').select('id, full_name, department').eq('is_active', true);
      if (mgrProfiles) setManagers(mgrProfiles.filter((p: any) => p.id !== user?.id && p.id !== ev?.employee_id));
      
      setLoading(false);
    })();
  }, [id, user]);

  const myRole = useMemo(() => {
    if (!evaluation || !user) return 'unknown';
    if (evaluation.second_manager_id === user.id && evaluation.status === 'second_manager_review') return 'second_manager';
    if (evaluation.first_manager_id === user.id) return 'first_manager';
    return 'unknown';
  }, [evaluation, user]);

  const empScores = useMemo(() => {
    if (!kpiEntries.length) return null;
    return calculateScores(kpiEntries.map(e => ({
      category: e.category, employee_rating: e.employee_rating, sort_order: e.sort_order,
    })), evaluation?.employee_type || 'non_sales');
  }, [kpiEntries, evaluation]);

  const getDaysWaiting = () => {
    if (!evaluation) return 0;
    const ref = evaluation.status === 'second_manager_review' ? evaluation.stage_second_manager_started_at : evaluation.stage_submitted_at;
    if (!ref) return 0;
    return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
  };

  const updateManagerRating = (entryId: string, rating: number) => {
    setKpiEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e;
      const gap = Math.abs(rating - (e.employee_rating || 0));
      return { ...e, manager_rating: rating, rating_gap: gap, anomaly_flagged: gap >= 2 };
    }));
  };

  const updateManagerComment = (entryId: string, comment: string) => {
    setKpiEntries(prev => prev.map(e => e.id === entryId ? { ...e, manager_comment: comment } : e));
  };

  const handleRevision = async () => {
    if (!revisionNote.trim() || !id || !user) return;
    setProcessing(true);
    try {
      await supabase.from('evaluations').update({
        status: 'revision_requested',
        revision_note: revisionNote,
        revision_count: (evaluation?.revision_count || 0) + 1,
        last_revision_requested_at: new Date().toISOString(),
      } as any).eq('id', id);
      await supabase.from('audit_logs').insert({
        evaluation_id: id, actor_id: user.id, actor_role: 'manager',
        actor_username: profile?.full_name,
        action: `Revision requested by ${myRole === 'second_manager' ? 'second' : 'first'} line manager`,
        old_status: evaluation.status, new_status: 'revision_requested',
      } as any);
      await supabase.from('notifications').insert({
        recipient_id: evaluation.employee_id, type: 'revision_requested',
        title: 'Evaluation returned for revision',
        message: `${profile?.full_name} has requested changes to your evaluation: ${revisionNote.slice(0, 100)}`,
        evaluation_id: id,
      } as any);
      toast.success(`Revision request sent.`);
      navigate('/manager/dashboard');
    } catch { toast.error('Failed'); }
    finally { setProcessing(false); }
  };

  const handleApprove = async () => {
    if (!remarks.trim() || remarks.length < 20 || !id || !user) return;
    setProcessing(true);
    try {
      // Save manager ratings
      for (const entry of kpiEntries) {
        if (entry.manager_rating != null) {
          await supabase.from('kpi_entries').update({
            manager_rating: entry.manager_rating,
            manager_comment: entry.manager_comment,
            rating_gap: entry.rating_gap,
            anomaly_flagged: entry.anomaly_flagged,
          } as any).eq('id', entry.id);
        }
      }

      let newStatus: string;
      let action: string;

      if (myRole === 'second_manager') {
        newStatus = 'sent_to_hc';
        action = 'Approved by second line manager — sent to HC';
        await supabase.from('evaluations').update({
          status: newStatus,
          second_manager_remarks: remarks,
          second_manager_reviewed_at: new Date().toISOString(),
          stage_hc_review_started_at: new Date().toISOString(),
        } as any).eq('id', id);
      } else if (requireSecondManager && secondManagerId) {
        newStatus = 'second_manager_review';
        action = 'Approved by first line manager — forwarded to second line manager';
        await supabase.from('evaluations').update({
          status: newStatus,
          first_manager_remarks: remarks,
          first_manager_reviewed_at: new Date().toISOString(),
          second_manager_required: true,
          second_manager_id: secondManagerId,
          stage_second_manager_started_at: new Date().toISOString(),
        } as any).eq('id', id);
        // Notify second manager
        await supabase.from('notifications').insert({
          recipient_id: secondManagerId, type: 'second_mgr_needed',
          title: 'Evaluation requires your sign-off',
          message: `${employee?.full_name}'s evaluation approved by ${profile?.full_name} — your review needed.`,
          evaluation_id: id,
        } as any);
      } else {
        newStatus = 'sent_to_hc';
        action = 'Approved by first line manager — sent to HC';
        await supabase.from('evaluations').update({
          status: newStatus,
          first_manager_remarks: remarks,
          first_manager_reviewed_at: new Date().toISOString(),
          stage_hc_review_started_at: new Date().toISOString(),
        } as any).eq('id', id);
      }

      await supabase.from('audit_logs').insert({
        evaluation_id: id, actor_id: user.id, actor_role: 'manager',
        actor_username: profile?.full_name,
        action, old_status: evaluation.status, new_status: newStatus,
      } as any);

      // Notify employee
      await supabase.from('notifications').insert({
        recipient_id: evaluation.employee_id, type: 'evaluation_approved',
        title: 'Evaluation approved',
        message: `Your evaluation has been approved by ${profile?.full_name}.`,
        evaluation_id: id,
      } as any);

      toast.success('Evaluation approved and forwarded.');
      navigate('/manager/dashboard');
    } catch { toast.error('Failed to approve'); }
    finally { setProcessing(false); }
  };

  if (loading) {
    return <DashboardLayout pageTitle="Review"><div className="p-8 text-center text-muted-foreground">Loading...</div></DashboardLayout>;
  }

  if (!evaluation || !employee) {
    return <DashboardLayout pageTitle="Review"><div className="p-8 text-center text-muted-foreground">Evaluation not found.</div></DashboardLayout>;
  }

  const days = getDaysWaiting();
  const daysBg = days >= 10 ? 'bg-[#7c2d12] text-[#fca5a5]' : days >= 5 ? 'bg-[#78350f] text-[#fde68a]' : 'bg-[#14532d] text-[#86efac]';
  const anomalyCount = kpiEntries.filter(e => e.anomaly_flagged).length;
  const categories = ['A1', 'A2_WIG', 'secondary', 'generic'] as const;
  const catLabels: Record<string, string> = { A1: 'Primary KPIs — A1', A2_WIG: 'WIG — A2', secondary: 'Secondary KPIs', generic: 'Generic KPIs' };

  return (
    <DashboardLayout pageTitle={`Review — ${employee.full_name}`}>
      {/* Employee Info Bar */}
      <div className="surface-card p-4 mb-4 flex flex-wrap items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-surface-raised flex items-center justify-center text-sm font-medium text-muted-foreground">
          {employee.full_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm">{employee.full_name}</div>
          <div className="text-xs text-muted-foreground">{employee.employee_id} · {employee.department} · Branch {employee.branch} · {employee.job_title}</div>
        </div>
        {empScores && (
          <span className={`px-3 py-1 rounded-md text-sm font-medium ${getClassificationBg(empScores.classification)}`}>
            {empScores.finalScore.toFixed(2)} — {empScores.classification}
          </span>
        )}
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${daysBg}`}>{days}d waiting</span>
        <span className={`text-xs px-2 py-0.5 rounded ${myRole === 'second_manager' ? 'bg-[#1c2d5f] text-[#a5b4fc]' : 'bg-[#3f2a00] text-[#fde68a]'}`}>
          {myRole === 'second_manager' ? '2nd Manager' : 'First Manager'}
        </span>
      </div>

      {/* Status Pipeline */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
        {STATUS_PIPELINE.map((s, i) => {
          const idx = STATUS_PIPELINE.indexOf(evaluation.status);
          const isCurrent = s === evaluation.status;
          const isDone = i < idx;
          return (
            <div key={s} className="flex items-center gap-1">
              <span className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap ${isCurrent ? 'bg-primary text-primary-foreground' : isDone ? 'bg-[#14532d] text-[#86efac]' : 'bg-card text-muted-foreground'}`}>
                {s.replace(/_/g, ' ')}
              </span>
              {i < STATUS_PIPELINE.length - 1 && <span className="text-border">→</span>}
            </div>
          );
        })}
      </div>

      {/* Tamper Alert */}
      {evaluation.score_tampered && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/20 border border-destructive text-destructive text-sm">
          ⚠ Score integrity check failed. Ratings may have been altered. Do not approve until reviewed by IT.
        </div>
      )}

      {/* Anomaly Alert */}
      {anomalyCount > 0 && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[#92400e]/30 border border-[#92400e] text-[#fcd34d] text-sm">
          ⚑ {anomalyCount} KPI(s) show a rating difference of 2+ points. Review highlighted KPIs carefully.
        </div>
      )}

      {/* Split Layout */}
      <div className="flex gap-6 items-start">
        {/* Left Panel - Employee Eval */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* General Info */}
          <div className="surface-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">General Information</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Full Name', employee.full_name], ['Function', employee.function_role],
                ['Department', employee.department], ['Branch', employee.branch],
                ['Employee ID', employee.employee_id], ['Type', evaluation.employee_type],
              ].map(([l, v]) => (
                <div key={l as string}><span className="text-muted-foreground text-xs">{l}</span><p className="text-foreground">{v || '—'}</p></div>
              ))}
            </div>
          </div>

          {/* KPI Sections */}
          {categories.map(cat => {
            const entries = kpiEntries.filter(e => e.category === cat);
            if (entries.length === 0) return null;
            return (
              <div key={cat} className="surface-card p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">{catLabels[cat]}</h3>
                {entries.map(entry => (
                  <div key={entry.id} className={`p-3 mb-2 rounded-lg border ${entry.anomaly_flagged ? 'border-[#92400e] bg-[#92400e]/10' : 'border-border bg-surface-raised'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm text-foreground font-medium">{entry.custom_title || 'KPI'}</h4>
                      {entry.anomaly_flagged && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#92400e] text-[#fcd34d]">⚑ Large gap</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">Employee:</span>
                      <RatingPills value={entry.employee_rating} readOnly size="sm" />
                    </div>
                    {entry.employee_comment && (
                      <p className="text-xs text-muted-foreground italic ml-1 mb-2">{entry.employee_comment}</p>
                    )}
                  </div>
                ))}
                {empScores && (
                  <div className="mt-2 p-3 rounded-lg bg-surface-raised border border-border text-xs font-mono text-muted-foreground">
                    {cat === 'A1' && <div>A1 score: {empScores.a1.scoreOn100.toFixed(2)} → weighted: {empScores.a1.weighted.toFixed(2)}</div>}
                    {cat === 'A2_WIG' && <div>A2 score: {empScores.a2.scoreOn100.toFixed(2)} → weighted: {empScores.a2.weighted.toFixed(2)}</div>}
                    {cat === 'secondary' && <div>Sec score: {empScores.secondary.scoreOn100.toFixed(2)} → weighted: {empScores.secondary.weighted.toFixed(2)}</div>}
                    {cat === 'generic' && <div>Gen score: {empScores.generic.scoreOn100.toFixed(2)} → weighted: {empScores.generic.weighted.toFixed(2)}</div>}
                  </div>
                )}
              </div>
            );
          })}

          {/* Final Score */}
          {empScores && (
            <div className="surface-card p-5 border-2 rounded-xl" style={{ borderColor: empScores.classificationColor }}>
              <div className="space-y-1 font-mono text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">A1:</span><span className="text-foreground">{empScores.a1.weighted.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">A2:</span><span className="text-foreground">{empScores.a2.weighted.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Secondary:</span><span className="text-foreground">{empScores.secondary.weighted.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Generic:</span><span className="text-foreground">{empScores.generic.weighted.toFixed(2)}</span></div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between text-base font-semibold">
                  <span className="text-foreground">FINAL:</span>
                  <span className="text-foreground">{empScores.finalScore.toFixed(2)}/100</span>
                </div>
              </div>
              <div className="mt-2">
                <span className={`inline-flex px-3 py-1 rounded-md text-sm font-medium ${getClassificationBg(empScores.classification)}`}>
                  ● {empScores.classification}
                </span>
              </div>
            </div>
          )}

          {/* AI Summary */}
          {evaluation.ai_summary && (
            <div className="surface-card border-l-[3px] border-l-[#a855f7] p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">AI Performance Insight</h3>
              <p className="text-sm text-muted-foreground">{evaluation.ai_summary}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-2">Review before writing your remarks.</p>
            </div>
          )}

          {/* Additional Sections */}
          {(evaluation.career_path || evaluation.training_needs || evaluation.key_areas_improvement || evaluation.proposed_action_plan || evaluation.employee_comments) && (
            <div className="surface-card p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground">Additional Sections</h3>
              {Array.isArray(evaluation.career_path) && evaluation.career_path.length > 0 && (
                <div><span className="text-xs text-muted-foreground block mb-1">Career Path</span><div className="flex flex-wrap gap-1">{evaluation.career_path.map((c: string) => <span key={c} className="px-2 py-0.5 bg-surface-raised text-xs text-foreground rounded">{c}</span>)}</div></div>
              )}
              {Array.isArray(evaluation.training_needs) && evaluation.training_needs.length > 0 && (
                <div><span className="text-xs text-muted-foreground block mb-1">Training Needs</span><div className="flex flex-wrap gap-1">{evaluation.training_needs.map((t: string) => <span key={t} className="px-2 py-0.5 bg-surface-raised text-xs text-foreground rounded">{t}</span>)}</div></div>
              )}
              {evaluation.key_areas_improvement && (
                <div><span className="text-xs text-muted-foreground block mb-1">Key Areas for Improvement</span><p className="text-sm text-foreground">{evaluation.key_areas_improvement}</p></div>
              )}
              {evaluation.proposed_action_plan && (
                <div><span className="text-xs text-muted-foreground block mb-1">Proposed Action Plan</span><p className="text-sm text-foreground">{evaluation.proposed_action_plan}</p></div>
              )}
              {evaluation.employee_comments && (
                <div><span className="text-xs text-muted-foreground block mb-1">Employee Comments</span><p className="text-sm text-foreground">{evaluation.employee_comments}</p></div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Manager Review */}
        <div className="w-[420px] flex-shrink-0 sticky top-[120px] max-h-[calc(100vh-160px)] overflow-y-auto">
          <div className="surface-card p-5 space-y-5">
            {/* Manager KPI Ratings */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">Manager KPI Ratings</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Override employee ratings if needed. Leave blank to accept.</p>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {kpiEntries.map(entry => {
                  const gap = entry.manager_rating != null ? Math.abs(entry.manager_rating - (entry.employee_rating || 0)) : 0;
                  return (
                    <div key={entry.id} className="p-2 rounded-lg border border-border bg-surface-raised">
                      <p className="text-xs text-foreground font-medium truncate mb-1">{entry.custom_title || 'KPI'}</p>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-muted-foreground w-16">Employee: {entry.employee_rating ?? '—'}</span>
                        <RatingPills value={entry.manager_rating} onChange={v => updateManagerRating(entry.id, v)} size="sm" />
                      </div>
                      {gap >= 2 && (
                        <p className="text-[10px] text-[#fcd34d] mb-1">⚑ Gap of {gap} — add a comment to justify.</p>
                      )}
                      <textarea
                        value={entry.manager_comment || ''}
                        onChange={e => updateManagerComment(entry.id, e.target.value)}
                        placeholder="Manager comment..."
                        rows={1}
                        className="input-field w-full h-auto resize-none text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                {myRole === 'second_manager' ? 'Remarks of second line manager' : 'Remarks of first line manager'}
              </h3>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Write your overall assessment, key observations, and recommendations..."
                rows={5}
                className="input-field w-full h-auto resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[10px] ${remarks.length < 20 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {remarks.length}/20 min
                </span>
              </div>

              {myRole === 'first_manager' && (
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={requireSecondManager} onChange={e => setRequireSecondManager(e.target.checked)} className="rounded border-border" />
                    Require second line manager review?
                  </label>
                  {requireSecondManager && (
                    <select value={secondManagerId} onChange={e => setSecondManagerId(e.target.value)}
                      className="input-field w-full text-sm">
                      <option value="">Select second line manager...</option>
                      {managers.map((m: any) => <option key={m.id} value={m.id}>{m.full_name} ({m.department})</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-border">
              <button onClick={() => setShowRevisionModal(true)}
                className="w-full py-2.5 rounded-lg bg-[#92400e] text-[#fde68a] text-sm font-medium hover:bg-[#92400e]/80 transition-fast">
                <RotateCcw className="inline h-4 w-4 mr-1" /> Request Revision
              </button>
              <button onClick={() => setShowApproveModal(true)}
                disabled={remarks.length < 20 || (requireSecondManager && !secondManagerId)}
                className="w-full py-3 rounded-lg bg-[#14532d] text-[#86efac] text-sm font-semibold hover:bg-[#14532d]/80 transition-fast disabled:opacity-40">
                <CheckCircle className="inline h-4 w-4 mr-1" /> Approve & Forward
              </button>
              <p className="text-[10px] text-muted-foreground text-center">All actions are recorded in the audit log.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="mt-6 surface-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Evaluation History</h3>
        {auditLogs.length > 0 ? (
          <div className="space-y-3">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${log.tamper_detected ? 'bg-destructive' : 'bg-primary'}`} />
                  <div className="w-px flex-1 bg-border" />
                </div>
                <div className="pb-3 min-w-0">
                  <p className="text-sm text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">{log.actor_username} · {new Date(log.created_at).toLocaleString()}</p>
                  {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        )}
      </div>

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="surface-card p-6 max-w-md w-full mx-4 rounded-xl">
            <h3 className="text-base font-semibold text-foreground mb-2">Request Revision</h3>
            <p className="text-sm text-muted-foreground mb-3">Specify what the employee needs to correct or improve:</p>
            <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)}
              placeholder="Describe required changes..." rows={4}
              className="input-field w-full h-auto resize-none mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRevisionModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={handleRevision} disabled={!revisionNote.trim() || processing}
                className="px-4 py-2 rounded-lg bg-[#92400e] text-[#fde68a] text-sm font-medium disabled:opacity-50">
                {processing ? 'Sending...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="surface-card p-6 max-w-md w-full mx-4 rounded-xl">
            <h3 className="text-base font-semibold text-foreground mb-3">Confirm Approval</h3>
            <div className="space-y-2 text-sm mb-4">
              <div><span className="text-muted-foreground">Employee:</span> <span className="text-foreground">{employee.full_name}</span></div>
              {empScores && <div><span className="text-muted-foreground">Score:</span> <span className="text-foreground">{empScores.finalScore.toFixed(2)} — {empScores.classification}</span></div>}
              <div><span className="text-muted-foreground">Remarks:</span> <span className="text-foreground">{remarks.slice(0, 80)}...</span></div>
              <div className="pt-2 text-muted-foreground">
                This evaluation will be forwarded to: <span className="text-foreground font-medium">
                  {requireSecondManager && secondManagerId ? 'Second Manager' : 'HC Team'}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowApproveModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={handleApprove} disabled={processing}
                className="px-4 py-2 rounded-lg bg-[#14532d] text-[#86efac] text-sm font-medium disabled:opacity-50">
                {processing ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
