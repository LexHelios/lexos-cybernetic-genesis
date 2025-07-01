import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  Settings, 
  Users,
  MessageSquare,
  ChevronRight,
  Zap
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'System Overview'
    },
    {
      name: 'Chat',
      href: '/chat',
      icon: MessageSquare,
      description: 'AI Communication'
    },
    {
      name: 'Agents',
      href: '/agents',
      icon: Bot,
      description: 'Agent Management'
    },
    {
      name: 'Agent Management',
      href: '/agent-management',
      icon: Users,
      description: 'Advanced Controls'
    },
    {
      name: 'Configuration',
      href: '/configuration',
      icon: Settings,
      description: 'System Settings'
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 min-h-screen bg-gradient-to-b from-slate-900/95 to-purple-900/95 backdrop-blur-lg border-r border-primary/20">
      <div className="p-6">
        {/* Logo Section */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary/50 bg-black/80">
            <img 
              src="/lovable-uploads/29134d57-1699-4fbb-8ef6-187f4c30655e.png" 
              alt="LexOS"
              className="w-full h-full object-cover opacity-90"
            />
          </div>
          <div>
            <h1 className="text-xl font-orbitron font-bold text-primary">LexOS</h1>
            <p className="text-xs text-primary/60">Genesis Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 group ${
                  active
                    ? 'bg-primary/20 border border-primary/30 text-primary shadow-lg glow-effect'
                    : 'hover:bg-primary/10 hover:border hover:border-primary/20 text-muted-foreground hover:text-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <p className="text-xs opacity-70">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${active ? 'rotate-90 text-primary' : 'group-hover:translate-x-1'}`} />
              </NavLink>
            );
          })}
        </nav>

        {/* System Status */}
        <div className="mt-8 p-4 rounded-lg bg-black/30 border border-primary/20">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">System Active</span>
          </div>
          <p className="text-xs text-muted-foreground">
            All agents operational
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
