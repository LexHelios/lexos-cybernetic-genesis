
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoginForm from "./components/auth/LoginForm";
import Index from "./pages/Index";
import ErrorBoundary from "./components/ErrorBoundary";
import { useState, useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const AppContent = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [forceShowLogin, setForceShowLogin] = useState(false);

  console.log('AppContent render:', { isAuthenticated, loading, user: !!user });

  // Add a timeout to force show login if loading takes too long
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('Loading timeout reached, forcing login screen');
        setForceShowLogin(true);
      }, 10000); // 10 seconds timeout
      
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  if (loading && !forceShowLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-xl font-orbitron font-bold text-primary">
              Initializing LEXOS Genesis
            </h2>
            <p className="text-sm text-muted-foreground">
              Establishing neural network connections...
            </p>
            <div className="text-xs text-muted-foreground/70 space-y-1 mt-4">
              <p>Backend: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}</p>
              <p>Status: Authenticating...</p>
            </div>
            <button 
              onClick={() => setForceShowLogin(true)}
              className="mt-4 px-4 py-2 text-xs bg-primary/20 hover:bg-primary/30 rounded border border-primary/40 text-primary"
            >
              Skip to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || forceShowLogin) {
    console.log('AppContent: User not authenticated, showing login form');
    return <LoginForm />;
  }

  console.log('AppContent: User authenticated, showing main app');
  return (
    <Routes>
      <Route path="/*" element={<Index />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
