import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const LoginForm = () => {
  const { login, loading } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  // Test backend connection on component mount
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          setConnectionStatus('connected');
          console.log('LoginForm: Backend connection successful');
        } else {
          setConnectionStatus('disconnected');
          console.error('LoginForm: Backend health check failed:', response.status);
        }
      } catch (error) {
        setConnectionStatus('disconnected');
        console.error('LoginForm: Backend connection failed:', error);
      }
    };
    
    testConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    console.log('LoginForm: Starting login attempt...', { username });
    setIsSubmitting(true);
    
    try {
      const result = await login({ username, password });
      console.log('LoginForm: Login result:', result);
      
      if (!result.success) {
        toast({
          title: "Login Failed",
          description: result.error || "Invalid credentials",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Login successful! Redirecting...",
        });
      }
    } catch (error) {
      console.error('LoginForm: Login error:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to server. Please check if the backend is running.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0a0a0a' }}>
      <div 
        className="fixed inset-0 opacity-10"
        style={{
          backgroundImage: `url('/lovable-uploads/af8c7339-edc2-45c1-a12a-3b489ce8310e.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'none' // Temporarily hide background image
        }}
      />
      
      <Card className="w-full max-w-md holographic-panel border-primary/30 relative z-10 mx-4">
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
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 text-base touch-manipulation"
              disabled={loading || isSubmitting}
              style={{ minHeight: '48px' }} // Ensure minimum touch target size
            >
              {(loading || isSubmitting) ? 'Authenticating...' : 'Access NEXUS'}
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-muted/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <p className="text-xs text-muted-foreground">
                Backend: {
                  connectionStatus === 'connected' ? 'Connected' :
                  connectionStatus === 'disconnected' ? 'Disconnected' : 'Checking...'
                }
              </p>
            </div>
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
