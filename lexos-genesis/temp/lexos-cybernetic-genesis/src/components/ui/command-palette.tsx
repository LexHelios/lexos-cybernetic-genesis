import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Home, 
  Users, 
  Activity, 
  Brain, 
  ListTodo, 
  Cpu, 
  MessageSquare,
  Shield,
  BarChart,
  Settings,
  User,
  Command as CommandIcon,
  Zap,
  FileText,
  Terminal,
  Palette,
  Volume2
} from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
  category: string;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  // Navigation commands
  const navigationCommands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      icon: Home,
      shortcut: 'Alt+1',
      action: () => navigate('/'),
      category: 'Navigation',
      keywords: ['home', 'overview']
    },
    {
      id: 'nav-agents',
      title: 'Agent Management',
      icon: Users,
      shortcut: 'Alt+2',
      action: () => navigate('/agents'),
      category: 'Navigation',
      keywords: ['ai', 'bots']
    },
    {
      id: 'nav-monitor',
      title: 'System Monitor',
      icon: Activity,
      shortcut: 'Alt+3',
      action: () => navigate('/monitor'),
      category: 'Navigation',
      keywords: ['performance', 'status']
    },
    {
      id: 'nav-knowledge',
      title: 'Knowledge Graph',
      icon: Brain,
      shortcut: 'Alt+4',
      action: () => navigate('/knowledge'),
      category: 'Navigation',
      keywords: ['data', 'graph']
    },
    {
      id: 'nav-tasks',
      title: 'Task Pipeline',
      icon: ListTodo,
      shortcut: 'Alt+5',
      action: () => navigate('/tasks'),
      category: 'Navigation',
      keywords: ['queue', 'workflow']
    },
    {
      id: 'nav-models',
      title: 'Model Arsenal',
      icon: Cpu,
      shortcut: 'Alt+6',
      action: () => navigate('/models'),
      category: 'Navigation',
      keywords: ['llm', 'ai models']
    },
    {
      id: 'nav-comms',
      title: 'Communications',
      icon: MessageSquare,
      shortcut: 'Alt+7',
      action: () => navigate('/comms'),
      category: 'Navigation',
      keywords: ['chat', 'messages']
    },
    {
      id: 'nav-security',
      title: 'Security Hub',
      icon: Shield,
      shortcut: 'Alt+8',
      action: () => navigate('/security'),
      category: 'Navigation',
      keywords: ['permissions', 'access']
    },
    {
      id: 'nav-analytics',
      title: 'Analytics',
      icon: BarChart,
      shortcut: 'Alt+9',
      action: () => navigate('/analytics'),
      category: 'Navigation',
      keywords: ['stats', 'metrics']
    }
  ];

  // Action commands
  const actionCommands: CommandItem[] = [
    {
      id: 'action-voice',
      title: 'Toggle Voice Assistant',
      icon: Volume2,
      shortcut: 'Ctrl+Space',
      action: () => {
        window.dispatchEvent(new CustomEvent('toggle-voice-assistant'));
        toast({ title: 'Voice Assistant', description: 'Voice assistant toggled' });
      },
      category: 'Actions',
      keywords: ['speak', 'microphone']
    },
    {
      id: 'action-theme',
      title: 'Toggle Theme',
      icon: Palette,
      shortcut: 'Ctrl+Shift+T',
      action: () => {
        window.dispatchEvent(new CustomEvent('toggle-theme'));
        toast({ title: 'Theme', description: 'Theme toggled' });
      },
      category: 'Actions',
      keywords: ['dark', 'light', 'colors']
    },
    {
      id: 'action-shortcuts',
      title: 'Show Keyboard Shortcuts',
      icon: CommandIcon,
      shortcut: 'Ctrl+/',
      action: () => {
        window.dispatchEvent(new CustomEvent('show-shortcuts'));
      },
      category: 'Actions',
      keywords: ['keys', 'hotkeys']
    },
    {
      id: 'action-terminal',
      title: 'Open Terminal',
      icon: Terminal,
      action: () => {
        toast({ title: 'Terminal', description: 'Terminal feature coming soon' });
      },
      category: 'Actions',
      keywords: ['console', 'cli']
    },
    {
      id: 'action-docs',
      title: 'Open Documentation',
      icon: FileText,
      action: () => {
        window.open('/docs', '_blank');
      },
      category: 'Actions',
      keywords: ['help', 'guide']
    }
  ];

  // Settings commands
  const settingsCommands: CommandItem[] = [
    {
      id: 'settings-profile',
      title: 'User Settings',
      icon: User,
      action: () => navigate('/settings'),
      category: 'Settings'
    },
    {
      id: 'settings-config',
      title: 'System Configuration',
      icon: Settings,
      action: () => navigate('/config'),
      category: 'Settings'
    },
    {
      id: 'settings-logout',
      title: 'Logout',
      icon: Zap,
      action: () => {
        logout();
        toast({ title: 'Logged out', description: 'You have been logged out successfully' });
      },
      category: 'Settings'
    }
  ];

  const allCommands = [...navigationCommands, ...actionCommands, ...settingsCommands];

  // Filter commands based on search
  const filteredCommands = allCommands.filter(command => {
    const searchLower = search.toLowerCase();
    return (
      command.title.toLowerCase().includes(searchLower) ||
      command.category.toLowerCase().includes(searchLower) ||
      command.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower))
    );
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  // Handle command selection
  const handleCommandSelect = (command: CommandItem) => {
    setOpen(false);
    setSearch('');
    command.action();
  };

  // Keyboard shortcut to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    const handleOpenCommandPalette = () => {
      setOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenCommandPalette);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenCommandPalette);
    };
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput 
          placeholder="Type a command or search..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {Object.entries(groupedCommands).map(([category, commands]) => (
            <React.Fragment key={category}>
              <CommandGroup heading={category}>
                {commands.map((command) => (
                  <CommandItem
                    key={command.id}
                    onSelect={() => handleCommandSelect(command)}
                    className="cursor-pointer"
                  >
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.title}</span>
                    {command.shortcut && (
                      <CommandShortcut>{command.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </React.Fragment>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}