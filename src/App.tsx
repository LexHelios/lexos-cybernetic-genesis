
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoginForm from "./components/auth/LoginForm";
import Index from "./pages/Index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent = () => {
  const { isAuthenticated, loading, user } = useAuth();

  console.log('AppContent render:', { isAuthenticated, loading, user: !!user });

  if (loading) {
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
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
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
);

export default App;
