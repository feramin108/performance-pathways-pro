import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getEvaluationStatus } from '@/lib/evaluationAudit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, AlertTriangle } from 'lucide-react';
import { getClassification, getClassificationColor } from '@/types/evaluation';

const HC_DECISIONS = [
  { value: 'validated', label: 'Validated & Approved', bg: '#14532d', border: '#22c55e' },
  { value: 'needs_improvement', label: 'Needs Improvement', bg: '#78350f', border: '#f59e0b' },
  { value: 'exceptional', label: 'Exceptional Performance', bg: '#1c1a00', border: '#f59e0b' },
  { value: 'flagged', label: 'Flagged for Follow-up', bg: '#7c2d12', border: '#ef4444' },
];

export default function HCEvaluationValidation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [hcRemarks, setHcRemarks] = useState('');
  const [decision, setDecision] = useState('');
  const [mgmtAction, setMgmtAction] = useState('');
  const [archiveModal, setArchiveModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: evaluation, refetch } = useQuery({
    queryKey: ['hc-eval', id],
    queryFn: async () => {
      const { data } = await supabase.from('evaluations').select('*').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: employee } = useQuery({
    queryKey: ['hc-eval-employee', evaluation?.employee_id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', evaluation!.employee_id).single();
      return data;
    },
    enabled: !!evaluation?.employee_id,
  });

  const { data: manager } = useQuery({
    queryKey: ['hc-eval-manager', evaluation?.first_manager_id],
    queryFn: async () => {
      if (!evaluation?.first_manager_id) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', evaluation.first_manager_id).single();
      return data;
    },
    enabled: !!evaluation?.first_manager_id,
  });

  const { data: kpiEntries } = useQuery({
    queryKey: ['hc-eval-kpis', id],
    queryFn: async () => {
      const { data } = await supabase.from('kpi_entries').select('*').eq('evaluation_id', id!).order('sort_order');
      return data || [];
    },
    enabled: !!id,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['hc-eval-audit', id],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs').select('*').eq('evaluation_id', id!).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (evaluation) {
      setHcRemarks(evaluation.hc_remarks || '');
      setDecision(evaluation.hc_decision || '');
      setMgmtAction(evaluation.management_action || '');
    }
  }, [evaluation]);

  const ev = evaluation as any;
  const emp = employee as any;
  const mgr = manager as any;
  const isValidated = ev?.status === 'hc_validated' || ev?.status === 'archived';
  const isArchived = ev?.status === 'archived';

  const daysAtHC = ev?.stage_hc_review_started_at
    ? Math.floor((Date.now() - new Date(ev.stage_hc_review_started_at).getTime()) / 86400000)
    : 0;

  const anomalies = (kpiEntries || []).filter((k: any) => k.anomaly_flagged);
  const categories = ['A1', 'A2_WIG', 'secondary', 'generic'];
  const catLabels: Record<string, string> = { A1: 'Primary A1', A2_WIG: 'A2 — WIG', secondary: 'Secondary', generic: 'Generic' };

  const handleValidate = async () => {
    if (hcRemarks.length < 20) { toast.error('HC remarks must be at least 20 characters.'); return; }
    if (!decision) { toast.error('Please select an HC decision.'); return; }
    setLoading(true);
    try {
      const oldStatus = (await getEvaluationStatus(id!)) || 'sent_to_hc';
      await supabase.from('audit_logs').insert({
        evaluation_id: id, actor_id: user?.id, actor_role: 'hc',
        actor_username: profile?.full_name, action: `HC validation completed — ${decision}`,
        old_status: oldStatus, new_status: 'hc_validated',
      });
      await supabase.from('evaluations').update({
        hc_remarks: hcRemarks, hc_decision: decision, status: 'hc_validated',
        hc_reviewed_at: new Date().toISOString(), hc_reviewer_id: user?.id,
      }).eq('id', id!);
      await supabase.from('notifications').insert({
        recipient_id: ev.employee_id, title: 'Your evaluation has been validated by HC',
        message: `Your 2025 appraisal has been reviewed. Decision: ${HC_DECISIONS.find(d => d.value === decision)?.label}.`,
        evaluation_id: id, type: 'hc_validated',
      });
      if (ev.first_manager_id) {
        await supabase.from('notifications').insert({
          recipient_id: ev.first_manager_id, title: 'Evaluation validated by HC',
          message: `${emp?.full_name}'s evaluation validated. Decision: ${decision}.`,
          evaluation_id: id, type: 'hc_validated',
        });
      }
      toast.success('Evaluation validated successfully.');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['hc-evaluations'] });
    } catch { toast.error('Error validating evaluation.'); }
    setLoading(false);
  };

  const handleArchive = async () => {
    if (!mgmtAction || mgmtAction.length < 10) { toast.error('Management action must be at least 10 characters.'); return; }
    setLoading(true);
    try {
      const oldStatus = (await getEvaluationStatus(id!)) || 'hc_validated';
      await supabase.from('audit_logs').insert({
        evaluation_id: id, actor_id: user?.id, actor_role: 'hc',
        actor_username: profile?.full_name, action: 'Evaluation archived — final',
        old_status: oldStatus, new_status: 'archived',
      });
      await supabase.from('evaluations').update({
        management_action: mgmtAction, status: 'archived', archived_at: new Date().toISOString(),
      }).eq('id', id!);
      await supabase.from('notifications').insert({
        recipient_id: ev.employee_id, title: 'Your 2025 appraisal is complete',
        message: `Your performance evaluation has been finalised and archived. Final score: ${ev.final_score?.toFixed(1)} — ${ev.final_classification}.`,
        evaluation_id: id, type: 'archived',
      });
      toast.success('Evaluation archived successfully.');
      setArchiveModal(false);
      navigate('/hc/pending');
    } catch { toast.error('Error archiving evaluation.'); }
    setLoading(false);
  };

  if (!ev) return <DashboardLayout pageTitle="Loading..."><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout pageTitle={`Validate — ${emp?.full_name || '...'}`}>
      {/* Tamper Alert */}
      {ev.score_tampered && (
        <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#7c2d12', borderLeft: '4px solid #ef4444' }}>
          <Shield className="h-5 w-5 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-sm" style={{ color: '#fca5a5' }}>⚠ SCORE INTEGRITY FAILURE — This evaluation's score hash does not match. DO NOT validate until investigated.</p>
        </div>
      )}

      {/* Employee Info Bar */}
      <div className="surface-card p-4 mb-4 flex flex-wrap items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-sm font-medium text-muted-foreground">{emp?.full_name?.[0] || '?'}</div>
        <div>
          <p className="text-sm font-medium text-foreground">{emp?.full_name}</p>
          <p className="text-xs text-muted-foreground">{emp?.employee_id} · {emp?.department} · Branch {emp?.branch}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-data text-sm font-medium text-foreground">{ev.final_score?.toFixed(1) ?? '—'} — {ev.final_classification || '—'}</span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: daysAtHC >= 10 ? '#7c2d12' : daysAtHC >= 5 ? '#78350f' : '#14532d', color: daysAtHC >= 10 ? '#fca5a5' : daysAtHC >= 5 ? '#fde68a' : '#86efac' }}>
            {daysAtHC}d at HC
          </span>
        </div>
      </div>

      {/* Anomaly Summary */}
      {anomalies.length > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3" style={{ background: '#78350f', borderLeft: '4px solid #f59e0b' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" style={{ color: '#f59e0b' }} />
            <span className="text-sm font-medium" style={{ color: '#fde68a' }}>{anomalies.length} KPI(s) with rating gap of 2+ points</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs" style={{ color: '#fde68a' }}>
            {anomalies.map((k: any) => (
              <span key={k.id}>⚑ {k.custom_title?.slice(0, 25) || 'KPI'}: Emp {k.employee_rating} vs Mgr {k.manager_rating}</span>
            ))}
          </div>
        </div>
      )}

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT — Employee Evaluation */}
        <div className="lg:col-span-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          {categories.map(cat => {
            const entries = (kpiEntries || []).filter((k: any) => k.category === cat);
            if (entries.length === 0) return null;
            return (
              <div key={cat} className="surface-card">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-medium text-foreground">{catLabels[cat]}</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI</TableHead>
                      <TableHead className="text-center">Employee</TableHead>
                      <TableHead className="text-center">Manager</TableHead>
                      <TableHead className="text-center">Gap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((k: any) => {
                      const gap = (k.manager_rating != null && k.employee_rating != null) ? Math.abs(k.employee_rating - k.manager_rating) : null;
                      return (
                        <TableRow key={k.id}>
                          <TableCell className="text-xs">{k.custom_title || '—'}</TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-md text-xs font-medium" style={{ background: '#3b82f6', color: 'white' }}>{k.employee_rating ?? '—'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-md text-xs font-medium" style={{ background: k.manager_rating != null ? '#f59e0b' : '#334155', color: k.manager_rating != null ? 'white' : '#94a3b8' }}>{k.manager_rating ?? '—'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {gap != null ? (
                              <span className={`text-xs font-medium ${gap >= 2 ? 'text-[#fcd34d]' : gap >= 1 ? 'text-muted-foreground' : 'text-[#86efac]'}`}>
                                {gap >= 2 ? '⚑ ' : ''}{gap}
                              </span>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })}

          {/* Score boxes */}
          <div className="surface-card p-4">
            <div className="grid grid-cols-2 gap-3 text-xs text-data">
              <div><span className="text-muted-foreground">A1 weighted:</span> <span className="text-foreground">{ev.a1_weighted?.toFixed(2) ?? '—'}</span></div>
              <div><span className="text-muted-foreground">A2 weighted:</span> <span className="text-foreground">{ev.a2_weighted?.toFixed(2) ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Sec weighted:</span> <span className="text-foreground">{ev.sec_weighted?.toFixed(2) ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Gen weighted:</span> <span className="text-foreground">{ev.gen_weighted?.toFixed(2) ?? '—'}</span></div>
            </div>
            <div className="border-t border-border mt-3 pt-3">
              <p className="text-sm font-medium text-foreground text-data">Final: {ev.final_score?.toFixed(2) ?? '—'} / 100 — {ev.final_classification || '—'}</p>
            </div>
          </div>
        </div>

        {/* MIDDLE — All Remarks */}
        <div className="lg:col-span-3 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          {ev.first_manager_remarks && (
            <div className="surface-card p-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Remarks of first line manager</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{ev.first_manager_remarks}</p>
              <p className="text-xs text-muted-foreground mt-2">— {mgr?.full_name || '—'} · {ev.first_manager_reviewed_at ? new Date(ev.first_manager_reviewed_at).toLocaleDateString() : ''}</p>
            </div>
          )}
          {ev.second_manager_remarks && (
            <div className="surface-card p-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Remarks of second line manager</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{ev.second_manager_remarks}</p>
            </div>
          )}
          {ev.employee_comments && (
            <div className="surface-card p-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Comments of the employee</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{ev.employee_comments}</p>
            </div>
          )}
          {ev.ai_summary && (
            <div className="surface-card p-4" style={{ borderLeft: '3px solid #a855f7' }}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">AI Performance Insight</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{ev.ai_summary}</p>
            </div>
          )}
        </div>

        {/* RIGHT — HC Action Panel */}
        <div className="lg:col-span-4">
          <div className="surface-card p-5 lg:sticky lg:top-0" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {/* Score Summary */}
            <div className="rounded-lg p-4 mb-5" style={{ background: '#263548' }}>
              <p className="text-data text-lg font-semibold text-foreground">{ev.final_score?.toFixed(2) ?? '—'} / 100</p>
              <p className={`text-sm font-medium mt-1 ${getClassificationColor(ev.final_classification || '')}`}>{ev.final_classification || '—'}</p>
              <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-data text-muted-foreground">
                <span>A1: {ev.a1_weighted?.toFixed(1) ?? '—'}</span>
                <span>A2: {ev.a2_weighted?.toFixed(1) ?? '—'}</span>
                <span>Sec: {ev.sec_weighted?.toFixed(1) ?? '—'}</span>
                <span>Gen: {ev.gen_weighted?.toFixed(1) ?? '—'}</span>
              </div>
              <p className="text-xs mt-2" style={{ color: ev.score_tampered ? '#fca5a5' : '#86efac' }}>
                {ev.score_tampered ? '⚠ Hash mismatch' : '✓ Score integrity verified'}
              </p>
            </div>

            {/* HC Remarks */}
            {!isArchived && (
              <>
                <h4 className="text-sm font-medium text-foreground mb-2">Remarks/recommendations of HC</h4>
                <Textarea value={hcRemarks} onChange={e => setHcRemarks(e.target.value)} rows={5} placeholder="Write your HC assessment (min 20 chars)..." disabled={isValidated} />
                <p className="text-xs text-muted-foreground mt-1 text-right">{hcRemarks.length} chars</p>

                {/* HC Decision */}
                {!isValidated && (
                  <>
                    <h4 className="text-sm font-medium text-foreground mt-5 mb-3">Final HC Decision</h4>
                    <div className="space-y-2">
                      {HC_DECISIONS.map(d => (
                        <button key={d.value} onClick={() => setDecision(d.value)} className="w-full text-left rounded-lg p-3 border transition-fast"
                          style={{
                            background: decision === d.value ? d.bg : 'transparent',
                            borderColor: decision === d.value ? d.border : '#334155',
                            borderWidth: decision === d.value ? 2 : 1,
                          }}>
                          <span className="text-sm text-foreground">{decision === d.value ? '● ' : '○ '}{d.label}</span>
                        </button>
                      ))}
                    </div>
                    <Button className="w-full mt-5 h-12" disabled={loading || hcRemarks.length < 20 || !decision} onClick={handleValidate}
                      style={{ background: '#14532d', color: '#86efac' }}>
                      {loading ? 'Saving...' : 'Validate & Proceed to Management'}
                    </Button>
                  </>
                )}

                {/* Management Action (post-validation) */}
                {isValidated && !isArchived && (
                  <>
                    <h4 className="text-sm font-medium text-foreground mt-6 mb-2">Management action</h4>
                    <Textarea value={mgmtAction} onChange={e => setMgmtAction(e.target.value)} rows={4} placeholder="Record the executive management decision..." />
                    <Button className="w-full mt-4 h-11" disabled={loading || mgmtAction.length < 10} onClick={() => setArchiveModal(true)}
                      style={{ background: '#0c2340', color: '#67e8f9' }}>
                      Archive Evaluation
                    </Button>
                  </>
                )}
              </>
            )}

            {isArchived && (
              <div className="rounded-lg p-4 text-center" style={{ background: '#14532d' }}>
                <p className="text-sm font-medium" style={{ color: '#86efac' }}>✓ This evaluation has been archived</p>
                <p className="text-xs mt-1" style={{ color: '#86efac80' }}>{ev.archived_at ? new Date(ev.archived_at).toLocaleDateString() : ''}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="surface-card mt-6">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Evaluation History</h3>
        </div>
        <div className="p-5">
          {(auditLogs || []).map((log: any, i: number) => (
            <div key={log.id} className="flex gap-3 pb-4 last:pb-0" style={log.tamper_detected ? { background: '#3b0a0a', borderLeft: '3px solid #ef4444', paddingLeft: 8, borderRadius: 4 } : {}}>
              <div className="flex flex-col items-center">
                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: log.actor_role === 'hc' ? '#ef4444' : log.actor_role === 'manager' ? '#f59e0b' : '#3b82f6' }} />
                {i < (auditLogs || []).length - 1 && <div className="flex-1 w-px bg-border mt-1" />}
              </div>
              <div className="min-w-0 pb-2">
                <p className="text-sm text-foreground">{log.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{log.actor_username || 'System'} · {new Date(log.created_at).toLocaleString()}</p>
                {log.notes && <p className="text-xs text-muted-foreground mt-1 italic">{log.notes}</p>}
              </div>
            </div>
          ))}
          {(!auditLogs || auditLogs.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No audit entries.</p>}
        </div>
      </div>

      {/* Archive Modal */}
      <Dialog open={archiveModal} onOpenChange={setArchiveModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive This Evaluation?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This is the final step. The evaluation will be permanently locked and archived.</p>
          <div className="my-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Employee:</span> <span className="text-foreground">{emp?.full_name}</span></p>
            <p><span className="text-muted-foreground">Final Score:</span> <span className="text-foreground">{ev.final_score?.toFixed(1)} — {ev.final_classification}</span></p>
            <p><span className="text-muted-foreground">HC Decision:</span> <span className="text-foreground">{HC_DECISIONS.find(d => d.value === decision)?.label || ev.hc_decision}</span></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveModal(false)}>Cancel</Button>
            <Button disabled={loading} onClick={handleArchive} style={{ background: '#0c2340', color: '#67e8f9' }}>
              {loading ? 'Archiving...' : 'Confirm & Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
