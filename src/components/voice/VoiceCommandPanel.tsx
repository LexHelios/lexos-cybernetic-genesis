import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, HelpCircle, Command } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VoiceInput } from './VoiceInput';
import { useToast } from '@/hooks/use-toast';

interface VoiceCommand {
  command: string;
  description: string;
  examples: string[];
  category: string;
}

const VOICE_COMMANDS: VoiceCommand[] = [
  {
    command: 'Agent Control',
    description: 'Manage AI agents',
    examples: ['Start research agent', 'Stop executor agent', 'List all agents'],
    category: 'agents'
  },
  {
    command: 'Task Management',
    description: 'Create and manage tasks',
    examples: ['Create task to analyze data', 'Check task status', 'Cancel current task'],
    category: 'tasks'
  },
  {
    command: 'Navigation',
    description: 'Navigate through the system',
    examples: ['Go to dashboard', 'Open analytics', 'Show knowledge graph'],
    category: 'navigation'
  },
  {
    command: 'System Control',
    description: 'Control system functions',
    examples: ['Check system status', 'Clear task queue', 'Show help'],
    category: 'system'
  }
];

export function VoiceCommandPanel() {
  const [transcript, setTranscript] = useState('');
  const [commandHistory, setCommandHistory] = useState<Array<{
    transcript: string;
    result: any;
    timestamp: Date;
  }>>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('closed');
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsResponse, setWsResponse] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const clientId = useRef(`voice-${Date.now()}`);
  
  const { toast } = useToast();

  // WebSocket connection logic
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${clientId.current}`;
    setWsStatus('connecting');
    setWsError(null);
    const ws = new window.WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('open');
    };
    ws.onclose = () => {
      setWsStatus('closed');
    };
    ws.onerror = (e) => {
      setWsStatus('error');
      setWsError('WebSocket connection error');
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'response') {
          setWsResponse(msg.original_message?.transcript || msg.original_message || '');
          handleCommand({
            transcript: msg.original_message?.transcript || '',
            result: msg,
            timestamp: new Date(),
            success: true
          });
        }
      } catch (err) {
        setWsError('Error parsing WebSocket message');
      }
    };
    return () => {
      ws.close();
    };
  }, []);

  // Send transcript over WebSocket
  useEffect(() => {
    if (wsRef.current && wsStatus === 'open' && transcript) {
      wsRef.current.send(JSON.stringify({ type: 'voice_command', transcript }));
    }
  }, [transcript, wsStatus]);

  const handleCommand = (result: any) => {
    setCommandHistory(prev => [{
      transcript: result.transcript,
      result,
      timestamp: new Date()
    }, ...prev].slice(0, 10)); // Keep last 10 commands

    if (result.success) {
      toast({
        title: 'Command Executed',
        description: result.result?.message || 'Command processed successfully'
      });
    } else if (result.isChat) {
      // Handle chat responses
      toast({
        title: 'Response',
        description: 'Check the chat for the response'
      });
    } else {
      toast({
        title: 'Command Failed',
        description: result.error || 'Failed to execute command',
        variant: 'destructive'
      });
    }
  };

  const categoryColors = {
    agents: 'bg-blue-500',
    tasks: 'bg-green-500',
    navigation: 'bg-purple-500',
    system: 'bg-orange-500'
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Commands
            </CardTitle>
            <CardDescription>
              Control the system with voice commands
              <span className="ml-2 text-xs">
                {wsStatus === 'connecting' && 'Connecting...'}
                {wsStatus === 'open' && 'Connected'}
                {wsStatus === 'closed' && 'Disconnected'}
                {wsStatus === 'error' && 'Error'}
              </span>
            </CardDescription>
            {wsError && <div className="text-xs text-red-500">{wsError}</div>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            Help
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Input Section */}
        <div className="flex flex-col items-center space-y-4 p-6 bg-muted/50 rounded-lg">
          <VoiceInput
            onTranscript={setTranscript}
            onCommand={handleCommand}
            showVisualization={true}
            autoCommand={true}
            size="lg"
          />
          
          {transcript && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Transcript:</p>
              <p className="font-medium">{transcript}</p>
            </div>
          )}
          {wsResponse && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Response:</p>
              <p className="font-medium">{wsResponse}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Command Help */}
        {showHelp && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Command className="h-4 w-4" />
              Available Commands
            </h3>
            <div className="grid gap-4">
              {VOICE_COMMANDS.map((cmd, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={cn('text-white', categoryColors[cmd.category as keyof typeof categoryColors])}
                    >
                      {cmd.category}
                    </Badge>
                    <span className="font-medium">{cmd.command}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{cmd.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {cmd.examples.map((example, i) => (
                      <code key={i} className="text-xs bg-muted px-2 py-1 rounded">
                        "{example}"
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Command History */}
        {commandHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="font-semibold">Recent Commands</h3>
              <ScrollArea className="h-48">
                <div className="space-y-2 pr-4">
                  {commandHistory.map((item, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{item.transcript}</p>
                        <span className="text-xs text-muted-foreground">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      {item.result.success ? (
                        <p className="text-xs text-green-600">
                          {item.result.result?.message || 'Success'}
                        </p>
                      ) : (
                        <p className="text-xs text-red-600">
                          {item.result.error || 'Failed'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}