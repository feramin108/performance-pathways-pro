import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch current user profile with role
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      return {
        ...profile,
        authId: user.id,
        roles: roles?.map(r => r.role) || ['employee'],
        primaryRole: roles?.[0]?.role || 'employee',
      };
    },
  });
}

// Fetch evaluations for current user
export function useMyEvaluations() {
  return useQuery({
    queryKey: ['my-evaluations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch all evaluations (for manager/HR/admin)
export function useAllEvaluations() {
  return useQuery({
    queryKey: ['all-evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch single evaluation with KPIs
export function useEvaluation(id: string | undefined) {
  return useQuery({
    queryKey: ['evaluation', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;

      const { data: evaluation, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const { data: kpis } = await supabase
        .from('kpi_entries')
        .select('*')
        .eq('evaluation_id', id)
        .order('sort_order');

      return {
        ...evaluation,
        primaryA1: kpis?.filter(k => k.category === 'primary_a1') || [],
        primaryA2: kpis?.filter(k => k.category === 'primary_a2') || [],
        secondaryKPIs: kpis?.filter(k => k.category === 'secondary') || [],
        genericKPIs: kpis?.filter(k => k.category === 'generic') || [],
      };
    },
  });
}

// Fetch audit logs for an evaluation
export function useAuditLogs(evaluationId?: string) {
  return useQuery({
    queryKey: ['audit-logs', evaluationId],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: true });

      if (evaluationId) {
        query = query.eq('evaluation_id', evaluationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch notifications
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });
}

// Create evaluation mutation
export function useCreateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      evaluation: Record<string, unknown>;
      kpis: { category: string; title: string; rating: number; comment: string; sort_order: number }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: evaluation, error: evalError } = await supabase
        .from('evaluations')
        .insert({ ...params.evaluation, employee_id: user.id } as any)
        .select()
        .single();

      if (evalError) throw evalError;

      if (params.kpis.length > 0) {
        const kpiRows = params.kpis.map(k => ({
          ...k,
          evaluation_id: evaluation.id,
        }));

        const { error: kpiError } = await supabase
          .from('kpi_entries')
          .insert(kpiRows as any);

        if (kpiError) throw kpiError;
      }

      // Audit log
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      await supabase.from('audit_logs').insert({
        evaluation_id: evaluation.id,
        action: params.evaluation.status === 'submitted' ? 'Submitted' : 'Created',
        performed_by: user.id,
        performed_by_name: profile?.full_name || user.email || '',
        performed_by_role: 'employee',
        details: params.evaluation.status === 'submitted'
          ? 'Evaluation submitted for manager review'
          : 'Evaluation draft created',
      } as any);

      return evaluation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['all-evaluations'] });
    },
  });
}

// Update evaluation status (approve, request changes, validate)
export function useUpdateEvaluationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      status: string;
      remarks?: string;
      remarkField: 'manager_remarks' | 'hr_remarks';
      action: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates: Record<string, unknown> = { status: params.status };
      if (params.remarks) updates[params.remarkField] = params.remarks;
      if (params.status === 'approved') updates.approved_at = new Date().toISOString();

      const { error } = await supabase
        .from('evaluations')
        .update(updates)
        .eq('id', params.id);

      if (error) throw error;

      // Get profile and role
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      await supabase.from('audit_logs').insert({
        evaluation_id: params.id,
        action: params.action,
        performed_by: user.id,
        performed_by_name: profile?.full_name || '',
        performed_by_role: roles?.[0]?.role || 'employee',
        details: params.remarks || `Evaluation ${params.action.toLowerCase()}`,
      } as any);

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation'] });
      queryClient.invalidateQueries({ queryKey: ['all-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['my-evaluations'] });
    },
  });
}

// Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
