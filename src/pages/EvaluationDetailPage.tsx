import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useEvaluationStore } from '@/store/evaluationStore';
import { useAuthStore } from '@/store/authStore';
import { StatusBadge } from '@/components/evaluation/StatusBadge';
import { ScoreDisplay } from '@/components/evaluation/ScoreDisplay';
import { calculateCategoryScore, getClassificationColor, RATING_LABELS, AuditLogEntry } from '@/types/evaluation';
import { motion } from 'framer-motion';
import { fadeIn } from '@/lib/animations';
import { Clock, User, Shield } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { getEvaluationById, approveEvaluation, requestChanges, validateEvaluation, auditLog, addAuditEntry } = useEvaluationStore();

  const [remarks, setRemarks] = useState('');
  const evaluation = getEvaluationById(id || '');

  if (!evaluation) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Evaluation not found.
        </div>
      </AppLayout>
    );
  }

  const colorClass = getClassificationColor(evaluation.classification);
  const relatedAudit = auditLog.filter(a => a.evaluationId === evaluation.id);

  const handleApprove = () => {
    approveEvaluation(evaluation.id, remarks);
    addAuditEntry({
      evaluationId: evaluation.id,
      action: 'Approved',
      performedBy: currentUser?.fullName || '',
      performedByRole: currentUser?.role || 'employee',
      timestamp: new Date().toISOString(),
      details: remarks || 'Evaluation approved by manager',
      ipAddress: '10.0.2.12',
    });
    toast.success('Evaluation approved');
    navigate('/dashboard');
  };

  const handleRequestChanges = () => {
    if (!remarks.trim()) {
      toast.error('Please provide remarks explaining the required changes.');
      return;
    }
    requestChanges(evaluation.id, remarks);
    addAuditEntry({
      evaluationId: evaluation.id,
      action: 'Changes Requested',
      performedBy: currentUser?.fullName || '',
      performedByRole: currentUser?.role || 'employee',
      timestamp: new Date().toISOString(),
      details: remarks,
      ipAddress: '10.0.2.12',
    });
    toast.success('Changes requested');
    navigate('/dashboard');
  };

  const handleValidate = () => {
    validateEvaluation(evaluation.id, remarks);
    addAuditEntry({
      evaluationId: evaluation.id,
      action: 'Validated',
      performedBy: currentUser?.fullName || '',
      performedByRole: currentUser?.role || 'employee',
      timestamp: new Date().toISOString(),
      details: remarks || 'Validated and archived by HR',
      ipAddress: '10.0.3.8',
    });
    toast.success('Evaluation validated and archived');
    navigate('/dashboard');
  };

  const categories = [
    { label: 'Primary A1', entries: evaluation.primaryA1, weight: evaluation.isSalesStaff ? 50 : 60 },
    { label: 'Primary A2 (WIG)', entries: evaluation.primaryA2, weight: evaluation.isSalesStaff ? 25 : 15 },
    { label: 'Secondary KPIs', entries: evaluation.secondaryKPIs, weight: 10 },
    { label: 'Generic KPIs', entries: evaluation.genericKPIs, weight: 15 },
  ];

  const canManagerAct = currentUser?.role === 'manager' && evaluation.status === 'submitted';
  const canHRAct = currentUser?.role === 'hr' && evaluation.status === 'approved';

  return (
    <AppLayout>
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <motion.div variants={fadeIn} initial="hidden" animate="visible">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Performance Evaluation — {evaluation.evaluationYear}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {evaluation.employeeName} • {evaluation.department}
                </p>
              </div>
              <StatusBadge status={evaluation.status} />
            </div>

            {/* Score Summary */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="surface-card p-4 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Final Score</p>
                <ScoreDisplay score={evaluation.totalScore} size="lg" />
              </div>
              <div className="surface-card p-4 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Classification</p>
                <p className={`text-lg font-semibold ${colorClass}`}>{evaluation.classification}</p>
              </div>
              <div className="surface-card p-4 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Staff Type</p>
                <p className="text-sm font-medium">{evaluation.isSalesStaff ? 'Sales' : 'Non-Sales'}</p>
              </div>
            </div>

            {/* KPI Categories */}
            {categories.map(cat => (
              <div key={cat.label} className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{cat.label}</h3>
                  <span className="text-data text-xs text-muted-foreground">
                    Weight: {cat.weight}% • Score: {Math.round(calculateCategoryScore(cat.entries))}
                  </span>
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
                      {cat.entries.map((entry, i) => (
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
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Additional Sections */}
            {[
              { label: 'Career Path Preferences', value: evaluation.careerPathPreferences },
              { label: 'Training Needs', value: evaluation.trainingNeeds },
              { label: 'Areas for Improvement', value: evaluation.areasForImprovement },
              { label: 'Proposed Action Plan', value: evaluation.proposedActionPlan },
              { label: 'Employee Comments', value: evaluation.employeeComments },
              { label: 'Manager Remarks', value: evaluation.managerRemarks },
              { label: 'HR Remarks', value: evaluation.hrRemarks },
            ].filter(s => s.value).map(section => (
              <div key={section.label} className="mb-3 surface-card p-4">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{section.label}</p>
                <p className="text-sm text-foreground">{section.value}</p>
              </div>
            ))}

            {/* Action Area */}
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
                      <button onClick={handleApprove} className="rounded-sm bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-mechanical hover:bg-success/90">
                        Approve
                      </button>
                      <button onClick={handleRequestChanges} className="rounded-sm bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-mechanical hover:bg-destructive/90">
                        Request Changes
                      </button>
                    </>
                  )}
                  {canHRAct && (
                    <button onClick={handleValidate} className="rounded-sm bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-mechanical hover:bg-success/90">
                      Validate & Archive
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Audit Trail Rail */}
        <div className="w-60 flex-shrink-0">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Audit Trail
          </p>
          <div className="space-y-0">
            {relatedAudit.map((entry, i) => (
              <div key={entry.id} className="relative flex gap-3 pb-4">
                {/* Timeline line */}
                {i < relatedAudit.length - 1 && (
                  <div className="absolute left-[9px] top-5 h-full w-px bg-border" />
                )}
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                  {entry.performedByRole === 'employee' && <User className="h-2.5 w-2.5 text-muted-foreground" />}
                  {entry.performedByRole === 'manager' && <Shield className="h-2.5 w-2.5 text-primary" />}
                  {entry.performedByRole === 'hr' && <Shield className="h-2.5 w-2.5 text-success" />}
                  {entry.performedByRole === 'admin' && <Shield className="h-2.5 w-2.5 text-warning" />}
                </div>
                <div>
                  <p className="text-xs font-medium">{entry.action}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.performedBy}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-data text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-data text-[9px] text-muted-foreground mt-0.5">{entry.ipAddress}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
