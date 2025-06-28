
import React from 'react';

const Header = () => {
  return (
    <header className="border-b border-primary/20 bg-card/50 backdrop-blur-md relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url('/lovable-uploads/af8c7339-edc2-45c1-a12a-3b489ce8310e.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)'
        }}
      />
      
      <div className="relative flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-primary/50 bg-black/80">
              <img 
                src="/lovable-uploads/29134d57-1699-4fbb-8ef6-187f4c30655e.png" 
                alt="LEX"
                className="w-full h-full object-cover opacity-90"
              />
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
