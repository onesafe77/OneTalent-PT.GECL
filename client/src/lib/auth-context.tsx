import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Role, Permission } from '@shared/rbac';

interface User {
  nik: string;
  name: string;
  position: string | null;
  department?: string | null;
  role: Role;
  permissions: Permission[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (nik: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (oldPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(nik: string, password: string) {
    const data = await apiRequest('/api/auth/login', 'POST', { nik, password });
    setUser(data.user);

    // Invalidate all queries on login to refresh data
    queryClient.invalidateQueries();
  }

  async function logout() {
    await apiRequest('/api/auth/logout', 'POST');
    setUser(null);

    // Clear all query cache on logout
    queryClient.clear();
  }

  async function resetPassword(oldPassword: string, newPassword: string) {
    await apiRequest('/api/auth/reset-password', 'POST', { oldPassword, newPassword });
  }

  function hasPermission(permission: Permission): boolean {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }

  function hasAnyPermission(permissions: Permission[]): boolean {
    if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
    return permissions.some(p => user.permissions.includes(p));
  }

  function hasAllPermissions(permissions: Permission[]): boolean {
    if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
    return permissions.every(p => user.permissions.includes(p));
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    resetPassword,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
