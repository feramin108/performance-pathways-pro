import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useKPITemplates, useDepartments } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { KpiModalErrorBoundary } from '@/components/hc/KpiModalErrorBoundary';

const CATEGORIES = [
  { value: 'A1', label: 'Primary A1' },
  { value: 'A2_WIG', label: 'Primary A2 — WIG' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'generic', label: 'Generic' },
];

const DEFAULT_FORM = {
  department_code: '',
  category: 'A1',
  title: '',
  weight_nonsales: 0,
  weight_sales: 0,
  is_active: true,
  sort_order: 0,
};

function getCategoryWeight(category: string, type: 'nonsales' | 'sales') {
  const weights: Record<string, { nonsales: string; sales: string }> = {
    A1: { nonsales: '60%', sales: '50%' },
    A2_WIG: { nonsales: '15%', sales: '25%' },
    secondary: { nonsales: '10%', sales: '10%' },
    generic: { nonsales: '15%', sales: '15%' },
  };
  return weights[category]?.[type] || '—';
}

export default function HCKPIManagement() {
  const { data: templates, refetch } = useKPITemplates();
  const { data: departments = [] } = useDepartments();
  const queryClient = useQueryClient();
  const [deptFilter, setDeptFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [titleError, setTitleError] = useState('');

  const filtered = useMemo(() => {
    let list = templates || [];
    if (deptFilter !== 'all') list = list.filter((t: any) => t.department_code === deptFilter || !t.department_code);
    return list;
  }, [templates, deptFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    (filtered || []).forEach((t: any) => {
      const key = t.department_code || 'Global';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const closeModal = () => {
    setModal(false);
    setTitleError('');
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...DEFAULT_FORM });
    setTitleError('');
    setModal(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      department_code: t.department_code || '',
      category: t.category || 'A1',
      title: t.title || '',
      weight_nonsales: Number(t.weight_nonsales) || 0,
      weight_sales: Number(t.weight_sales) || 0,
      is_active: t.is_active ?? true,
      sort_order: Number(t.sort_order) || 0,
    });
    setTitleError('');
    setModal(true);
  };

  const handleSave = async () => {
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setTitleError('KPI title is required.');
      return;
    }

    setSaving(true);
    setTitleError('');

    try {
      const payload = {
        department_code: form.department_code || null,
        category: form.category,
        title: trimmedTitle,
        weight_nonsales: Number(form.weight_nonsales) || 0,
        weight_sales: Number(form.weight_sales) || 0,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };

      if (editId) {
        const { error } = await supabase.from('kpi_templates').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('KPI template updated.');
      } else {
        const { error } = await supabase.from('kpi_templates').insert(payload);
        if (error) throw error;
        toast.success('KPI template added successfully.');
      }

      closeModal();
      setForm({ ...DEFAULT_FORM });
      queryClient.invalidateQueries({ queryKey: ['kpi-templates'] });
      refetch();
    } catch (err: any) {
      toast.error(`Failed to save KPI template: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const { count, error: countError } = await supabase
        .from('kpi_entries')
        .select('id', { count: 'exact', head: true })
        .eq('kpi_template_id', deleteModal);

      if (countError) throw countError;

      if ((count || 0) > 0) {
        toast.error(`Cannot delete — this KPI is used in ${count} evaluation(s). Deactivate it instead.`);
        setDeleteModal(null);
        return;
      }

      const { error } = await supabase.from('kpi_templates').delete().eq('id', deleteModal);
      if (error) throw error;

      toast.success('KPI template deleted.');
      setDeleteModal(null);
      queryClient.invalidateQueries({ queryKey: ['kpi-templates'] });
      refetch();
    } catch (err: any) {
      toast.error(`Failed to delete KPI template: ${err?.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="KPI Management">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[180px] input-field"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(departments ?? []).map((d: any) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add KPI Template</Button>
      </div>

      {grouped.map(([dept, items]) => (
        <div key={dept} className="surface-card mb-4">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">{dept === 'Global' ? 'Global (All Departments)' : dept} — {items.length} KPIs</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Non-Sales %</TableHead>
                <TableHead className="text-center">Sales %</TableHead>
                <TableHead className="text-center">Sort Order</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-foreground">{t.title}</TableCell>
                  <TableCell><span className="text-xs rounded-full px-2 py-0.5 bg-card text-muted-foreground">{t.category}</span></TableCell>
                  <TableCell className="text-center text-sm font-mono">{getCategoryWeight(t.category, 'nonsales')}</TableCell>
                  <TableCell className="text-center text-sm font-mono">{getCategoryWeight(t.category, 'sales')}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{t.sort_order ?? 0}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={t.is_active} onCheckedChange={async (v) => {
                      try {
                        const { error } = await supabase.from('kpi_templates').update({ is_active: v }).eq('id', t.id);
                        if (error) throw error;
                        refetch();
                      } catch (err: any) {
                        toast.error(`Failed to update KPI template: ${err?.message || 'Unknown error'}`);
                      }
                    }} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(t)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteModal(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}

      {grouped.length === 0 && <div className="surface-card p-12 text-center text-sm text-muted-foreground">No KPI templates found.</div>}

      <Dialog open={modal} onOpenChange={(open) => { if (!open) closeModal(); else setModal(true); }}>
        <DialogContent>
          <KpiModalErrorBoundary onClose={closeModal}>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit' : 'Add'} KPI Template</DialogTitle>
              <DialogDescription>
                {editId ? 'Update the KPI template details below.' : 'Create a new KPI template for evaluations.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Department</label>
                <Select value={form.department_code || '__global__'} onValueChange={v => setForm(f => ({ ...f, department_code: v === '__global__' ? '' : v }))}>
                  <SelectTrigger className="input-field"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__global__">Global (All Departments)</SelectItem>
                    {(departments ?? []).map((d: any) => <SelectItem key={d.code} value={d.code}>{d.code} — {d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Leave as Global for KPIs that apply to all departments.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">KPI Title</label>
                <Input
                  placeholder="e.g. IT Risk Management"
                  value={form.title}
                  minLength={3}
                  onChange={e => {
                    setForm(f => ({ ...f, title: e.target.value }));
                    if (titleError) setTitleError('');
                  }}
                  className="input-field"
                />
                {titleError && <p className="text-xs text-destructive">{titleError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Non-Sales Weight (%)</label>
                  <Input type="number" min={0} max={100} step={0.1} value={form.weight_nonsales} onChange={e => setForm(f => ({ ...f, weight_nonsales: parseFloat(e.target.value) || 0 }))} className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Sales Weight (%)</label>
                  <Input type="number" min={0} max={100} step={0.1} value={form.weight_sales} onChange={e => setForm(f => ({ ...f, weight_sales: parseFloat(e.target.value) || 0 }))} className="input-field" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">These are informational — the system uses category-level weights in the evaluation formula.</p>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Active</label>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <span className="text-sm text-foreground">{form.is_active ? 'On' : 'Off'}</span>
                </div>
                <p className="text-xs text-muted-foreground">Inactive KPIs won't appear in evaluations.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Sort Order</label>
                <Input type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} className="input-field" />
                <p className="text-xs text-muted-foreground">Lower numbers appear first.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : editId ? 'Update KPI Template' : 'Add KPI Template'}</Button>
            </DialogFooter>
          </KpiModalErrorBoundary>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete KPI Template?</DialogTitle>
            <DialogDescription>
              Delete this KPI template? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
