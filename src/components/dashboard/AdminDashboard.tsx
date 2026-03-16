import { motion } from 'framer-motion';
import { useEvaluationStore } from '@/store/evaluationStore';
import { Settings, Shield, Users, BarChart3 } from 'lucide-react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeIn = { hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } } };

export function AdminDashboard() {
  const { evaluations, auditLog } = useEvaluationStore();

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">System Administration</h1>
        <p className="text-sm text-muted-foreground">Manage evaluation cycles, KPI templates, and system settings</p>
      </motion.div>

      <motion.div variants={fadeIn} className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Total Evaluations', value: evaluations.length, icon: BarChart3 },
          { label: 'Audit Entries', value: auditLog.length, icon: Shield },
          { label: 'Active Users', value: 4, icon: Users },
          { label: 'KPI Templates', value: 8, icon: Settings },
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

      {/* Recent Audit Log */}
      <motion.div variants={fadeIn}>
        <h2 className="mb-3 text-sm font-semibold">Recent Audit Log</h2>
        <div className="surface-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Performed By</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Details</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map(entry => (
                <tr key={entry.id} className="border-b border-border last:border-0 transition-mechanical hover:bg-secondary/30">
                  <td className="px-4 py-3 text-data text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{entry.action}</td>
                  <td className="px-4 py-3 text-sm">{entry.performedBy}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-sm bg-secondary px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                      {entry.performedByRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{entry.details}</td>
                  <td className="px-4 py-3 text-data text-xs text-muted-foreground">{entry.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
