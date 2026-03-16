
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('employee', 'manager', 'hr', 'admin');

-- Profiles table (auto-filled from AD in production)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  manager_id UUID REFERENCES public.profiles(id),
  manager_name TEXT NOT NULL DEFAULT '',
  longevity TEXT NOT NULL DEFAULT '',
  qualification TEXT NOT NULL DEFAULT '',
  marital_status TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Evaluation cycles
CREATE TABLE public.evaluation_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evaluations
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cycle_id UUID REFERENCES public.evaluation_cycles(id),
  employee_name TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  longevity TEXT NOT NULL DEFAULT '',
  qualification TEXT NOT NULL DEFAULT '',
  marital_status TEXT NOT NULL DEFAULT '',
  evaluation_year INTEGER NOT NULL,
  is_sales_staff BOOLEAN NOT NULL DEFAULT false,
  career_path_preferences TEXT NOT NULL DEFAULT '',
  training_needs TEXT NOT NULL DEFAULT '',
  areas_for_improvement TEXT NOT NULL DEFAULT '',
  proposed_action_plan TEXT NOT NULL DEFAULT '',
  employee_comments TEXT NOT NULL DEFAULT '',
  manager_remarks TEXT NOT NULL DEFAULT '',
  hr_remarks TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'validated', 'archived')),
  total_score INTEGER NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);

-- KPI entries
CREATE TABLE public.kpi_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('primary_a1', 'primary_a2', 'secondary', 'generic')),
  title TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT NOT NULL DEFAULT '',
  performed_by_role TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers can view team profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "HR can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'hr'));
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Evaluation cycles policies (everyone can read active cycles)
CREATE POLICY "Anyone can view cycles" ON public.evaluation_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage cycles" ON public.evaluation_cycles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Evaluations policies
CREATE POLICY "Employees can view own evaluations" ON public.evaluations FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "Employees can create own evaluations" ON public.evaluations FOR INSERT WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "Employees can update own draft evaluations" ON public.evaluations FOR UPDATE USING (auth.uid() = employee_id AND status IN ('draft', 'changes_requested'));
CREATE POLICY "Managers can view submitted evaluations" ON public.evaluations FOR SELECT USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can update submitted evaluations" ON public.evaluations FOR UPDATE USING (public.has_role(auth.uid(), 'manager') AND status IN ('submitted', 'under_review'));
CREATE POLICY "HR can view approved evaluations" ON public.evaluations FOR SELECT USING (public.has_role(auth.uid(), 'hr'));
CREATE POLICY "HR can update approved evaluations" ON public.evaluations FOR UPDATE USING (public.has_role(auth.uid(), 'hr') AND status = 'approved');
CREATE POLICY "Admins can view all evaluations" ON public.evaluations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- KPI entries policies (follow parent evaluation access)
CREATE POLICY "Users can view own KPI entries" ON public.kpi_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.evaluations WHERE id = evaluation_id AND employee_id = auth.uid())
);
CREATE POLICY "Users can manage own KPI entries" ON public.kpi_entries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.evaluations WHERE id = evaluation_id AND employee_id = auth.uid())
);
CREATE POLICY "Users can update own KPI entries" ON public.kpi_entries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.evaluations WHERE id = evaluation_id AND employee_id = auth.uid())
);
CREATE POLICY "Users can delete own KPI entries" ON public.kpi_entries FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.evaluations WHERE id = evaluation_id AND employee_id = auth.uid())
);
CREATE POLICY "Managers can view KPI entries" ON public.kpi_entries FOR SELECT USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "HR can view KPI entries" ON public.kpi_entries FOR SELECT USING (public.has_role(auth.uid(), 'hr'));
CREATE POLICY "Admins can view KPI entries" ON public.kpi_entries FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.evaluations WHERE id = evaluation_id AND employee_id = auth.uid())
);
CREATE POLICY "Managers can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "HR can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'hr'));
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (performed_by = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  -- Default role is employee
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
