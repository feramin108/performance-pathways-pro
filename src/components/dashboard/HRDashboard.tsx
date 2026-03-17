import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAllEvaluations } from '@/hooks/useSupabaseQueries';
import { BarChart3, CheckCircle, Clock, FileText, Building2, Users, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../evaluation/StatusBadge';
import { ScoreDisplay } from '../evaluation/ScoreDisplay';
import { stagger, fadeIn } from '@/lib/animations';
import { EvaluationStatus } from '@/types/evaluation';
import { DepartmentManager } from '../hr/DepartmentManager';
import { DepartmentKPIManager } from '../hr/DepartmentKPIManager';
import { ManagerAssignment } from '../hr/ManagerAssignment';

type Tab = 'overview' | 'departments' | 'managers' | 'evaluations';

export function HRDashboard() {
  const { data: evaluations = [] } = useAllEvaluations();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedDept, setSelectedDept] = useState<{ id: string; name: string } | null>(null);

  const total = evaluations.length;
  const submitted = evaluations.filter(e => e.status !== 'draft').length;
  const validated = evaluations.filter(e => e.status === 'validated').length;
  const pending = evaluations.filter(e => e.status === 'approved').length;
  const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'departments', label: 'Departments & KPIs', icon: Building2 },
    { id: 'managers', label: 'Manager Assignments', icon: Users },
    { id: 'evaluations', label: 'All Evaluations', icon: FileText },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">HR Dashboard</h1>
        <p className="text-sm text-muted-foreground">Organization-wide performance management</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeIn} className="mb-6 flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedDept(null); }}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-mechanical ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
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

          <motion.div variants={fadeIn} className="mb-6 surface-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cycle Completion</span>
              <span className="text-data text-sm font-semibold">{completionRate}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-mechanical" style={{ width: `${completionRate}%` }} />
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div variants={fadeIn} className="mb-6 grid grid-cols-3 gap-3">
            <button onClick={() => setActiveTab('departments')} className="surface-card p-4 text-left transition-mechanical hover:border-primary/30">
              <Building2 className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Manage Departments</p>
              <p className="text-xs text-muted-foreground">Create departments & configure KPIs</p>
            </button>
            <button onClick={() => setActiveTab('managers')} className="surface-card p-4 text-left transition-mechanical hover:border-primary/30">
              <Users className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Assign Managers</p>
              <p className="text-xs text-muted-foreground">Link line managers to departments</p>
            </button>
            <button onClick={() => setActiveTab('evaluations')} className="surface-card p-4 text-left transition-mechanical hover:border-primary/30">
              <FileText className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Review Evaluations</p>
              <p className="text-xs text-muted-foreground">View all submitted evaluations</p>
            </button>
          </motion.div>
        </>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        selectedDept ? (
          <DepartmentKPIManager
            departmentId={selectedDept.id}
            departmentName={selectedDept.name}
            onBack={() => setSelectedDept(null)}
          />
        ) : (
          <DepartmentManager onSelectDepartment={(id, name) => setSelectedDept({ id, name })} />
        )
      )}

      {/* Managers Tab */}
      {activeTab === 'managers' && <ManagerAssignment />}

      {/* Evaluations Tab */}
      {activeTab === 'evaluations' && (
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
                    <td className="px-4 py-3 text-sm font-medium">{ev.employee_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{ev.department}</td>
                    <td className="px-4 py-3 text-data text-sm">{ev.evaluation_year}</td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status as EvaluationStatus} /></td>
                    <td className="px-4 py-3"><ScoreDisplay score={ev.total_score} /></td>
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
                {evaluations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No evaluations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
