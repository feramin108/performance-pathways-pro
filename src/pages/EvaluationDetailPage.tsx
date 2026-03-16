import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useEvaluation, useAuditLogs, useProfile, useUpdateEvaluationStatus } from '@/hooks/useSupabaseQueries';
import { StatusBadge } from '@/components/evaluation/StatusBadge';
import { ScoreDisplay } from '@/components/evaluation/ScoreDisplay';
import { getClassificationColor, RATING_LABELS, EvaluationStatus } from '@/types/evaluation';
import { motion } from 'framer-motion';
import { fadeIn } from '@/lib/animations';
import { Clock, User, Shield } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: evaluation, isLoading } = useEvaluation(id);
  const { data: auditLog = [] } = useAuditLogs(id);
  const updateStatus = useUpdateEvaluationStatus();

  const [remarks, setRemarks] = useState('');

  if (isLoading) {
    return <AppLayout><div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading...</div></AppLayout>;
  }

  if (!evaluation) {
    return <AppLayout><div className="flex h-64 items-center justify-center text-muted-foreground">Evaluation not found.</div></AppLayout>;
  }

  const colorClass = getClassificationColor(evaluation.classification);

  const handleAction = (status: string, action: string, remarkField: 'manager_remarks' | 'hr_remarks') => {
    if (status === 'changes_requested' && !remarks.trim()) {
      toast.error('Please provide remarks explaining the required changes.');
      return;
    }
    updateStatus.mutate({
      id: evaluation.id,
      status,
      remarks,
      remarkField,
      action,
    }, {
      onSuccess: () => {
        toast.success(`Evaluation ${action.toLowerCase()}`);
        navigate('/dashboard');
      },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const categories = [
    { label: 'Primary A1', entries: evaluation.primaryA1 || [], weight: evaluation.is_sales_staff ? 50 : 60 },
    { label: 'Primary A2 (WIG)', entries: evaluation.primaryA2 || [], weight: evaluation.is_sales_staff ? 25 : 15 },
    { label: 'Secondary KPIs', entries: evaluation.secondaryKPIs || [], weight: 10 },
    { label: 'Generic KPIs', entries: evaluation.genericKPIs || [], weight: 15 },
  ];

  const canManagerAct = profile?.primaryRole === 'manager' && evaluation.status === 'submitted';
  const canHRAct = profile?.primaryRole === 'hr' && evaluation.status === 'approved';

  return (
    <AppLayout>
      <div className="flex gap-6">
        <div className="flex-1">
          <motion.div variants={fadeIn} initial="hidden" animate="visible">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Performance Evaluation — {evaluation.evaluation_year}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {evaluation.employee_name} • {evaluation.department}
                </p>
              </div>
              <StatusBadge status={evaluation.status as EvaluationStatus} />
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="surface-card p-4 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Final Score</p>
                <ScoreDisplay score={evaluation.total_score} size="lg" />
              </div>
              <div className="surface-card p-4 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Classification</p>
                <p className={`text-lg font-semibold ${colorClass}`}>{evaluation.classification}</p>
              </div>
              <div className="surface-card p-4 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Staff Type</p>
                <p className="text-sm font-medium">{evaluation.is_sales_staff ? 'Sales' : 'Non-Sales'}</p>
              </div>
            </div>

            {categories.map(cat => (
              <div key={cat.label} className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{cat.label}</h3>
                  <span className="text-data text-xs text-muted-foreground">Weight: {cat.weight}%</span>
                </div>
                <div className="surface-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">#</th>
                        <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Title</th>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rating</th>
                        <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.entries.map((entry: any, i: number) => (
                        <tr key={entry.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 text-data text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2 text-sm">{entry.title || '—'}</td>
                          <td className="px-4 py-2 text-right">
                            <span className="text-data text-sm font-semibold">{entry.rating}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">({RATING_LABELS[entry.rating]})</span>
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{entry.comment || '—'}</td>
                        </tr>
                      ))}
                      {cat.entries.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-3 text-center text-xs text-muted-foreground">No KPIs</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {[
              { label: 'Career Path Preferences', value: evaluation.career_path_preferences },
              { label: 'Training Needs', value: evaluation.training_needs },
              { label: 'Areas for Improvement', value: evaluation.areas_for_improvement },
              { label: 'Proposed Action Plan', value: evaluation.proposed_action_plan },
              { label: 'Employee Comments', value: evaluation.employee_comments },
              { label: 'Manager Remarks', value: evaluation.manager_remarks },
              { label: 'HR Remarks', value: evaluation.hr_remarks },
            ].filter(s => s.value).map(section => (
              <div key={section.label} className="mb-3 surface-card p-4">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{section.label}</p>
                <p className="text-sm text-foreground">{section.value}</p>
              </div>
            ))}

            {(canManagerAct || canHRAct) && (
              <div className="mt-6 surface-card p-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {canManagerAct ? 'Manager Review' : 'HR Validation'}
                </p>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  className="input-inset mb-3 w-full resize-none prose-constrained"
                  rows={3}
                />
                <div className="flex gap-2">
                  {canManagerAct && (
                    <>
                      <button onClick={() => handleAction('approved', 'Approved', 'manager_remarks')} disabled={updateStatus.isPending} className="rounded-sm bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-mechanical hover:bg-success/90 disabled:opacity-50">
                        Approve
                      </button>
                      <button onClick={() => handleAction('changes_requested', 'Changes Requested', 'manager_remarks')} disabled={updateStatus.isPending} className="rounded-sm bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-mechanical hover:bg-destructive/90 disabled:opacity-50">
                        Request Changes
                      </button>
                    </>
                  )}
                  {canHRAct && (
                    <button onClick={() => handleAction('validated', 'Validated', 'hr_remarks')} disabled={updateStatus.isPending} className="rounded-sm bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-mechanical hover:bg-success/90 disabled:opacity-50">
                      Validate & Archive
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Audit Trail */}
        <div className="w-60 flex-shrink-0">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Audit Trail</p>
          <div className="space-y-0">
            {auditLog.map((entry, i) => (
              <div key={entry.id} className="relative flex gap-3 pb-4">
                {i < auditLog.length - 1 && <div className="absolute left-[9px] top-5 h-full w-px bg-border" />}
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                  {entry.performed_by_role === 'employee' ? <User className="h-2.5 w-2.5 text-muted-foreground" /> : <Shield className="h-2.5 w-2.5 text-primary" />}
                </div>
                <div>
                  <p className="text-xs font-medium">{entry.action}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.performed_by_name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-data text-[10px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-data text-[9px] text-muted-foreground mt-0.5">{entry.ip_address}</p>
                </div>
              </div>
            ))}
            {auditLog.length === 0 && (
              <p className="text-xs text-muted-foreground">No audit entries yet.</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
