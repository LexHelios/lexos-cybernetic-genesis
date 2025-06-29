
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
    console.log('AuthProvider useEffect running');
    
    // Simple timeout to simulate check and ensure loading completes
    const initializeAuth = async () => {
      try {
        const currentUser = apiClient.getCurrentUser();
        console.log('Current user from API:', currentUser);
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      } finally {
        // Ensure loading is set to false after a brief delay
        setTimeout(() => {
          setIsLoading(false);
          console.log('AuthProvider initialization complete');
        }, 100);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiClient.login(username, password);
      
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

  console.log('AuthProvider rendering with context:', contextValue);

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
