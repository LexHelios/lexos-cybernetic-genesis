import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '../services/api';
import { User } from '../types/api';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 AuthProvider useEffect - NEXUS INITIALIZATION STARTING');
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Checking for existing user session...');
        const currentUser = apiClient.getCurrentUser();
        console.log('📊 getCurrentUser result:', currentUser);
        
        if (currentUser) {
          console.log('✅ User found in storage:', currentUser.username);
          setUser(currentUser);
        } else {
          console.log('❌ No stored user found - showing login form');
        }
      } catch (error) {
        console.error('💀 Error getting current user:', error);
      } finally {
        console.log('🎯 Setting isLoading to false - NEXUS READY');
        setIsLoading(false);
      }
    };

    // Small timeout to ensure proper initialization
    setTimeout(() => {
      initializeAuth();
    }, 100);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Attempting login for:', username);
      
      const response = await apiClient.login(username, password);
      console.log('Login response:', response);
      
      if (response.success) {
        setUser(response.user);
        toast({
          title: "Authentication Successful",
          description: `Welcome back, ${response.user.full_name}!`,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    toast({
      title: "Logged Out",
      description: "Successfully logged out of NEXUS system",
    });
  };

  const contextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  console.log('🚀 AuthProvider rendering with:', {
    user: user?.username || 'none',
    isAuthenticated: !!user,
    isLoading,
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
