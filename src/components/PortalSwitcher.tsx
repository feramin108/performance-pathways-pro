import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PortalSwitcherProps {
  mode: string;
  onSwitch: (mode: string) => void;
}

export function PortalSwitcher({ mode, onSwitch }: PortalSwitcherProps) {
  const navigate = useNavigate();
  const { role } = useAuth();

  const switchTo = (newMode: string) => {
    localStorage.setItem('spes_portal_mode', newMode);
    onSwitch(newMode);
    if (newMode === 'employee') navigate('/employee/dashboard');
    else if (newMode === 'manager') navigate('/manager/dashboard');
    else navigate('/hc/dashboard');
  };

  if (role === 'superadmin') {
    return (
      <div className="flex rounded-lg border border-border bg-card overflow-hidden text-xs font-medium">
        <button
          onClick={() => switchTo('employee')}
          className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
            mode === 'employee'
              ? 'bg-role-employee-bg text-role-employee-text'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          👤 My Appraisal
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => switchTo('manager')}
          className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
            mode === 'manager'
              ? 'bg-role-manager-bg text-role-manager-text'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          👥 Manager
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => switchTo('hc')}
          className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
            mode === 'hc'
              ? 'bg-role-hc-bg text-role-hc-text'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          🏢 HC Management
        </button>
      </div>
    );
  }

  // HC staff — two-way switcher
  return (
    <div className="flex rounded-lg border border-border bg-card overflow-hidden text-xs font-medium">
      <button
        onClick={() => switchTo('employee')}
        className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
          mode === 'employee'
            ? 'bg-role-employee-bg text-role-employee-text'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        👤 My Appraisal
      </button>
      <div className="w-px bg-border" />
      <button
        onClick={() => switchTo('hc')}
        className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
          mode === 'hc'
            ? 'bg-role-hc-bg text-role-hc-text'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        🏢 HC Management
      </button>
    </div>
  );
}
