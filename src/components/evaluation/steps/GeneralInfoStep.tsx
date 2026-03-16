import { User } from '@/types/evaluation';

interface Props {
  user: User;
  generalInfo: { longevity: string; qualification: string; maritalStatus: string };
  setGeneralInfo: (info: { longevity: string; qualification: string; maritalStatus: string }) => void;
  isSalesStaff: boolean;
  setIsSalesStaff: (v: boolean) => void;
}

export function GeneralInfoStep({ user, generalInfo, setGeneralInfo, isSalesStaff, setIsSalesStaff }: Props) {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold tracking-tight">General Information</h2>
      <p className="mb-6 text-xs text-muted-foreground">
        Auto-filled from Active Directory. Edit fields as necessary.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="surface-card p-4">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Employee Name
          </label>
          <p className="text-sm font-medium">{user.fullName}</p>
        </div>

        <div className="surface-card p-4">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Function / Role
          </label>
          <p className="text-sm font-medium">{user.jobTitle}</p>
        </div>

        <div className="surface-card p-4">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Department
          </label>
          <p className="text-sm font-medium">{user.department}</p>
        </div>

        <div className="surface-card p-4">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Service / Unit
          </label>
          <p className="text-sm font-medium">{user.unit}</p>
        </div>

        <div className="surface-card p-4">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Manager / Reporting Line
          </label>
          <p className="text-sm font-medium">{user.managerName}</p>
        </div>

        <div className="surface-card p-4">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Email
          </label>
          <p className="text-sm font-medium">{user.email}</p>
        </div>

        <div className="surface-card p-4">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Longevity in Bank
          </label>
          <input
            value={generalInfo.longevity}
            onChange={e => setGeneralInfo({ ...generalInfo, longevity: e.target.value })}
            className="input-inset w-full"
          />
        </div>

        <div className="surface-card p-4">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Highest Academic Qualification
          </label>
          <input
            value={generalInfo.qualification}
            onChange={e => setGeneralInfo({ ...generalInfo, qualification: e.target.value })}
            className="input-inset w-full"
          />
        </div>

        <div className="surface-card p-4">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Marital Status
          </label>
          <input
            value={generalInfo.maritalStatus}
            onChange={e => setGeneralInfo({ ...generalInfo, maritalStatus: e.target.value })}
            className="input-inset w-full"
          />
        </div>

        <div className="surface-card p-4">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Evaluation Year
          </label>
          <p className="text-data text-sm font-semibold">2024</p>
        </div>
      </div>

      {/* Sales Staff Toggle */}
      <div className="mt-4 surface-card p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setIsSalesStaff(!isSalesStaff)}
            className={`relative h-5 w-9 rounded-full transition-mechanical cursor-pointer ${
              isSalesStaff ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-mechanical ${
                isSalesStaff ? 'left-4' : 'left-0.5'
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-medium">Sales Staff</p>
            <p className="text-[10px] text-muted-foreground">
              {isSalesStaff
                ? 'KPI weights: A1=50%, A2=25%, Secondary=10%, Generic=15%'
                : 'KPI weights: A1=60%, A2=15%, Secondary=10%, Generic=15%'}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
