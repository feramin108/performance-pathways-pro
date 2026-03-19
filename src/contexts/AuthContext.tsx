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
  isLDAPAuth: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  isLDAPAuth: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Decode JWT without verifying (verification is done server-side)
function decodeJWT(token: string) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    // Check expiry
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null; // expired
    }
    return decoded;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [role, setRole]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLDAPAuth, setIsLDAPAuth] = useState(false);

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

  async function loadLDAPSession() {
    const token = localStorage.getItem('spes_token');
    if (!token) return false;

    const decoded = decodeJWT(token);
    if (!decoded) {
      // Token expired — clear it
      localStorage.removeItem('spes_token');
      localStorage.removeItem('spes_role');
      localStorage.removeItem('spes_profile');
      return false;
    }

    // Build profile from JWT + stored profile data
    const storedProfile = localStorage.getItem('spes_profile');
    const profileData = storedProfile ? JSON.parse(storedProfile) : null;

    // Build profile directly from JWT — no Supabase call needed
    // This avoids RLS issues with anonymous access
    const ldapProfile = profileData || {};
    setProfile({
      id: decoded.sub,
      full_name: decoded.full_name || ldapProfile.full_name || '',
      email: decoded.email || ldapProfile.email || '',
      username: decoded.username || null,
      employee_id: ldapProfile.employee_id || null,
      sex: null,
      department: decoded.dept || ldapProfile.department || null,
      branch: decoded.branch || ldapProfile.branch || null,
      job_title: null,
      function_role: null,
      occupied_since: null,
      previous_function: null,
      manager_id: null,
      second_manager_id: null,
      date_joining: null,
      marital_status: null,
      academic_qualification: null,
      employee_type: null,
      is_active: true,
      ad_groups: null,
      last_login_at: null,
    });

    setRole(decoded.role || 'employee');
    setIsLDAPAuth(true);
    setIsLoading(false);
    return true;
  }

  useEffect(() => {
    // First check for LDAP JWT token
    loadLDAPSession().then((hasLDAP) => {
      if (hasLDAP) {
        // LDAP auth active — do NOT set up Supabase listener
        // It would fire with no session and reset role to null
        return;
      }

      // No LDAP token — use Supabase auth
      let subscription: { unsubscribe: () => void } | null = null;

      const { data } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          // Only process if not in LDAP mode
          const ldapToken = localStorage.getItem('spes_token');
          if (ldapToken) return; // LDAP token appeared — ignore Supabase events

          setSession(session);
          setIsLDAPAuth(false);
          if (session?.user) {
            setTimeout(() => fetchUserData(session.user.id), 0);
          } else {
            setProfile(null);
            setRole(null);
            setIsLoading(false);
          }
        }
      );
      subscription = data.subscription;

      supabase.auth.getSession().then(({ data: { session } }) => {
        const ldapToken = localStorage.getItem('spes_token');
        if (ldapToken) return; // LDAP took over

        setSession(session);
        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setIsLoading(false);
        }
      });

      return () => subscription?.unsubscribe();
    });
  }, []);

  const signOut = async () => {
    // Clear LDAP token
    localStorage.removeItem('spes_token');
    localStorage.removeItem('spes_role');
    localStorage.removeItem('spes_profile');
    setIsLDAPAuth(false);

    // Also sign out of Supabase if applicable
    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (isLDAPAuth) {
      await loadLDAPSession();
    } else if (session?.user) {
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
      isLDAPAuth,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
