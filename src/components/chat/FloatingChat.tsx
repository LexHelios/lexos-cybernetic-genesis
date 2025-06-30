import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Minimize2, Maximize2, X, MessageCircle, Mic, MicOff, Volume2, VolumeX, Brain, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useConversation } from '@11labs/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { VoiceInput } from '../voice/VoiceInput';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'system';
  timestamp: Date;
  files?: File[];
  modelUsed?: string;
  routingReason?: string;
  isDeepThinking?: boolean;
}

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: 100 });
  const [size, setSize] = useState({ width: 380, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'LEX AI Phase 3 Neural Command Center initialized. How may I assist you?',
      sender: 'system',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [lastUsedModel, setLastUsedModel] = useState<string | null>(null);
  const [performanceMode, setPerformanceMode] = useState<'fast' | 'balanced' | 'quality'>('balanced');
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/voice`;
        
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected successfully');
          setWsConnected(true);
        };
        
        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected');
          setWsConnected(false);
          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            if (data.type === 'transcription_complete') {
              setInputValue(prev => prev + (prev ? ' ' : '') + data.result.text);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setWsConnected(false);
      }
    };

    if (isOpen) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isOpen]);

  // Initialize ElevenLabs conversation
  const conversation = useConversation({
    onConnect: () => {
      console.log('Audio conversation connected');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Voice communication activated. You can now speak directly to LEX AI.',
        sender: 'system',
        timestamp: new Date()
      }]);
    },
    onDisconnect: () => {
      console.log('Audio conversation disconnected');
    },
    onMessage: (message) => {
      if (message.source === 'ai') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: message.message,
          sender: 'system',
          timestamp: new Date()
        }]);
      }
    },
    onError: (error) => {
      console.error('Audio conversation error:', error);
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    const target = e.target as HTMLElement;
    if (target.closest('.resize-handle')) {
      setIsResizing(true);
      return;
    }
    
    setIsDragging(true);
    const rect = chatRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && !isMinimized) {
      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - size.width)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - size.height))
      });
    } else if (isResizing) {
      const newWidth = Math.max(300, Math.min(e.clientX - position.x, window.innerWidth - position.x));
      const newHeight = Math.max(200, Math.min(e.clientY - position.y, window.innerHeight - position.y));
      setSize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, position]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && selectedFiles.length === 0) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      files: selectedFiles.length > 0 ? [...selectedFiles] : undefined,
      isDeepThinking
    };

    setMessages(prev => [...prev, newMessage]);
    const userInput = inputValue;
    setInputValue('');
    setSelectedFiles([]);

    // Show thinking indicator
    const modelName = selectedModel === 'auto' ? 'Lex AI (Auto-routing)' :
                     selectedModel.includes('phi3') ? 'Phi3 Mini' :
                     selectedModel.includes('deepseek') ? 'DeepSeek R1' :
                     selectedModel.includes('qwen') ? 'Qwen Coder' :
                     selectedModel.includes('llama') ? 'Llama 3.3' :
                     selectedModel.includes('mistral') ? 'Mistral' :
                     selectedModel.includes('mixtral') ? 'Mixtral' :
                     selectedModel.includes('gemma') ? 'Gemma 2' :
                     selectedModel;
    
    const thinkingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: isDeepThinking 
        ? `🧠 Deep thinking mode activated... ${modelName} is analyzing your request thoroughly...`
        : selectedModel === 'auto' ? 'Lex is analyzing your request...' : `Processing with ${modelName} model...`,
      sender: 'system',
      timestamp: new Date(),
      isDeepThinking
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      // Call the actual LLM API with auto mode support
      const endpoint = selectedModel === 'auto' ? '/api/chat/auto' : '/api/chat';
      const token = localStorage.getItem('token');
      
      const requestBody = selectedModel === 'auto' ? {
        message: userInput,
        messages: messages.filter(m => m.sender === 'user' || m.sender === 'system').slice(-10).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        performance_mode: performanceMode,
        deep_thinking: isDeepThinking,
        options: {
          temperature: isDeepThinking ? 0.3 : 0.8,
          max_tokens: isDeepThinking ? 4096 : 2048
        }
      } : {
        model: selectedModel,
        messages: [
          ...messages.filter(m => m.sender === 'user' || m.sender === 'system').slice(-10).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          { role: 'user', content: userInput }
        ],
        temperature: isDeepThinking ? 0.3 : 0.8,
        max_tokens: isDeepThinking ? 4096 : 2048
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from LLM');
      }

      const data = await response.json();
      
      // Extract the actual response content, filtering out thinking/reasoning
      let responseContent = data.message?.content || data.response || 'No response received';
      
      // Remove thinking tags and content between them
      responseContent = responseContent
        .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking[^>]*>[\s\S]*?<\/thinking>/gi, '')
        .replace(/<thought[^>]*>[\s\S]*?<\/thought>/gi, '')
        .replace(/<reasoning[^>]*>[\s\S]*?<\/reasoning>/gi, '')
        .trim();
      
      // If the response is empty after filtering, use the original
      if (!responseContent) {
        responseContent = data.message?.content || data.response || 'No response received';
      }
      
      // Check if auto mode was used and update last used model
      if (data.model_used) {
        setLastUsedModel(data.model_used);
      }
      
      // Remove thinking indicator and add actual response with model info
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingMessage.id);
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          content: responseContent,
          sender: 'system',
          timestamp: new Date(),
          modelUsed: data.model_used,
          routingReason: data.routing_reason,
          isDeepThinking
        }];
      });
    } catch (error) {
      console.error('Error calling LLM:', error);
      // Remove thinking indicator and show error
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingMessage.id);
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          content: 'Error: Failed to connect to AI model. Please check the backend connection.',
          sender: 'system',
          timestamp: new Date()
        }];
      });
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

  const startVoiceChat = async () => {
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ 
        agentId: 'your-agent-id', // You'll need to replace this with actual agent ID
      });
    } catch (error) {
      console.error('Failed to start voice chat:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Failed to start voice chat. Please check your microphone permissions and API configuration.',
        sender: 'system',
        timestamp: new Date()
      }]);
    }
  };

  const stopVoiceChat = async () => {
    await conversation.endSession();
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    conversation.setVolume({ volume: newVolume });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 hover:bg-primary/30 glow-effect"
      >
        <MessageCircle className="w-6 h-6 text-primary" />
      </Button>
    );
  }

  return (
    <div
      ref={chatRef}
      className={`fixed z-50 holographic-panel transition-all duration-300 ${
        isMinimized ? 'w-80 h-12' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 320 : size.width,
        height: isMinimized ? 48 : size.height,
      }}
    >
      {/* Header */}
      <div
        ref={headerRef}
        className="flex items-center justify-between p-3 bg-card/80 backdrop-blur-md border-b border-primary/20 cursor-move rounded-t-lg"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-primary/50 bg-black/80">
            <img 
              src="/lovable-uploads/29134d57-1699-4fbb-8ef6-187f4c30655e.png" 
              alt="LEX"
              className="w-full h-full object-cover opacity-90"
            />
          </div>
          <div>
            <h3 className="text-sm font-orbitron font-bold text-primary">Neural Interface</h3>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-muted-foreground">
                {selectedModel === 'auto' ? 'Lex AI' : 'Manual Mode'}
                {lastUsedModel && selectedModel === 'auto' && (
                  <span className="text-primary/60"> • {lastUsedModel}</span>
                )}
              </p>
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Model Selector */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-40 h-8 text-xs bg-card/50 border-primary/20">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center space-x-2">
                  <Brain className="w-3 h-3 text-primary animate-pulse" />
                  <span className="font-semibold">Auto (Lex AI)</span>
                </div>
              </SelectItem>
              <div className="px-2 py-1 text-xs text-muted-foreground border-t">Manual Selection</div>
              <SelectItem value="phi3:mini">
                <div className="flex items-center space-x-2">
                  <Brain className="w-3 h-3" />
                  <span>Phi3 Mini (Fast)</span>
                </div>
              </SelectItem>
              <SelectItem value="mistral:7b">
                <div className="flex items-center space-x-2">
                  <Brain className="w-3 h-3" />
                  <span>Mistral 7B</span>
                </div>
              </SelectItem>
              <SelectItem value="deepseek-r1:7b">
                <div className="flex items-center space-x-2">
                  <Brain className="w-3 h-3" />
                  <span>DeepSeek R1</span>
                </div>
              </SelectItem>
              <SelectItem value="qwen2.5-coder:7b">
                <div className="flex items-center space-x-2">
                  <Brain className="w-3 h-3" />
                  <span>Qwen Coder</span>
                </div>
              </SelectItem>
              <SelectItem value="llama3.3:70b">
                <div className="flex items-center space-x-2">
                  <Brain className="w-3 h-3" />
                  <span>Llama 3.3 70B</span>
                </div>
              </SelectItem>
              <SelectItem value="mixtral:8x7b">
                <div className="flex items-center space-x-2">
                  <Brain className="w-3 h-3" />
                  <span>Mixtral 8x7B</span>
                </div>
              </SelectItem>
              <SelectItem value="gemma2:9b">
                <div className="flex items-center space-x-2">
                  <Brain className="w-3 h-3" />
                  <span>Gemma 2 9B</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Performance Mode Selector (only show in auto mode) */}
          {selectedModel === 'auto' && (
            <>
              <div className="w-px h-6 bg-primary/20" />
              <Select value={performanceMode} onValueChange={(value: 'fast' | 'balanced' | 'quality') => setPerformanceMode(value)}>
                <SelectTrigger className="w-24 h-8 text-xs bg-card/50 border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">⚡ Fast</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="balanced">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">⚖️ Balanced</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="quality">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">💎 Quality</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          
          <div className="w-px h-6 bg-primary/20" />
          {/* Audio Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={conversation.status === 'connected' ? stopVoiceChat : startVoiceChat}
            className={`w-8 h-8 p-0 ${conversation.status === 'connected' ? 'hover:bg-destructive/20' : 'hover:bg-primary/20'}`}
          >
            {conversation.status === 'connected' ? 
              <MicOff className="w-4 h-4" /> : 
              <Mic className="w-4 h-4" />
            }
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVolumeChange(volume > 0 ? 0 : 0.7)}
            className="w-8 h-8 p-0 hover:bg-primary/20"
          >
            {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-8 h-8 p-0 hover:bg-primary/20"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 p-0 hover:bg-destructive/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Content */}
      {!isMinimized && (
        <>
          {/* API Key Input */}
          {showApiKeyInput && (
            <div className="p-4 bg-card/50 border-b border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Enter your ElevenLabs API key for voice chat:</p>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key..."
                  className="flex-1 px-3 py-2 bg-background/50 border border-primary/20 rounded text-sm"
                />
                <Button
                  onClick={() => setShowApiKeyInput(false)}
                  className="bg-primary/20 hover:bg-primary/30 border border-primary/30"
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-background/50 backdrop-blur-md" style={{ height: size.height - 180 }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary/20 border border-primary/30 text-primary'
                      : 'bg-card/80 border border-primary/20 text-foreground'
                  } ${message.isDeepThinking ? 'border-purple-500/50 bg-purple-500/10' : ''}`}
                >
                  {message.isDeepThinking && message.sender === 'user' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-purple-400" />
                      <span className="text-xs text-purple-400">Deep Thinking</span>
                    </div>
                  )}
                  <p className="text-sm">{message.content}</p>
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.files.map((file, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          📎 {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-muted-foreground">
                      {formatTime(message.timestamp)}
                    </div>
                    {message.modelUsed && message.sender === 'system' && (
                      <div className="text-xs text-primary/60 flex items-center space-x-1">
                        <Brain className="w-3 h-3" />
                        <span>{message.modelUsed}</span>
                        {message.routingReason && (
                          <span className="text-muted-foreground"> • {message.routingReason}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* File Upload Area */}
          {selectedFiles.length > 0 && (
            <div className="px-4 py-2 bg-card/50 border-t border-primary/20">
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">📎 {file.name}</span>
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

          {/* Deep Thinking Toggle */}
          <div className="px-4 py-2 bg-card/50 border-t border-primary/20">
            <div className="flex items-center space-x-2">
              <Switch
                id="deep-thinking"
                checked={isDeepThinking}
                onCheckedChange={setIsDeepThinking}
              />
              <Label htmlFor="deep-thinking" className="text-xs flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-400" />
                Deep Thinking Mode
              </Label>
              <span className="text-xs text-muted-foreground">
                (Slower but more detailed responses)
              </span>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-card/80 backdrop-blur-md border-t border-primary/20 rounded-b-lg">
            <div className="flex items-end space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="hover:bg-primary/20"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <VoiceInput
                size="sm"
                showVisualization={false}
                onTranscript={(text) => {
                  setInputValue(prev => prev + (prev ? ' ' : '') + text);
                }}
                onCommand={(result) => {
                  if (result.isChat && result.result) {
                    // Add the transcription as user message
                    const userMessage: ChatMessage = {
                      id: Date.now().toString(),
                      content: result.transcript,
                      sender: 'user',
                      timestamp: new Date()
                    };
                    setMessages(prev => [...prev, userMessage]);
                    
                    // Add the response as system message
                    const responseMessage: ChatMessage = {
                      id: (Date.now() + 1).toString(),
                      content: result.result,
                      sender: 'system',
                      timestamp: new Date()
                    };
                    setMessages(prev => [...prev, responseMessage]);
                  }
                }}
              />
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Communicate with LEX AI..."
                className="min-h-[40px] max-h-[120px] bg-background/50 border-primary/20 focus:border-primary/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() && selectedFiles.length === 0}
                className="bg-primary/20 hover:bg-primary/30 border border-primary/30"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            ref={resizeRef}
            className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-primary/20 hover:bg-primary/40 rounded-tl-lg"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsResizing(true);
            }}
          >
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-primary/60"></div>
          </div>
        </>
      )}
    </div>
  );
};

export default FloatingChat;
