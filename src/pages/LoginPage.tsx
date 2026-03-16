import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Shield, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const DEMO_ACCOUNTS = [
  { email: 'sarah.chen@bank.com', role: 'Employee', name: 'Sarah Chen' },
  { email: 'james.okafor@bank.com', role: 'Manager', name: 'James Okafor' },
  { email: 'amina.bello@bank.com', role: 'HR', name: 'Amina Bello' },
  { email: 'admin@bank.com', role: 'Admin', name: 'Admin User' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email)) {
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Use a demo account below.');
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    if (login(demoEmail)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Performance Ledger
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Enterprise Performance Management System
          </p>
        </div>

        {/* Login Form */}
        <div className="surface-card p-6">
          <p className="mb-4 text-xs text-muted-foreground">
            Sign in with your Active Directory credentials
          </p>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Corporate Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="name@bank.com"
                className="input-inset w-full"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="input-inset w-full"
                defaultValue="password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-mechanical hover:bg-primary/90"
            >
              Sign In via Active Directory
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="mt-4 surface-card p-4">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Demo Accounts
          </p>
          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map(account => (
              <button
                key={account.email}
                onClick={() => handleDemoLogin(account.email)}
                className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left transition-mechanical hover:bg-secondary"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{account.name}</p>
                  <p className="text-[10px] text-muted-foreground">{account.email}</p>
                </div>
                <span className="rounded-sm bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {account.role}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Secure banking environment • HTTPS encrypted • Audit logged
        </p>
      </motion.div>
    </div>
  );
}
