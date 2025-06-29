import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Languages, Settings2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface VoiceConfig {
  enabled: boolean;
  language: string;
  realtime: boolean;
  autoCommand: boolean;
  timestamps: boolean;
  chunkLength: number;
  strideLength: number;
  audioGain: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

export function VoiceSettings() {
  const [config, setConfig] = useState<VoiceConfig>({
    enabled: true,
    language: 'en',
    realtime: false,
    autoCommand: true,
    timestamps: false,
    chunkLength: 30,
    strideLength: 5,
    audioGain: 1.0,
    echoCancellation: true,
    noiseSuppression: true,
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved configuration
    const savedConfig = localStorage.getItem('voiceConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
    
    // Check if Whisper service is initialized
    checkWhisperStatus();
  }, []);

  const checkWhisperStatus = async () => {
    try {
      const response = await axios.get('/api/voice/status', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setIsInitialized(response.data.status.whisperInitialized);
    } catch (error) {
      console.error('Failed to check Whisper status:', error);
    }
  };

  const initializeWhisper = async () => {
    setIsLoading(true);
    try {
      await axios.get('/api/voice/initialize', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setIsInitialized(true);
      toast({
        title: 'Voice Service Initialized',
        description: 'Whisper transcription service is ready to use.',
      });
    } catch (error) {
      toast({
        title: 'Initialization Failed',
        description: 'Failed to initialize voice transcription service.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (updates: Partial<VoiceConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem('voiceConfig', JSON.stringify(newConfig));
  };

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      toast({
        title: 'Microphone Test Successful',
        description: 'Your microphone is working properly.',
      });
    } catch (error) {
      toast({
        title: 'Microphone Test Failed',
        description: 'Unable to access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Recognition Settings
          </CardTitle>
          <CardDescription>
            Configure voice input and transcription settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Whisper Service Status</p>
              <p className="text-sm text-muted-foreground">
                {isInitialized ? 'Service is ready' : 'Service needs initialization'}
              </p>
            </div>
            {!isInitialized && (
              <Button 
                onClick={initializeWhisper} 
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? 'Initializing...' : 'Initialize Service'}
              </Button>
            )}
          </div>

          {/* Enable Voice Input */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="voice-enabled">Enable Voice Input</Label>
              <p className="text-sm text-muted-foreground">
                Allow voice input throughout the system
              </p>
            </div>
            <Switch
              id="voice-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => updateConfig({ enabled: checked })}
            />
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language">Recognition Language</Label>
            <Select
              value={config.language}
              onValueChange={(value) => updateConfig({ language: value })}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Real-time Transcription */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="realtime">Real-time Transcription</Label>
              <p className="text-sm text-muted-foreground">
                Show transcription while speaking (uses more resources)
              </p>
            </div>
            <Switch
              id="realtime"
              checked={config.realtime}
              onCheckedChange={(checked) => updateConfig({ realtime: checked })}
            />
          </div>

          {/* Auto Command Processing */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-command">Auto Command Processing</Label>
              <p className="text-sm text-muted-foreground">
                Automatically process voice as commands when applicable
              </p>
            </div>
            <Switch
              id="auto-command"
              checked={config.autoCommand}
              onCheckedChange={(checked) => updateConfig({ autoCommand: checked })}
            />
          </div>

          {/* Include Timestamps */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="timestamps">Include Timestamps</Label>
              <p className="text-sm text-muted-foreground">
                Add word-level timestamps to transcriptions
              </p>
            </div>
            <Switch
              id="timestamps"
              checked={config.timestamps}
              onCheckedChange={(checked) => updateConfig({ timestamps: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio Processing Settings
          </CardTitle>
          <CardDescription>
            Fine-tune audio processing parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Audio Gain */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="audio-gain">Audio Gain</Label>
              <span className="text-sm text-muted-foreground">
                {(config.audioGain * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              id="audio-gain"
              min={0.5}
              max={2}
              step={0.1}
              value={[config.audioGain]}
              onValueChange={([value]) => updateConfig({ audioGain: value })}
            />
          </div>

          {/* Echo Cancellation */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="echo-cancel">Echo Cancellation</Label>
              <p className="text-sm text-muted-foreground">
                Reduce echo and feedback from speakers
              </p>
            </div>
            <Switch
              id="echo-cancel"
              checked={config.echoCancellation}
              onCheckedChange={(checked) => updateConfig({ echoCancellation: checked })}
            />
          </div>

          {/* Noise Suppression */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="noise-suppress">Noise Suppression</Label>
              <p className="text-sm text-muted-foreground">
                Filter out background noise
              </p>
            </div>
            <Switch
              id="noise-suppress"
              checked={config.noiseSuppression}
              onCheckedChange={(checked) => updateConfig({ noiseSuppression: checked })}
            />
          </div>

          {/* Test Microphone */}
          <div className="pt-4">
            <Button onClick={testMicrophone} variant="outline" className="w-full">
              <Mic className="h-4 w-4 mr-2" />
              Test Microphone
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Advanced Settings
          </CardTitle>
          <CardDescription>
            Advanced transcription parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chunk Length */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="chunk-length">Chunk Length (seconds)</Label>
              <span className="text-sm text-muted-foreground">{config.chunkLength}s</span>
            </div>
            <Slider
              id="chunk-length"
              min={10}
              max={60}
              step={5}
              value={[config.chunkLength]}
              onValueChange={([value]) => updateConfig({ chunkLength: value })}
            />
            <p className="text-xs text-muted-foreground">
              Length of audio chunks for processing
            </p>
          </div>

          {/* Stride Length */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stride-length">Stride Length (seconds)</Label>
              <span className="text-sm text-muted-foreground">{config.strideLength}s</span>
            </div>
            <Slider
              id="stride-length"
              min={1}
              max={10}
              step={1}
              value={[config.strideLength]}
              onValueChange={([value]) => updateConfig({ strideLength: value })}
            />
            <p className="text-xs text-muted-foreground">
              Overlap between audio chunks for better accuracy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}