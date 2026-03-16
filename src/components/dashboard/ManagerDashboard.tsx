import { motion } from 'framer-motion';
import { useEvaluationStore } from '@/store/evaluationStore';
import { Users, Clock, CheckCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../evaluation/StatusBadge';
import { ScoreDisplay } from '../evaluation/ScoreDisplay';
import { stagger, fadeIn } from '@/lib/animations';

export function ManagerDashboard() {
  const { evaluations } = useEvaluationStore();
  const navigate = useNavigate();

  const pendingReviews = evaluations.filter(e => e.status === 'submitted');
  const approved = evaluations.filter(e => e.status === 'approved');

  const stats = [
    { label: 'Pending Reviews', value: pendingReviews.length, icon: Clock },
    { label: 'Approved', value: approved.length, icon: CheckCircle },
    { label: 'Total Submissions', value: evaluations.filter(e => e.status !== 'draft').length, icon: FileText },
    { label: 'Team Size', value: evaluations.length, icon: Users },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Team Reviews</h1>
        <p className="text-sm text-muted-foreground">Review and approve team evaluations</p>
      </motion.div>

      <motion.div variants={fadeIn} className="mb-6 grid grid-cols-4 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="surface-card p-4">
            <div className="flex items-center justify-between">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-data text-2xl font-semibold">{stat.value}</span>
            </div>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={fadeIn}>
        <h2 className="mb-3 text-sm font-semibold">Pending Reviews</h2>
        <div className="surface-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Employee</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Year</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Score</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.filter(e => e.status !== 'draft').map(ev => (
                <tr key={ev.id} className="border-b border-border last:border-0 transition-mechanical hover:bg-secondary/30">
                  <td className="px-4 py-3 text-sm font-medium">{ev.employeeName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{ev.department}</td>
                  <td className="px-4 py-3 text-data text-sm">{ev.evaluationYear}</td>
                  <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                  <td className="px-4 py-3"><ScoreDisplay score={ev.totalScore} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/evaluation/${ev.id}`)}
                      className="text-xs font-medium text-primary transition-mechanical hover:text-primary/80"
                    >
                      Review
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
