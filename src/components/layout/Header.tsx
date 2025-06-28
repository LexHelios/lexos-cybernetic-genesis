
import React from 'react';

const Header = () => {
  return (
    <header className="border-b border-primary/20 bg-card/50 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center glow-effect">
              <span className="text-primary-foreground font-orbitron font-bold text-sm">LEX</span>
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
            <div className="w-2 h-2 bg-accent rounded-full neural-pulse"></div>
            <span className="text-sm font-medium">H100 ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
