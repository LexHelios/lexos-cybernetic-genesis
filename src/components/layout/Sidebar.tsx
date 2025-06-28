
import React from 'react';
import { NavLink } from 'react-router-dom';

const navigationItems = [
  { name: 'Command Center', path: '/', image: '/lovable-uploads/f34b40bc-f65b-4b1c-a136-90a9c414dbba.png' },
  { name: 'Neural Agents', path: '/agents', image: '/lovable-uploads/29134d57-1699-4fbb-8ef6-187f4c30655e.png' },
  { name: 'Knowledge Graph', path: '/knowledge', image: '/lovable-uploads/af8c7339-edc2-45c1-a12a-3b489ce8310e.png' },
  { name: 'Task Pipeline', path: '/tasks', image: '/lovable-uploads/406c0f98-a1f5-49e1-aa85-6682103bbaa4.png' },
  { name: 'System Monitor', path: '/monitor', image: '/lovable-uploads/f34b40bc-f65b-4b1c-a136-90a9c414dbba.png' },
  { name: 'Model Arsenal', path: '/models', image: '/lovable-uploads/424c81e2-4884-45aa-aab9-3e53ccbcc153.png' },
  { name: 'Communications', path: '/comms', image: '/lovable-uploads/10e48b1e-8455-4335-b2ab-33b7e1ad1f20.png' },
  { name: 'Security Hub', path: '/security', image: '/lovable-uploads/77669bfc-4788-4f74-88fe-619924ecac22.png' },
  { name: 'Analytics', path: '/analytics', image: '/lovable-uploads/f34b40bc-f65b-4b1c-a136-90a9c414dbba.png' },
  { name: 'Configuration', path: '/config', image: '/lovable-uploads/424c81e2-4884-45aa-aab9-3e53ccbcc153.png' }
];

const Sidebar = () => {
  return (
    <aside className="w-64 border-r border-primary/20 bg-card/30 backdrop-blur-md">
      <div className="p-4">
        <h2 className="text-sm font-orbitron font-bold text-primary mb-4">SYSTEM NAVIGATION</h2>
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/20 border border-primary/30 text-primary glow-effect'
                    : 'hover:bg-primary/10 border border-transparent text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-primary/30 bg-black/50">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                />
              </div>
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-4 left-4 right-4">
        <div className="holographic-panel p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-2">SYSTEM STATUS</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">GPU Utilization</span>
              <span className="text-sm text-matrix-green">87%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Agents</span>
              <span className="text-sm text-cyber-pink">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Tasks Running</span>
              <span className="text-sm text-electric-blue">8</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
