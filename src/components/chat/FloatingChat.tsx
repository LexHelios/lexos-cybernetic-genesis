
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Minimize2, Maximize2, X, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'system';
  timestamp: Date;
  files?: File[];
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
  
  const chatRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
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
  }, [isDragging, dragOffset, size.width, size.height]);

  const handleSendMessage = () => {
    if (!inputValue.trim() && selectedFiles.length === 0) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      files: selectedFiles.length > 0 ? [...selectedFiles] : undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setSelectedFiles([]);

    // Simulate system response
    setTimeout(() => {
      const responses = [
        'Processing your request through neural pathways...',
        'Analyzing data through Phase 3 protocols...',
        'Executing autonomous decision matrix...',
        'Neural networks activated. Processing complete.',
      ];
      const response: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
    }, 1000 + Math.random() * 2000);
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
            <p className="text-xs text-muted-foreground">LEX AI Command</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
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
          <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-background/50 backdrop-blur-md" style={{ height: size.height - 140 }}>
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
                  }`}
                >
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
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTime(message.timestamp)}
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
        </>
      )}
    </div>
  );
};

export default FloatingChat;
