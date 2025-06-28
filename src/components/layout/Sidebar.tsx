
import React from 'react';
import { NavLink } from 'react-router-dom';

const navigationItems = [
  { name: 'Command Center', path: '/', icon: '🏠' },
  { name: 'Neural Agents', path: '/agents', icon: '🤖' },
  { name: 'Knowledge Graph', path: '/knowledge', icon: '🧠' },
  { name: 'Task Pipeline', path: '/tasks', icon: '⚡' },
  { name: 'System Monitor', path: '/monitor', icon: '📊' },
  { name: 'Model Arsenal', path: '/models', icon: '🔫' },
  { name: 'Communications', path: '/comms', icon: '📡' },
  { name: 'Security Hub', path: '/security', icon: '🛡️' },
  { name: 'Analytics', path: '/analytics', icon: '📈' },
  { name: 'Configuration', path: '/config', icon: '⚙️' }
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
              <span className="text-lg">{item.icon}</span>
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
