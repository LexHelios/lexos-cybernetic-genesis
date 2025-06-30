import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Cpu, 
  Brain, 
  Shield, 
  Zap,
  Volume2,
  Palette,
  Command,
  Skip
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { GlassmorphismPanel } from '../effects/GlassmorphismPanel';

interface WelcomeFlowProps {
  onComplete: (preferences: UserPreferences) => void;
  onSkip?: () => void;
}

interface UserPreferences {
  theme: string;
  voiceEnabled: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  tutorialMode: boolean;
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to LEXOS Genesis',
    subtitle: 'Your Advanced AI Operating System',
    icon: Brain,
    content: 'welcome'
  },
  {
    id: 'features',
    title: 'Powerful Features',
    subtitle: 'Discover what LEXOS can do',
    icon: Cpu,
    content: 'features'
  },
  {
    id: 'preferences',
    title: 'Personalize Your Experience',
    subtitle: 'Set up your preferences',
    icon: Palette,
    content: 'preferences'
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    subtitle: 'Work faster with shortcuts',
    icon: Command,
    content: 'shortcuts'
  },
  {
    id: 'ready',
    title: 'All Set!',
    subtitle: 'Your journey begins now',
    icon: Zap,
    content: 'ready'
  }
];

const features = [
  {
    icon: Brain,
    title: 'AI Agent Management',
    description: 'Deploy and orchestrate multiple AI agents for complex tasks'
  },
  {
    icon: Shield,
    title: 'Enhanced Security',
    description: 'Military-grade encryption and access control'
  },
  {
    icon: Zap,
    title: 'Real-time Analytics',
    description: 'Monitor system performance and agent activities'
  },
  {
    icon: Cpu,
    title: 'Neural Processing',
    description: 'Advanced LLM orchestration and model management'
  }
];

const shortcuts = [
  { keys: ['Ctrl', 'Space'], description: 'Activate voice assistant' },
  { keys: ['Ctrl', 'K'], description: 'Open command palette' },
  { keys: ['Ctrl', '/'], description: 'Show all shortcuts' },
  { keys: ['Esc'], description: 'Close dialogs' },
  { keys: ['Ctrl', 'Shift', 'T'], description: 'Toggle theme' }
];

export function WelcomeFlow({ onComplete, onSkip }: WelcomeFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'matrix',
    voiceEnabled: true,
    soundEnabled: true,
    animationsEnabled: true,
    tutorialMode: true
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(preferences);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderContent = () => {
    const step = steps[currentStep];

    switch (step.content) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-32 h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Brain className="w-16 h-16 text-primary" />
            </motion.div>
            <div className="space-y-4">
              <p className="text-lg text-muted-foreground">
                Experience the future of AI-powered computing with LEXOS Genesis.
              </p>
              <p className="text-muted-foreground">
                This brief setup will help you get the most out of your system.
              </p>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="grid gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassmorphismPanel className="p-4" hoverable>
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </GlassmorphismPanel>
              </motion.div>
            ))}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            {/* Theme Selection */}
            <div className="space-y-3">
              <Label>Color Theme</Label>
              <RadioGroup
                value={preferences.theme}
                onValueChange={(value) => 
                  setPreferences({ ...preferences, theme: value })
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="matrix" />
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-green-500" />
                      Matrix
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="cyberpunk" />
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-pink-500" />
                      Cyberpunk
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="darkmatter" />
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-purple-500" />
                      Dark Matter
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="solarflare" />
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-orange-500" />
                      Solar Flare
                    </span>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="voice">Voice Assistant</Label>
                </div>
                <Switch
                  id="voice"
                  checked={preferences.voiceEnabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, voiceEnabled: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sound">Sound Effects</Label>
                </div>
                <Switch
                  id="sound"
                  checked={preferences.soundEnabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, soundEnabled: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="animations">Animations</Label>
                </div>
                <Switch
                  id="animations"
                  checked={preferences.animationsEnabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, animationsEnabled: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="tutorial">Tutorial Mode</Label>
                </div>
                <Switch
                  id="tutorial"
                  checked={preferences.tutorialMode}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, tutorialMode: checked })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Master these shortcuts to navigate LEXOS like a pro:
            </p>
            {shortcuts.map((shortcut, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <span className="text-sm">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <React.Fragment key={i}>
                      <kbd className="px-2 py-1 text-xs rounded bg-background border">
                        {key}
                      </kbd>
                      {i < shortcut.keys.length - 1 && (
                        <span className="text-muted-foreground">+</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        );

      case 'ready':
        return (
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-32 h-32 mx-auto rounded-full bg-green-500/10 flex items-center justify-center"
            >
              <Check className="w-16 h-16 text-green-500" />
            </motion.div>
            <div className="space-y-4">
              <p className="text-lg">
                Your LEXOS system is configured and ready!
              </p>
              <p className="text-muted-foreground">
                {preferences.tutorialMode 
                  ? "Tutorial hints will guide you through the interface."
                  : "You're all set to explore on your own."}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <currentStepData.icon className="w-8 h-8 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-muted-foreground">{currentStepData.subtitle}</p>
              </div>
            </div>
            {onSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground"
              >
                <Skip className="w-4 h-4 mr-1" />
                Skip
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentStep 
                    ? 'bg-primary' 
                    : index < currentStep 
                    ? 'bg-primary/50' 
                    : 'bg-muted'
                )}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="gap-2"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Get Started
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}