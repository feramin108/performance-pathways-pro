import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useHCEvaluations } from '@/hooks/useSupabaseQueries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Calendar } from 'lucide-react';

export default function HCCycles() {
  const queryClient = useQueryClient();
  const { data: evaluations } = useHCEvaluations();
  const { data: cycles, refetch } = useQuery({
    queryKey: ['all-cycles'],
    queryFn: async () => {
      const { data } = await supabase.from('evaluation_cycles').select('*').order('year', { ascending: false });
      return data || [];
    },
  });

  const { data: totalEmployees } = useQuery({
    queryKey: ['total-active-employees'],
    queryFn: async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true);
      return count || 0;
    },
  });

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ year: new Date().getFullYear() + 1, label: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [closeModal, setCloseModal] = useState<string | null>(null);

  const getSubmissions = (cycleId: string) => (evaluations || []).filter((e: any) => e.cycle_id === cycleId && e.status !== 'draft').length;

  const handleCreate = async () => {
    if (!form.label) { toast.error('Label is required.'); return; }
    setSaving(true);
    const { error } = await supabase.from('evaluation_cycles').insert({
      year: form.year,
      label: form.label,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: false,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Cycle created.');
    setModal(false);
    setForm({ year: new Date().getFullYear() + 1, label: '', start_date: '', end_date: '' });
    refetch();
  };

  const activateCycle = async (id: string) => {
    // Deactivate all first
    await supabase.from('evaluation_cycles').update({ is_active: false }).neq('id', 'impossible');
    await supabase.from('evaluation_cycles').update({ is_active: true }).eq('id', id);
    toast.success('Cycle activated.');
    refetch();
    queryClient.invalidateQueries({ queryKey: ['active-cycle'] });
  };

  const closeCycle = async () => {
    if (!closeModal) return;
    await supabase.from('evaluation_cycles').update({ is_active: false }).eq('id', closeModal);
    toast.success('Cycle closed.');
    setCloseModal(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['active-cycle'] });
  };

  return (
    <DashboardLayout pageTitle="Evaluation Cycles">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Manage evaluation periods and track submission progress.</p>
        <Button size="sm" onClick={() => setModal(true)}><Plus className="h-4 w-4 mr-1" />Create New Cycle</Button>
      </div>

      <div className="surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(cycles || []).map((c: any) => {
              const subs = getSubmissions(c.id);
              const pct = totalEmployees ? Math.round((subs / totalEmployees) * 100) : 0;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-foreground text-data">{c.year}</TableCell>
                  <TableCell>{c.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.start_date || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.end_date || '—'}</TableCell>
                  <TableCell>
                    <span className="text-xs rounded-full px-2 py-0.5" style={{
                      background: c.is_active ? '#14532d' : '#1e293b',
                      color: c.is_active ? '#86efac' : '#94a3b8',
                    }}>{c.is_active ? 'Active' : 'Closed'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="w-16 h-2" />
                      <span className="text-xs text-muted-foreground">{subs}/{totalEmployees}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {c.is_active ? (
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCloseModal(c.id)}>Close</Button>
                      ) : (
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => activateCycle(c.id)}>Activate</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Evaluation Cycle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="number" placeholder="Year" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="input-field" />
            <Input placeholder='Label (e.g. "Annual Appraisal 2026")' value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="input-field" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="input-field" />
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="input-field" />
            </div>
            <p className="text-xs text-muted-foreground">Only one cycle can be active at a time.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleCreate}>{saving ? 'Creating...' : 'Create Cycle'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!closeModal} onOpenChange={() => setCloseModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close This Cycle?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Closing will prevent new submissions and move the cycle to closed status.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseModal(null)}>Cancel</Button>
            <Button variant="destructive" onClick={closeCycle}>Close Cycle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
