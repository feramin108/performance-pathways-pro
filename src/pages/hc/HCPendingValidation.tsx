import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useHCEvaluations, useAllProfiles } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { getEvaluationStatus } from '@/lib/evaluationAudit';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, Send } from 'lucide-react';

export default function HCPendingValidation() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: evaluations, refetch } = useHCEvaluations();
  const { data: profiles } = useAllProfiles();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const pending = useMemo(() => {
    let list = (evaluations || []).filter((e: any) => e.status === 'sent_to_hc');
    if (search) list = list.filter((e: any) => {
      const emp = profiles?.find((p: any) => p.id === e.employee_id);
      return emp?.full_name?.toLowerCase().includes(search.toLowerCase());
    });
    if (deptFilter !== 'all') list = list.filter((e: any) => {
      const emp = profiles?.find((p: any) => p.id === e.employee_id);
      return emp?.department === deptFilter;
    });
    if (slaFilter === 'overdue') list = list.filter((e: any) => daysAt(e) >= 5);
    if (slaFilter === 'critical') list = list.filter((e: any) => daysAt(e) >= 10);
    return list.sort((a: any, b: any) => daysAt(b) - daysAt(a));
  }, [evaluations, profiles, search, deptFilter, slaFilter]);

  const depts = useMemo(() => [...new Set((profiles || []).map((p: any) => p.department).filter(Boolean))].sort(), [profiles]);

  function daysAt(e: any) {
    if (!e.stage_hc_review_started_at) return 0;
    return Math.floor((Date.now() - new Date(e.stage_hc_review_started_at).getTime()) / 86400000);
  }

  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === pending.length ? [] : pending.map((e: any) => e.id));

  const handleBulkValidate = async () => {
    if (!bulkRemarks || bulkRemarks.length < 20) { toast.error('HC remarks must be at least 20 characters.'); return; }
    setLoading(true);
    try {
      for (const id of selected) {
        await supabase.from('evaluations').update({
          hc_remarks: bulkRemarks,
          hc_decision: 'validated',
          status: 'hc_validated',
          hc_reviewed_at: new Date().toISOString(),
          hc_reviewer_id: user?.id,
        }).eq('id', id);
        const ev = evaluations?.find((e: any) => e.id === id);
        await supabase.from('audit_logs').insert({
          evaluation_id: id, actor_id: user?.id, actor_role: 'hc',
          actor_username: profile?.full_name, action: 'HC validation completed — validated',
          old_status: 'sent_to_hc', new_status: 'hc_validated',
        });
        if (ev) {
          await supabase.from('notifications').insert({
            recipient_id: ev.employee_id, title: 'Your evaluation has been validated by HC',
            message: 'Your 2025 appraisal has been reviewed by the HC team. Decision: Validated & Approved.',
            evaluation_id: id, type: 'hc_validated',
          });
        }
      }
      toast.success(`${selected.length} evaluations validated.`);
      setSelected([]);
      setBulkModal(false);
      setBulkRemarks('');
      refetch();
    } catch { toast.error('Error during bulk validation.'); }
    setLoading(false);
  };

  return (
    <DashboardLayout pageTitle="Pending HC Validation">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 input-field" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[160px] input-field"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>{[['all', 'All Depts'], ...depts.map(d => [d, d])].map(([v, l]) => <SelectItem key={v} value={v as string}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={slaFilter} onValueChange={setSlaFilter}>
          <SelectTrigger className="w-[160px] input-field"><SelectValue placeholder="SLA Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="overdue">Overdue (5+)</SelectItem>
            <SelectItem value="critical">Critical (10+)</SelectItem>
          </SelectContent>
        </Select>
        {search || deptFilter !== 'all' || slaFilter !== 'all' ? (
          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSearch(''); setDeptFilter('all'); setSlaFilter('all'); }}>Clear Filters</button>
        ) : null}
      </div>

      <div className="surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><input type="checkbox" checked={selected.length === pending.length && pending.length > 0} onChange={toggleAll} className="rounded" /></TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Days at HC</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No evaluations pending validation.</TableCell></TableRow>
            )}
            {pending.map((e: any) => {
              const emp = profiles?.find((p: any) => p.id === e.employee_id);
              const days = daysAt(e);
              return (
                <TableRow key={e.id} style={days >= 10 ? { background: '#1a0a0a' } : days >= 5 ? { background: '#1a1500' } : {}}>
                  <TableCell><input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggleSelect(e.id)} className="rounded" /></TableCell>
                  <TableCell className="font-medium text-foreground">
                    {e.score_tampered && <span className="text-destructive mr-1">⚠</span>}
                    {emp?.full_name || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{emp?.employee_id || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{emp?.department || '—'}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: days >= 10 ? '#7c2d12' : days >= 5 ? '#78350f' : '#14532d', color: days >= 10 ? '#fca5a5' : days >= 5 ? '#fde68a' : '#86efac' }}>
                      {days >= 5 ? '⚑ ' : ''}{days}d
                    </span>
                  </TableCell>
                  <TableCell className="text-data text-sm">{e.final_score?.toFixed(1) ?? '—'}</TableCell>
                  <TableCell>{e.final_classification && <span className="text-xs font-medium">{e.final_classification}</span>}</TableCell>
                  <TableCell>
                    <button onClick={() => navigate(`/hc/evaluation/${e.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-md" style={{ background: '#a855f7', color: 'white' }}>Validate</button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-[220px] right-0 z-50 flex items-center justify-between px-6 py-3 border-t border-border" style={{ background: '#1e293b' }}>
          <span className="text-sm text-foreground font-medium">{selected.length} selected</span>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => setBulkModal(true)} style={{ background: '#14532d', color: '#86efac', borderColor: '#22c55e' }}>Validate All Selected</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
          </div>
        </div>
      )}

      <Dialog open={bulkModal} onOpenChange={setBulkModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk HC Validation</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">Enter shared HC remarks for {selected.length} evaluation(s):</p>
          <Textarea value={bulkRemarks} onChange={e => setBulkRemarks(e.target.value)} rows={4} placeholder="Write your HC assessment (min 20 chars)..." />
          <p className="text-xs text-muted-foreground mt-1">{bulkRemarks.length}/20 minimum characters</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkModal(false)}>Cancel</Button>
            <Button disabled={loading || bulkRemarks.length < 20} onClick={handleBulkValidate} style={{ background: '#14532d', color: '#86efac' }}>
              {loading ? 'Validating...' : 'Confirm Validation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
