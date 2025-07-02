import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './use-toast';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  global?: boolean;
}

const defaultShortcuts: ShortcutConfig[] = [
  {
    key: ' ',
    ctrl: true,
    description: 'Toggle voice assistant',
    action: () => {
      window.dispatchEvent(new CustomEvent('toggle-voice-assistant'));
    },
    global: true
  },
  {
    key: 'k',
    ctrl: true,
    description: 'Open command palette',
    action: () => {
      window.dispatchEvent(new CustomEvent('open-command-palette'));
    },
    global: true
  },
  {
    key: '/',
    ctrl: true,
    description: 'Show keyboard shortcuts',
    action: () => {
      window.dispatchEvent(new CustomEvent('show-shortcuts'));
    },
    global: true
  },
  {
    key: 'Escape',
    description: 'Close dialogs/Cancel',
    action: () => {
      window.dispatchEvent(new CustomEvent('escape-pressed'));
    },
    global: true
  },
  {
    key: 't',
    ctrl: true,
    shift: true,
    description: 'Toggle theme',
    action: () => {
      window.dispatchEvent(new CustomEvent('toggle-theme'));
    },
    global: true
  }
];

export function useKeyboardShortcuts(additionalShortcuts: ShortcutConfig[] = []) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Navigation shortcuts
  const navigationShortcuts: ShortcutConfig[] = [
    {
      key: '1',
      alt: true,
      description: 'Go to Dashboard',
      action: () => navigate('/')
    },
    {
      key: '2',
      alt: true,
      description: 'Go to Agents',
      action: () => navigate('/agents')
    },
    {
      key: '3',
      alt: true,
      description: 'Go to System Monitor',
      action: () => navigate('/monitor')
    },
    {
      key: '4',
      alt: true,
      description: 'Go to Knowledge Graph',
      action: () => navigate('/knowledge')
    },
    {
      key: '5',
      alt: true,
      description: 'Go to Tasks',
      action: () => navigate('/tasks')
    },
    {
      key: '6',
      alt: true,
      description: 'Go to Models',
      action: () => navigate('/models')
    },
    {
      key: '7',
      alt: true,
      description: 'Go to Communications',
      action: () => navigate('/comms')
    },
    {
      key: '8',
      alt: true,
      description: 'Go to Security',
      action: () => navigate('/security')
    },
    {
      key: '9',
      alt: true,
      description: 'Go to Analytics',
      action: () => navigate('/analytics')
    }
  ];

  const allShortcuts = [...defaultShortcuts, ...navigationShortcuts, ...additionalShortcuts];

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    for (const shortcut of allShortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                      (shortcut.key === ' ' && event.code === 'Space');
      
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const metaMatch = shortcut.meta ? event.metaKey : true;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        break;
      }
    }
  }, [allShortcuts]);

  // Show shortcuts modal handler
  const handleShowShortcuts = useCallback(() => {
    setIsShortcutsModalOpen(true);
  }, []);

  // Close shortcuts modal handler
  const handleEscapePressed = useCallback(() => {
    if (isShortcutsModalOpen) {
      setIsShortcutsModalOpen(false);
    }
  }, [isShortcutsModalOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('show-shortcuts', handleShowShortcuts);
    window.addEventListener('escape-pressed', handleEscapePressed);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('show-shortcuts', handleShowShortcuts);
      window.removeEventListener('escape-pressed', handleEscapePressed);
    };
  }, [handleKeyPress, handleShowShortcuts, handleEscapePressed]);

  return {
    shortcuts: allShortcuts,
    isShortcutsModalOpen,
    setIsShortcutsModalOpen
  };
}

// Helper function to format shortcut keys for display
export function formatShortcut(shortcut: ShortcutConfig): string {
  const keys = [];
  
  if (shortcut.ctrl) keys.push('Ctrl');
  if (shortcut.shift) keys.push('Shift');
  if (shortcut.alt) keys.push('Alt');
  if (shortcut.meta) keys.push('Cmd');
  
  if (shortcut.key === ' ') {
    keys.push('Space');
  } else {
    keys.push(shortcut.key.toUpperCase());
  }
  
  return keys.join('+');
}