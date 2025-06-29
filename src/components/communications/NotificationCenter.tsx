import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, AlertCircle, Info, AlertTriangle, Filter, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '../ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useToast } from '../ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface Notification {
  id: number;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  notificationTypes: string[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
    notificationTypes: [],
  });
  const [filterType, setFilterType] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    fetchNotificationCount();
    fetchPreferences();

    // Set up WebSocket listener for real-time notifications
    const ws = new WebSocket(`ws://localhost:3001`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification:new') {
        setNotifications(prev => [data.data, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        toast({
          title: data.data.title,
          description: data.data.message,
        });
      } else if (data.type === 'notification:read') {
        setNotifications(prev => 
          prev.map(n => n.id === data.data.notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notifications/count', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const dismissNotification = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (!notifications.find(n => n.id === notificationId)?.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });
      
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved.',
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences.',
        variant: 'destructive',
      });
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (type === 'warning') {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  const filteredNotifications = filterType
    ? notifications.filter(n => n.type === filterType)
    : notifications;

  const notificationTypes = [...new Set(notifications.map(n => n.type))];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filterType === null}
                    onCheckedChange={() => setFilterType(null)}
                  >
                    All notifications
                  </DropdownMenuCheckboxItem>
                  {notificationTypes.map(type => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={filterType === type}
                      onCheckedChange={() => setFilterType(type)}
                    >
                      {type.replace('_', ' ').charAt(0).toUpperCase() + type.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Notification Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-notifications">Email notifications</Label>
                      <Switch
                        id="email-notifications"
                        checked={preferences.emailEnabled}
                        onCheckedChange={(checked) => 
                          updatePreferences({ emailEnabled: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-notifications">Push notifications</Label>
                      <Switch
                        id="push-notifications"
                        checked={preferences.pushEnabled}
                        onCheckedChange={(checked) => 
                          updatePreferences({ pushEnabled: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="in-app-notifications">In-app notifications</Label>
                      <Switch
                        id="in-app-notifications"
                        checked={preferences.inAppEnabled}
                        onCheckedChange={(checked) => 
                          updatePreferences({ inAppEnabled: checked })
                        }
                      />
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetTitle>
          <SheetDescription>
            {unreadCount > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={markAllAsRead}
                className="p-0 h-auto"
              >
                Mark all as read
              </Button>
            )}
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="all" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">
              All ({filteredNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({filteredNotifications.filter(n => !n.read).length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        notification.read 
                          ? 'bg-background' 
                          : 'bg-muted/50 border-primary/20'
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getNotificationIcon(notification.type, notification.priority)}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notification.id);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="unread" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {filteredNotifications.filter(n => !n.read).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No unread notifications
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.filter(n => !n.read).map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 rounded-lg border bg-muted/50 border-primary/20 transition-colors cursor-pointer"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getNotificationIcon(notification.type, notification.priority)}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notification.id);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}