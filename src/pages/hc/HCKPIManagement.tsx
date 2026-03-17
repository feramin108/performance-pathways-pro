import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useKPITemplates, useDepartments } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'A1', label: 'Primary A1' },
  { value: 'A2_WIG', label: 'A2 WIG' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'generic', label: 'Generic' },
];

export default function HCKPIManagement() {
  const { data: templates, refetch } = useKPITemplates();
  const { data: departments } = useDepartments();
  const queryClient = useQueryClient();
  const [deptFilter, setDeptFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', category: 'A1', department_code: '', weight_nonsales: 0, weight_sales: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = templates || [];
    if (deptFilter !== 'all') list = list.filter((t: any) => t.department_code === deptFilter || !t.department_code);
    return list;
  }, [templates, deptFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((t: any) => {
      const key = t.department_code || 'Global';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const openAdd = () => {
    setEditId(null);
    setForm({ title: '', category: 'A1', department_code: '', weight_nonsales: 0, weight_sales: 0, is_active: true });
    setModal(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({ title: t.title, category: t.category, department_code: t.department_code || '', weight_nonsales: t.weight_nonsales || 0, weight_sales: t.weight_sales || 0, is_active: t.is_active });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Title is required.'); return; }
    setSaving(true);
    const payload = {
      title: form.title,
      category: form.category,
      department_code: form.department_code || null,
      weight_nonsales: form.weight_nonsales,
      weight_sales: form.weight_sales,
      is_active: form.is_active,
    };
    if (editId) {
      const { error } = await supabase.from('kpi_templates').update(payload).eq('id', editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('KPI template updated.');
    } else {
      const { error } = await supabase.from('kpi_templates').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('KPI template created.');
    }
    setSaving(false);
    setModal(false);
    queryClient.invalidateQueries({ queryKey: ['kpi-templates'] });
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const { error } = await supabase.from('kpi_templates').delete().eq('id', deleteModal);
    if (error) { toast.error(error.message); return; }
    toast.success('KPI template deleted.');
    setDeleteModal(null);
    refetch();
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
                  <TableCell className="text-center text-data text-sm">{t.weight_nonsales || 0}%</TableCell>
                  <TableCell className="text-center text-data text-sm">{t.weight_sales || 0}%</TableCell>
                  <TableCell className="text-center"><Switch checked={t.is_active} onCheckedChange={async (v) => { await supabase.from('kpi_templates').update({ is_active: v }).eq('id', t.id); refetch(); }} /></TableCell>
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

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} KPI Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="KPI Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" />
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.department_code} onValueChange={v => setForm(f => ({ ...f, department_code: v }))}>
              <SelectTrigger className="input-field"><SelectValue placeholder="Department (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Global</SelectItem>
                {(departments || []).map((d: any) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Non-Sales Weight %" value={form.weight_nonsales} onChange={e => setForm(f => ({ ...f, weight_nonsales: Number(e.target.value) }))} className="input-field" />
              <Input type="number" placeholder="Sales Weight %" value={form.weight_sales} onChange={e => setForm(f => ({ ...f, weight_sales: Number(e.target.value) }))} className="input-field" />
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /> Active</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : editId ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete KPI Template?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will remove the template from future evaluations. Existing entries are preserved.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
