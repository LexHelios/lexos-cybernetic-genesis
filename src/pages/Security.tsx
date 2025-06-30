
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Eye,
  EyeOff,
  Search,
  Filter,
  Activity,
  Users,
  Key,
  FileX,
  Ban,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

// Mock security data
const securityMetrics = {
  threatLevel: 'low',
  activeSessions: 3,
  blockedAttempts: 127,
  contentBlocks: 15,
  accessDenials: 2,
  lastScan: '2025-01-02T10:15:00Z'
};

const securityLogs = [
  {
    id: 'log-001',
    timestamp: '2025-01-02T10:30:00Z',
    type: 'authentication',
    severity: 'info',
    event: 'Successful login',
    user: 'admin',
    ip: '192.168.1.100',
    details: 'User authenticated successfully via password'
  },
  {
    id: 'log-002',
    timestamp: '2025-01-02T10:25:00Z',
    type: 'content_filter',
    severity: 'warning',
    event: 'Content blocked',
    user: 'system',
    ip: '10.0.0.1',
    details: 'Potentially harmful content detected and blocked'
  },
  {
    id: 'log-003',
    timestamp: '2025-01-02T10:20:00Z',
    type: 'access_control',
    severity: 'error',
    event: 'Access denied',
    user: 'guest_user',
    ip: '203.0.113.1',
    details: 'Insufficient permissions to access restricted resource'
  },
  {
    id: 'log-004',
    timestamp: '2025-01-02T10:15:00Z',
    type: 'system',
    severity: 'info',
    event: 'Security scan completed',
    user: 'system',
    ip: 'localhost',
    details: 'Automated security audit completed successfully'
  }
];

const activeSessions = [
  {
    id: 'session-001',
    user: 'admin',
    ip: '192.168.1.100',
    location: 'Local Network',
    browser: 'Chrome 120.0',
    started: '2025-01-02T08:00:00Z',
    lastActivity: '2025-01-02T10:30:00Z',
    status: 'active'
  },
  {
    id: 'session-002',
    user: 'operator',
    ip: '10.0.0.50',
    location: 'Internal Network',
    browser: 'Firefox 121.0',
    started: '2025-01-02T09:15:00Z',
    lastActivity: '2025-01-02T10:25:00Z',
    status: 'active'
  },
  {
    id: 'session-003',
    user: 'admin',
    ip: '192.168.1.101',
    location: 'Local Network',
    browser: 'Safari 17.1',
    started: '2025-01-02T07:30:00Z',
    lastActivity: '2025-01-02T09:45:00Z',
    status: 'idle'
  }
];

const Security = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'info': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400 border-red-400';
      case 'medium': return 'text-yellow-400 border-yellow-400';
      case 'low': return 'text-green-400 border-green-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'authentication': return <Key className="w-4 h-4" />;
      case 'content_filter': return <FileX className="w-4 h-4" />;
      case 'access_control': return <Ban className="w-4 h-4" />;
      case 'system': return <Activity className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const filteredLogs = securityLogs.filter(log =>
    log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Security Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage system security protocols
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Run Scan
          </Button>
          <Button className="neural-button">
            <Shield className="w-4 h-4 mr-2" />
            Security Settings
          </Button>
        </div>
      </div>

      {/* Security Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Security Logs</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Security Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="holographic-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
                  <Shield className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline" className={getThreatLevelColor(securityMetrics.threatLevel)}>
                    {securityMetrics.threatLevel.toUpperCase()}
                  </Badge>
                  <div className="text-2xl font-orbitron font-bold text-primary">
                    Secured
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All systems operational
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="holographic-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-orbitron font-bold text-primary">
                  {securityMetrics.activeSessions}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current user sessions
                </p>
              </CardContent>
            </Card>

            <Card className="holographic-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Blocked Attempts</CardTitle>
                  <Ban className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-orbitron font-bold text-red-400">
                  {securityMetrics.blockedAttempts}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total blocked this week
                </p>
              </CardContent>
            </Card>

            <Card className="holographic-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Content Blocks</CardTitle>
                  <FileX className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-orbitron font-bold text-yellow-400">
                  {securityMetrics.contentBlocks}
                </div>
                <p className="text-xs text-muted-foreground">
                  Content filter activations
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Security Status */}
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">System Security Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Firewall Protection
                    </span>
                    <Badge variant="outline" className="text-green-400 border-green-400">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Access Control
                    </span>
                    <Badge variant="outline" className="text-green-400 border-green-400">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Content Filtering
                    </span>
                    <Badge variant="outline" className="text-green-400 border-green-400">Active</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Encryption
                    </span>
                    <Badge variant="outline" className="text-green-400 border-green-400">AES-256</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Authentication
                    </span>
                    <Badge variant="outline" className="text-green-400 border-green-400">Multi-Factor</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      Last Security Scan
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(securityMetrics.lastScan).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 neural-input"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="holographic-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getEventIcon(log.type)}
                      <div>
                        <div className="font-medium">{log.event}</div>
                        <div className="text-sm text-muted-foreground">
                          {log.details}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getSeverityColor(log.severity)}>
                        {log.severity.toUpperCase()}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>User: {log.user}</span>
                    <span>IP: {log.ip}</span>
                    <span>Type: {log.type.replace('_', ' ')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <Card key={session.id} className="holographic-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {session.user}
                          <Badge variant="outline" className={
                            session.status === 'active' 
                              ? 'text-green-400 border-green-400' 
                              : 'text-yellow-400 border-yellow-400'
                          }>
                            {session.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.location} • {session.browser}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        Terminate
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span>IP: {session.ip}</span>
                    <span>Started: {new Date(session.started).toLocaleString()}</span>
                    <span>Last Activity: {new Date(session.lastActivity).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">Security Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-orbitron font-bold text-primary">Authentication Policies</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Password Complexity</span>
                      <Badge variant="outline" className="text-green-400 border-green-400">Enforced</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Session Timeout</span>
                      <span className="text-sm text-muted-foreground">24 hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Max Login Attempts</span>
                      <span className="text-sm text-muted-foreground">3</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-orbitron font-bold text-primary">Access Control</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Role-Based Access</span>
                      <Badge variant="outline" className="text-green-400 border-green-400">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>API Rate Limiting</span>
                      <Badge variant="outline" className="text-green-400 border-green-400">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>IP Whitelisting</span>
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">Partial</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Security;
