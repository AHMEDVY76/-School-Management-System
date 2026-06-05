import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserDTO, AuthResponse, ApiResponse } from '@/types';

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (auth: AuthResponse) => void;
  login: (email: string, password: string) => Promise<ApiResponse<AuthResponse>>;
  register: (data: { email: string; password: string; name: string; role: string }) => Promise<ApiResponse<AuthResponse>>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  loadFromStorage: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (auth: AuthResponse) => {
        set({
          user: auth.user,
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          isAuthenticated: true,
        });
      },

      login: async (email: string, password: string) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const result: ApiResponse<AuthResponse> = await response.json();

        if (result.success && result.data) {
          get().setAuth(result.data);
        }

        return result;
      },

      register: async (data) => {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result: ApiResponse<AuthResponse> = await response.json();

        if (result.success && result.data) {
          get().setAuth(result.data);
        }

        return result;
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          if (refreshToken) {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          get().clearAuth();
        }
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          return false;
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const result: ApiResponse<AuthResponse> = await response.json();

          if (result.success && result.data) {
            get().setAuth(result.data);
            return true;
          }

          return false;
        } catch (error) {
          console.error('Token refresh error:', error);
          return false;
        }
      },

      loadFromStorage: () => {
        const state = get();
        set({
          isAuthenticated: !!(state.accessToken && state.user),
        });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);