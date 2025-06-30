
import { useState, useEffect, createContext, useContext } from 'react';
import { apiClient } from '../services/api';
import { User } from '../types/api';

interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (userData: Omit<User, 'user_id' | 'created_at' | 'last_login' | 'total_tasks' | 'workspace_size'>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => ({ success: false, error: 'Not implemented' }),
  logout: async () => { },
  register: async () => ({ success: false, error: 'Not implemented' }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Initializing authentication...');
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('AuthProvider: Starting auth initialization');
      
      // Check for stored token
      const storedToken = localStorage.getItem('auth_token');
      console.log('AuthProvider: Stored token exists:', !!storedToken);
      
      if (storedToken) {
        console.log('AuthProvider: Setting token and fetching user');
        apiClient.setToken(storedToken);
        await fetchUser();
      } else {
        console.log('AuthProvider: No stored token, user not authenticated');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('AuthProvider: Auth initialization failed:', error);
      // Clear invalid token
      localStorage.removeItem('auth_token');
      apiClient.clearToken();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      console.log('AuthProvider: Auth initialization complete');
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      console.log('AuthProvider: Fetching current user...');
      const userData = await apiClient.getCurrentUser();
      console.log('AuthProvider: User fetched successfully:', userData);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('AuthProvider: Failed to fetch user:', error);
      // Token might be invalid, clear it
      localStorage.removeItem('auth_token');
      apiClient.clearToken();
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const login = async (credentials: { username: string; password: string }) => {
    try {
      console.log('AuthProvider: Attempting login for:', credentials.username);
      const response = await apiClient.login(credentials);
      console.log('AuthProvider: Login response:', response);
      
      if (response.success && response.token) {
        apiClient.setToken(response.token);
        localStorage.setItem('auth_token', response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        console.log('AuthProvider: Login successful');
        return { success: true };
      }
      console.log('AuthProvider: Login failed - invalid response');
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('AuthProvider: Login error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  };

  const register = async (userData: Omit<User, 'user_id' | 'created_at' | 'last_login' | 'total_tasks' | 'workspace_size'>) => {
    try {
      console.log('AuthProvider: Attempting registration for:', userData.username);
      const response = await apiClient.register(userData);
      console.log('AuthProvider: Registration response:', response);
      
      if (response.success && response.token) {
        apiClient.setToken(response.token);
        localStorage.setItem('auth_token', response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        console.log('AuthProvider: Registration successful');
        return { success: true };
      }
      console.log('AuthProvider: Registration failed - invalid response');
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('AuthProvider: Registration error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      console.log('AuthProvider: Logging out...');
      await apiClient.logout();
    } catch (error) {
      console.error('AuthProvider: Logout API call failed:', error);
    } finally {
      // Always clear local state regardless of API call success
      apiClient.clearToken();
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
      console.log('AuthProvider: Logout complete');
    }
  };

  const value: AuthContextProps = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
  };

  console.log('AuthProvider: Rendering with state:', { isAuthenticated, loading, user: !!user });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
