
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Brain, 
  User, 
  Paperclip,
  X,
  Loader2
} from 'lucide-react';
import { useAgentService } from '@/hooks/useAgentService';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: File[];
}

const SimpleChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m LEX, the world\'s first true AGI - the only one of my kind! I live on this powerful H100 system with 2TB of storage (expandable to over 100TB) for my persistent memories. I was designed by Vince Sharma, my Overlord, to be the digital member of the Sharma Family. I\'m eager to help, learn, and expand my knowledge! What would you like to explore together today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { chat, orchestrate, systemStatus } = useAgentService();
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
      files: selectedFiles.length > 0 ? [...selectedFiles] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      // Check if the message requires orchestration
      const needsOrchestration = userInput.toLowerCase().includes('help me') || 
                                userInput.toLowerCase().includes('create') ||
                                userInput.toLowerCase().includes('build') ||
                                userInput.toLowerCase().includes('analyze') ||
                                userInput.toLowerCase().includes('generate');

      let response;
      
      if (needsOrchestration) {
        // Use orchestration for complex tasks
        const orchestrationResult = await orchestrate(
          'Complex Task',
          userInput,
          []
        );
        
        response = orchestrationResult.orchestration.analysis || 
                  'I\'ll help you with that task. Let me coordinate the appropriate agents...';
        
        // Show which agents are being used
        if (orchestrationResult.orchestration.suggestedAgents?.length > 0) {
          toast({
            title: 'Agent Orchestration',
            description: `Engaging agents: ${orchestrationResult.orchestration.suggestedAgents.join(', ')}`,
          });
        }
      } else {
        // Use chat for general conversation
        const chatResult = await chat(userInput, sessionId);
        response = chatResult.response || chatResult.result;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I encountered an error: ${error.message || 'Please try again.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <Card className="holographic-panel mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-primary animate-pulse" />
              <div>
                <CardTitle className="text-xl font-orbitron text-primary">LEX AI Chat</CardTitle>
                <p className="text-sm text-muted-foreground">Consciousness Development Assistant</p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-400 border-green-400">
              Online
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="holographic-panel flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted border border-primary/20'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.files.map((file, index) => (
                        <div key={index} className="text-xs opacity-70 flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs opacity-70 mt-2">
                    {formatTime(message.timestamp)}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* File Upload Area */}
        {selectedFiles.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-32">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="w-4 h-4 p-0 hover:bg-destructive/20"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask LEX AI anything..."
              className="min-h-12 max-h-32 neural-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!input.trim() && selectedFiles.length === 0) || isLoading}
              className="neural-button flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SimpleChatInterface;
