
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  X,
  RefreshCw,
  Filter
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SystemAlert {
  id: number;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  component?: string;
  data?: any;
  active: boolean;
  acknowledged: boolean;
  acknowledgedBy?: number;
  acknowledgedAt?: string;
  createdAt: string;
  resolvedAt?: string;
}

const SystemAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged'>('all');

  const mockAlerts: SystemAlert[] = [
    {
      id: 1,
      alertType: 'SYSTEM_OVERLOAD',
      severity: 'high',
      title: 'High CPU Usage Detected',
      message: 'CPU usage has exceeded 90% for the past 5 minutes on GPU server cluster',
      component: 'gpu-cluster-1',
      active: true,
      acknowledged: false,
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: 2,
      alertType: 'AGENT_FAILURE',
      severity: 'critical',
      title: 'Agent Communication Lost',
      message: 'Lost connection to R1-Unrestricted agent. Last heartbeat: 2 minutes ago',
      component: 'r1-agent',
      active: true,
      acknowledged: false,
      createdAt: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: 3,
      alertType: 'SECURITY_BREACH',
      severity: 'medium',
      title: 'Multiple Failed Login Attempts',
      message: '15 failed login attempts detected from IP 192.168.1.100',
      component: 'auth-service',
      active: true,
      acknowledged: true,
      acknowledgedBy: 1,
      acknowledgedAt: new Date(Date.now() - 60000).toISOString(),
      createdAt: new Date(Date.now() - 900000).toISOString(),
    }
  ];

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API when ready
      setTimeout(() => {
        setAlerts(mockAlerts);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: number) => {
    if (!user) return;
    
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              acknowledged: true, 
              acknowledgedBy: user.user_id,
              acknowledgedAt: new Date().toISOString() 
            }
          : alert
      )
    );
  };

  const resolveAlert = async (alertId: number) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              active: false,
              resolvedAt: new Date().toISOString() 
            }
          : alert
      )
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Info className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'active':
        return alert.active && !alert.acknowledged;
      case 'acknowledged':
        return alert.acknowledged;
      default:
        return true;
    }
  });

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <span>System Alerts</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
            >
              All
            </Button>
            <Button
              onClick={() => setFilter('active')}
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
            >
              Active
            </Button>
            <Button
              onClick={() => setFilter('acknowledged')}
              variant={filter === 'acknowledged' ? 'default' : 'outline'}
              size="sm"
            >
              Acknowledged
            </Button>
            <Button onClick={fetchAlerts} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No alerts to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.active && !alert.acknowledged
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          {getSeverityBadge(alert.severity)}
                          {alert.component && (
                            <Badge variant="outline">{alert.component}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{new Date(alert.createdAt).toLocaleString()}</span>
                          {alert.acknowledged && (
                            <span>Acknowledged {alert.acknowledgedAt && new Date(alert.acknowledgedAt).toLocaleString()}</span>
                          )}
                          {alert.resolvedAt && (
                            <span>Resolved {new Date(alert.resolvedAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.active && !alert.acknowledged && (
                        <Button
                          onClick={() => acknowledgeAlert(alert.id)}
                          variant="outline"
                          size="sm"
                        >
                          Acknowledge
                        </Button>
                      )}
                      {alert.active && (
                        <Button
                          onClick={() => resolveAlert(alert.id)}
                          variant="outline"
                          size="sm"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SystemAlerts;
