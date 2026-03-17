import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Fetch current user's evaluations
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

// Fetch evaluations visible to manager (RLS filters automatically)
export function useManagerEvaluations() {
  return useQuery({
    queryKey: ['manager-evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*, employee:profiles!evaluations_employee_id_fkey(full_name, department, branch)')
        .order('created_at', { ascending: false }) as any;
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch evaluations visible to HC (RLS filters automatically)
export function useHCEvaluations() {
  return useQuery({
    queryKey: ['hc-evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .order('created_at', { ascending: false }) as any;
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch notifications for current user
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch active evaluation cycle
export function useActiveCycle() {
  return useQuery({
    queryKey: ['active-cycle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_cycles')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// Fetch all active profiles
export function useAllProfiles() {
  return useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch departments
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch KPI templates
export function useKPITemplates(departmentCode?: string) {
  return useQuery({
    queryKey: ['kpi-templates', departmentCode],
    queryFn: async () => {
      let query = supabase.from('kpi_templates').select('*').eq('is_active', true).order('sort_order');
      if (departmentCode) {
        query = query.or(`department_code.eq.${departmentCode},department_code.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}
