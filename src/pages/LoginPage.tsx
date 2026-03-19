import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, Users, UserCheck, Shield } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Employee Demo', email: 'employee@bank.local', password: 'Demo@1234', className: 'bg-role-employee-bg text-role-employee-text hover:opacity-90' },
  { label: 'Line Manager Demo', email: 'manager@bank.local', password: 'Demo@1234', className: 'bg-role-manager-bg text-role-manager-text hover:opacity-90' },
  { label: 'HC Demo', email: 'hc@bank.local', password: 'Demo@1234', className: 'bg-role-hc-bg text-role-hc-text hover:opacity-90' },
];

const ROLE_DASHBOARDS: Record<string, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  hc: '/hc/dashboard',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session, role } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (session && role) {
      navigate(ROLE_DASHBOARDS[role] || '/employee/dashboard');
    }
  }, [session, role, navigate]);

  // LDAP login for real AD users
  const handleLDAPLogin = async () => {
    if (!email || !password) {
      setError('Please enter your domain username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/ldap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      localStorage.setItem('spes_token', data.token);
      localStorage.setItem('spes_role', data.role);
      localStorage.setItem('spes_profile', JSON.stringify(data.profile));
      // Force full page reload so AuthContext picks up the new token
      const destination = ROLE_DASHBOARDS[data.role] || '/employee/dashboard';
      window.location.href = destination;
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Demo login — Supabase only
  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const useEmail = loginEmail || email;
    const usePassword = loginPassword || password;

    if (!useEmail || !usePassword) {
      setError('Please enter your credentials.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: useEmail,
        password: usePassword,
      });
      if (signInError) throw signInError;

      // Update last_login_at
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ last_login_at: new Date().toISOString() } as any).eq('id', user.id);
      }

      // Fetch role and redirect
      if (user) {
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).limit(1).single();
        const userRole = (roleData as any)?.role || 'employee';
        navigate(ROLE_DASHBOARDS[userRole] || '/employee/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLDAPLogin();
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    // Auto-submit
    handleLogin(demoEmail, demoPassword);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo Placeholder */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="NFC Bank" className="h-10 object-contain" />
        </div>

        {/* Heading */}
        <h1 className="text-center text-xl font-medium text-foreground mb-1">
          Staff Performance Evaluation System
        </h1>
        <p className="text-center text-[13px] text-muted-foreground mb-8">
          Sign in with your corporate account
        </p>

        {/* Form Card */}
        <div className="surface-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">
                Domain Username
              </label>
              <input
                type="text"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder='username or BANK\username'
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-fast"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Verifying...
                </>
              ) : (
                'Sign In with Active Directory'
              )}
            </button>
          </form>

          {/* Demo Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">Demo Access</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Demo Buttons */}
          <div className="flex gap-2">
            {DEMO_ACCOUNTS.map(demo => (
              <button
                key={demo.label}
                onClick={() => handleDemoLogin(demo.email, demo.password)}
                disabled={loading}
                className={`flex-1 h-10 rounded-lg text-[13px] font-medium transition-fast disabled:opacity-50 ${demo.className}`}
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © 2025 Staff Appraisal System · IT Department
        </p>
      </div>
    </div>
  );
}
