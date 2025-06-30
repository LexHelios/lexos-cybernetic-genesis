import React, { useEffect, useState } from 'react';
import { Search, Filter, Download, RefreshCw, AlertTriangle, Shield, Lock, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { securityService, SecurityLog } from '../../services/security';
import { useToast } from '../../hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const SecurityLogs: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    limit: 100
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityLogs();
  }, [filters]);

  const loadSecurityLogs = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: filters.limit
      };
      
      if (filters.type) {
        params.type = filters.type;
      }
      
      const { logs } = await securityService.getSecurityLogs(params);
      setLogs(logs);
    } catch (error) {
      console.error('Failed to load security logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'successful_login':
      case 'failed_login':
      case 'account_locked':
        return <Lock className="w-4 h-4" />;
      case 'suspicious_activity':
      case 'brute_force':
      case 'security_incident':
        return <AlertTriangle className="w-4 h-4" />;
      case 'blocked_login_attempt':
      case 'ip_blocked':
      case 'ip_unblocked':
        return <Shield className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'successful_login':
        return 'text-green-500';
      case 'failed_login':
      case 'account_locked':
        return 'text-yellow-500';
      case 'suspicious_activity':
      case 'brute_force':
      case 'security_incident':
      case 'blocked_login_attempt':
      case 'ip_blocked':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getEventBadgeVariant = (type: string): any => {
    switch (type) {
      case 'successful_login':
        return 'outline';
      case 'failed_login':
      case 'account_locked':
        return 'secondary';
      case 'suspicious_activity':
      case 'brute_force':
      case 'security_incident':
      case 'blocked_login_attempt':
      case 'ip_blocked':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const formatEventType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredLogs = logs.filter(log => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      log.event_type.toLowerCase().includes(searchLower) ||
      log.username?.toLowerCase().includes(searchLower) ||
      log.ip_address?.toLowerCase().includes(searchLower) ||
      log.user_id?.toString().includes(searchLower)
    );
  });

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'User', 'IP', 'Details'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.event_type,
        log.username || log.user_id || '-',
        log.ip_address || '-',
        JSON.stringify(log).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-logs-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-warning-orange/30 bg-warning-orange/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Security Logs</CardTitle>
            <CardDescription>Monitor and analyze security events</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSecurityLogs}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({ ...filters, type: value })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All event types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All event types</SelectItem>
                <SelectItem value="successful_login">Successful Login</SelectItem>
                <SelectItem value="failed_login">Failed Login</SelectItem>
                <SelectItem value="account_locked">Account Locked</SelectItem>
                <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                <SelectItem value="brute_force">Brute Force</SelectItem>
                <SelectItem value="security_incident">Security Incident</SelectItem>
                <SelectItem value="blocked_login_attempt">Blocked Login</SelectItem>
                <SelectItem value="ip_blocked">IP Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.limit.toString()}
              onValueChange={(value) => setFilters({ ...filters, limit: parseInt(value) })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 logs</SelectItem>
                <SelectItem value="100">100 logs</SelectItem>
                <SelectItem value="200">200 logs</SelectItem>
                <SelectItem value="500">500 logs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          <ScrollArea className="h-[500px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[200px]">Event Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading security logs...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No security logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        <div>
                          <div>{new Date(log.timestamp).toLocaleString()}</div>
                          <div className="text-muted-foreground">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className={getEventColor(log.event_type)}>
                            {getEventIcon(log.event_type)}
                          </span>
                          <Badge variant={getEventBadgeVariant(log.event_type)}>
                            {formatEventType(log.event_type)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.username || log.user_id || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.message || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Summary */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {filteredLogs.length} of {logs.length} logs</span>
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span>Success</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span>Warning</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span>Critical</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityLogs;
