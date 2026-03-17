
-- ====================================================
-- FULL SCHEMA REBUILD FOR STAFF PERFORMANCE EVALUATION
-- ====================================================

DROP TABLE IF EXISTS email_reminders CASCADE;
DROP TABLE IF EXISTS kpi_goals CASCADE;
DROP TABLE IF EXISTS kpi_entries CASCADE;
DROP TABLE IF EXISTS kpi_templates CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS evaluation_cycles CASCADE;
DROP TABLE IF EXISTS department_managers CASCADE;
DROP TABLE IF EXISTS department_kpis CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TYPE IF EXISTS app_role CASCADE;

-- ============ TABLES ============

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar UNIQUE NOT NULL,
  name varchar NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  username varchar,
  full_name varchar NOT NULL DEFAULT '',
  email varchar,
  employee_id varchar UNIQUE,
  sex varchar,
  department varchar,
  branch varchar,
  job_title varchar,
  function_role varchar,
  occupied_since date,
  previous_function varchar,
  manager_id uuid REFERENCES profiles(id),
  second_manager_id uuid REFERENCES profiles(id),
  date_joining date,
  marital_status varchar,
  academic_qualification varchar,
  employee_type varchar DEFAULT 'non_sales',
  is_active boolean DEFAULT true,
  ad_groups jsonb,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role varchar NOT NULL,
  assigned_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE evaluation_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  label varchar NOT NULL,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  reminder_sent_at timestamptz,
  reminder_sent_by uuid REFERENCES profiles(id),
  manager_reminder_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE kpi_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code varchar REFERENCES departments(code),
  category varchar NOT NULL,
  title varchar NOT NULL,
  weight_nonsales decimal DEFAULT 0,
  weight_sales decimal DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0
);

CREATE TABLE kpi_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  cycle_id uuid REFERENCES evaluation_cycles(id) NOT NULL,
  kpi_template_id uuid REFERENCES kpi_templates(id),
  custom_title varchar,
  category varchar NOT NULL,
  goal_statement text,
  target_rating integer,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, cycle_id, kpi_template_id)
);

CREATE TABLE evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  first_manager_id uuid REFERENCES profiles(id),
  second_manager_id uuid REFERENCES profiles(id),
  second_manager_required boolean DEFAULT false,
  hc_reviewer_id uuid REFERENCES profiles(id),
  cycle_id uuid REFERENCES evaluation_cycles(id),
  employee_type varchar DEFAULT 'non_sales',
  status varchar DEFAULT 'draft',
  stage_submitted_at timestamptz,
  stage_manager_review_started_at timestamptz,
  stage_second_manager_started_at timestamptz,
  stage_hc_review_started_at timestamptz,
  a1_score_on_100 decimal(5,2),
  a1_weighted decimal(5,2),
  a2_score_on_100 decimal(5,2),
  a2_weighted decimal(5,2),
  sec_score_on_100 decimal(5,2),
  sec_weighted decimal(5,2),
  gen_score_on_100 decimal(5,2),
  gen_weighted decimal(5,2),
  final_score decimal(5,2),
  final_classification varchar,
  score_hash varchar,
  score_locked_at timestamptz,
  score_tampered boolean DEFAULT false,
  ai_summary text,
  ai_summary_generated_at timestamptz,
  career_path jsonb,
  training_needs jsonb,
  key_areas_improvement text,
  proposed_action_plan text,
  employee_comments text,
  first_manager_remarks text,
  second_manager_remarks text,
  hc_remarks text,
  management_action text,
  hc_decision varchar,
  revision_count integer DEFAULT 0,
  revision_note text,
  last_revision_requested_at timestamptz,
  submitted_at timestamptz,
  first_manager_reviewed_at timestamptz,
  second_manager_reviewed_at timestamptz,
  hc_reviewed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE kpi_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE CASCADE NOT NULL,
  kpi_template_id uuid REFERENCES kpi_templates(id),
  kpi_goal_id uuid REFERENCES kpi_goals(id),
  custom_title varchar,
  category varchar NOT NULL,
  employee_rating integer,
  manager_rating integer,
  rating_gap integer GENERATED ALWAYS AS (ABS(COALESCE(manager_rating,0) - COALESCE(employee_rating,0))) STORED,
  anomaly_flagged boolean DEFAULT false,
  employee_comment text,
  manager_comment text,
  sort_order integer DEFAULT 0
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES evaluations(id),
  actor_id uuid REFERENCES profiles(id),
  actor_role varchar,
  actor_username varchar,
  action varchar NOT NULL,
  old_status varchar,
  new_status varchar,
  notes text,
  tamper_detected boolean DEFAULT false,
  ip_address varchar,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES profiles(id) NOT NULL,
  type varchar,
  title varchar,
  message text,
  evaluation_id uuid REFERENCES evaluations(id),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE email_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES evaluation_cycles(id),
  sent_by uuid REFERENCES profiles(id),
  recipient_type varchar,
  recipient_count integer,
  sent_at timestamptz DEFAULT now(),
  notes text
);

-- ============ FUNCTIONS ============

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS varchar
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$;

-- ============ TRIGGERS ============

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER evaluations_updated_at BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ RLS ============

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "roles_select_own" ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "roles_select_hc" ON user_roles FOR SELECT TO authenticated USING (get_my_role() = 'hc');
CREATE POLICY "roles_insert" ON user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "roles_update_hc" ON user_roles FOR UPDATE TO authenticated USING (get_my_role() = 'hc');
CREATE POLICY "roles_delete_hc" ON user_roles FOR DELETE TO authenticated USING (get_my_role() = 'hc');

CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert_hc" ON departments FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'hc');
CREATE POLICY "departments_update_hc" ON departments FOR UPDATE TO authenticated USING (get_my_role() = 'hc');
CREATE POLICY "departments_delete_hc" ON departments FOR DELETE TO authenticated USING (get_my_role() = 'hc');

CREATE POLICY "cycles_select" ON evaluation_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "cycles_insert_hc" ON evaluation_cycles FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'hc');
CREATE POLICY "cycles_update_hc" ON evaluation_cycles FOR UPDATE TO authenticated USING (get_my_role() = 'hc');

CREATE POLICY "templates_select" ON kpi_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_insert_hc" ON kpi_templates FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'hc');
CREATE POLICY "templates_update_hc" ON kpi_templates FOR UPDATE TO authenticated USING (get_my_role() = 'hc');
CREATE POLICY "templates_delete_hc" ON kpi_templates FOR DELETE TO authenticated USING (get_my_role() = 'hc');

CREATE POLICY "goals_select_own" ON kpi_goals FOR SELECT TO authenticated USING (employee_id = auth.uid());
CREATE POLICY "goals_select_manager" ON kpi_goals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = kpi_goals.employee_id AND (profiles.manager_id = auth.uid() OR profiles.second_manager_id = auth.uid()))
);
CREATE POLICY "goals_select_hc" ON kpi_goals FOR SELECT TO authenticated USING (get_my_role() = 'hc');
CREATE POLICY "goals_insert_own" ON kpi_goals FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());
CREATE POLICY "goals_update_own" ON kpi_goals FOR UPDATE TO authenticated USING (employee_id = auth.uid());

CREATE POLICY "eval_select_own" ON evaluations FOR SELECT TO authenticated USING (employee_id = auth.uid());
CREATE POLICY "eval_select_manager" ON evaluations FOR SELECT TO authenticated USING (first_manager_id = auth.uid() OR second_manager_id = auth.uid());
CREATE POLICY "eval_select_hc" ON evaluations FOR SELECT TO authenticated USING (get_my_role() = 'hc');
CREATE POLICY "eval_insert_own" ON evaluations FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());
CREATE POLICY "eval_update_own_draft" ON evaluations FOR UPDATE TO authenticated USING (employee_id = auth.uid() AND status IN ('draft', 'revision_requested'));
CREATE POLICY "eval_update_manager" ON evaluations FOR UPDATE TO authenticated USING ((first_manager_id = auth.uid() OR second_manager_id = auth.uid()) AND status IN ('submitted', 'revision_requested', 'first_manager_approved'));
CREATE POLICY "eval_update_hc" ON evaluations FOR UPDATE TO authenticated USING (get_my_role() = 'hc');

CREATE POLICY "kpi_select_own" ON kpi_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM evaluations WHERE evaluations.id = kpi_entries.evaluation_id AND evaluations.employee_id = auth.uid()));
CREATE POLICY "kpi_select_manager" ON kpi_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM evaluations WHERE evaluations.id = kpi_entries.evaluation_id AND (evaluations.first_manager_id = auth.uid() OR evaluations.second_manager_id = auth.uid())));
CREATE POLICY "kpi_select_hc" ON kpi_entries FOR SELECT TO authenticated USING (get_my_role() = 'hc');
CREATE POLICY "kpi_insert_own" ON kpi_entries FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM evaluations WHERE evaluations.id = kpi_entries.evaluation_id AND evaluations.employee_id = auth.uid()));
CREATE POLICY "kpi_update_own" ON kpi_entries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM evaluations WHERE evaluations.id = kpi_entries.evaluation_id AND evaluations.employee_id = auth.uid() AND evaluations.status IN ('draft', 'revision_requested')));
CREATE POLICY "kpi_update_manager" ON kpi_entries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM evaluations WHERE evaluations.id = kpi_entries.evaluation_id AND (evaluations.first_manager_id = auth.uid() OR evaluations.second_manager_id = auth.uid())));
CREATE POLICY "kpi_delete_own" ON kpi_entries FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM evaluations WHERE evaluations.id = kpi_entries.evaluation_id AND evaluations.employee_id = auth.uid() AND evaluations.status IN ('draft', 'revision_requested')));

CREATE POLICY "audit_select_hc" ON audit_logs FOR SELECT TO authenticated USING (get_my_role() = 'hc');
CREATE POLICY "audit_select_own" ON audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM evaluations WHERE evaluations.id = audit_logs.evaluation_id AND (evaluations.employee_id = auth.uid() OR evaluations.first_manager_id = auth.uid())));
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notif_select_own" ON notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "notif_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "reminders_select_hc" ON email_reminders FOR SELECT TO authenticated USING (get_my_role() = 'hc');
CREATE POLICY "reminders_insert_hc" ON email_reminders FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'hc');

-- ============ SEED DATA ============

INSERT INTO departments (code, name) VALUES
  ('IT', 'Information Technology'),
  ('RISK', 'Risk Management'),
  ('CREDIT', 'Credit'),
  ('FINCON', 'Financial Control'),
  ('HC', 'Human Capital'),
  ('GM', 'General Management'),
  ('IA', 'Internal Audit'),
  ('CT', 'Corporate Treasury'),
  ('EBS', 'Electronic Banking Services'),
  ('SWIFT', 'SWIFT Operations'),
  ('STRA', 'Strategy'),
  ('CPU', 'Card Processing Unit'),
  ('LD', 'Legal & Documentation'),
  ('REC', 'Recovery'),
  ('LOG', 'Logistics'),
  ('ICU', 'International / Corporate Unit'),
  ('WU', 'Western Union Operations'),
  ('ARC', 'Archives'),
  ('BDS', 'Business Development & Strategy'),
  ('COM', 'Compliance & Communications');

INSERT INTO evaluation_cycles (year, label, start_date, end_date, is_active) VALUES
  (2025, 'Annual Appraisal 2025', '2025-01-01', '2025-12-31', true);

INSERT INTO kpi_templates (department_code, category, title, sort_order) VALUES
  ('IT', 'A1', 'Address security exceptions from auditors and regulators', 1),
  ('IT', 'A1', 'Protect bank information systems against cyber threats', 2),
  ('IT', 'A1', 'Perform IT/IS Security Tests', 3),
  ('IT', 'A1', 'Assist network team to build failover plan', 4),
  ('IT', 'A1', 'IT Risks Management', 5),
  ('IT', 'A1', 'Monitoring Security systems (applications, physical devices)', 6),
  ('IT', 'A1', 'Policy and Procedure Design', 7);

INSERT INTO kpi_templates (department_code, category, title, sort_order) VALUES
  ('IT', 'A2_WIG', 'Wildly Important Goal (self-defined)', 1);

INSERT INTO kpi_templates (department_code, category, title, sort_order) VALUES
  ('IT', 'secondary', 'Information Security Awareness Training for all staff', 1),
  ('IT', 'secondary', 'Support: tickets solved and closed', 2),
  ('IT', 'secondary', 'Security Innovations', 3);

INSERT INTO kpi_templates (department_code, category, title, sort_order) VALUES
  (NULL, 'generic', 'Reporting', 1),
  (NULL, 'generic', 'Teamwork', 2),
  (NULL, 'generic', 'Adaptability', 3),
  (NULL, 'generic', 'Communication', 4);
