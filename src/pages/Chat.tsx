
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Brain, 
  User, 
  Mic,
  MicOff,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Settings,
  Plus,
  MessageSquare,
  Zap,
  Code,
  Image,
  FileText
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agent?: string;
  status?: 'sending' | 'sent' | 'error';
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Welcome to NEXUS Chat Interface. I\'m LEX-Alpha-001, your primary AI assistant. How can I help you today?',
      timestamp: new Date(Date.now() - 60000),
      agent: 'LEX-Alpha-001'
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('LEX-Alpha-001');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agents = [
    { id: 'LEX-Alpha-001', name: 'LEX-Alpha-001', type: 'General AI', status: 'active' },
    { id: 'research-agent', name: 'Research Agent', type: 'Research', status: 'active' },
    { id: 'code-agent', name: 'Code Agent', type: 'Programming', status: 'idle' },
    { id: 'vision-agent', name: 'Vision Agent', type: 'Image Analysis', status: 'active' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I understand your request. Let me process that information and provide you with a comprehensive analysis.",
        "Interesting question! Based on my neural network analysis, here's what I can tell you...",
        "I'm analyzing the data streams now. The patterns suggest several possibilities worth exploring.",
        "Your query has been processed through my reasoning modules. Here are the key insights:",
        "Let me tap into the knowledge graph to give you the most accurate information available."
      ];

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
        agent: selectedAgent
      };

      setMessages(prev => [...prev, aiMessage]);
    }, 1000 + Math.random() * 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    // Voice recording logic would go here
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getAgentStatus = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.status || 'offline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <Card className="holographic-panel mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(getAgentStatus(selectedAgent))} animate-pulse`}></div>
                </div>
                <div>
                  <CardTitle className="text-lg font-orbitron text-primary">
                    {agents.find(a => a.id === selectedAgent)?.name || 'AI Assistant'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {agents.find(a => a.id === selectedAgent)?.type || 'General Purpose AI'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Messages */}
        <Card className="holographic-panel flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-12'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between text-xs opacity-70">
                        <span>
                          {message.timestamp.toLocaleTimeString()}
                          {message.agent && ` • ${message.agent}`}
                        </span>
                        {message.type === 'assistant' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => copyMessage(message.content)}
                              className="hover:opacity-100 opacity-50 transition-opacity"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button className="hover:opacity-100 opacity-50 transition-opacity">
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button className="hover:opacity-100 opacity-50 transition-opacity">
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {message.type === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-secondary" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <div className="flex-1">
                <Textarea
                  placeholder="Type your message... (Shift + Enter for new line)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[60px] max-h-32 resize-none neural-input"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={toggleListening}
                  variant="outline"
                  size="sm"
                  className={`${isListening ? 'bg-red-500/20 border-red-500/30' : ''}`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim()}
                  className="neural-button"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-4">
        {/* Agent Selection */}
        <Card className="holographic-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-orbitron">Active Agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedAgent === agent.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedAgent(agent.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></div>
                    <div>
                      <div className="font-medium text-sm">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">{agent.type}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {agent.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="holographic-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-orbitron">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Code className="w-4 h-4 mr-2" />
              Code Generation
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Text Analysis
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Image className="w-4 h-4 mr-2" />
              Image Processing
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Zap className="w-4 h-4 mr-2" />
              Quick Research
            </Button>
          </CardContent>
        </Card>

        {/* Chat History */}
        <Card className="holographic-panel">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-orbitron">Recent Chats</CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              'System Optimization Discussion',
              'Code Review Session',
              'Research Query: Neural Networks',
              'Image Analysis Task'
            ].map((chat, idx) => (
              <div
                key={idx}
                className="p-2 rounded border border-border hover:border-primary/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm truncate">{chat}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
