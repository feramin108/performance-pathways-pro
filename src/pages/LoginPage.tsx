import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertCircle, Users, UserCheck, BarChart3, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const DEMO_ACCOUNTS = [
  { label: 'Employee', email: 'employee@demo.com', password: 'demo123456', icon: Users, color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
  { label: 'Line Manager', email: 'manager@demo.com', password: 'demo123456', icon: UserCheck, color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' },
  { label: 'HR', email: 'hr@demo.com', password: 'demo123456', icon: BarChart3, color: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' },
  { label: 'SuperAdmin', email: 'admin@demo.com', password: 'demo123456', icon: Settings, color: 'bg-primary/10 text-primary hover:bg-primary/20' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsSignUp(false);
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
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
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="input-inset w-full"
                  required={isSignUp}
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Email
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-inset w-full"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-mechanical hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="mt-3 w-full text-center text-xs text-muted-foreground transition-mechanical hover:text-foreground"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Demo Quick Login */}
        <div className="mt-4 surface-card p-4">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Quick Demo Login</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(demo => (
              <button
                key={demo.label}
                onClick={() => handleDemoLogin(demo.email, demo.password)}
                className={`flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium transition-mechanical ${demo.color}`}
              >
                <demo.icon className="h-3.5 w-3.5" />
                {demo.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            Click a role above to fill credentials, then press Sign In
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Secure banking environment • HTTPS encrypted • Audit logged
        </p>
      </motion.div>
    </div>
  );
}
