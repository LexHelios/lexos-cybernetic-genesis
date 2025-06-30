
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import LoginForm from "./components/auth/LoginForm";
import Index from "./pages/Index";
import ErrorBoundary from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/effects/LoadingScreen";
import { KeyboardShortcutsModal } from "./components/ui/keyboard-shortcuts-modal";
import { useState, useEffect } from "react";
import startupUtils from "./utils/startupUtils";
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Dashboard from '@/pages/Dashboard';
import Agents from './pages/Agents';
import Tasks from './pages/Tasks';
import Analytics from '@/pages/Analytics';
import Models from './pages/Models';
import Security from './pages/Security';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import KnowledgeGraph from '@/pages/KnowledgeGraph';
import Pipeline from './pages/Pipeline';
import Communications from '@/pages/Communications';
import ConsciousnessLab from './pages/ConsciousnessLab';
import { websocketService } from '@/services/websocket';

// Create a query client with simple configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});


// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Enhanced app layout with cyberpunk effects
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [forceShowLogin, setForceShowLogin] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      await startupUtils.initialize();
      setLoading(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    console.log('App: Connecting to WebSocket...');
    websocketService.connect();
    
    return () => {
      console.log('App: Disconnecting WebSocket...');
      websocketService.disconnect();
    };
  }, []);

  if (loading && !forceShowLogin) {
    return <LoadingScreen isLoading={true} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Animated background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Auth-aware app content
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  console.log('AppContent: isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  
  if (isLoading) {
    return <LoadingScreen isLoading={true} />;
  }
  
  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginForm />
        } 
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/agents"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Agents />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Tasks />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Analytics />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/models"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Models />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Security />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Chat />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <KnowledgeGraph />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pipeline"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Pipeline />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/communications"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Communications />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consciousness"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ConsciousnessLab />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App = () => {
  console.log('App: Rendering main application');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <AppContent />
                <KeyboardShortcutsModal />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
