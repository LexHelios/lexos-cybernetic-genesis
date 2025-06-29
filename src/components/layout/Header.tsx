import React from 'react';
import { Bot, Zap, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationCenter from '@/components/communications/NotificationCenter';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

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
              <Bot className="w-5 h-5 text-primary opacity-80" />
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

          {/* Notification Center */}
          {user && <NotificationCenter />}

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png" alt={user.username} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;