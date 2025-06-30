import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Shield,
  Activity,
  Cpu,
  HardDrive,
  Network,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Progress } from '../ui/progress';
import { useToast } from '../ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
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
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

interface AlertStats {
  total: number;
  active: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export default function SystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(true);
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    active: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAlerts();
    
    // Set up WebSocket listener for real-time alerts
    const ws = new WebSocket(`ws://localhost:3001`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'system:alert') {
        setAlerts(prev => [data.data, ...prev]);
        updateStats([data.data, ...alerts]);
        
        // Show toast for critical alerts
        if (data.data.severity === 'critical') {
          toast({
            title: 'Critical System Alert',
            description: data.data.title,
            variant: 'destructive',
          });
        }
      } else if (data.type === 'system:alert_acknowledged') {
        setAlerts(prev => 
          prev.map(alert => 
            alert.id === data.data.alertId 
              ? { ...alert, acknowledged: true, acknowledgedBy: data.data.userId }
              : alert
          )
        );
      } else if (data.type === 'system:alert_resolved') {
        setAlerts(prev => 
          prev.map(alert => 
            alert.id === data.data.alertId 
              ? { ...alert, active: false, resolvedAt: new Date().toISOString() }
              : alert
          )
        );
        updateStats(alerts);
      }
    };

    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/alerts?activeOnly=${activeOnlyFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setAlerts(data.alerts);
      updateStats(data.alerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (alertsList: SystemAlert[]) => {
    const stats: AlertStats = {
      total: alertsList.length,
      active: alertsList.filter(a => a.active).length,
      critical: alertsList.filter(a => a.severity === 'critical' && a.active).length,
      high: alertsList.filter(a => a.severity === 'high' && a.active).length,
      medium: alertsList.filter(a => a.severity === 'medium' && a.active).length,
      low: alertsList.filter(a => a.severity === 'low' && a.active).length,
    };
    setStats(stats);
  };

  const acknowledgeAlert = async (alertId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledgedBy: user?.user_id }
            : alert
        )
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive',
      });
    }
  };

  const resolveAlert = async (alertId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, active: false, resolvedAt: new Date().toISOString() }
            : alert
        )
      );
      updateStats(alerts);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve alert',
        variant: 'destructive',
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getComponentIcon = (component?: string) => {
    switch (component) {
      case 'security':
        return <Shield className="w-4 h-4" />;
      case 'performance':
        return <Activity className="w-4 h-4" />;
      case 'cpu':
        return <Cpu className="w-4 h-4" />;
      case 'storage':
        return <HardDrive className="w-4 h-4" />;
      case 'network':
        return <Network className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (activeOnlyFilter && !alert.active) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <Progress value={(stats.active / Math.max(stats.total, 1)) * 100} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Immediate attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              High
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <p className="text-xs text-muted-foreground">Action required</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Medium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            <p className="text-xs text-muted-foreground">Monitor closely</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Monitor and manage system-wide alerts</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveOnlyFilter(!activeOnlyFilter);
                  fetchAlerts();
                }}
              >
                {activeOnlyFilter ? 'Show All' : 'Active Only'}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={fetchAlerts}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No alerts found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.active ? 'border-l-4' : ''
                    } ${
                      alert.severity === 'critical' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' :
                      alert.severity === 'high' ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20' :
                      alert.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                      'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            {alert.component && (
                              <Badge variant="outline" className="text-xs">
                                {getComponentIcon(alert.component)}
                                <span className="ml-1">{alert.component}</span>
                              </Badge>
                            )}
                            {!alert.active && (
                              <Badge variant="secondary" className="text-xs">
                                Resolved
                              </Badge>
                            )}
                            {alert.acknowledged && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Acknowledged
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            {alert.resolvedAt && (
                              <span> • Resolved {formatDistanceToNow(new Date(alert.resolvedAt), { addSuffix: true })}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {alert.active && (
                        <div className="flex items-center space-x-2">
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {user?.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveAlert(alert.id)}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
