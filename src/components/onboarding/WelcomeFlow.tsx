
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowRight, CheckCircle } from 'lucide-react';

interface WelcomeFlowProps {
  onComplete: () => void;
}

const WelcomeFlow: React.FC<WelcomeFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to NEXUS",
      description: "Your AI-powered command center is ready.",
      action: "Get Started"
    },
    {
      title: "Connect Your Agents",
      description: "Deploy and manage AI agents effortlessly.",
      action: "Continue"
    },
    {
      title: "You're All Set!",
      description: "Start controlling your AI infrastructure.",
      action: "Enter Dashboard"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="holographic-panel max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-orbitron bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            {steps[currentStep].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            {steps[currentStep].description}
          </p>
          
          <div className="flex justify-center space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 neural-button"
            >
              {steps[currentStep].action}
              {currentStep === steps.length - 1 ? (
                <CheckCircle className="w-4 h-4 ml-2" />
              ) : (
                <ChevronRight className="w-4 h-4 ml-2" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeFlow;
