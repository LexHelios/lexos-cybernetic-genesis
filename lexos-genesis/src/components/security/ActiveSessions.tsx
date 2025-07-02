import React, { useEffect, useState } from 'react';
import { Users, Clock, Globe, Monitor, LogOut, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { securityService, SessionInfo } from '../../services/security';
import { useToast } from '../../hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

// Mock session type for display
interface DisplaySession {
  id: string;
  username: string;
  role: string;
  ip: string;
  createdAt: string;
  lastActivity: number;
}

const ActiveSessions: React.FC = () => {
  const [sessions, setSessions] = useState<DisplaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<DisplaySession | null>(null);
  const [sessionActivity, setSessionActivity] = useState<any[]>([]);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const sessions = await securityService.getActiveSessions();
      // Transform SessionInfo to DisplaySession
      const displaySessions: DisplaySession[] = sessions.map(session => ({
        id: session.session_id,
        username: `User ${session.user_id}`,
        role: 'user',
        ip: session.ip_address,
        createdAt: session.created_at,
        lastActivity: new Date(session.last_activity).getTime()
      }));
      setSessions(displaySessions);
    } catch (error) {
      console.error('Failed to load active sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load active sessions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionActivity = async (sessionId: string) => {
    try {
      const { activity } = await securityService.getSessionActivity(sessionId);
      setSessionActivity(activity);
    } catch (error) {
      console.error('Failed to load session activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session activity',
        variant: 'destructive'
      });
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      await securityService.endSession(sessionId);
      toast({
        title: 'Success',
        description: 'Session terminated successfully'
      });
      loadSessions();
    } catch (error) {
      console.error('Failed to terminate session:', error);
      toast({
        title: 'Error',
        description: 'Failed to terminate session',
        variant: 'destructive'
      });
    }
  };

  const getRoleBadgeVariant = (role: string): any => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'operator':
        return 'default';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSessionStatus = (session: DisplaySession) => {
    const now = Date.now();
    const timeSinceActivity = now - session.lastActivity;
    
    if (timeSinceActivity < 60000) { // Less than 1 minute
      return { status: 'Active', color: 'text-green-500' };
    } else if (timeSinceActivity < 300000) { // Less than 5 minutes
      return { status: 'Idle', color: 'text-yellow-500' };
    } else {
      return { status: 'Inactive', color: 'text-gray-500' };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-matrix-green/30 bg-matrix-green/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Monitor and manage user sessions</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-matrix-green">
                {sessions.length} Active
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                No active sessions found.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const { status, color } = getSessionStatus(session);
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                          <span>{session.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(session.role)}>
                          {session.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span>{session.ip}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(session.createdAt).toLocaleString()}</div>
                          <div className="text-muted-foreground">
                            {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(session.lastActivity).toLocaleTimeString()}</div>
                          <div className="text-muted-foreground">
                            {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-green-500' : status === 'Idle' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                          <span className={`text-sm ${color}`}>{status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSession(session);
                              loadSessionActivity(session.id);
                              setShowActivityDialog(true);
                            }}
                          >
                            <Activity className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => terminateSession(session.id)}
                          >
                            <LogOut className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {sessions.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Active</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>Idle</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span>Inactive</span>
                </span>
              </div>
              <div>
                <Clock className="w-4 h-4 inline mr-1" />
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Activity</DialogTitle>
            <DialogDescription>
              {selectedSession && `Activity log for ${selectedSession.username} (${selectedSession.role})`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] rounded-md border p-4">
            {sessionActivity.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No activity recorded for this session
              </div>
            ) : (
              <div className="space-y-2">
                {sessionActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <div className="text-muted-foreground font-mono min-w-[100px]">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.type}</div>
                      {activity.resource && (
                        <div className="text-muted-foreground">
                          Resource: {activity.resource}
                          {activity.action && ` - Action: ${activity.action}`}
                          {activity.result && ` - Result: ${activity.result}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)}>
              Close
            </Button>
            {selectedSession && (
              <Button
                variant="destructive"
                onClick={() => {
                  terminateSession(selectedSession.id);
                  setShowActivityDialog(false);
                }}
              >
                Terminate Session
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActiveSessions;
