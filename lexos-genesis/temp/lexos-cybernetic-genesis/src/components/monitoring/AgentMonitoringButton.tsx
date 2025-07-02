
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Monitor, Terminal } from 'lucide-react';
import { AgentBrowsingMonitor } from './AgentBrowsingMonitor';
import { BuiltInTerminal } from './BuiltInTerminal';

const AgentMonitoringButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        size="icon"
      >
        <Monitor className="h-5 w-5" />
      </Button>

      {/* Monitoring Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Agent Activity Monitor
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[75vh]">
            {/* Agent Web Browsing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Web Browsing Activity
              </h3>
              <AgentBrowsingMonitor />
            </div>

            {/* Built-in Terminal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                System Terminal
              </h3>
              <BuiltInTerminal />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgentMonitoringButton;
