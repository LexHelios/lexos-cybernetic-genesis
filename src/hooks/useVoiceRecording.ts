import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecordingOptions {
  autoCommand?: boolean;
  realtime?: boolean;
  language?: string;
  onTranscription?: (result: TranscriptionResult) => void;
  onPartialTranscription?: (text: string) => void;
  onCommand?: (result: CommandResult) => void;
}

interface TranscriptionResult {
  text: string;
  timestamps?: any[];
  language?: string;
  duration?: number;
}

interface CommandResult {
  success: boolean;
  command?: string;
  result?: any;
  error?: string;
  transcript: string;
  isChat?: boolean;
}

export function useVoiceRecording(options: VoiceRecordingOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  const { toast } = useToast();

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    // Use the proxy endpoint
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/voice?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Voice WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'transcription_complete':
            setTranscript(data.result.text);
            setIsProcessing(false);
            if (options.onTranscription) {
              options.onTranscription(data.result);
            }
            break;
            
          case 'partial_transcription':
            if (options.onPartialTranscription) {
              options.onPartialTranscription(data.result.text);
            }
            break;
            
          case 'command_result':
            if (options.onCommand) {
              options.onCommand(data.result);
            }
            break;
            
          case 'chat_response':
            if (options.onCommand) {
              options.onCommand({
                success: true,
                transcript: transcript,
                isChat: true,
                result: data.response
              });
            }
            break;
            
          case 'navigate':
            // Handle navigation commands
            window.location.href = data.route;
            break;
            
          case 'error':
            setError(data.error);
            setIsProcessing(false);
            toast({
              title: 'Voice Error',
              description: data.error,
              variant: 'destructive'
            });
            break;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };
    
    ws.onerror = (event) => {
      console.error('Voice WebSocket error:', event);
      setError('WebSocket connection error');
    };
    
    ws.onclose = () => {
      console.log('Voice WebSocket disconnected');
      wsRef.current = null;
    };
    
    wsRef.current = ws;
    return ws;
  }, [options, transcript, toast]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Initialize WebSocket if not connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        initializeWebSocket();
      }
      
      // Wait for WebSocket to connect
      await new Promise((resolve) => {
        const checkConnection = () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            resolve(true);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
      
      // Send start recording message
      wsRef.current?.send(JSON.stringify({
        type: 'start_recording',
        language: options.language || 'en',
        realtime: options.realtime || false,
        autoCommand: options.autoCommand || false
      }));
      
      // Setup audio visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      source.connect(analyzerRef.current);
      
      // Start audio level monitoring
      const updateAudioLevel = () => {
        if (analyzerRef.current) {
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(average / 255);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();
      
      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send data to WebSocket for real-time processing
          if (options.realtime && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Clean up audio visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Send stop recording message
        wsRef.current?.send(JSON.stringify({ type: 'stop_recording' }));
        
        // Process the complete recording if not using real-time
        if (!options.realtime && audioChunksRef.current.length > 0) {
          setIsProcessing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Convert to base64 and send
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result?.toString().split(',')[1];
            if (base64 && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'audio_chunk',
                data: base64
              }));
            }
          };
          reader.readAsDataURL(audioBlob);
        }
        
        setAudioLevel(0);
      };
      
      // Start recording
      mediaRecorder.start(options.realtime ? 1000 : undefined); // 1 second chunks for real-time
      setIsRecording(true);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone');
      toast({
        title: 'Recording Error',
        description: 'Failed to access microphone. Please check your permissions.',
        variant: 'destructive'
      });
    }
  }, [initializeWebSocket, options, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Send transcript for command processing
  const processCommand = useCallback(async (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await initializeWebSocket();
    }
    
    wsRef.current?.send(JSON.stringify({
      type: 'command',
      transcript: text
    }));
  }, [initializeWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    transcript,
    error,
    startRecording: useCallback(async () => {
      try {
        setError(null);
        
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Initialize WebSocket if not connected
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          initializeWebSocket();
        }
        
        // Wait for WebSocket to connect
        await new Promise((resolve) => {
          const checkConnection = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              resolve(true);
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
        
        // Send start recording message
        wsRef.current?.send(JSON.stringify({
          type: 'start_recording',
          language: options.language || 'en',
          realtime: options.realtime || false,
          autoCommand: options.autoCommand || false
        }));
        
        // Setup audio visualization
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 256;
        source.connect(analyzerRef.current);
        
        // Start audio level monitoring
        const updateAudioLevel = () => {
          if (analyzerRef.current) {
            const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
            analyzerRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setAudioLevel(average / 255);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          }
        };
        updateAudioLevel();
        
        // Setup MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/ogg';
        
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            
            // Send data to WebSocket for real-time processing
            if (options.realtime && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(event.data);
            }
          }
        };
        
        mediaRecorder.onstop = async () => {
          // Clean up audio visualization
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          
          // Send stop recording message
          wsRef.current?.send(JSON.stringify({ type: 'stop_recording' }));
          
          // Process the complete recording if not using real-time
          if (!options.realtime && audioChunksRef.current.length > 0) {
            setIsProcessing(true);
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            
            // Convert to base64 and send
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result?.toString().split(',')[1];
              if (base64 && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'audio_chunk',
                  data: base64
                }));
              }
            };
            reader.readAsDataURL(audioBlob);
          }
          
          setAudioLevel(0);
        };
        
        // Start recording
        mediaRecorder.start(options.realtime ? 1000 : undefined); // 1 second chunks for real-time
        setIsRecording(true);
        
      } catch (err) {
        console.error('Failed to start recording:', err);
        setError('Failed to access microphone');
        toast({
          title: 'Recording Error',
          description: 'Failed to access microphone. Please check your permissions.',
          variant: 'destructive'
        });
      }
    }, [initializeWebSocket, options, toast]),
    stopRecording: useCallback(() => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }, [isRecording]),
    processCommand: useCallback(async (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await initializeWebSocket();
      }
      
      wsRef.current?.send(JSON.stringify({
        type: 'command',
        transcript: text
      }));
    }, [initializeWebSocket])
  };
}
