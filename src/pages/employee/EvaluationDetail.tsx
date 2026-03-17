import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RatingPills } from '@/components/evaluation/RatingPills';
import { ScoreBox } from '@/components/evaluation/ScoreBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateScores, getClassificationBg, computeScoreHash, type KPIEntry as KPIEntryType } from '@/lib/scoreEngine';
import { AlertTriangle, Download, Edit, ChevronRight, Shield } from 'lucide-react';

interface EvalData {
  [key: string]: any;
}

const STATUS_ORDER = ['draft', 'submitted', 'first_manager_approved', 'second_manager_review', 'sent_to_hc', 'hc_validated', 'archived'];

export default function EvaluationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [evaluation, setEvaluation] = useState<EvalData | null>(null);
  const [kpiEntries, setKpiEntries] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [tampered, setTampered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: ev }, { data: entries }, { data: logs }] = await Promise.all([
        supabase.from('evaluations').select('*').eq('id', id).single(),
        supabase.from('kpi_entries').select('*').eq('evaluation_id', id).order('sort_order'),
        supabase.from('audit_logs').select('*').eq('evaluation_id', id).order('created_at', { ascending: false }),
      ]);
      setEvaluation(ev as any);
      setKpiEntries((entries as any) || []);
      setAuditLogs((logs as any) || []);
      setLoading(false);

      // Tamper check
      if (ev && (ev as any).score_hash && (ev as any).status !== 'draft') {
        const entriesForHash: KPIEntryType[] = ((entries as any) || []).map((e: any) => ({
          category: e.category,
          employee_rating: e.employee_rating,
          sort_order: e.sort_order,
        }));
        const hash = await computeScoreHash(entriesForHash, (ev as any).final_score || 0);
        if (hash !== (ev as any).score_hash) {
          setTampered(true);
          await supabase.from('evaluations').update({ score_tampered: true } as any).eq('id', id);
          await supabase.from('audit_logs').insert({
            evaluation_id: id,
            actor_id: user?.id,
            action: 'TAMPER ALERT: Score hash mismatch detected',
            tamper_detected: true,
          } as any);
        }
      }
    })();
  }, [id, user]);

  const scores = useMemo(() => {
    if (!kpiEntries.length) return null;
    return calculateScores(
      kpiEntries.map((e: any) => ({ category: e.category, employee_rating: e.employee_rating, sort_order: e.sort_order })),
      evaluation?.employee_type || 'non_sales',
    );
  }, [kpiEntries, evaluation]);

  const currentStatusIdx = STATUS_ORDER.indexOf(evaluation?.status || 'draft');

  if (loading) {
    return <DashboardLayout pageTitle="Loading..."><div className="p-8 text-center text-muted-foreground">Loading evaluation...</div></DashboardLayout>;
  }

  if (!evaluation) {
    return <DashboardLayout pageTitle="Not Found"><div className="p-8 text-center text-muted-foreground">Evaluation not found.</div></DashboardLayout>;
  }

  const categories = [
    { key: 'A1', label: 'Primary KPIs — A1' },
    { key: 'A2_WIG', label: 'WIG — A2' },
    { key: 'secondary', label: 'Secondary KPIs' },
    { key: 'generic', label: 'Generic KPIs' },
  ];

  return (
    <DashboardLayout pageTitle={`Evaluation — ${evaluation.cycle_id ? new Date().getFullYear() : ''}`}>
      {/* Tamper Alert */}
      {(tampered || evaluation.score_tampered) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/20 border border-destructive/50 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          ⚠ Score integrity check failed. Contact your system administrator immediately.
        </div>
      )}

      {/* Revision Banner */}
      {evaluation.status === 'revision_requested' && (
        <div className="mb-4 rounded-lg bg-[#7c2d12] border-l-4 border-destructive p-4">
          <p className="text-sm font-medium text-[#fca5a5] mb-1">Your evaluation has been returned for revision</p>
          {evaluation.revision_note && (
            <blockquote className="text-sm text-[#fca5a5]/80 border-l-2 border-[#fca5a5]/30 pl-3 my-2 italic">{evaluation.revision_note}</blockquote>
          )}
          <p className="text-xs text-[#fca5a5]/60">Revision #{evaluation.revision_count || 1}</p>
          <button onClick={() => navigate(`/employee/evaluation/${id}/edit`)}
            className="mt-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium flex items-center gap-1">
            <Edit className="h-4 w-4" /> Edit & Resubmit
          </button>
        </div>
      )}

      {/* Status Pipeline */}
      <div className="surface-card p-4 mb-6">
        <div className="flex items-center gap-1">
          {STATUS_ORDER.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`h-2 flex-1 rounded-full ${i <= currentStatusIdx ? 'bg-primary' : 'bg-border'}`} />
              {i < STATUS_ORDER.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 flex-shrink-0" />}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {STATUS_ORDER.map((s, i) => (
            <span key={s} className={`text-[9px] ${i <= currentStatusIdx ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left — Evaluation Content */}
        <div className="flex-1 min-w-0">
          {/* KPI Categories */}
          {categories.map(cat => {
            const catEntries = kpiEntries.filter((e: any) => e.category === cat.key);
            if (catEntries.length === 0) return null;
            return (
              <div key={cat.key} className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">{cat.label}</h3>
                {catEntries.map((entry: any, i: number) => (
                  <div key={entry.id} className="surface-card p-4 mb-2">
                    <h4 className="text-sm font-medium text-foreground mb-2">{entry.custom_title || `KPI ${i + 1}`}</h4>
                    <div className="flex items-center gap-4 mb-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Employee: </span>
                        <RatingPills value={entry.employee_rating} readOnly size="sm" />
                      </div>
                      {entry.manager_rating != null && (
                        <div>
                          <span className="text-xs text-muted-foreground">Manager: </span>
                          <RatingPills value={entry.manager_rating} readOnly size="sm" />
                        </div>
                      )}
                      {entry.anomaly_flagged && (
                        <span className="text-xs bg-[#92400e] text-[#fcd34d] px-2 py-0.5 rounded">⚑ Gap ≥ 2</span>
                      )}
                    </div>
                    {entry.employee_comment && <p className="text-xs text-muted-foreground italic">{entry.employee_comment}</p>}
                    {entry.manager_comment && <p className="text-xs text-muted-foreground italic mt-1">Manager: {entry.manager_comment}</p>}
                  </div>
                ))}
              </div>
            );
          })}

          {/* Final Score */}
          {scores && (
            <div className="surface-card p-6 border-2 rounded-2xl mb-6" style={{ borderColor: scores.classificationColor }}>
              <div className="space-y-1 text-data text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">A1 weighted:</span><span className="text-foreground">{scores.a1.weighted.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">A2 weighted:</span><span className="text-foreground">{scores.a2.weighted.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Secondary:</span><span className="text-foreground">{scores.secondary.weighted.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Generic:</span><span className="text-foreground">{scores.generic.weighted.toFixed(2)}</span></div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold text-base">
                  <span>FINAL SCORE:</span>
                  <span>{scores.finalScore.toFixed(2)} / 100</span>
                </div>
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getClassificationBg(scores.classification)}`}>
                  ● {scores.classification}
                </span>
              </div>
            </div>
          )}

          {/* Remarks */}
          {evaluation.first_manager_remarks && (
            <div className="surface-card p-4 mb-3">
              <h4 className="text-xs text-muted-foreground mb-1">Remarks of first line manager</h4>
              <p className="text-sm text-foreground">{evaluation.first_manager_remarks}</p>
              <p className="text-xs text-muted-foreground mt-1">— {evaluation.first_manager_reviewed_at ? new Date(evaluation.first_manager_reviewed_at).toLocaleDateString() : ''}</p>
            </div>
          )}
          {evaluation.hc_remarks && (
            <div className="surface-card p-4 mb-3">
              <h4 className="text-xs text-muted-foreground mb-1">HC Remarks</h4>
              <p className="text-sm text-foreground">{evaluation.hc_remarks}</p>
            </div>
          )}

          {/* AI Summary */}
          {evaluation.ai_summary && (
            <div className="surface-card border-l-[3px] border-l-[#a855f7] p-4 mb-6">
              <h4 className="text-sm font-medium text-foreground mb-2">AI Performance Insight</h4>
              <p className="text-sm text-muted-foreground">{evaluation.ai_summary}</p>
            </div>
          )}
        </div>

        {/* Right — Audit Trail */}
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <div className="surface-card p-4 sticky top-20">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Evaluation History
            </h3>
            <div className="space-y-0">
              {auditLogs.map((log: any, i: number) => (
                <div key={log.id} className="flex gap-3 pb-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${log.tamper_detected ? 'bg-destructive' : 'bg-primary'}`} />
                    {i < auditLogs.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{log.action}</p>
                    {log.actor_username && <p className="text-[11px] text-muted-foreground">{log.actor_username} · {log.actor_role}</p>}
                    <p className="text-[10px] text-muted-foreground/60">{new Date(log.created_at).toLocaleString()}</p>
                    {log.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{log.notes}</p>}
                    {log.tamper_detected && <span className="text-[10px] text-destructive">⚠ Tamper detected</span>}
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-xs text-muted-foreground">No history yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
