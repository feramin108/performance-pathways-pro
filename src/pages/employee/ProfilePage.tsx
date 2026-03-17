import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useMyEvaluations } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import { Save, User } from 'lucide-react';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { data: evaluations } = useMyEvaluations();
  const [form, setForm] = useState({
    full_name: '', sex: '', marital_status: '',
    academic_qualification: '', date_joining: '', function_role: '',
    occupied_since: '', previous_function: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        sex: profile.sex || '',
        marital_status: profile.marital_status || '',
        academic_qualification: profile.academic_qualification || '',
        date_joining: profile.date_joining || '',
        function_role: profile.function_role || '',
        occupied_since: profile.occupied_since || '',
        previous_function: profile.previous_function || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update(form as any).eq('id', profile.id);
      await refreshProfile();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const archived = evaluations?.filter((e: any) => e.status === 'archived' || e.final_score) || [];

  return (
    <DashboardLayout pageTitle="My Profile">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="surface-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Personal Information
          </h2>
          <div className="space-y-3">
            <Field label="Full Name" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} />
            <Field label="Email" value={profile?.email || ''} readOnly />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sex</label>
                <div className="flex gap-2">
                  {['M', 'F'].map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, sex: s }))}
                      className={`flex-1 h-10 rounded-lg text-sm font-medium transition-fast ${form.sex === s ? 'bg-primary text-primary-foreground' : 'bg-surface-raised border border-border text-muted-foreground'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Marital Status</label>
                <select value={form.marital_status} onChange={e => setForm(f => ({ ...f, marital_status: e.target.value }))} className="input-field w-full">
                  <option value="">Select</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Academic Qualification</label>
              <select value={form.academic_qualification} onChange={e => setForm(f => ({ ...f, academic_qualification: e.target.value }))} className="input-field w-full">
                <option value="">Select</option>
                {['HND', 'BSc', 'MSc', 'MBA', 'PhD', 'Other'].map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <Field label="Function / Role" value={form.function_role} onChange={v => setForm(f => ({ ...f, function_role: v }))} />
            <Field label="Date of Joining" value={form.date_joining} onChange={v => setForm(f => ({ ...f, date_joining: v }))} type="date" />
            <Field label="Occupied Since" value={form.occupied_since} onChange={v => setForm(f => ({ ...f, occupied_since: v }))} type="date" />
            <Field label="Previous Function" value={form.previous_function} onChange={v => setForm(f => ({ ...f, previous_function: v }))} />
            <Field label="Department" value={profile?.department || '—'} readOnly />
            <Field label="Branch" value={profile?.branch || '—'} readOnly />
            <Field label="Employee ID" value={profile?.employee_id || '—'} readOnly />
            {profile?.ad_groups && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">AD Groups</label>
                <div className="flex gap-1 flex-wrap">
                  {(profile.ad_groups as string[]).map(g => (
                    <span key={g} className="px-2 py-0.5 rounded bg-surface-raised border border-border text-xs text-muted-foreground">{g}</span>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50 mt-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="surface-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Performance Summary</h2>
          {archived.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 text-xs">Year</th>
                  <th className="text-left py-2 text-xs">Score</th>
                  <th className="text-left py-2 text-xs">Classification</th>
                  <th className="text-left py-2 text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {archived.map((e: any) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-2 text-foreground">{new Date(e.created_at).getFullYear()}</td>
                    <td className="py-2 text-data text-foreground">{e.final_score ? Number(e.final_score).toFixed(2) : '—'}</td>
                    <td className="py-2">{e.final_classification || '—'}</td>
                    <td className="py-2"><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No completed evaluations yet.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange, readOnly, type = 'text' }: {
  label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        className={`input-field w-full ${readOnly ? 'bg-surface-raised cursor-default' : ''}`} />
    </div>
  );
}
