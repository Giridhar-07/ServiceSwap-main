import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Try to restore from token first
      const token = localStorage.getItem('serviceswap_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const u = await res.json();
            const safe = { id: u._id || u.id, name: u.name, email: u.email, avatar: u.avatar } as User;
            setUser(safe);
            localStorage.setItem('serviceswap_user', JSON.stringify(safe));
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // fall through to stored user
        }
      }

      // Fallback to stored user if exists
      const storedUser = localStorage.getItem('serviceswap_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('serviceswap_user');
        }
      }
      setIsLoading(false);
    };

    init();
  }, []);

  const login = async (email: string, password: string, mfaCode?: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mfaCode })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Login failed');
      }
      const data = await res.json();
      const u: User = { id: data.user._id || data.user.id, name: data.user.name, email: data.user.email, avatar: data.user.avatar };
      setUser(u);
      localStorage.setItem('serviceswap_user', JSON.stringify(u));
      localStorage.setItem('serviceswap_token', data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Signup failed');
      }
      const data = await res.json();
      const u: User = { id: data.user._id || data.user.id, name: data.user.name, email: data.user.email, avatar: data.user.avatar };
      setUser(u);
      localStorage.setItem('serviceswap_user', JSON.stringify(u));
      localStorage.setItem('serviceswap_token', data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('serviceswap_user');
    localStorage.removeItem('serviceswap_token');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};