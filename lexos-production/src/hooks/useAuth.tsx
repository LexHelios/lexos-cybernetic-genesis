
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api';
import { User } from '../types/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthProvider: Initializing authentication...');
      
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          console.log('AuthProvider: Found existing token, verifying...');
          apiClient.setToken(token);
          
          try {
            const userData = await apiClient.getCurrentUser();
            console.log('AuthProvider: Token verified, user loaded:', userData);
            setUser(userData);
          } catch (error) {
            console.log('AuthProvider: Token verification failed:', error);
            localStorage.removeItem('auth_token');
            apiClient.clearToken();
          }
        } else {
          console.log('AuthProvider: No existing token found');
        }
      } catch (error) {
        console.error('AuthProvider: Error during initialization:', error);
      } finally {
        setIsLoading(false);
        console.log('AuthProvider: Initialization complete');
      }
    };

    // Add a small delay to ensure the backend is ready
    setTimeout(initializeAuth, 1000);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('AuthProvider: Attempting login for:', username);
    
    try {
      const response = await apiClient.login({ username, password });
      console.log('AuthProvider: Login response:', response);
      
      if (response.success && response.token && response.user) {
        localStorage.setItem('auth_token', response.token);
        apiClient.setToken(response.token);
        setUser(response.user);
        console.log('AuthProvider: Login successful');
        return true;
      } else {
        console.log('AuthProvider: Login failed - invalid response');
        return false;
      }
    } catch (error) {
      console.error('AuthProvider: Login error:', error);
      return false;
    }
  };

  const logout = () => {
    console.log('AuthProvider: Logging out...');
    localStorage.removeItem('auth_token');
    apiClient.clearToken();
    setUser(null);
    console.log('AuthProvider: Logout complete');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
