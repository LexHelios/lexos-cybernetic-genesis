import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  Palette, 
  Activity,
  Key,
  Mail,
  Phone,
  Globe,
  Save,
  AlertCircle,
  Check,
  Crown,
  Zap,
  Database,
  Lock,
  Mic
} from 'lucide-react';
import { apiClient } from '@/services/api';
import PasswordChangeModal from '@/components/settings/PasswordChangeModal';
import TwoFactorSetupModal from '@/components/settings/TwoFactorSetupModal';
import ApiKeyModal from '@/components/settings/ApiKeyModal';
import { VoiceSettings } from '@/components/settings/VoiceSettings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserProfile {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  role: 'admin' | 'family_member' | 'guest';
  security_level: 'ADMIN' | 'SAFE' | 'RESTRICTED';
  agent_access_level: 'FULL' | 'BASIC' | 'LIMITED';
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      task_updates: boolean;
      system_alerts: boolean;
      security_alerts: boolean;
    };
    ui: {
      sidebar_collapsed: boolean;
      dense_mode: boolean;
      animations_enabled: boolean;
      show_agent_details: boolean;
    };
  };
  security: {
    two_factor_enabled: boolean;
    last_password_change: number;
    active_sessions: number;
    api_keys: Array<{
      id: string;
      name: string;
      created_at: number;
      last_used: number;
      permissions: string[];
    }>;
  };
  limits: {
    max_concurrent_tasks: number;
    daily_task_limit: number;
    storage_quota: string;
    api_rate_limit: number;
  };
  created_at: number;
  last_login: number;
  total_tasks: number;
  workspace_size: string;
}

const UserSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    theme: 'dark' as 'light' | 'dark' | 'auto',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      sms: false,
      task_updates: true,
      system_alerts: true,
      security_alerts: true,
    },
    ui: {
      sidebar_collapsed: false,
      dense_mode: false,
      animations_enabled: true,
      show_agent_details: true,
    }
  });

  useEffect(() => {
    if (user) {
      // Initialize with current user data
      setFormData(prev => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || '',
      }));
      
      // Fetch full profile (mock for now, replace with actual API call)
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call when backend endpoint is ready
      // const response = await apiClient.getUserProfile(user.user_id);
      
      // Mock data for now
      const mockProfile: UserProfile = {
        ...user!,
        phone: '+1 (555) 123-4567',
        bio: 'System administrator with full access to all LexOS functionalities.',
        avatar_url: '/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png',
        preferences: {
          theme: 'dark',
          language: 'en',
          timezone: 'America/New_York',
          notifications: {
            email: true,
            push: true,
            sms: false,
            task_updates: true,
            system_alerts: true,
            security_alerts: true,
          },
          ui: {
            sidebar_collapsed: false,
            dense_mode: false,
            animations_enabled: true,
            show_agent_details: true,
          }
        },
        security: {
          two_factor_enabled: false,
          last_password_change: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
          active_sessions: 2,
          api_keys: [
            {
              id: 'key_1',
              name: 'Main API Key',
              created_at: Date.now() - 90 * 24 * 60 * 60 * 1000,
              last_used: Date.now() - 2 * 60 * 60 * 1000,
              permissions: ['read', 'write', 'admin']
            }
          ]
        },
        limits: {
          max_concurrent_tasks: 100,
          daily_task_limit: 10000,
          storage_quota: '1TB',
          api_rate_limit: 1000
        },
        created_at: Date.now() - 365 * 24 * 60 * 60 * 1000,
        last_login: Date.now() - 60 * 60 * 1000,
        total_tasks: 15234,
        workspace_size: '45.7GB'
      };
      
      setProfile(mockProfile);
      setFormData({
        full_name: mockProfile.full_name,
        email: mockProfile.email,
        phone: mockProfile.phone || '',
        bio: mockProfile.bio || '',
        ...mockProfile.preferences
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load user profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // TODO: Replace with actual API call
      // await apiClient.updateUserProfile(user.user_id, formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    setPasswordModalOpen(true);
  };

  const handleEnable2FA = () => {
    setTwoFactorModalOpen(true);
  };

  const handle2FASuccess = () => {
    // Refresh profile to show updated 2FA status
    if (profile) {
      setProfile({
        ...profile,
        security: {
          ...profile.security,
          two_factor_enabled: true
        }
      });
    }
  };

  const handleGenerateApiKey = () => {
    setApiKeyModalOpen(true);
  };

  const handleApiKeySuccess = (keyData: { id: string; name: string; permissions: string[] }) => {
    // Add the new key to the profile
    if (profile) {
      setProfile({
        ...profile,
        security: {
          ...profile.security,
          api_keys: [
            ...profile.security.api_keys,
            {
              id: keyData.id,
              name: keyData.name,
              created_at: Date.now(),
              last_used: Date.now(),
              permissions: keyData.permissions,
            }
          ]
        }
      });
    }
  };

  const handleRevokeApiKey = async () => {
    if (!revokeKeyId) return;
    
    try {
      await apiClient.revokeApiKey(revokeKeyId);
      
      // Remove the key from the profile
      if (profile) {
        setProfile({
          ...profile,
          security: {
            ...profile.security,
            api_keys: profile.security.api_keys.filter(key => key.id !== revokeKeyId)
          }
        });
      }
      
      toast({
        title: 'Success',
        description: 'API key revoked successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to revoke API key',
      });
    } finally {
      setRevokeKeyId(null);
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Please log in to view settings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { icon: Crown, label: 'Overlord', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
      family_member: { icon: User, label: 'Family', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      guest: { icon: User, label: 'Guest', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig];
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getSecurityBadge = (level: string) => {
    const securityConfig = {
      ADMIN: { icon: Shield, label: 'Admin Access', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
      SAFE: { icon: Shield, label: 'Safe Mode', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
      RESTRICTED: { icon: Lock, label: 'Restricted', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' }
    };
    
    const config = securityConfig[level as keyof typeof securityConfig];
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-orbitron font-bold matrix-text flex items-center gap-2">
              <Settings className="w-8 h-8" />
              User Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile, preferences, and system configuration
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getRoleBadge(user.role)}
            {getSecurityBadge(user.security_level)}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-primary" />
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                    variant="secondary"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{user.username}</h3>
                  <p className="text-sm text-muted-foreground">User ID: {user.user_id}</p>
                  <p className="text-sm text-muted-foreground">
                    Member since {new Date(profile?.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm">
                      <Mail className="w-4 h-4 mr-2" />
                      Verify
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4 mr-2" />
                      Verify
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Interface</CardTitle>
              <CardDescription>
                Customize how LexOS looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select 
                    value={formData.theme}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, theme: value as any }))}
                  >
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={formData.language}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={formData.timezone}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Interface Options</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Collapsed Sidebar</Label>
                    <p className="text-sm text-muted-foreground">
                      Start with the sidebar collapsed by default
                    </p>
                  </div>
                  <Switch
                    checked={formData.ui.sidebar_collapsed}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        ui: { ...prev.ui, sidebar_collapsed: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dense Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce spacing for more compact interface
                    </p>
                  </div>
                  <Switch
                    checked={formData.ui.dense_mode}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        ui: { ...prev.ui, dense_mode: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable smooth transitions and animations
                    </p>
                  </div>
                  <Switch
                    checked={formData.ui.animations_enabled}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        ui: { ...prev.ui, animations_enabled: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Agent Details</Label>
                    <p className="text-sm text-muted-foreground">
                      Show detailed agent information in dashboards
                    </p>
                  </div>
                  <Switch
                    checked={formData.ui.show_agent_details}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        ui: { ...prev.ui, show_agent_details: checked }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how and when you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Notification Channels</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.email}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, email: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Push Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Browser push notifications
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.push}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, push: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      SMS Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Text message notifications for critical alerts
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.sms}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, sms: checked }
                      }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Notification Types</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications about task status changes
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.task_updates}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, task_updates: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Important system status and maintenance alerts
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.system_alerts}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, system_alerts: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Security-related notifications and warnings
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.security_alerts}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, security_alerts: checked }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Notification Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Section */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Password
                </h4>
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Last changed</p>
                      <p className="text-sm text-muted-foreground">
                        {profile ? new Date(profile.security.last_password_change).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleChangePassword}>
                      Change Password
                    </Button>
                  </div>
                </div>
              </div>

              {/* 2FA Section */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Two-Factor Authentication
                </h4>
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.security.two_factor_enabled ? (
                          <span className="flex items-center gap-1 text-green-500">
                            <Check className="w-3 h-3" />
                            Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-500">
                            <AlertCircle className="w-3 h-3" />
                            Not enabled
                          </span>
                        )}
                      </p>
                    </div>
                    <Button 
                      variant={profile?.security.two_factor_enabled ? "outline" : "default"}
                      onClick={handleEnable2FA}
                    >
                      {profile?.security.two_factor_enabled ? 'Manage 2FA' : 'Enable 2FA'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Active Sessions
                </h4>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    You have <span className="font-medium text-foreground">{profile?.security.active_sessions || 0}</span> active sessions
                  </p>
                  <Button variant="link" className="px-0 mt-2">
                    View all sessions →
                  </Button>
                </div>
              </div>

              {/* API Keys */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  API Keys
                </h4>
                <div className="space-y-2">
                  {profile?.security.api_keys.map(key => (
                    <div key={key.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{key.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(key.created_at).toLocaleDateString()} • 
                            Last used {new Date(key.last_used).toLocaleDateString()}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setRevokeKeyId(key.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        {key.permissions.map(perm => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={handleGenerateApiKey}>
                    <Key className="w-4 h-4 mr-2" />
                    Generate New API Key
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                View your account limits and system usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">{profile?.total_tasks.toLocaleString() || 0}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Workspace Size</p>
                  <p className="text-2xl font-bold">{profile?.workspace_size || '0GB'}</p>
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Account Limits
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Concurrent Tasks</p>
                      <p className="text-sm text-muted-foreground">Maximum parallel task execution</p>
                    </div>
                    <Badge variant="outline">{profile?.limits.max_concurrent_tasks || 0}</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Daily Task Limit</p>
                      <p className="text-sm text-muted-foreground">Maximum tasks per day</p>
                    </div>
                    <Badge variant="outline">{profile?.limits.daily_task_limit.toLocaleString() || 0}</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Storage Quota</p>
                      <p className="text-sm text-muted-foreground">Total storage allocation</p>
                    </div>
                    <Badge variant="outline">{profile?.limits.storage_quota || '0GB'}</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">API Rate Limit</p>
                      <p className="text-sm text-muted-foreground">Requests per minute</p>
                    </div>
                    <Badge variant="outline">{profile?.limits.api_rate_limit || 0}/min</Badge>
                  </div>
                </div>
              </div>

              {/* Access Levels */}
              <div className="space-y-4">
                <h4 className="font-medium">Access Configuration</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Security Level</span>
                    {getSecurityBadge(user.security_level)}
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Agent Access</span>
                    <Badge variant="outline">{user.agent_access_level}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Tab */}
        <TabsContent value="voice" className="space-y-4">
          <VoiceSettings />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <PasswordChangeModal 
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
      />
      
      <TwoFactorSetupModal
        open={twoFactorModalOpen}
        onOpenChange={setTwoFactorModalOpen}
        onSuccess={handle2FASuccess}
      />
      
      <ApiKeyModal
        open={apiKeyModalOpen}
        onOpenChange={setApiKeyModalOpen}
        onSuccess={handleApiKeySuccess}
      />
      
      {/* Revoke API Key Confirmation */}
      <AlertDialog open={!!revokeKeyId} onOpenChange={(open) => !open && setRevokeKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? This action cannot be undone and any 
              applications using this key will immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeApiKey} className="bg-destructive text-destructive-foreground">
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserSettings;