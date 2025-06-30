import React, { useEffect, useState } from 'react';
import { X, Command, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
    category?: string;
  }>;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'Space'], description: 'Toggle voice assistant' },
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
      { keys: ['Escape'], description: 'Close dialogs / Cancel' },
      { keys: ['Ctrl', 'Shift', 'T'], description: 'Toggle theme' }
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Alt', '1'], description: 'Go to Dashboard' },
      { keys: ['Alt', '2'], description: 'Go to Agent Management' },
      { keys: ['Alt', '3'], description: 'Go to System Monitor' },
      { keys: ['Alt', '4'], description: 'Go to Knowledge Graph' },
      { keys: ['Alt', '5'], description: 'Go to Task Pipeline' },
      { keys: ['Alt', '6'], description: 'Go to Model Arsenal' },
      { keys: ['Alt', '7'], description: 'Go to Communications' },
      { keys: ['Alt', '8'], description: 'Go to Security Hub' },
      { keys: ['Alt', '9'], description: 'Go to Analytics' }
    ]
  },
  {
    title: 'Voice Commands',
    shortcuts: [
      { keys: ['Voice'], description: 'Start research agent', category: 'Agent Control' },
      { keys: ['Voice'], description: 'Stop executor agent', category: 'Agent Control' },
      { keys: ['Voice'], description: 'Create task to [description]', category: 'Task Management' },
      { keys: ['Voice'], description: 'Check task status', category: 'Task Management' },
      { keys: ['Voice'], description: 'Go to [page name]', category: 'Navigation' },
      { keys: ['Voice'], description: 'Show help', category: 'System' }
    ]
  }
];

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleShowShortcuts = () => setOpen(true);
    const handleEscape = () => {
      if (open) setOpen(false);
    };

    window.addEventListener('show-shortcuts', handleShowShortcuts);
    window.addEventListener('escape-pressed', handleEscape);

    return () => {
      window.removeEventListener('show-shortcuts', handleShowShortcuts);
      window.removeEventListener('escape-pressed', handleEscape);
    };
  }, [open]);

  const filteredGroups = shortcutGroups.map(group => ({
    ...group,
    shortcuts: group.shortcuts.filter(shortcut =>
      shortcut.description.toLowerCase().includes(search.toLowerCase()) ||
      shortcut.category?.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(group => group.shortcuts.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Command className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Shortcuts List */}
          <ScrollArea className="h-[50vh]">
            <div className="space-y-6 pr-4">
              {filteredGroups.map((group) => (
                <div key={group.title} className="space-y-3">
                  <h3 className="font-semibold text-lg">{group.title}</h3>
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{shortcut.description}</span>
                          {shortcut.category && (
                            <Badge variant="secondary" className="text-xs">
                              {shortcut.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {shortcut.keys[0] === 'Voice' ? (
                            <Badge variant="outline" className="text-xs">
                              Voice Command
                            </Badge>
                          ) : (
                            shortcut.keys.map((key, i) => (
                              <React.Fragment key={i}>
                                <kbd className="px-2 py-1 text-xs rounded bg-background border border-border">
                                  {key}
                                </kbd>
                                {i < shortcut.keys.length - 1 && (
                                  <span className="text-muted-foreground text-xs">+</span>
                                )}
                              </React.Fragment>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Tips */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Use <kbd className="px-1.5 py-0.5 text-xs rounded bg-muted">Ctrl+K</kbd> to 
              quickly access any command or navigate anywhere in LEXOS.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}