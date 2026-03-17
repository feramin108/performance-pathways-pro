import { useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useHCEvaluations, useAllProfiles } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

export default function HCCalibration() {
  const { data: evaluations } = useHCEvaluations();
  const { data: profiles } = useAllProfiles();

  const { data: kpiEntries } = useQuery({
    queryKey: ['calibration-kpis'],
    queryFn: async () => {
      const { data } = await supabase.from('kpi_entries').select('*') as any;
      return data || [];
    },
  });

  // Manager comparison
  const managerData = useMemo(() => {
    if (!evaluations || !kpiEntries || !profiles) return [];
    const byMgr: Record<string, { name: string; dept: string; count: number; empScores: number[]; mgrScores: number[]; anomalies: number }> = {};
    
    evaluations.filter((e: any) => e.first_manager_id && e.status !== 'draft').forEach((e: any) => {
      const mgr = profiles.find((p: any) => p.id === e.first_manager_id);
      if (!mgr) return;
      if (!byMgr[e.first_manager_id]) byMgr[e.first_manager_id] = { name: mgr.full_name, dept: mgr.department || '—', count: 0, empScores: [], mgrScores: [], anomalies: 0 };
      byMgr[e.first_manager_id].count++;

      const entries = kpiEntries.filter((k: any) => k.evaluation_id === e.id);
      entries.forEach((k: any) => {
        if (k.employee_rating != null) byMgr[e.first_manager_id].empScores.push(k.employee_rating);
        if (k.manager_rating != null) byMgr[e.first_manager_id].mgrScores.push(k.manager_rating);
        if (k.anomaly_flagged) byMgr[e.first_manager_id].anomalies++;
      });
    });

    return Object.values(byMgr).map(m => ({
      ...m,
      avgEmp: m.empScores.length ? m.empScores.reduce((a, b) => a + b, 0) / m.empScores.length : 0,
      avgMgr: m.mgrScores.length ? m.mgrScores.reduce((a, b) => a + b, 0) / m.mgrScores.length : 0,
      avgDiff: m.mgrScores.length && m.empScores.length
        ? (m.mgrScores.reduce((a, b) => a + b, 0) / m.mgrScores.length) - (m.empScores.reduce((a, b) => a + b, 0) / m.empScores.length)
        : 0,
    })).sort((a, b) => b.avgDiff - a.avgDiff);
  }, [evaluations, kpiEntries, profiles]);

  // Dept calibration
  const deptCalibration = useMemo(() => {
    if (!evaluations || !profiles) return { depts: [], bankAvg: 0 };
    const archived = evaluations.filter((e: any) => ['archived', 'hc_validated'].includes(e.status) && e.final_score != null);
    const bankAvg = archived.length ? archived.reduce((a: number, e: any) => a + Number(e.final_score), 0) / archived.length : 0;
    const byDept: Record<string, number[]> = {};
    archived.forEach((e: any) => {
      const emp = profiles.find((p: any) => p.id === e.employee_id);
      const dept = emp?.department || 'Unknown';
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(Number(e.final_score));
    });
    const depts = Object.entries(byDept).filter(([, s]) => s.length >= 2).map(([dept, scores]) => ({
      dept, avg: scores.reduce((a, b) => a + b, 0) / scores.length, count: scores.length,
    })).sort((a, b) => b.avg - a.avg);
    return { depts, bankAvg };
  }, [evaluations, profiles]);

  // Flagged evaluations
  const flagged = useMemo(() => {
    if (!evaluations || !profiles) return [];
    return evaluations.filter((e: any) => e.score_tampered || e.hc_decision === 'flagged').map((e: any) => {
      const emp = profiles.find((p: any) => p.id === e.employee_id);
      const mgr = profiles.find((p: any) => p.id === e.first_manager_id);
      return { ...e, empName: emp?.full_name || '—', mgrName: mgr?.full_name || '—', dept: emp?.department || '—', reason: e.score_tampered ? 'Tamper Alert' : 'Flagged by HC' };
    });
  }, [evaluations, profiles]);

  function biasLabel(diff: number) {
    if (diff > 1.5) return { label: 'Very Lenient', bg: '#7c2d12', color: '#fca5a5' };
    if (diff > 0.5) return { label: 'Lenient', bg: '#78350f', color: '#fde68a' };
    if (diff < -0.5) return { label: 'Strict', bg: '#3b0764', color: '#d8b4fe' };
    return { label: 'Neutral', bg: '#14532d', color: '#86efac' };
  }

  return (
    <DashboardLayout pageTitle="Calibration View">
      <p className="text-sm text-muted-foreground mb-6">Identify rating patterns and potential bias across managers and departments.</p>

      {/* Section 1: Manager Comparison */}
      <div className="surface-card mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Manager Rating Patterns</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manager</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead className="text-center">Reviewed</TableHead>
              <TableHead className="text-center">Avg Emp</TableHead>
              <TableHead className="text-center">Avg Mgr</TableHead>
              <TableHead className="text-center">Avg Diff</TableHead>
              <TableHead className="text-center">Anomalies</TableHead>
              <TableHead>Bias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managerData.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No data yet.</TableCell></TableRow>}
            {managerData.map((m, i) => {
              const bias = biasLabel(m.avgDiff);
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium text-foreground">{m.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.dept}</TableCell>
                  <TableCell className="text-center text-data text-sm">{m.count}</TableCell>
                  <TableCell className="text-center text-data text-sm">{m.avgEmp.toFixed(1)}</TableCell>
                  <TableCell className="text-center text-data text-sm">{m.avgMgr.toFixed(1)}</TableCell>
                  <TableCell className="text-center text-data text-sm" style={{ color: m.avgDiff > 1.5 ? '#fca5a5' : m.avgDiff > 0.5 ? '#fde68a' : m.avgDiff < -0.5 ? '#d8b4fe' : '#86efac' }}>
                    {m.avgDiff > 0 ? '+' : ''}{m.avgDiff.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">{m.anomalies > 0 && <span className="text-xs rounded-full px-2 py-0.5" style={{ background: '#92400e', color: '#fcd34d' }}>{m.anomalies}</span>}</TableCell>
                  <TableCell><span className="text-xs rounded-full px-2 py-0.5" style={{ background: bias.bg, color: bias.color }}>{bias.label}</span></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Section 3: Dept Calibration */}
      <div className="surface-card mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Department vs Bank Average</h2>
        </div>
        {deptCalibration.depts.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Need at least 2 evaluations per dept.</div>
        ) : (
          <div className="p-5" style={{ height: Math.max(200, deptCalibration.depts.length * 40 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptCalibration.depts} layout="vertical" margin={{ left: 60, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="dept" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={55} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                <ReferenceLine x={deptCalibration.bankAvg} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `Bank avg: ${deptCalibration.bankAvg.toFixed(1)}`, fill: '#f59e0b', fontSize: 11 }} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Section 4: Flagged */}
      {flagged.length > 0 && (
        <div className="surface-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Evaluations Requiring Calibration Review</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flagged.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-foreground">{f.empName}</TableCell>
                  <TableCell className="text-sm">{f.mgrName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.dept}</TableCell>
                  <TableCell className="text-data text-sm">{f.final_score?.toFixed(1) ?? '—'}</TableCell>
                  <TableCell><span className="text-xs rounded-full px-2 py-0.5" style={{ background: f.reason === 'Tamper Alert' ? '#7c2d12' : '#78350f', color: f.reason === 'Tamper Alert' ? '#fca5a5' : '#fde68a' }}>{f.reason}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashboardLayout>
  );
}
