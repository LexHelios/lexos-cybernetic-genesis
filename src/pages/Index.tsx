
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import FloatingChat from '../components/chat/FloatingChat';
import { VoiceAssistant } from '../components/voice/VoiceAssistant';
import { CommandPalette } from '../components/ui/command-palette';
import { AnimatedBackground } from '../components/effects/AnimatedBackground';
import { WelcomeFlow } from '../components/onboarding/WelcomeFlow';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import startupUtils from '../utils/startupUtils';
import Dashboard from './Dashboard';
import AgentManagement from './AgentManagement';
import SystemMonitor from './SystemMonitor';
import KnowledgeGraph from './KnowledgeGraph';
import TaskPipeline from './TaskPipeline';
import ModelArsenal from './ModelArsenal';
import Communications from './Communications';
import SecurityHub from './SecurityHub';
import Analytics from './Analytics';
import Configuration from './Configuration';
import UserSettings from './UserSettings';

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const { theme } = useTheme();
  const { shortcuts } = useKeyboardShortcuts();
  const { user } = useAuth();
  const [startupComplete, setStartupComplete] = useState(false);

  // Check if user has seen welcome flow and initialize startup
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('lexos-welcome-completed');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
    
    // Run startup sequence
    const runStartup = async () => {
      const username = user?.name || user?.username || 'User';
      const startup = await startupUtils.initialize(username);
      
      // Show welcome toast with personalized message
      toast.success(startup.welcomeMessage, {
        duration: 5000,
        position: 'top-center',
      });
      
      // Show performance warnings if any
      if (startup.performance.issues.length > 0) {
        setTimeout(() => {
          startup.performance.issues.forEach(issue => {
            toast.warning(issue, {
              duration: 7000,
              position: 'bottom-right',
            });
          });
        }, 2000);
      }
      
      setStartupComplete(true);
    };
    
    if (user) {
      runStartup();
    }
  }, [user]);

  const handleWelcomeComplete = (preferences: any) => {
    localStorage.setItem('lexos-welcome-completed', 'true');
    localStorage.setItem('lexos-preferences', JSON.stringify(preferences));
    setShowWelcome(false);
    
    // Apply preferences
    if (preferences.theme) {
      window.dispatchEvent(new CustomEvent('set-theme', { detail: preferences.theme }));
    }
  };

  const handleWelcomeSkip = () => {
    localStorage.setItem('lexos-welcome-completed', 'true');
    setShowWelcome(false);
  };

  // Get background variant based on theme
  const backgroundVariants = {
    matrix: 'matrix',
    cyberpunk: 'particles',
    darkmatter: 'neural',
    solarflare: 'waves'
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Animated Background */}
      <AnimatedBackground 
        variant={backgroundVariants[theme] as any}
        className="opacity-20"
      />
      
      {/* Main Content */}
      <div className="relative z-10">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-h-[calc(100vh-4rem)]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents" element={<AgentManagement />} />
              <Route path="/monitor" element={<SystemMonitor />} />
              <Route path="/knowledge" element={<KnowledgeGraph />} />
              <Route path="/tasks" element={<TaskPipeline />} />
              <Route path="/models" element={<ModelArsenal />} />
              <Route path="/comms" element={<Communications />} />
              <Route path="/security" element={<SecurityHub />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/config" element={<Configuration />} />
              <Route path="/settings" element={<UserSettings />} />
            </Routes>
          </main>
        </div>
      </div>
      
      {/* Floating Components */}
      <FloatingChat />
      <VoiceAssistant position="bottom-right" />
      <CommandPalette />
      
      {/* Welcome Flow */}
      {showWelcome && (
        <WelcomeFlow 
          onComplete={handleWelcomeComplete}
          onSkip={handleWelcomeSkip}
        />
      )}
    </div>
  );
};

export default Index;
