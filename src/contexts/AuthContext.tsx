import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  username: string | null;
  employee_id: string | null;
  sex: string | null;
  department: string | null;
  branch: string | null;
  job_title: string | null;
  function_role: string | null;
  occupied_since: string | null;
  previous_function: string | null;
  manager_id: string | null;
  second_manager_id: string | null;
  date_joining: string | null;
  marital_status: string | null;
  academic_qualification: string | null;
  employee_type: string | null;
  is_active: boolean;
  ad_groups: string[] | null;
  last_login_at: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchUserData(userId: string) {
    try {
      const [{ data: profileData }, { data: roleData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId).limit(1).single(),
      ]);
      setProfile(profileData as any);
      setRole((roleData as any)?.role || 'employee');
    } catch {
      setProfile(null);
      setRole('employee');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          // Defer to avoid auth deadlock
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchUserData(session.user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      role,
      isLoading,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
