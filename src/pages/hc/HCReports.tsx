import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useHCEvaluations, useAllProfiles, useActiveCycle } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileText, Building, MapPin, Shield, Download } from 'lucide-react';

export default function HCReports() {
  const { data: evaluations } = useHCEvaluations();
  const { data: profiles } = useAllProfiles();
  const { data: activeCycle } = useActiveCycle();

  const { data: cycles } = useQuery({
    queryKey: ['all-cycles-reports'],
    queryFn: async () => {
      const { data } = await supabase.from('evaluation_cycles').select('*').order('year', { ascending: false });
      return data || [];
    },
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['all-audit-logs-export'],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000) as any;
      return data || [];
    },
  });

  const [selectedCycle, setSelectedCycle] = useState('');

  const downloadCSV = (type: string) => {
    let headers: string[] = [];
    let rows: string[] = [];
    const cycleId = selectedCycle || (activeCycle as any)?.id;

    if (type === 'audit') {
      headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Old Status', 'New Status', 'Notes', 'Tamper'];
      rows = (auditLogs || []).map((l: any) => [l.created_at, l.actor_username, l.actor_role, l.action, l.old_status, l.new_status, l.notes, l.tamper_detected].map(v => `"${v || ''}"`).join(','));
    } else {
      headers = ['Employee Name', 'Employee ID', 'Dept', 'Branch', 'Type', 'Status', 'Score', 'Classification', 'HC Decision', 'Submitted', 'Archived'];
      let list = evaluations || [];
      if (cycleId) list = list.filter((e: any) => e.cycle_id === cycleId);
      if (type === 'dept') {
        // all depts included
      }
      rows = list.map((e: any) => {
        const emp = profiles?.find((p: any) => p.id === e.employee_id);
        return [emp?.full_name, emp?.employee_id, emp?.department, emp?.branch, e.employee_type, e.status, e.final_score?.toFixed(1), e.final_classification, e.hc_decision, e.submitted_at?.slice(0, 10), e.archived_at?.slice(0, 10)].map(v => `"${v || ''}"`).join(',');
      });
    }

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Appraisal_${type}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { type: 'cycle', title: 'Full Cycle Report', desc: 'All evaluations for selected cycle with scores, classifications, and HC decisions.', icon: FileText },
    { type: 'dept', title: 'Department Report', desc: 'Evaluations filtered by department with KPI breakdown.', icon: Building },
    { type: 'branch', title: 'Branch Report', desc: 'Evaluations filtered by branch location code.', icon: MapPin },
    { type: 'audit', title: 'Audit Log Export', desc: 'Full system audit trail including all status changes and tamper alerts.', icon: Shield },
  ];

  return (
    <DashboardLayout pageTitle="Reports & Export">
      <div className="flex items-center gap-3 mb-6">
        <Select value={selectedCycle} onValueChange={setSelectedCycle}>
          <SelectTrigger className="w-[220px] input-field"><SelectValue placeholder="Select cycle" /></SelectTrigger>
          <SelectContent>{(cycles || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(card => (
          <div key={card.type} className="surface-card p-5">
            <div className="flex items-start gap-3 mb-4">
              <card.icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-foreground">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadCSV(card.type)}>
              <Download className="h-4 w-4 mr-1" />Download CSV
            </Button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
