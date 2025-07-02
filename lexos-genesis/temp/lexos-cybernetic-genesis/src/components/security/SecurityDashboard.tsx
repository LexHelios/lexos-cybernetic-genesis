import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Lock, Eye, ShieldCheck, ShieldAlert, Activity, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { securityService, SecurityMetrics } from '../../services/security';
import MetricCard from '../dashboard/MetricCard';
import { useToast } from '../../hooks/use-toast';

const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityMetrics();
    const interval = setInterval(loadSecurityMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityMetrics = async () => {
    try {
      const data = await securityService.getSecurityMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load security metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security metrics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'MINIMAL': return 'text-green-500';
      case 'LOW': return 'text-blue-500';
      case 'MEDIUM': return 'text-yellow-500';
      case 'HIGH': return 'text-orange-500';
      case 'CRITICAL': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getThreatLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'MINIMAL': return 'outline';
      case 'LOW': return 'secondary';
      case 'MEDIUM': return 'default';
      case 'HIGH': return 'destructive';
      case 'CRITICAL': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted" />
              <CardContent className="h-24 bg-muted mt-2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Threat Level"
          value={metrics.threatLevel}
          subtitle="Current threat assessment"
          color="warning"
          trend="stable"
          animate={true}
          backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
        />
        <MetricCard
          title="Security Score"
          value={`${metrics.securityScore.toFixed(1)}%`}
          subtitle="System security health"
          color="matrix"
          trend={metrics.securityScore > 90 ? 'up' : metrics.securityScore < 70 ? 'down' : 'stable'}
          backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
        />
        <MetricCard
          title="Blocked Attempts"
          value={metrics.last24Hours.blockedAttempts.toString()}
          subtitle="Last 24 hours"
          color="warning"
          trend={metrics.last24Hours.blockedAttempts > 0 ? 'down' : 'stable'}
          backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
        />
        <MetricCard
          title="Active Sessions"
          value={metrics.overall.activeSessions.toString()}
          subtitle="Currently active"
          color="primary"
          trend="stable"
          backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
        />
      </div>

      {/* Threat Status Card */}
      <Card className="border-warning-orange/30 bg-warning-orange/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-warning-orange" />
              <CardTitle>Threat Status</CardTitle>
            </div>
            <Badge variant={getThreatLevelBadgeVariant(metrics.threatLevel)}>
              {metrics.threatLevel}
            </Badge>
          </div>
          <CardDescription>Real-time security threat assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Security Score</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">{metrics.securityScore.toFixed(1)}%</span>
                <Progress value={metrics.securityScore} className="w-24" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs">Failed Logins</span>
                    <span className="text-xs font-medium">{metrics.last24Hours.failedLogins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Blocked Attempts</span>
                    <span className="text-xs font-medium">{metrics.last24Hours.blockedAttempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Suspicious Activities</span>
                    <span className="text-xs font-medium">{metrics.last24Hours.suspiciousActivities}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Overall Stats</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs">Blocked IPs</span>
                    <span className="text-xs font-medium">{metrics.overall.blockedIPs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Security Incidents</span>
                    <span className="text-xs font-medium">{metrics.overall.securityIncidents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Total Scans</span>
                    <span className="text-xs font-medium">{metrics.overall.totalScans}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle>Login Activity</CardTitle>
            </div>
            <CardDescription>Authentication attempts over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Successful Logins (24h)</span>
                <span className="font-semibold text-green-500">{metrics.last24Hours.successfulLogins}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Failed Logins (24h)</span>
                <span className="font-semibold text-red-500">{metrics.last24Hours.failedLogins}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Success Rate</span>
                <span className="font-semibold">
                  {metrics.last24Hours.successfulLogins + metrics.last24Hours.failedLogins > 0
                    ? `${((metrics.last24Hours.successfulLogins / (metrics.last24Hours.successfulLogins + metrics.last24Hours.failedLogins)) * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-matrix-green/30 bg-matrix-green/5">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-matrix-green" />
              <CardTitle>Session Overview</CardTitle>
            </div>
            <CardDescription>Active user sessions and access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Sessions</span>
                <span className="font-semibold">{metrics.overall.activeSessions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Events (7d)</span>
                <span className="font-semibold">{metrics.last7Days.totalEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Suspicious Activities (7d)</span>
                <span className="font-semibold text-yellow-500">{metrics.last7Days.suspiciousActivities}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityDashboard;