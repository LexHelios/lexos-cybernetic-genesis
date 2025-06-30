
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from './components/theme-provider';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoginForm from '@/components/auth/LoginForm';
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
import { useEffect } from 'react';

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

// Enhanced Loading component with cyberpunk style
const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
    {/* Animated background grid */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>
    </div>
    
    <div className="text-center z-10">
      <div className="relative mb-8">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-2 border-transparent border-t-cyan-400 border-r-purple-400"></div>
        <div className="absolute inset-0 inline-block animate-ping rounded-full h-16 w-16 border border-cyan-400 opacity-20"></div>
      </div>
      <h2 className="text-3xl font-orbitron font-bold text-white mb-4 animate-pulse">
        INITIALIZING NEXUS...
      </h2>
      <div className="flex items-center justify-center space-x-2 mb-4">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <p className="text-cyan-300 font-rajdhani tracking-wider">Neural pathways synchronizing...</p>
    </div>
  </div>
);

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
  useEffect(() => {
    console.log('App: Connecting to WebSocket...');
    websocketService.connect();
    
    return () => {
      console.log('App: Disconnecting WebSocket...');
      websocketService.disconnect();
    };
  }, []);

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
    return <LoadingScreen />;
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

function App() {
  console.log('App: Rendering main application');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <AuthProvider>
            <Router>
              <AppContent />
              <Toaster />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
