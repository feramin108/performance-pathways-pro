import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDepartmentKPIs, useCreateDepartmentKPI, useToggleDepartmentKPI } from '@/hooks/useSupabaseQueries';
import { ArrowLeft, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { fadeIn } from '@/lib/animations';

const CATEGORIES = [
  { value: 'primary_a1', label: 'Primary A1 (50-60%)' },
  { value: 'primary_a2', label: 'Primary A2 / WIG (15-25%)' },
  { value: 'secondary', label: 'Secondary (10%)' },
  { value: 'generic', label: 'Generic (15%)' },
];

interface Props {
  departmentId: string;
  departmentName: string;
  onBack: () => void;
}

export function DepartmentKPIManager({ departmentId, departmentName, onBack }: Props) {
  const { data: kpis = [], isLoading } = useDepartmentKPIs(departmentId);
  const createKPI = useCreateDepartmentKPI();
  const toggleKPI = useToggleDepartmentKPI();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'primary_a1',
    weight: 0,
    max_rating: 5,
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await createKPI.mutateAsync({
      department_id: departmentId,
      name: form.name.trim(),
      category: form.category,
      weight: form.weight,
      max_rating: form.max_rating,
      sort_order: kpis.length,
    });
    setForm({ name: '', category: 'primary_a1', weight: 0, max_rating: 5 });
    setShowForm(false);
  };

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    kpis: kpis.filter(k => k.category === cat.value),
  }));

  return (
    <motion.div variants={fadeIn}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-sm transition-mechanical hover:bg-secondary">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h2 className="text-sm font-semibold">{departmentName} — KPI Configuration</h2>
            <p className="text-xs text-muted-foreground">Define KPI templates for this department</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-mechanical hover:bg-primary/90"
        >
          <Plus className="h-3 w-3" />
          Add KPI
        </button>
      </div>

      {showForm && (
        <div className="mb-4 surface-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">KPI Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Revenue Target Achievement"
                className="input-inset w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="input-inset w-full"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Weight (%)</label>
              <input
                type="number"
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))}
                min={0}
                max={100}
                className="input-inset w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Max Rating</label>
              <input
                type="number"
                value={form.max_rating}
                onChange={e => setForm(f => ({ ...f, max_rating: Number(e.target.value) }))}
                min={1}
                max={10}
                className="input-inset w-full"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={createKPI.isPending || !form.name.trim()}
              className="rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-mechanical hover:bg-primary/90 disabled:opacity-50"
            >
              {createKPI.isPending ? 'Creating...' : 'Create KPI'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">Loading KPIs...</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.value}>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{group.label}</h3>
              <div className="surface-card overflow-hidden">
                {group.kpis.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">KPI Name</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Weight</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rating Scale</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Toggle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.kpis.map(kpi => (
                        <tr key={kpi.id} className="border-b border-border last:border-0 transition-mechanical hover:bg-secondary/30">
                          <td className="px-4 py-2.5 text-sm font-medium">{kpi.name}</td>
                          <td className="px-4 py-2.5 text-data text-sm">{Number(kpi.weight)}%</td>
                          <td className="px-4 py-2.5 text-data text-sm">0–{kpi.max_rating}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex rounded-sm px-2 py-0.5 text-[10px] font-medium ${
                              kpi.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                            }`}>
                              {kpi.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => toggleKPI.mutate({ id: kpi.id, is_active: !kpi.is_active })}
                              className="text-muted-foreground transition-mechanical hover:text-foreground"
                            >
                              {kpi.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-4 text-center text-xs text-muted-foreground">
                    No KPIs defined for this category yet.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
