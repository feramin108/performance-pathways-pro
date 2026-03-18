-- Ensure HC can read KPI entries needed for validation screens
DROP POLICY IF EXISTS "kpi_select_hc" ON public.kpi_entries;
DROP POLICY IF EXISTS "hc_read_kpi_entries" ON public.kpi_entries;

CREATE POLICY "hc_read_kpi_entries"
ON public.kpi_entries
FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'hc'
  OR evaluation_id IN (
    SELECT e.id
    FROM public.evaluations e
    WHERE e.employee_id = auth.uid()
       OR e.first_manager_id = auth.uid()
       OR e.second_manager_id = auth.uid()
  )
);