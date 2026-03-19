import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, Pencil, Search, UserCheck, UserPlus, UserX, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/StatCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { toast } from 'sonner';

interface RoleRecord {
  role: string;
}

interface ManagerRef {
  id: string;
  full_name: string;
  department: string | null;
}

interface DirectoryProfile {
  id: string;
  full_name: string;
  email: string | null;
  employee_id: string | null;
  sex: string | null;
  department: string | null;
  branch: string | null;
  job_title: string | null;
  date_joining: string | null;
  employee_type: string | null;
  academic_qualification: string | null;
  marital_status: string | null;
  is_active: boolean | null;
  manager_id: string | null;
  second_manager_id: string | null;
  manager?: ManagerRef | null;
  second_manager?: ManagerRef | null;
  user_roles?: RoleRecord[] | null;
}

interface DepartmentRecord {
  code: string;
  name: string;
  is_active: boolean | null;
}

interface ActiveEvaluation {
  id: string;
  employee_id: string;
  status: string | null;
  first_manager_id: string | null;
}

const EMPTY_NEW_EMPLOYEE = {
  full_name: '',
  employee_id: '',
  email: '',
  sex: '',
  department: '',
  branch: '',
  job_title: '',
  date_joining: '',
  employee_type: 'non_sales',
  academic_qualification: '',
  marital_status: '',
};

const EMPTY_ASSIGNMENT_FORM = {
  manager_id: '',
  second_manager_id: '',
  department: '',
};

export default function HCEmployeeDirectory() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [managerStatusFilter, setManagerStatusFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ ...EMPTY_NEW_EMPLOYEE });
  const [selectedEmployee, setSelectedEmployee] = useState<DirectoryProfile | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({ ...EMPTY_ASSIGNMENT_FORM });
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [bulkManagerId, setBulkManagerId] = useState('');
  const [bulkSecondManagerId, setBulkSecondManagerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);

  const { data: profiles = [], refetch } = useQuery({
    queryKey: ['hc-employee-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          employee_id,
          sex,
          department,
          branch,
          job_title,
          date_joining,
          employee_type,
          academic_qualification,
          marital_status,
          is_active,
          manager_id,
          second_manager_id,
          manager:profiles!profiles_manager_id_fkey(id, full_name, department),
          second_manager:profiles!profiles_second_manager_id_fkey(id, full_name, department),
          user_roles(role)
        `)
        .order('full_name');

      if (error) throw error;
      return ((data || []) as any[]).map((row) => ({
        ...row,
        manager: Array.isArray(row.manager) ? row.manager[0] ?? null : row.manager ?? null,
        second_manager: Array.isArray(row.second_manager) ? row.second_manager[0] ?? null : row.second_manager ?? null,
      })) as DirectoryProfile[];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['employee-directory-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('code, name, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as DepartmentRecord[];
    },
  });

  const { data: managers = [] } = useQuery({
    queryKey: ['employee-directory-managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, user_roles!inner(role)')
        .eq('user_roles.role', 'manager')
        .order('full_name');

      if (error) throw error;

      const unique = new Map<string, ManagerRef>();
      (data || []).forEach((manager: any) => {
        if (!unique.has(manager.id)) {
          unique.set(manager.id, {
            id: manager.id,
            full_name: manager.full_name,
            department: manager.department,
          });
        }
      });

      return Array.from(unique.values());
    },
  });

  const { data: activeEvaluations = [] } = useQuery({
    queryKey: ['employee-directory-active-evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('id, employee_id, status, first_manager_id')
        .in('status', ['draft', 'submitted']);

      if (error) throw error;
      return (data || []) as ActiveEvaluation[];
    },
  });

  const employees = useMemo(
    () => profiles.filter((profileRecord) => (profileRecord.user_roles?.[0]?.role || 'employee') === 'employee'),
    [profiles],
  );

  const departmentOptions = useMemo<SearchableSelectOption[]>(
    () => departments.map((department) => ({
      value: department.code,
      label: `${department.code} — ${department.name}`,
      meta: department.name,
    })),
    [departments],
  );

  const managerLookup = useMemo(() => {
    const map = new Map<string, ManagerRef>();
    managers.forEach((manager) => map.set(manager.id, manager));
    return map;
  }, [managers]);

  const baseManagerOptions = useMemo<SearchableSelectOption[]>(
    () => managers.map((manager) => ({
      value: manager.id,
      label: `${manager.full_name} — ${manager.department || 'No department'}`,
      meta: manager.department || 'No department',
    })),
    [managers],
  );

  const editManagerOptions = useMemo(
    () => baseManagerOptions.filter((option) => option.value !== selectedEmployee?.id),
    [baseManagerOptions, selectedEmployee?.id],
  );

  const filtered = useMemo(() => {
    let list = [...employees];

    if (!showInactive) list = list.filter((employee) => employee.is_active);
    if (search) {
      const term = search.toLowerCase();
      list = list.filter((employee) =>
        employee.full_name?.toLowerCase().includes(term) ||
        employee.employee_id?.toLowerCase().includes(term) ||
        employee.manager?.full_name?.toLowerCase().includes(term),
      );
    }
    if (deptFilter !== 'all') list = list.filter((employee) => employee.department === deptFilter);
    if (managerStatusFilter === 'assigned') list = list.filter((employee) => employee.manager_id);
    if (managerStatusFilter === 'unassigned') list = list.filter((employee) => !employee.manager_id);

    return list;
  }, [employees, showInactive, search, deptFilter, managerStatusFilter]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active),
    [employees],
  );

  const summary = useMemo(() => {
    const managerAssigned = activeEmployees.filter((employee) => employee.manager_id).length;
    const noManagerAssigned = activeEmployees.filter((employee) => !employee.manager_id).length;
    const departmentsCovered = new Set(
      activeEmployees
        .filter((employee) => employee.manager_id && employee.department)
        .map((employee) => employee.department as string),
    ).size;

    return {
      totalEmployees: activeEmployees.length,
      managerAssigned,
      noManagerAssigned,
      departmentsCovered,
    };
  }, [activeEmployees]);

  const bulkTargets = useMemo(() => {
    if (!bulkDepartment) return [];
    return employees.filter(
      (employee) => employee.department === bulkDepartment && employee.id !== bulkManagerId,
    );
  }, [employees, bulkDepartment, bulkManagerId]);

  const overrideCount = useMemo(
    () => bulkTargets.filter((employee) => employee.manager_id && employee.manager_id !== bulkManagerId).length,
    [bulkTargets, bulkManagerId],
  );

  const selectedManager = assignmentForm.manager_id ? managerLookup.get(assignmentForm.manager_id) ?? null : null;
  const selectedSecondManager = assignmentForm.second_manager_id ? managerLookup.get(assignmentForm.second_manager_id) ?? null : null;
  const bulkSelectedManager = bulkManagerId ? managerLookup.get(bulkManagerId) ?? null : null;
  const bulkSelectedSecondManager = bulkSecondManagerId ? managerLookup.get(bulkSecondManagerId) ?? null : null;
  const selectedDepartmentLabel = departments.find((department) => department.code === assignmentForm.department)?.name;
  const bulkDepartmentName = departments.find((department) => department.code === bulkDepartment)?.name || bulkDepartment;

  const activeEvaluationConflict = useMemo(() => {
    if (!selectedEmployee) return null;
    return activeEvaluations.find((evaluation) =>
      evaluation.employee_id === selectedEmployee.id &&
      ['draft', 'submitted'].includes(evaluation.status || '') &&
      (evaluation.first_manager_id || '') !== assignmentForm.manager_id,
    ) || null;
  }, [activeEvaluations, assignmentForm.manager_id, selectedEmployee]);

  const currentManagerName = useMemo(() => {
    if (!selectedEmployee?.manager_id) return 'None';
    return managerLookup.get(selectedEmployee.manager_id)?.full_name || selectedEmployee.manager?.full_name || 'Current manager';
  }, [managerLookup, selectedEmployee]);

  function longevity(dateJoining: string | null) {
    if (!dateJoining) return '—';
    const months = Math.floor((Date.now() - new Date(dateJoining).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 24) return `${months} months`;
    return `${Math.floor(months / 12)} years, ${months % 12} months`;
  }

  const refreshDirectory = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ['hc-employee-directory'] }),
      queryClient.invalidateQueries({ queryKey: ['employee-directory-active-evaluations'] }),
    ]);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', id);
    if (error) {
      toast.error(`Failed to update employee status: ${error.message}`);
      return;
    }
    await refreshDirectory();
    toast.success(`Employee ${!current ? 'activated' : 'deactivated'}.`);
  };

  const handleAdd = async () => {
    if (!newEmp.full_name || !newEmp.email) {
      toast.error('Name and email are required.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('profiles').insert({
      id: crypto.randomUUID(),
      full_name: newEmp.full_name,
      employee_id: newEmp.employee_id || null,
      email: newEmp.email,
      sex: newEmp.sex || null,
      department: newEmp.department || null,
      branch: newEmp.branch || null,
      job_title: newEmp.job_title || null,
      date_joining: newEmp.date_joining || null,
      employee_type: newEmp.employee_type,
      academic_qualification: newEmp.academic_qualification || null,
      marital_status: newEmp.marital_status || null,
    } as any);
    setSaving(false);

    if (error) {
      toast.error(`Error creating employee: ${error.message}`);
      return;
    }

    toast.success('Employee profile created.');
    setAddModal(false);
    setNewEmp({ ...EMPTY_NEW_EMPLOYEE });
    await refreshDirectory();
  };

  const openEdit = (employee: DirectoryProfile) => {
    setSelectedEmployee(employee);
    setAssignmentForm({
      manager_id: employee.manager_id || '',
      second_manager_id: employee.second_manager_id || '',
      department: employee.department || '',
    });
    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setSelectedEmployee(null);
    setAssignmentForm({ ...EMPTY_ASSIGNMENT_FORM });
  };

  const handleSaveAssignment = async () => {
    if (!selectedEmployee || !user) return;

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          manager_id: assignmentForm.manager_id || null,
          second_manager_id: assignmentForm.second_manager_id || null,
          department: assignmentForm.department || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      const managerName = selectedManager?.full_name || 'None';
      const secondManagerName = selectedSecondManager?.full_name || 'None';
      const departmentName = assignmentForm.department || 'None';

      const { error: auditError } = await supabase.from('audit_logs').insert({
        evaluation_id: null,
        actor_id: user.id,
        actor_role: 'hc',
        actor_username: profile?.full_name,
        action: 'Manager assignment updated by HC',
        notes: `First manager: ${managerName}. Second manager: ${secondManagerName}. Department: ${departmentName}.`,
      } as any);

      if (auditError) throw auditError;

      await refreshDirectory();
      toast.success('Profile updated — manager assignment saved.');
      closeEditModal();
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error?.message || 'Unknown error'}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const closeBulkModal = () => {
    setBulkModal(false);
    setBulkDepartment('');
    setBulkManagerId('');
    setBulkSecondManagerId('');
  };

  const handleBulkAssign = async () => {
    if (!bulkDepartment || !bulkManagerId || !user || bulkTargets.length === 0) return;

    setSavingBulk(true);
    try {
      const targetIds = bulkTargets.map((employee) => employee.id);
      const { error } = await supabase
        .from('profiles')
        .update({
          manager_id: bulkManagerId,
          second_manager_id: bulkSecondManagerId || null,
          updated_at: new Date().toISOString(),
        } as any)
        .in('id', targetIds);

      if (error) throw error;

      const actorName = profile?.full_name || 'HC';
      const managerName = bulkSelectedManager?.full_name || 'Selected manager';
      const auditEntries = bulkTargets.map((employee) => ({
        evaluation_id: null,
        actor_id: user.id,
        actor_role: 'hc',
        actor_username: actorName,
        action: 'Manager assigned by HC',
        notes: `${managerName} assigned as first line manager to ${employee.full_name} by ${actorName}`,
      }));

      const { error: auditError } = await supabase.from('audit_logs').insert(auditEntries as any);
      if (auditError) throw auditError;

      await refreshDirectory();
      toast.success(`${bulkTargets.length} employees in ${bulkDepartment} assigned to ${managerName}`);
      closeBulkModal();
    } catch (error: any) {
      toast.error(`Bulk assignment failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setSavingBulk(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Employee Directory">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Total Employees" value={summary.totalEmployees} icon={Users} accentColor="hsl(var(--foreground))" />
        <StatCard label="Manager Assigned" value={summary.managerAssigned} icon={UserCheck} accentColor="hsl(var(--success))" />
        <button type="button" className="text-left" onClick={() => setManagerStatusFilter('unassigned')}>
          <StatCard label="No Manager Assigned" value={summary.noManagerAssigned} icon={UserX} accentColor="hsl(var(--warning))" pulse={summary.noManagerAssigned > 0} />
        </button>
        <StatCard label="Departments Covered" value={summary.departmentsCovered} icon={Building2} accentColor="hsl(var(--primary))" />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, ID, or manager..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 input-field" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[180px] input-field"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.code} value={department.code}>{department.code} — {department.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={managerStatusFilter} onValueChange={setManagerStatusFilter}>
          <SelectTrigger className="w-[170px] input-field"><SelectValue placeholder="Manager Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          Show inactive
        </label>
        <Button variant="outline" size="sm" onClick={() => setBulkModal(true)}>Bulk Assign</Button>
        <Button size="sm" onClick={() => setAddModal(true)}><UserPlus className="h-4 w-4 mr-1" />Add Employee</Button>
      </div>

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Longevity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No employees found.</TableCell></TableRow>}
            {filtered.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium text-foreground">{employee.full_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground text-data">{employee.employee_id || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{employee.department || '—'}</TableCell>
                <TableCell>
                  {employee.manager ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-foreground">{employee.manager.full_name}</span>
                      {employee.manager.department && (
                        <Badge variant="secondary" className="border-border bg-accent text-accent-foreground">
                          {employee.manager.department}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge className="border-warning/30 bg-warning/20 text-warning hover:bg-warning/20">⚑ Unassigned</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{employee.branch || '—'}</TableCell>
                <TableCell className="text-xs">{employee.job_title || '—'}</TableCell>
                <TableCell className="text-xs text-data">{longevity(employee.date_joining)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={employee.employee_type === 'sales' ? 'bg-primary/15 text-primary' : 'bg-accent text-accent-foreground'}>
                    {employee.employee_type === 'sales' ? 'Sales' : 'Non-Sales'}
                  </Badge>
                </TableCell>
                <TableCell><Switch checked={!!employee.is_active} onCheckedChange={() => toggleActive(employee.id, !!employee.is_active)} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(employee)} aria-label={`Edit ${employee.full_name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editModal} onOpenChange={(open) => { if (!open) closeEditModal(); else setEditModal(true); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
            <DialogDescription>Update manager assignment and department for the selected employee.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground">First Line Manager</label>
                  {selectedEmployee?.manager && (
                    <Badge className="border-success/30 bg-success/15 text-success hover:bg-success/15">Currently assigned</Badge>
                  )}
                </div>
                <SearchableSelect
                  value={assignmentForm.manager_id}
                  onChange={(value) => setAssignmentForm((current) => ({ ...current, manager_id: value }))}
                  options={editManagerOptions}
                  placeholder="Select first line manager..."
                  searchPlaceholder="Search first line manager..."
                  emptyText="No managers found."
                />
                {selectedEmployee?.manager && (
                  <p className="text-xs text-muted-foreground">Current: {selectedEmployee.manager.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Second Line Manager (Optional)</label>
                <SearchableSelect
                  value={assignmentForm.second_manager_id}
                  onChange={(value) => setAssignmentForm((current) => ({ ...current, second_manager_id: value }))}
                  options={editManagerOptions}
                  placeholder="Select second line manager (optional)..."
                  searchPlaceholder="Search second line manager..."
                  emptyText="No managers found."
                />
                <p className="text-xs text-muted-foreground">Second line manager sign-off can be required per evaluation by the first line manager.</p>
              </div>
            </div>

            {assignmentForm.manager_id && assignmentForm.manager_id === assignmentForm.second_manager_id && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>First and second manager are the same person.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Department</label>
              <SearchableSelect
                value={assignmentForm.department}
                onChange={(value) => setAssignmentForm((current) => ({ ...current, department: value }))}
                options={departmentOptions}
                placeholder="Select department..."
                searchPlaceholder="Search department..."
                emptyText="No departments found."
              />
              {selectedEmployee?.department && (
                <p className="text-xs text-muted-foreground">Current department: {selectedEmployee.department}</p>
              )}
            </div>

            {selectedEmployee && assignmentForm.department !== (selectedEmployee.department || '') && (
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertDescription>Changing department will affect which KPI templates appear in this employee&apos;s next evaluation.</AlertDescription>
              </Alert>
            )}

            {activeEvaluationConflict && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Active evaluation warning</AlertTitle>
                <AlertDescription>
                  ⚑ This employee has an active evaluation assigned to {currentManagerName}. Changing the manager now will NOT affect their current in-progress evaluation. The new manager will apply from the next evaluation.
                </AlertDescription>
              </Alert>
            )}

            <div className="surface-card p-4 text-sm">
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Employee</p>
                  <p className="font-medium text-foreground">{selectedEmployee?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">First Line Manager</p>
                  <p className="text-foreground">{selectedManager?.full_name || 'None'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Second Line Manager</p>
                  <p className="text-foreground">{selectedSecondManager?.full_name || 'None'}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Department after save: {selectedDepartmentLabel ? `${assignmentForm.department} — ${selectedDepartmentLabel}` : 'None'}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>Cancel</Button>
            <Button disabled={savingEdit} onClick={handleSaveAssignment}>{savingEdit ? 'Saving...' : 'Save Assignment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkModal} onOpenChange={(open) => { if (!open) closeBulkModal(); else setBulkModal(true); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Assign Manager by Department</DialogTitle>
            <DialogDescription>Assign first and optional second line managers to all employees in a department.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Department</label>
              <SearchableSelect
                value={bulkDepartment}
                onChange={(value) => {
                  setBulkDepartment(value);
                  setBulkManagerId('');
                  setBulkSecondManagerId('');
                }}
                options={departmentOptions}
                placeholder="Select department..."
                searchPlaceholder="Search department..."
                emptyText="No departments found."
              />
            </div>

            {bulkDepartment && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Assign as First Line Manager</label>
                  <SearchableSelect
                    value={bulkManagerId}
                    onChange={setBulkManagerId}
                    options={baseManagerOptions}
                    placeholder="Select first line manager..."
                    searchPlaceholder="Search manager..."
                    emptyText="No managers found."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Assign as Second Line Manager (Optional)</label>
                  <SearchableSelect
                    value={bulkSecondManagerId}
                    onChange={setBulkSecondManagerId}
                    options={baseManagerOptions}
                    placeholder="Select second line manager (optional)..."
                    searchPlaceholder="Search second line manager..."
                    emptyText="No managers found."
                  />
                </div>
              </div>
            )}

            {bulkManagerId && bulkManagerId === bulkSecondManagerId && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>First and second manager are the same person.</AlertDescription>
              </Alert>
            )}

            {bulkDepartment && bulkManagerId && (
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-foreground">
                  This will assign <span className="font-medium">{bulkSelectedManager?.full_name}</span> as first line manager to ALL <span className="font-medium">{bulkTargets.length}</span> employees in <span className="font-medium">{bulkDepartmentName}</span>.
                </p>

                {bulkSelectedSecondManager && (
                  <p className="text-xs text-muted-foreground">Second line manager: {bulkSelectedSecondManager.full_name}</p>
                )}

                {overrideCount > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>⚑ {overrideCount} employees already have a manager assigned. This will override their current assignment.</AlertDescription>
                  </Alert>
                )}

                <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border bg-background p-3">
                  {bulkTargets.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      {bulkTargets.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                          <span className="text-foreground">{employee.full_name}</span>
                          <span className="text-xs text-muted-foreground">{employee.employee_id || employee.department || '—'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No employees found for this department.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeBulkModal}>Cancel</Button>
            <Button disabled={savingBulk || !bulkDepartment || !bulkManagerId || bulkTargets.length === 0} onClick={handleBulkAssign}>
              {savingBulk ? 'Assigning...' : 'Confirm Bulk Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Full Name *" value={newEmp.full_name} onChange={e => setNewEmp(n => ({ ...n, full_name: e.target.value }))} className="input-field" />
            <Input placeholder="Email *" value={newEmp.email} onChange={e => setNewEmp(n => ({ ...n, email: e.target.value }))} className="input-field" />
            <Input placeholder="Employee ID" value={newEmp.employee_id} onChange={e => setNewEmp(n => ({ ...n, employee_id: e.target.value }))} className="input-field" />
            <Select value={newEmp.sex} onValueChange={value => setNewEmp(n => ({ ...n, sex: value }))}>
              <SelectTrigger className="input-field"><SelectValue placeholder="Sex" /></SelectTrigger>
              <SelectContent><SelectItem value="M">M</SelectItem><SelectItem value="F">F</SelectItem></SelectContent>
            </Select>
            <Select value={newEmp.department} onValueChange={value => setNewEmp(n => ({ ...n, department: value }))}>
              <SelectTrigger className="input-field"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>{departments.map((department) => <SelectItem key={department.code} value={department.code}>{department.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Branch" value={newEmp.branch} onChange={e => setNewEmp(n => ({ ...n, branch: e.target.value }))} className="input-field" />
            <Input placeholder="Job Title" value={newEmp.job_title} onChange={e => setNewEmp(n => ({ ...n, job_title: e.target.value }))} className="input-field" />
            <Input type="date" placeholder="Date of Joining" value={newEmp.date_joining} onChange={e => setNewEmp(n => ({ ...n, date_joining: e.target.value }))} className="input-field" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Note: An auth account will need to be created separately for login access.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleAdd}>{saving ? 'Creating...' : 'Create Employee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
