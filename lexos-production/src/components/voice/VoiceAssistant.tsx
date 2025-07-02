
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Brain } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { CommandResult } from '@/types/api';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');

  const {
    startRecording,
    stopRecording,
    isRecording,
    transcript,
    error
  } = useVoiceRecording();

  const handleVoiceCommand = async (command: string) => {
    try {
      const response = await fetch('/api/voice/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ command })
      });

      const result: CommandResult = await response.json();
      
      if (result.success) {
        setLastCommand(command);
        if (result.result?.message) {
          setLastResponse(result.result.message);
        } else if (result.message) {
          setLastResponse(result.message);
        }
        
        // Handle chat responses
        if (result.isChat && result.result?.message) {
          setLastResponse(result.result.message);
        }
      } else {
        setLastResponse(result.error || 'Command failed');
      }
    } catch (error) {
      console.error('Voice command error:', error);
      setLastResponse('Connection error');
    }
  };

  const toggleListening = async () => {
    if (isRecording) {
      await stopRecording();
      setIsListening(false);
    } else {
      await startRecording();
      setIsListening(true);
    }
  };

  const toggleVolume = () => {
    setVolume(volume > 0 ? 0 : 0.7);
  };

  // Process transcript when recording stops
  useEffect(() => {
    if (transcript && !isRecording) {
      handleVoiceCommand(transcript);
    }
  }, [transcript, isRecording]);

  return (
    <Card className="holographic-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Voice Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={toggleListening}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className={`w-16 h-16 rounded-full ${
              isListening ? 'animate-pulse' : ''
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </Button>
          
          <Button
            onClick={toggleVolume}
            variant="outline"
            size="sm"
          >
            {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center p-2 bg-red-500/10 rounded">
            {error}
          </div>
        )}

        {transcript && (
          <div className="p-3 bg-primary/10 rounded border border-primary/20">
            <p className="text-sm text-primary">You said: "{transcript}"</p>
          </div>
        )}

        {lastResponse && (
          <div className="p-3 bg-secondary/10 rounded border border-secondary/20">
            <p className="text-sm text-secondary">Response: {lastResponse}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          {isListening ? 'Listening...' : 'Click to start voice command'}
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceAssistant;
