import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setCsrfToken } from '../services/api';

interface AuthContextValue {
  user: string | null;
  isSudo: boolean;
  isAuthenticated: boolean;
  isSetupRequired: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setup: (username: string, password: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSetupRequired, setIsSetupRequired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshStatus = async () => {
    try {
      setIsLoading(true);
      const res = await api.getStatus();
      setIsSetupRequired(res.setupRequired);
      setIsAuthenticated(res.authenticated);
      if (res.authenticated && res.username) {
        setUser(res.username);
      } else {
        setUser(null);
      }
      if (res.csrfToken) {
        setCsrfToken(res.csrfToken);
      }
    } catch (e) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login({ username, password });
    if (res.success) {
      setUser(res.username);
      setIsAuthenticated(true);
      setCsrfToken(res.csrfToken);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setCsrfToken(null);
    }
  };

  const setup = async (username: string, password: string) => {
    const res = await api.setup({ username, password });
    if (res.success) {
      setUser(res.username);
      setIsAuthenticated(true);
      setIsSetupRequired(false);
      setCsrfToken(res.csrfToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isSudo: (user?.toLowerCase() === 'sudo'),
        isAuthenticated,
        isSetupRequired,
        isLoading,
        login,
        logout,
        setup,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
