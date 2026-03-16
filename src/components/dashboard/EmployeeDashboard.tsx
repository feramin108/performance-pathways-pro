import { motion } from 'framer-motion';
import { useProfile, useMyEvaluations } from '@/hooks/useSupabaseQueries';
import { FileText, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../evaluation/StatusBadge';
import { ScoreDisplay } from '../evaluation/ScoreDisplay';
import { stagger, fadeIn } from '@/lib/animations';
import { EvaluationStatus } from '@/types/evaluation';

export function EmployeeDashboard() {
  const { data: profile } = useProfile();
  const { data: evaluations = [], isLoading } = useMyEvaluations();
  const navigate = useNavigate();

  const stats = [
    { label: 'Total Evaluations', value: evaluations.length, icon: FileText },
    { label: 'Pending', value: evaluations.filter(e => e.status === 'draft' || e.status === 'changes_requested').length, icon: Clock },
    { label: 'Submitted', value: evaluations.filter(e => e.status === 'submitted' || e.status === 'under_review').length, icon: AlertCircle },
    { label: 'Completed', value: evaluations.filter(e => e.status === 'validated' || e.status === 'approved').length, icon: CheckCircle },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          {profile?.department || 'Your Department'} • {profile?.job_title || 'Your Role'}
        </p>
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

      <motion.div variants={fadeIn} className="mb-6">
        <button
          onClick={() => navigate('/evaluation/new')}
          className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-mechanical hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Start New Evaluation
        </button>
      </motion.div>

      <motion.div variants={fadeIn}>
        <h2 className="mb-3 text-sm font-semibold">My Evaluations</h2>
        <div className="surface-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading evaluations...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Year</th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Classification</th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Submitted</th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map(ev => (
                  <tr key={ev.id} className="border-b border-border last:border-0 transition-mechanical hover:bg-secondary/30">
                    <td className="px-4 py-3 text-data text-sm">{ev.evaluation_year}</td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status as EvaluationStatus} /></td>
                    <td className="px-4 py-3"><ScoreDisplay score={ev.total_score} /></td>
                    <td className="px-4 py-3 text-sm">{ev.classification}</td>
                    <td className="px-4 py-3 text-data text-xs text-muted-foreground">
                      {ev.submitted_at ? new Date(ev.submitted_at).toLocaleDateString() : '—'}
                    </td>
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
                {evaluations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No evaluations found. Start a new evaluation to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
