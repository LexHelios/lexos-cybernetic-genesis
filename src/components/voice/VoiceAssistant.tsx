import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface VoiceAssistantProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function VoiceAssistant({ 
  className,
  position = 'bottom-right' 
}: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    text: string;
    timestamp: Date;
  }>>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();
  
  const {
    isRecording,
    isProcessing,
    audioLevel,
    error,
    startRecording,
    stopRecording
  } = useVoiceRecording({
    autoCommand: true,
    realtime: false,
    onTranscription: (result) => {
      setTranscript(result.text);
      addToHistory('user', result.text);
    },
    onCommand: async (result) => {
      if (result.success) {
        const message = result.result?.message || 'Command executed successfully';
        setResponse(message);
        addToHistory('assistant', message);
        
        if (ttsEnabled) {
          speak(message);
        }
      } else if (result.isChat && result.response) {
        setResponse(result.response);
        addToHistory('assistant', result.response);
        
        if (ttsEnabled) {
          speak(result.response);
        }
      } else {
        const errorMessage = result.error || 'Failed to process command';
        setResponse(errorMessage);
        addToHistory('assistant', errorMessage);
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    }
  });

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Text-to-Speech functionality
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      utteranceRef.current = new SpeechSynthesisUtterance(text);
      utteranceRef.current.rate = 1.0;
      utteranceRef.current.pitch = 1.0;
      utteranceRef.current.volume = 0.9;
      
      utteranceRef.current.onstart = () => setIsSpeaking(true);
      utteranceRef.current.onend = () => setIsSpeaking(false);
      utteranceRef.current.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utteranceRef.current);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const addToHistory = (type: 'user' | 'assistant', text: string) => {
    setConversationHistory(prev => [...prev, {
      type,
      text,
      timestamp: new Date()
    }].slice(-10)); // Keep last 10 messages
  };

  // Audio visualization
  useEffect(() => {
    if (!canvasRef.current || !isOpen || isMinimized) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isRecording || audioLevel > 0 || isSpeaking) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Create gradient background
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.1)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw waveform
        const waveHeight = isSpeaking ? 30 : audioLevel * 100;
        const frequency = isSpeaking ? 0.02 : 0.05;
        const amplitude = isSpeaking ? 15 : audioLevel * 50;
        
        ctx.beginPath();
        ctx.strokeStyle = isRecording ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 2;
        
        for (let x = 0; x < canvas.width; x++) {
          const y = centerY + Math.sin((x * frequency) + (Date.now() * 0.003)) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
        
        // Draw circular indicators
        const numCircles = 3;
        for (let i = 0; i < numCircles; i++) {
          const radius = 20 + i * 15 + (isSpeaking ? Math.sin(Date.now() * 0.003 + i) * 5 : audioLevel * 20);
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(16, 185, 129, ${0.3 - i * 0.1})`;
          ctx.stroke();
        }
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, audioLevel, isSpeaking, isOpen, isMinimized]);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4'
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn(
              'fixed z-50',
              positionClasses[position],
              className
            )}
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 group"
            >
              <Mic className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              'fixed z-50',
              positionClasses[position],
              className
            )}
          >
            <Card className={cn(
              'w-96 shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md',
              isMinimized ? 'h-16' : 'h-[500px]'
            )}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="font-semibold">Voice Assistant</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className="h-8 w-8"
                  >
                    {ttsEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="h-8 w-8"
                  >
                    {isMinimized ? (
                      <Maximize2 className="h-4 w-4" />
                    ) : (
                      <Minimize2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              {!isMinimized && (
                <div className="flex flex-col h-[calc(100%-4rem)]">
                  {/* Visualization Canvas */}
                  <div className="relative h-32 bg-gradient-to-b from-primary/5 to-transparent">
                    <canvas
                      ref={canvasRef}
                      width={384}
                      height={128}
                      className="absolute inset-0"
                    />
                  </div>

                  {/* Conversation History */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {conversationHistory.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: item.type === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'flex',
                          item.type === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div className={cn(
                          'max-w-[80%] px-4 py-2 rounded-lg',
                          item.type === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        )}>
                          <p className="text-sm">{item.text}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {item.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Current Transcript */}
                  {transcript && (
                    <div className="px-4 py-2 border-t border-primary/20">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">You:</span> {transcript}
                      </p>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="p-4 border-t border-primary/20">
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={handleToggleRecording}
                        disabled={isProcessing}
                        size="lg"
                        className={cn(
                          'rounded-full h-16 w-16',
                          isRecording && 'bg-red-500 hover:bg-red-600'
                        )}
                      >
                        {isRecording ? (
                          <MicOff className="h-6 w-6" />
                        ) : (
                          <Mic className="h-6 w-6" />
                        )}
                      </Button>
                      
                      {isSpeaking && (
                        <Button
                          onClick={stopSpeaking}
                          variant="outline"
                          size="sm"
                        >
                          Stop Speaking
                        </Button>
                      )}
                    </div>
                    
                    {error && (
                      <p className="text-sm text-red-500 text-center mt-2">
                        {error}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Press Ctrl+Space to toggle voice assistant
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}