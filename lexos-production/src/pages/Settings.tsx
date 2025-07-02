
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Bell, 
  Palette,
  HardDrive,
  Network,
  Brain,
  Save,
  RefreshCw,
  Download,
  Upload,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';

const Settings = () => {
  const [selectedTab, setSelectedTab] = useState('profile');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Mock settings state
  const [settings, setSettings] = useState({
    profile: {
      username: 'admin',
      email: 'admin@nexus.local',
      displayName: 'NEXUS Administrator',
      timezone: 'UTC',
      language: 'en'
    },
    system: {
      maxAgents: 10,
      taskTimeout: 300,
      autoSave: true,
      debugMode: false,
      backupEnabled: true,
      logLevel: 'info'
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 1440,
      passwordExpiry: 90,
      apiAccess: true,
      ipWhitelisting: false
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      taskCompletion: true,
      systemAlerts: true,
      securityEvents: true,
      weeklyReports: true
    },
    appearance: {
      theme: 'dark',
      accentColor: 'cyan',
      animations: true,
      compactMode: false,
      sidebarCollapsed: false
    },
    performance: {
      gpuMemoryLimit: 80,
      cpuCores: 16,
      diskCache: 10,
      networkTimeout: 30,
      backgroundTasks: 5
    }
  });

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            System Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your NEXUS environment and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button className="neural-button">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="system">
            <SettingsIcon className="w-4 h-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Brain className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={settings.profile.username}
                    onChange={(e) => handleSettingChange('profile', 'username', e.target.value)}
                    className="neural-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                    className="neural-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={settings.profile.displayName}
                    onChange={(e) => handleSettingChange('profile', 'displayName', e.target.value)}
                    className="neural-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={settings.profile.timezone}
                    onChange={(e) => handleSettingChange('profile', 'timezone', e.target.value)}
                    className="neural-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">API Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value="nx_1234567890abcdef1234567890abcdef"
                    readOnly
                    className="neural-input font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this key to authenticate API requests
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxAgents">Maximum Agents</Label>
                  <Input
                    id="maxAgents"
                    type="number"
                    value={settings.system.maxAgents}
                    onChange={(e) => handleSettingChange('system', 'maxAgents', parseInt(e.target.value))}
                    className="neural-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of concurrent agents
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taskTimeout">Task Timeout (seconds)</Label>
                  <Input
                    id="taskTimeout"
                    type="number"
                    value={settings.system.taskTimeout}
                    onChange={(e) => handleSettingChange('system', 'taskTimeout', parseInt(e.target.value))}
                    className="neural-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Default timeout for task execution
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoSave">Auto Save</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save system state
                    </p>
                  </div>
                  <Switch
                    id="autoSave"
                    checked={settings.system.autoSave}
                    onCheckedChange={(checked) => handleSettingChange('system', 'autoSave', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="debugMode">Debug Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable detailed logging and debugging
                    </p>
                  </div>
                  <Switch
                    id="debugMode"
                    checked={settings.system.debugMode}
                    onCheckedChange={(checked) => handleSettingChange('system', 'debugMode', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="backupEnabled">Automatic Backups</Label>
                    <p className="text-sm text-muted-foreground">
                      Create regular system backups
                    </p>
                  </div>
                  <Switch
                    id="backupEnabled"
                    checked={settings.system.backupEnabled}
                    onCheckedChange={(checked) => handleSettingChange('system', 'backupEnabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">Security Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="2fa">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for login
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="2fa"
                      checked={settings.security.twoFactorEnabled}
                      onCheckedChange={(checked) => handleSettingChange('security', 'twoFactorEnabled', checked)}
                    />
                    <Button variant="outline" size="sm">
                      Setup
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="apiAccess">API Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable external API access
                    </p>
                  </div>
                  <Switch
                    id="apiAccess"
                    checked={settings.security.apiAccess}
                    onCheckedChange={(checked) => handleSettingChange('security', 'apiAccess', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ipWhitelisting">IP Whitelisting</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict access by IP address
                    </p>
                  </div>
                  <Switch
                    id="ipWhitelisting"
                    checked={settings.security.ipWhitelisting}
                    onCheckedChange={(checked) => handleSettingChange('security', 'ipWhitelisting', checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="neural-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                  <Input
                    id="passwordExpiry"
                    type="number"
                    value={settings.security.passwordExpiry}
                    onChange={(e) => handleSettingChange('security', 'passwordExpiry', parseInt(e.target.value))}
                    className="neural-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'emailNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="taskCompletion">Task Completion</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when tasks complete
                    </p>
                  </div>
                  <Switch
                    id="taskCompletion"
                    checked={settings.notifications.taskCompletion}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'taskCompletion', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="systemAlerts">System Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Critical system notifications
                    </p>
                  </div>
                  <Switch
                    id="systemAlerts"
                    checked={settings.notifications.systemAlerts}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'systemAlerts', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="securityEvents">Security Events</Label>
                    <p className="text-sm text-muted-foreground">
                      Security-related notifications
                    </p>
                  </div>
                  <Switch
                    id="securityEvents"
                    checked={settings.notifications.securityEvents}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'securityEvents', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">Interface Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="animations">Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable interface animations
                    </p>
                  </div>
                  <Switch
                    id="animations"
                    checked={settings.appearance.animations}
                    onCheckedChange={(checked) => handleSettingChange('appearance', 'animations', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="compactMode">Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce spacing and padding
                    </p>
                  </div>
                  <Switch
                    id="compactMode"
                    checked={settings.appearance.compactMode}
                    onCheckedChange={(checked) => handleSettingChange('appearance', 'compactMode', checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-2">
                  {['cyan', 'purple', 'pink', 'blue', 'green'].map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        settings.appearance.accentColor === color ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: `var(--${color}-500)` }}
                      onClick={() => handleSettingChange('appearance', 'accentColor', color)}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Settings */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">Performance Tuning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="gpuMemory">GPU Memory Limit (%)</Label>
                  <div className="px-3">
                    <Slider
                      id="gpuMemory"
                      min={50}
                      max={100}
                      step={5}
                      value={[settings.performance.gpuMemoryLimit]}
                      onValueChange={(value) => handleSettingChange('performance', 'gpuMemoryLimit', value[0])}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>50%</span>
                    <span>{settings.performance.gpuMemoryLimit}%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diskCache">Disk Cache (GB)</Label>
                  <div className="px-3">
                    <Slider
                      id="diskCache"
                      min={1}
                      max={50}
                      step={1}
                      value={[settings.performance.diskCache]}
                      onValueChange={(value) => handleSettingChange('performance', 'diskCache', value[0])}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1 GB</span>
                    <span>{settings.performance.diskCache} GB</span>
                    <span>50 GB</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpuCores">CPU Cores</Label>
                    <Input
                      id="cpuCores"
                      type="number"
                      value={settings.performance.cpuCores}
                      onChange={(e) => handleSettingChange('performance', 'cpuCores', parseInt(e.target.value))}
                      className="neural-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backgroundTasks">Background Tasks</Label>
                    <Input
                      id="backgroundTasks"
                      type="number"
                      value={settings.performance.backgroundTasks}
                      onChange={(e) => handleSettingChange('performance', 'backgroundTasks', parseInt(e.target.value))}
                      className="neural-input"
                    />
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

export default Settings;
