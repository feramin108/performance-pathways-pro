import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDepartments, useCreateDepartment, useToggleDepartment } from '@/hooks/useSupabaseQueries';
import { Plus, Building2, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react';
import { fadeIn } from '@/lib/animations';

interface Props {
  onSelectDepartment: (id: string, name: string) => void;
}

export function DepartmentManager({ onSelectDepartment }: Props) {
  const { data: departments = [], isLoading } = useDepartments();
  const createDept = useCreateDepartment();
  const toggleDept = useToggleDepartment();
  const [newName, setNewName] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDept.mutateAsync(newName.trim());
    setNewName('');
    setShowForm(false);
  };

  return (
    <motion.div variants={fadeIn}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Departments</h2>
          <p className="text-xs text-muted-foreground">Manage organizational departments</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-mechanical hover:bg-primary/90"
        >
          <Plus className="h-3 w-3" />
          Add Department
        </button>
      </div>

      {showForm && (
        <div className="mb-4 surface-card p-4">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Department Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g., Finance, Operations"
              className="input-inset flex-1"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={createDept.isPending || !newName.trim()}
              className="rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-mechanical hover:bg-primary/90 disabled:opacity-50"
            >
              {createDept.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading departments...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id} className="border-b border-border last:border-0 transition-mechanical hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{dept.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-medium ${
                      dept.is_active
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(dept.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleDept.mutate({ id: dept.id, is_active: !dept.is_active })}
                        className="text-muted-foreground transition-mechanical hover:text-foreground"
                        title={dept.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {dept.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => onSelectDepartment(dept.id, dept.name)}
                        className="flex items-center gap-1 text-xs font-medium text-primary transition-mechanical hover:text-primary/80"
                      >
                        Manage KPIs
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No departments created yet. Add your first department above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
