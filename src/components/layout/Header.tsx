
import React from 'react';
import { Bot, Zap } from 'lucide-react';

const Header = () => {
  return (
    <header className="border-b border-primary/20 bg-card/50 backdrop-blur-md relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
      
      <div className="relative flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-primary/50 bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-orbitron font-bold matrix-text">LexOS</h1>
              <p className="text-xs text-muted-foreground">Autonomous ASI Infrastructure</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 bg-matrix-green rounded-full neural-pulse"></div>
            <span className="text-sm font-medium">PHASE 3 ACTIVE</span>
          </div>
          
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
            <Zap className="w-3 h-3 text-accent" />
            <span className="text-sm font-medium">H100 ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
