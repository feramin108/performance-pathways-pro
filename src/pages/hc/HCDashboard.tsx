import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { useHCEvaluations, useAllProfiles, useActiveCycle } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Clock, CheckCircle, AlertTriangle, Users, Flag, Shield, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const ACCENT = 'hsl(0, 84%, 60%)';

function getClassColor(avg: number) {
  if (avg > 95) return '#f59e0b';
  if (avg >= 81) return '#a855f7';
  if (avg >= 66) return '#3b82f6';
  if (avg >= 50) return '#eab308';
  return '#ef4444';
}

function heatColor(val: number) {
  if (val >= 4.5) return { bg: '#0c4a6e', text: '#7dd3fc' };
  if (val >= 4.0) return { bg: '#14532d', text: '#86efac' };
  if (val >= 3.5) return { bg: '#1e3a5f', text: '#93c5fd' };
  if (val >= 3.0) return { bg: '#3f2a00', text: '#fde68a' };
  if (val >= 2.0) return { bg: '#78350f', text: '#fde68a' };
  return { bg: '#7c2d12', text: '#fca5a5' };
}

export default function HCDashboard() {
  const navigate = useNavigate();
  const { data: evaluations } = useHCEvaluations();
  const { data: profiles } = useAllProfiles();
  const { data: activeCycle } = useActiveCycle();
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  const { data: auditLogs } = useQuery({
    queryKey: ['hc-recent-audit'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12) as any;
      return data || [];
    },
  });

  const { data: kpiEntries } = useQuery({
    queryKey: ['hc-all-kpi-entries'],
    queryFn: async () => {
      const { data } = await supabase.from('kpi_entries').select('*, evaluation:evaluations(employee_id, status, cycle_id)') as any;
      return data || [];
    },
  });

  const pending = evaluations?.filter((e: any) => e.status === 'sent_to_hc') || [];
  const validated = evaluations?.filter((e: any) => ['hc_validated', 'archived'].includes(e.status) && activeCycle && e.cycle_id === (activeCycle as any).id).length || 0;
  const mgmtPending = evaluations?.filter((e: any) => e.status === 'hc_validated' && !e.management_action).length || 0;
  const activeEmployees = profiles?.filter((p: any) => p.is_active).length || 0;
  const noEvalYet = useMemo(() => {
    if (!profiles || !evaluations || !activeCycle) return 0;
    const withEval = new Set(evaluations.filter((e: any) => e.cycle_id === (activeCycle as any).id).map((e: any) => e.employee_id));
    return profiles.filter((p: any) => p.is_active && !withEval.has(p.id)).length;
  }, [profiles, evaluations, activeCycle]);

  const slaOverdue = pending.filter((e: any) => {
    if (!e.stage_hc_review_started_at) return false;
    return Math.floor((Date.now() - new Date(e.stage_hc_review_started_at).getTime()) / 86400000) >= 5;
  });

  const tampered = evaluations?.filter((e: any) => e.score_tampered) || [];

  // Dept performance data
  const deptData = useMemo(() => {
    if (!evaluations) return [];
    const archived = evaluations.filter((e: any) => ['archived', 'hc_validated'].includes(e.status) && e.final_score != null);
    const byDept: Record<string, number[]> = {};
    archived.forEach((e: any) => {
      const emp = profiles?.find((p: any) => p.id === e.employee_id);
      const dept = emp?.department || 'Unknown';
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(Number(e.final_score));
    });
    return Object.entries(byDept).map(([dept, scores]) => ({
      dept,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    })).sort((a, b) => b.avg - a.avg);
  }, [evaluations, profiles]);

  // KPI heat map
  const heatMapData = useMemo(() => {
    if (!kpiEntries || !profiles) return [];
    const map: Record<string, Record<string, number[]>> = {};
    kpiEntries.forEach((k: any) => {
      if (!k.evaluation || !['archived', 'hc_validated'].includes(k.evaluation.status)) return;
      const emp = profiles.find((p: any) => p.id === k.evaluation.employee_id);
      const dept = emp?.department || 'Unknown';
      if (!map[dept]) map[dept] = {};
      const cat = k.category;
      if (!map[dept][cat]) map[dept][cat] = [];
      const r = k.manager_rating ?? k.employee_rating;
      if (r != null) map[dept][cat].push(r);
    });
    return Object.entries(map).map(([dept, cats]) => {
      const row: any = { dept };
      ['A1', 'A2_WIG', 'secondary', 'generic'].forEach(c => {
        const vals = cats[c] || [];
        row[c] = vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
      });
      const all = Object.values(cats).flat() as number[];
      row.overall = all.length ? (all.reduce((a, b) => a + b, 0) / all.length) : null;
      return row;
    });
  }, [kpiEntries, profiles]);

  const daysAt = (e: any) => {
    if (!e.stage_hc_review_started_at) return 0;
    return Math.floor((Date.now() - new Date(e.stage_hc_review_started_at).getTime()) / 86400000);
  };

  return (
    <DashboardLayout pageTitle="HC Dashboard">
      {/* Alert Banners */}
      {pending.length > 0 && !dismissed.pending && (
        <div className="mb-3 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#3b0764', borderLeft: '4px solid #a855f7' }}>
          <Clock className="h-4 w-4 flex-shrink-0" style={{ color: '#a855f7' }} />
          <p className="text-sm flex-1" style={{ color: '#d8b4fe' }}>
            <strong>{pending.length}</strong> evaluation(s) received from managers and awaiting HC validation.{' '}
            <button className="underline font-medium" onClick={() => navigate('/hc/pending')}>Review now →</button>
          </p>
          <button onClick={() => setDismissed(d => ({ ...d, pending: true }))}><X className="h-4 w-4" style={{ color: '#d8b4fe' }} /></button>
        </div>
      )}
      {slaOverdue.length > 0 && !dismissed.sla && (
        <div className="mb-3 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#78350f', borderLeft: '4px solid #f59e0b' }}>
          <Flag className="h-4 w-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <p className="text-sm flex-1" style={{ color: '#fde68a' }}>
            ⚑ <strong>{slaOverdue.length}</strong> evaluation(s) have exceeded the 5-day HC review SLA.{' '}
            <button className="underline font-medium" onClick={() => navigate('/hc/evaluations')}>View overdue →</button>
          </p>
          <button onClick={() => setDismissed(d => ({ ...d, sla: true }))}><X className="h-4 w-4" style={{ color: '#fde68a' }} /></button>
        </div>
      )}
      {tampered.length > 0 && !dismissed.tamper && (
        <div className="mb-3 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#7c2d12', borderLeft: '4px solid #ef4444' }}>
          <Shield className="h-4 w-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-sm flex-1" style={{ color: '#fca5a5' }}>
            ⚠ Score integrity alert: <strong>{tampered.length}</strong> evaluation(s) have failed hash verification.{' '}
            <button className="underline font-medium" onClick={() => navigate('/hc/evaluations')}>Investigate →</button>
          </p>
          <button onClick={() => setDismissed(d => ({ ...d, tamper: true }))}><X className="h-4 w-4" style={{ color: '#fca5a5' }} /></button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Received from Managers" value={pending.length} icon={Clock} accentColor="#a855f7" pulse={pending.length > 0} sublabel={slaOverdue.length > 0 ? `${slaOverdue.length} overdue (5+ days)` : undefined} />
        <StatCard label="HC Validated This Cycle" value={validated} icon={CheckCircle} accentColor="#22c55e" />
        <StatCard label="Management Action Pending" value={mgmtPending} icon={AlertTriangle} accentColor="#f59e0b" sublabel="Awaiting final sign-off" />
        <StatCard label="Total Active Employees" value={activeEmployees} icon={Users} accentColor="#3b82f6" sublabel={`${noEvalYet} with no 2025 evaluation yet`} />
      </div>

      {/* Row 1: Pending table + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div className="lg:col-span-3 surface-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Pending HC Validation</h2>
          </div>
          {pending.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No evaluations pending HC validation.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Days at HC</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.slice(0, 10).map((e: any) => {
                  const emp = profiles?.find((p: any) => p.id === e.employee_id);
                  const days = daysAt(e);
                  return (
                    <TableRow key={e.id} className={days >= 10 ? 'animate-stat-pulse' : ''} style={days >= 10 ? { '--pulse-color': '#ef444440' } as any : days >= 5 ? { background: '#1a1500' } : {}}>
                      <TableCell className="font-medium">
                        {e.score_tampered && <span className="text-destructive mr-1">⚠</span>}
                        {emp?.full_name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{emp?.department || '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${days >= 10 ? 'text-[#fca5a5]' : days >= 5 ? 'text-[#fde68a]' : 'text-[#86efac]'}`}
                          style={{ background: days >= 10 ? '#7c2d12' : days >= 5 ? '#78350f' : '#14532d' }}>
                          {days >= 5 ? '⚑ ' : ''}{days}d
                        </span>
                      </TableCell>
                      <TableCell className="text-data text-sm">{e.final_score?.toFixed(1) ?? '—'}</TableCell>
                      <TableCell>
                        <button onClick={() => navigate(`/hc/evaluation/${e.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-md" style={{ background: '#a855f7', color: 'white' }}>Validate</button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="lg:col-span-2 surface-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Recent System Activity</h2>
            <button onClick={() => navigate('/hc/audit')} className="text-xs text-primary hover:underline">View Full Log →</button>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {(auditLogs || []).map((log: any) => (
              <div key={log.id} className="flex gap-3 px-5 py-3 border-b border-border/50 last:border-0">
                <div className="mt-1 h-2 w-2 rounded-full flex-shrink-0" style={{ background: log.actor_role === 'hc' ? '#ef4444' : log.actor_role === 'manager' ? '#f59e0b' : '#3b82f6' }} />
                <div className="min-w-0">
                  <p className="text-xs text-foreground truncate">{(log.action || '').slice(0, 60)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {log.actor_username || 'System'} · <span className="capitalize">{log.actor_role || ''}</span> · {new Date(log.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {(!auditLogs || auditLogs.length === 0) && <p className="p-5 text-sm text-muted-foreground text-center">No activity yet.</p>}
          </div>
        </div>
      </div>

      {/* Row 2: Department Performance */}
      <div className="surface-card mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Department Performance — 2025 Cycle</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Average final scores by department (completed evaluations)</p>
        </div>
        {deptData.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Distribution will appear after evaluations are completed.</div>
        ) : (
          <div className="p-5" style={{ height: Math.max(200, deptData.length * 36 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical" margin={{ left: 60, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="dept" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={55} />
                <Tooltip formatter={(v: any) => [v.toFixed(1), 'Avg Score']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                <ReferenceLine x={66} stroke="#3b82f6" strokeDasharray="5 5" />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {deptData.map((d, i) => <Cell key={i} fill={getClassColor(d.avg)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row 3: KPI Heat Map */}
      {heatMapData.length > 0 && (
        <div className="surface-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">KPI Category Heat Map — Team Performance</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Average rating (0–5) per category per dept</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Dept</th>
                  {['A1', 'A2 (WIG)', 'Secondary', 'Generic', 'Overall'].map(h => (
                    <th key={h} className="text-center px-4 py-3 text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatMapData.map((row: any) => (
                  <tr key={row.dept} className="border-b border-border/50">
                    <td className="px-4 py-2 text-xs font-medium text-foreground">{row.dept}</td>
                    {['A1', 'A2_WIG', 'secondary', 'generic', 'overall'].map(cat => {
                      const val = row[cat];
                      if (val == null) return <td key={cat} className="text-center px-4 py-2"><span className="text-data text-xs text-muted-foreground">—</span></td>;
                      const c = heatColor(val);
                      return (
                        <td key={cat} className="text-center px-4 py-2">
                          <span className="inline-block rounded px-2 py-1 text-data text-xs font-medium" style={{ background: c.bg, color: c.text }}>{val.toFixed(1)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
