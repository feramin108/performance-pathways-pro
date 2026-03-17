import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAllProfiles, useDepartments } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Search, UserPlus } from 'lucide-react';

export default function HCEmployeeDirectory() {
  const { data: profiles, refetch } = useAllProfiles();
  const { data: departments } = useDepartments();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ full_name: '', employee_id: '', email: '', sex: '', department: '', branch: '', job_title: '', date_joining: '', employee_type: 'non_sales', academic_qualification: '', marital_status: '' });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    let list = profiles || [];
    if (!showInactive) list = list.filter((p: any) => p.is_active);
    if (search) list = list.filter((p: any) => p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.employee_id?.toLowerCase().includes(search.toLowerCase()));
    if (deptFilter !== 'all') list = list.filter((p: any) => p.department === deptFilter);
    return list;
  }, [profiles, search, deptFilter, showInactive]);

  const depts = useMemo(() => [...new Set((profiles || []).map((p: any) => p.department).filter(Boolean))].sort(), [profiles]);

  function longevity(dateJoining: string | null) {
    if (!dateJoining) return '—';
    const months = Math.floor((Date.now() - new Date(dateJoining).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 24) return `${months} months`;
    return `${Math.floor(months / 12)} years, ${months % 12} months`;
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', id);
    refetch();
    toast.success(`Employee ${!current ? 'activated' : 'deactivated'}.`);
  };

  const handleAdd = async () => {
    if (!newEmp.full_name || !newEmp.email) { toast.error('Name and email are required.'); return; }
    setSaving(true);
    // Note: This creates a profile record. Auth account must be created separately.
    const { error } = await supabase.from('profiles').insert({
      id: crypto.randomUUID(),
      full_name: newEmp.full_name,
      employee_id: newEmp.employee_id || null,
      email: newEmp.email,
      sex: newEmp.sex || null,
      department: newEmp.department || null,
      branch: newEmp.branch || null,
      job_title: newEmp.job_title || null,
      date_joining: newEmp.date_joining || null,
      employee_type: newEmp.employee_type,
      academic_qualification: newEmp.academic_qualification || null,
      marital_status: newEmp.marital_status || null,
    } as any);
    setSaving(false);
    if (error) { toast.error('Error creating employee: ' + error.message); return; }
    toast.success('Employee profile created.');
    setAddModal(false);
    setNewEmp({ full_name: '', employee_id: '', email: '', sex: '', department: '', branch: '', job_title: '', date_joining: '', employee_type: 'non_sales', academic_qualification: '', marital_status: '' });
    refetch();
  };

  return (
    <DashboardLayout pageTitle="Employee Directory">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 input-field" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[160px] input-field"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Depts</SelectItem>{depts.map(d => <SelectItem key={d} value={d as string}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          Show inactive
        </label>
        <Button size="sm" onClick={() => setAddModal(true)}><UserPlus className="h-4 w-4 mr-1" />Add Employee</Button>
      </div>

      <div className="surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Longevity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No employees found.</TableCell></TableRow>}
            {filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-foreground">{p.full_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground text-data">{p.employee_id || '—'}</TableCell>
                <TableCell className="text-xs">{p.sex || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.department || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.branch || '—'}</TableCell>
                <TableCell className="text-xs">{p.job_title || '—'}</TableCell>
                <TableCell className="text-xs text-data">{longevity(p.date_joining)}</TableCell>
                <TableCell><span className="text-xs rounded-full px-2 py-0.5" style={{ background: p.employee_type === 'sales' ? '#78350f' : '#1e3a5f', color: p.employee_type === 'sales' ? '#fde68a' : '#93c5fd' }}>{p.employee_type === 'sales' ? 'Sales' : 'Non-Sales'}</span></TableCell>
                <TableCell><Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Full Name *" value={newEmp.full_name} onChange={e => setNewEmp(n => ({ ...n, full_name: e.target.value }))} className="input-field" />
            <Input placeholder="Email *" value={newEmp.email} onChange={e => setNewEmp(n => ({ ...n, email: e.target.value }))} className="input-field" />
            <Input placeholder="Employee ID" value={newEmp.employee_id} onChange={e => setNewEmp(n => ({ ...n, employee_id: e.target.value }))} className="input-field" />
            <Select value={newEmp.sex} onValueChange={v => setNewEmp(n => ({ ...n, sex: v }))}>
              <SelectTrigger className="input-field"><SelectValue placeholder="Sex" /></SelectTrigger>
              <SelectContent><SelectItem value="M">M</SelectItem><SelectItem value="F">F</SelectItem></SelectContent>
            </Select>
            <Select value={newEmp.department} onValueChange={v => setNewEmp(n => ({ ...n, department: v }))}>
              <SelectTrigger className="input-field"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>{(departments || []).map((d: any) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Branch" value={newEmp.branch} onChange={e => setNewEmp(n => ({ ...n, branch: e.target.value }))} className="input-field" />
            <Input placeholder="Job Title" value={newEmp.job_title} onChange={e => setNewEmp(n => ({ ...n, job_title: e.target.value }))} className="input-field" />
            <Input type="date" placeholder="Date of Joining" value={newEmp.date_joining} onChange={e => setNewEmp(n => ({ ...n, date_joining: e.target.value }))} className="input-field" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Note: An auth account will need to be created separately for login access.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleAdd}>{saving ? 'Creating...' : 'Create Employee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
