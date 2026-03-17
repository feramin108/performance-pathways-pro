
-- Departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view active departments
CREATE POLICY "Authenticated users can view departments" ON public.departments
  FOR SELECT TO authenticated USING (true);

-- HR and admin can manage departments
CREATE POLICY "HR can manage departments" ON public.departments
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Department KPI templates
CREATE TABLE public.department_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'primary_a1',
  weight NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_rating INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.department_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view department KPIs" ON public.department_kpis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR can manage department KPIs" ON public.department_kpis
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Department-Manager assignment table
CREATE TABLE public.department_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department_id, manager_user_id)
);

ALTER TABLE public.department_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view department managers" ON public.department_managers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR can manage department managers" ON public.department_managers
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add department_id to profiles for linking employees to departments
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

-- Trigger for updated_at on departments
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
