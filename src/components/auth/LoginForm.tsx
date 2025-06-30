
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const LoginForm = () => {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <Card className="w-full max-w-md holographic-panel border-primary/30 relative z-10 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-primary/50 bg-black/80 relative">
              <img 
                src="/lovable-uploads/29134d57-1699-4fbb-8ef6-187f4c30655e.png" 
                alt="NEXUS"
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
            </div>
          </div>
          <CardTitle className="text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            NEXUS GENESIS
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Neural Enhanced eXecution & Understanding System
          </p>
          <p className="text-cyan-300/80 text-sm font-rajdhani tracking-wider">
            Access the H100 neural command center
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="neural-input border-primary/30 focus:border-primary bg-background/50 backdrop-blur-sm"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neural-input border-primary/30 focus:border-primary bg-background/50 backdrop-blur-sm"
                placeholder="Enter password"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full neural-button bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-medium font-orbitron tracking-wider"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-current rounded-sm"></div>
                  Initialize NEXUS
                </div>
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20 backdrop-blur-sm">
            <div className="text-center space-y-2">
              <p className="text-xs text-primary font-orbitron font-bold tracking-wider">
                DEFAULT ACCESS CREDENTIALS
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="text-center">
                  <div className="text-muted-foreground">Username:</div>
                  <div className="font-mono text-cyan-300">admin</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">Password:</div>
                  <div className="font-mono text-cyan-300">Admin123!</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Powered by H100 GPU Cluster • Secure Neural Architecture
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
