import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

interface VoiceInputProps {
  onTranscript?: (text: string) => void;
  onCommand?: (result: any) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showVisualization?: boolean;
  autoCommand?: boolean;
  realtime?: boolean;
}

export function VoiceInput({
  onTranscript,
  onCommand,
  className,
  size = 'md',
  showVisualization = true,
  autoCommand = false,
  realtime = false
}: VoiceInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const {
    isRecording,
    isProcessing,
    audioLevel,
    transcript,
    error,
    startRecording,
    stopRecording
  } = useVoiceRecording({
    autoCommand,
    realtime,
    onTranscription: (result) => {
      if (onTranscript) {
        onTranscript(result.text);
      }
    },
    onCommand
  });

  // Audio visualization
  useEffect(() => {
    if (!showVisualization || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isRecording || audioLevel > 0) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.3;
        const pulseRadius = baseRadius + (audioLevel * 50);
        
        // Draw outer pulse
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 + audioLevel * 0.4})`;
        ctx.lineWidth = 2 + audioLevel * 3;
        ctx.stroke();
        
        // Draw inner circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
        ctx.fillStyle = isRecording ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)';
        ctx.fill();
        
        // Draw audio level bars
        const barCount = 12;
        const barWidth = 4;
        const barSpacing = (2 * Math.PI) / barCount;
        
        for (let i = 0; i < barCount; i++) {
          const angle = i * barSpacing;
          const barHeight = 10 + audioLevel * 30 * (0.5 + 0.5 * Math.sin(Date.now() * 0.005 + i));
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          
          ctx.beginPath();
          ctx.rect(-barWidth / 2, baseRadius + 10, barWidth, barHeight);
          ctx.fillStyle = `rgba(59, 130, 246, ${0.6 + audioLevel * 0.4})`;
          ctx.fill();
          
          ctx.restore();
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
  }, [isRecording, audioLevel, showVisualization]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {showVisualization && (
        <canvas
          ref={canvasRef}
          width={120}
          height={120}
          className="absolute inset-0 pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
      )}
      
      <Button
        variant={isRecording ? 'destructive' : 'default'}
        size="icon"
        className={cn(
          sizeClasses[size],
          'relative z-10 transition-all duration-200',
          isRecording && 'animate-pulse'
        )}
        onClick={handleClick}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className={cn('animate-spin', `h-${iconSize[size] / 4} w-${iconSize[size] / 4}`)} />
        ) : isRecording ? (
          <MicOff className={`h-${iconSize[size] / 4} w-${iconSize[size] / 4}`} />
        ) : (
          <Mic className={`h-${iconSize[size] / 4} w-${iconSize[size] / 4}`} />
        )}
      </Button>
      
      {error && (
        <div className="absolute top-full mt-2 text-sm text-red-500 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}