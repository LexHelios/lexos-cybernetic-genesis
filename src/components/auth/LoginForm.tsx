import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const LoginForm = () => {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
      <div 
        className="fixed inset-0 opacity-10"
        style={{
          backgroundImage: `url('/lovable-uploads/af8c7339-edc2-45c1-a12a-3b489ce8310e.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'none' // Temporarily hide background image
        }}
      />
      
      <Card className="w-full max-w-md holographic-panel border-primary/30 relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/50 bg-black/80">
              <img 
                src="/lovable-uploads/29134d57-1699-4fbb-8ef6-187f4c30655e.png" 
                alt="NEXUS"
                className="w-full h-full object-cover opacity-90"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-orbitron font-bold text-primary">
            NEXUS Access Portal
          </CardTitle>
          <p className="text-muted-foreground">
            Authenticate to access the H100 neural command center
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background/50 border-primary/30 focus:border-primary"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 border-primary/30 focus:border-primary"
                placeholder="Enter password"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Access NEXUS'}
            </Button>
          </form>
          
          <div className="mt-6 p-3 bg-muted/10 rounded-lg border border-primary/20">
            <p className="text-xs text-muted-foreground text-center">
              Default credentials: admin / Admin123!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
