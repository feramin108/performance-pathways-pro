import { motion } from 'framer-motion';
import { useEvaluationStore } from '@/store/evaluationStore';
import { BarChart3, CheckCircle, Clock, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../evaluation/StatusBadge';
import { ScoreDisplay } from '../evaluation/ScoreDisplay';
import { stagger, fadeIn } from '@/lib/animations';

export function HRDashboard() {
  const { evaluations } = useEvaluationStore();
  const navigate = useNavigate();

  const total = evaluations.length;
  const submitted = evaluations.filter(e => e.status !== 'draft').length;
  const validated = evaluations.filter(e => e.status === 'validated').length;
  const pending = evaluations.filter(e => e.status === 'approved').length;

  const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">HR Dashboard</h1>
        <p className="text-sm text-muted-foreground">Organization-wide performance overview</p>
      </motion.div>

      <motion.div variants={fadeIn} className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Submission Rate', value: `${completionRate}%`, icon: BarChart3 },
          { label: 'Pending Validation', value: pending, icon: Clock },
          { label: 'Validated', value: validated, icon: CheckCircle },
          { label: 'Total Evaluations', value: total, icon: FileText },
        ].map(stat => (
          <div key={stat.label} className="surface-card p-4">
            <div className="flex items-center justify-between">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-data text-2xl font-semibold">{stat.value}</span>
            </div>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Completion Bar */}
      <motion.div variants={fadeIn} className="mb-6 surface-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Cycle Completion</span>
          <span className="text-data text-sm font-semibold">{completionRate}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-mechanical" style={{ width: `${completionRate}%` }} />
        </div>
      </motion.div>

      <motion.div variants={fadeIn}>
        <h2 className="mb-3 text-sm font-semibold">All Evaluations</h2>
        <div className="surface-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Employee</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Year</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Score</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Classification</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map(ev => (
                <tr key={ev.id} className="border-b border-border last:border-0 transition-mechanical hover:bg-secondary/30">
                  <td className="px-4 py-3 text-sm font-medium">{ev.employeeName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{ev.department}</td>
                  <td className="px-4 py-3 text-data text-sm">{ev.evaluationYear}</td>
                  <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                  <td className="px-4 py-3"><ScoreDisplay score={ev.totalScore} /></td>
                  <td className="px-4 py-3 text-sm">{ev.classification}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/evaluation/${ev.id}`)}
                      className="text-xs font-medium text-primary transition-mechanical hover:text-primary/80"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
