
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className }) => {
  const [isHealthy, setIsHealthy] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  useEffect(() => {
    const handleConnectionChange = (event: CustomEvent) => {
      const { isHealthy: healthy, timestamp } = event.detail;
      setIsHealthy(healthy);
      setLastUpdate(timestamp);
      
      if (!healthy) {
        setIsRecovering(true);
        // Reset recovering state after 30 seconds
        setTimeout(() => setIsRecovering(false), 30000);
      } else {
        setIsRecovering(false);
      }
    };

    window.addEventListener('connectionStatusChanged', handleConnectionChange as EventListener);
    
    return () => {
      window.removeEventListener('connectionStatusChanged', handleConnectionChange as EventListener);
    };
  }, []);

  const getStatusIcon = () => {
    if (isRecovering) {
      return <RefreshCw className="w-3 h-3 animate-spin" />;
    }
    return isHealthy ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (isRecovering) return 'Recovering';
    return isHealthy ? 'Online' : 'Offline';
  };

  const getStatusVariant = () => {
    if (isRecovering) return 'secondary';
    return isHealthy ? 'default' : 'destructive';
  };

  return (
    <div className={className}>
      <Badge variant={getStatusVariant()} className="flex items-center gap-1">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
    </div>
  );
};

export default ConnectionStatus;
