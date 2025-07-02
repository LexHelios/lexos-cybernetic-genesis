
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

interface VoiceInputProps {
  onTranscript?: (text: string) => void;
  onCommand?: (result: any) => void;
  size?: 'sm' | 'md' | 'lg';
  showVisualization?: boolean;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onCommand,
  size = 'md',
  showVisualization = true,
  className = ''
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  // Handle transcript when recording stops
  React.useEffect(() => {
    if (transcript && !isRecording && !isProcessing) {
      setIsProcessing(true);
      
      // Process the transcript
      if (onTranscript) {
        onTranscript(transcript);
      }
      
      // Optionally process as command
      if (onCommand) {
        processVoiceCommand(transcript);
      }
      
      setIsProcessing(false);
    }
  }, [transcript, isRecording, onTranscript, onCommand]);

  const processVoiceCommand = async (text: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/voice/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          command: text,
          transcript: text
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (onCommand) {
          onCommand({ ...result, transcript: text });
        }
      }
    } catch (error) {
      console.error('Voice command processing error:', error);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8 p-0',
    md: 'w-10 h-10 p-0',
    lg: 'w-12 h-12 p-0'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <Button
        onClick={handleToggleRecording}
        variant={isRecording ? "destructive" : "outline"}
        className={`${sizeClasses[size]} ${
          isRecording ? 'animate-pulse bg-red-500/20 border-red-500/50' : 'hover:bg-primary/20'
        }`}
        disabled={isProcessing}
      >
        {isRecording ? (
          <MicOff className={iconSizes[size]} />
        ) : (
          <Mic className={iconSizes[size]} />
        )}
      </Button>

      {error && (
        <div className="text-xs text-red-400 text-center max-w-[100px]">
          {error}
        </div>
      )}

      {showVisualization && transcript && (
        <div className="text-xs text-muted-foreground text-center max-w-[150px] p-2 bg-background/50 rounded border border-primary/20">
          "{transcript}"
        </div>
      )}

      {isProcessing && (
        <div className="text-xs text-primary animate-pulse">
          Processing...
        </div>
      )}
    </div>
  );
};
