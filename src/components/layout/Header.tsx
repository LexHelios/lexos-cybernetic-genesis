
import React from 'react';
import { Bot, Zap } from 'lucide-react';

const Header = () => {
  return (
    <header className="border-b border-primary/20 bg-card/50 backdrop-blur-md relative overflow-hidden">
      {/* Background with AI agents image */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5"
        style={{
          backgroundImage: `url('/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.1
        }}
      />
      
      <div className="relative flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-primary/50 bg-primary/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Remove icon to show background image clearly */}
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
            <div 
              className="w-3 h-3 rounded overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            <span className="text-sm font-medium">H100 ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
