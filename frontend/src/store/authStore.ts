import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  role: 'user' | 'admin' | null;
  isAuthenticated: boolean;
  login: (token: string, userId: string, role: 'user' | 'admin') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      role: null,
      isAuthenticated: false,

      login: (token, userId, role) => {
        localStorage.setItem('token', token);
        set({ token, userId, role, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, userId: null, role: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
