import { create } from 'zustand';
import { User, UserRole } from '@/types/evaluation';
import { MOCK_USERS } from './mockData';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string) => boolean;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  login: (email: string) => {
    const user = MOCK_USERS.find(u => u.email === email);
    if (user) {
      set({ currentUser: user, isAuthenticated: true });
      return true;
    }
    return false;
  },
  logout: () => set({ currentUser: null, isAuthenticated: false }),
  switchRole: (role: UserRole) => {
    const user = MOCK_USERS.find(u => u.role === role);
    if (user) {
      set({ currentUser: user, isAuthenticated: true });
    }
  },
}));
