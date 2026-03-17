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

const CATEGORIES = [
  { value: 'A1', label: 'Primary A1' },
  { value: 'A2_WIG', label: 'Primary A2 — WIG' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'generic', label: 'Generic' },
];

function getCategoryWeight(category: string, type: 'nonsales' | 'sales') {
  const weights: Record<string, { nonsales: string; sales: string }> = {
    A1: { nonsales: '60%', sales: '50%' },
    A2_WIG: { nonsales: '15%', sales: '25%' },
    secondary: { nonsales: '10%', sales: '10%' },
    generic: { nonsales: '15%', sales: '15%' },
  };
  return weights[category]?.[type] || '—';
}

const DEFAULT_FORM = { title: '', category: 'A1', department_code: '__global__', weight_nonsales: 0, weight_sales: 0, is_active: true };

export default function HCKPIManagement() {
  const { data: templates, refetch } = useKPITemplates();
  const { data: departments } = useDepartments();
  const queryClient = useQueryClient();
  const [deptFilter, setDeptFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const openAdd = () => {
    setEditId(null);
    setForm({ ...DEFAULT_FORM });
    setModal(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      title: t.title || '',
      category: t.category || 'A1',
      department_code: t.department_code || '__global__',
      weight_nonsales: t.weight_nonsales || 0,
      weight_sales: t.weight_sales || 0,
      is_active: t.is_active ?? true,
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        department_code: form.department_code === '__global__' ? null : form.department_code,
        weight_nonsales: parseFloat(String(form.weight_nonsales)) || 0,
        weight_sales: parseFloat(String(form.weight_sales)) || 0,
        is_active: form.is_active,
      };
      if (editId) {
        const { error } = await supabase.from('kpi_templates').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('KPI template updated.');
      } else {
        const { error } = await supabase.from('kpi_templates').insert(payload);
        if (error) throw error;
        toast.success('KPI template created.');
      }
      setModal(false);
      queryClient.invalidateQueries({ queryKey: ['kpi-templates'] });
      refetch();
    } catch (err: any) {
      toast.error('Failed to save: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const { count } = await supabase
        .from('kpi_entries')
        .select('id', { count: 'exact', head: true })
        .eq('kpi_template_id', deleteModal);
      if (count && count > 0) {
        toast.error(`Cannot delete — this KPI is used in ${count} evaluation(s). Deactivate it instead.`);
        setDeleteModal(null);
        return;
      }
      const { error } = await supabase.from('kpi_templates').delete().eq('id', deleteModal);
      if (error) throw error;
      toast.success('KPI template deleted.');
      setDeleteModal(null);
      refetch();
    } catch (err: any) {
      toast.error('Failed to delete: ' + (err?.message || 'Unknown error'));
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
            {(departments || []).map((d: any) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
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
                <TableHead className="text-center">Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-foreground">{t.title}</TableCell>
                  <TableCell><span className="text-xs rounded-full px-2 py-0.5 bg-card text-muted-foreground">{t.category}</span></TableCell>
                  <TableCell className="text-center text-sm font-mono">{getCategoryWeight(t.category, 'nonsales')}</TableCell>
                  <TableCell className="text-center text-sm font-mono">{getCategoryWeight(t.category, 'sales')}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={t.is_active} onCheckedChange={async (v) => {
                      try {
                        await supabase.from('kpi_templates').update({ is_active: v }).eq('id', t.id);
                        refetch();
                      } catch { /* silent */ }
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

      {/* Add/Edit Modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit' : 'Add'} KPI Template</DialogTitle>
            <DialogDescription>
              {editId ? 'Update the KPI template details below.' : 'Create a new KPI template for evaluations.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="KPI Title (e.g. IT Risk Management)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" />
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.department_code} onValueChange={v => setForm(f => ({ ...f, department_code: v }))}>
              <SelectTrigger className="input-field"><SelectValue placeholder="Department (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">Global (All Departments)</SelectItem>
                {(departments || []).map((d: any) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Non-Sales Weight %" value={form.weight_nonsales} onChange={e => setForm(f => ({ ...f, weight_nonsales: parseFloat(e.target.value) || 0 }))} className="input-field" />
              <Input type="number" placeholder="Sales Weight %" value={form.weight_sales} onChange={e => setForm(f => ({ ...f, weight_sales: parseFloat(e.target.value) || 0 }))} className="input-field" />
            </div>
            <p className="text-xs text-muted-foreground">Per-KPI weights are informational. The system uses category-level weights (A1: 60%/50%, A2: 15%/25%, etc.).</p>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /> Active</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : editId ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete KPI Template?</DialogTitle>
            <DialogDescription>This will remove the template from future evaluations. Existing entries are preserved.</DialogDescription>
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
