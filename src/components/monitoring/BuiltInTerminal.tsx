
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Terminal, Send, Trash2 } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export const BuiltInTerminal: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: '1',
      type: 'output',
      content: 'LexOS Genesis Terminal v1.0.0',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'output',
      content: 'Type "help" for available commands',
      timestamp: new Date()
    }
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [lines]);

  const addLine = (type: TerminalLine['type'], content: string) => {
    const newLine: TerminalLine = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setLines(prev => [...prev, newLine]);
  };

  const executeCommand = (command: string) => {
    // Add command to terminal
    addLine('command', `$ ${command}`);
    
    // Add to history
    setCommandHistory(prev => [...prev, command].slice(-50)); // Keep last 50 commands
    
    // Process command
    const cmd = command.toLowerCase().trim();
    
    switch (cmd) {
      case 'help':
        addLine('output', 'Available commands:');
        addLine('output', '  help - Show this help message');
        addLine('output', '  clear - Clear terminal');
        addLine('output', '  status - Show system status');
        addLine('output', '  agents - List active agents');
        addLine('output', '  ps - Show running processes');
        addLine('output', '  uptime - Show system uptime');
        addLine('output', '  whoami - Current user info');
        break;
        
      case 'clear':
        setLines([]);
        break;
        
      case 'status':
        addLine('output', 'System Status: ONLINE');
        addLine('output', 'CPU Usage: 45%');
        addLine('output', 'Memory Usage: 38.7%');
        addLine('output', 'Active Agents: 2');
        break;
        
      case 'agents':
        addLine('output', 'Active Agents:');
        addLine('output', '  LEX-Alpha-001 (General Purpose AI) - ACTIVE');
        addLine('output', '  Research Agent (Research & Analysis) - ACTIVE');
        break;
        
      case 'ps':
        addLine('output', 'PID    NAME           STATUS    CPU%');
        addLine('output', '1001   lex-alpha-001  running   12.3');
        addLine('output', '1002   research-agent running   8.7');
        addLine('output', '1003   orchestrator   running   5.2');
        break;
        
      case 'uptime':
        addLine('output', 'System uptime: 7 days, 14 hours, 23 minutes');
        break;
        
      case 'whoami':
        addLine('output', 'Current user: admin@lexos-genesis.com');
        addLine('output', 'Role: Administrator');
        break;
        
      default:
        if (cmd.startsWith('echo ')) {
          addLine('output', command.slice(5));
        } else if (cmd === '') {
          // Empty command, do nothing
        } else {
          addLine('error', `Command not found: ${command}`);
          addLine('output', 'Type "help" for available commands');
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCommand.trim()) {
      executeCommand(currentCommand);
      setCurrentCommand('');
      setHistoryIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const clearTerminal = () => {
    setLines([]);
    addLine('output', 'Terminal cleared');
  };

  const getLineClassName = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command': return 'text-cyan-400 font-mono';
      case 'error': return 'text-red-400 font-mono';
      case 'output': return 'text-green-400 font-mono';
      default: return 'text-gray-300 font-mono';
    }
  };

  return (
    <Card className="h-full bg-slate-900 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-green-400 flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Terminal
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearTerminal}
            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80 p-4" ref={scrollAreaRef}>
          <div className="space-y-1">
            {lines.map((line) => (
              <div key={line.id} className={`text-xs ${getLineClassName(line.type)}`}>
                {line.content}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="border-t border-slate-700 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 flex items-center">
              <span className="text-cyan-400 font-mono text-sm mr-2">$</span>
              <Input
                ref={inputRef}
                value={currentCommand}
                onChange={(e) => setCurrentCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                className="bg-transparent border-none text-green-400 font-mono text-sm p-0 h-auto focus-visible:ring-0"
              />
            </div>
            <Button size="sm" type="submit" className="h-6 w-6 p-0">
              <Send className="h-3 w-3" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
