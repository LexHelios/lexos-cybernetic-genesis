
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSystemMonitor } from '../../hooks/useSystemMonitor';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  Bot, 
  Network, 
  ListTodo, 
  Monitor, 
  Cpu, 
  MessageSquare, 
  Shield, 
  BarChart3, 
  Settings 
} from 'lucide-react';

const navigationItems = [
  { name: 'Command Center', path: '/', icon: LayoutDashboard },
  { name: 'Neural Agents', path: '/agents', icon: Bot },
  { name: 'Knowledge Graph', path: '/knowledge', icon: Network },
  { name: 'Task Pipeline', path: '/tasks', icon: ListTodo },
  { name: 'System Monitor', path: '/monitor', icon: Monitor },
  { name: 'Model Arsenal', path: '/models', icon: Cpu },
  { name: 'Communications', path: '/comms', icon: MessageSquare },
  { name: 'Security Hub', path: '/security', icon: Shield },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Configuration', path: '/config', icon: Settings }
];

const Sidebar = () => {
  const { systemStatus } = useSystemMonitor();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 border-r border-primary/20 bg-card/30 backdrop-blur-md flex flex-col">
      <div className="p-4 flex-1">
        <div className="mb-4">
          <h2 className="text-sm font-orbitron font-bold text-primary mb-2">NEXUS NAVIGATION</h2>
          <div className="text-xs text-muted-foreground">
            User: {user?.full_name} ({user?.role})
          </div>
        </div>
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-primary/30 bg-black/50">
                <item.icon className="w-4 h-4 opacity-80 hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="holographic-panel p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-2">SYSTEM STATUS</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">GPU Utilization</span>
              <span className="text-sm text-matrix-green">
                {systemStatus?.hardware.gpu.utilization.toFixed(1) || '--'}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Agents</span>
              <span className="text-sm text-cyber-pink">
                {systemStatus?.orchestrator.active_agents || '--'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Tasks</span>
              <span className="text-sm text-electric-blue">
                {systemStatus?.orchestrator.active_tasks || '--'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Temperature</span>
              <span className="text-sm text-warning-orange">
                {systemStatus?.hardware.gpu.temperature || '--'}°C
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
