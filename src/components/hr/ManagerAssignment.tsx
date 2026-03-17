import { motion } from 'framer-motion';
import { useDepartments, useDepartmentManagers, useManagerProfiles, useAssignManager, useRemoveManager } from '@/hooks/useSupabaseQueries';
import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { fadeIn } from '@/lib/animations';

export function ManagerAssignment() {
  const { data: departments = [] } = useDepartments();
  const { data: assignments = [] } = useDepartmentManagers();
  const { data: managerProfiles = [] } = useManagerProfiles();
  const assignManager = useAssignManager();
  const removeManager = useRemoveManager();

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedManager, setSelectedManager] = useState('');

  const handleAssign = async () => {
    if (!selectedDept || !selectedManager) return;
    await assignManager.mutateAsync({ department_id: selectedDept, manager_user_id: selectedManager });
    setSelectedManager('');
  };

  return (
    <motion.div variants={fadeIn}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Line Manager Assignments</h2>
        <p className="text-xs text-muted-foreground">Assign line managers to departments</p>
      </div>

      <div className="mb-4 surface-card p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Department</label>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="input-inset w-full">
              <option value="">Select department...</option>
              {departments.filter(d => d.is_active).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Line Manager</label>
            <select value={selectedManager} onChange={e => setSelectedManager(e.target.value)} className="input-inset w-full">
              <option value="">Select manager...</option>
              {managerProfiles.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.email})</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAssign}
            disabled={!selectedDept || !selectedManager || assignManager.isPending}
            className="flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-mechanical hover:bg-primary/90 disabled:opacity-50"
          >
            <UserPlus className="h-3 w-3" />
            Assign
          </button>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Department</th>
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Line Manager</th>
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Assigned</th>
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Remove</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => {
              const dept = departments.find(d => d.id === a.department_id);
              const mgr = managerProfiles.find(m => m.user_id === a.manager_user_id);
              return (
                <tr key={a.id} className="border-b border-border last:border-0 transition-mechanical hover:bg-secondary/30">
                  <td className="px-4 py-3 text-sm font-medium">{dept?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-sm">{mgr?.full_name || a.manager_user_id}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeManager.mutate(a.id)}
                      className="text-muted-foreground transition-mechanical hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {assignments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No manager assignments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
