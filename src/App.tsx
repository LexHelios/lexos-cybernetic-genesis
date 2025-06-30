
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
    return <LoadingScreen isLoading={true} />;
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
      <ThemeProvider>
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

export default App;
