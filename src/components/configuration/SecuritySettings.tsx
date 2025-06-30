
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Eye, Clock, AlertTriangle } from 'lucide-react';

interface SecuritySetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'toggle' | 'input' | 'select';
  value?: string;
  options?: string[];
}

const SecuritySettings: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySetting[]>([
    {
      id: 'content_filtering',
      name: 'Content Filtering',
      description: 'Filter inappropriate content for child accounts',
      enabled: true,
      type: 'toggle'
    },
    {
      id: 'session_timeout',
      name: 'Session Timeout',
      description: 'Automatically log out users after inactivity',
      enabled: true,
      type: 'input',
      value: '30'
    },
    {
      id: 'require_approval',
      name: 'Require Admin Approval',
      description: 'Require admin approval for sensitive operations',
      enabled: false,
      type: 'toggle'
    },
    {
      id: 'audit_logging',
      name: 'Audit Logging',
      description: 'Log all user activities for security monitoring',
      enabled: true,
      type: 'toggle'
    },
    {
      id: 'ip_whitelist',
      name: 'IP Whitelisting',
      description: 'Only allow access from specific IP addresses',
      enabled: false,
      type: 'toggle'
    },
    {
      id: 'mfa_required',
      name: 'Multi-Factor Authentication',
      description: 'Require MFA for admin accounts',
      enabled: true,
      type: 'toggle'
    }
  ]);

  const toggleSetting = (settingId: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === settingId 
        ? { ...setting, enabled: !setting.enabled }
        : setting
    ));
  };

  const updateSettingValue = (settingId: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === settingId 
        ? { ...setting, value }
        : setting
    ));
  };

  const securityScore = Math.round((settings.filter(s => s.enabled).length / settings.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Security Settings</h2>
          <p className="text-muted-foreground">Configure security policies for your family system</p>
        </div>
        <Card className="w-48">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-semibold">Security Score</span>
            </div>
            <div className="text-2xl font-bold text-primary">{securityScore}%</div>
            <Badge variant={securityScore >= 80 ? 'default' : securityScore >= 60 ? 'secondary' : 'destructive'}>
              {securityScore >= 80 ? 'Strong' : securityScore >= 60 ? 'Moderate' : 'Weak'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settings.map(setting => (
          <Card key={setting.id} className="holographic-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${setting.enabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                    {setting.id === 'content_filtering' && <Eye className="w-4 h-4" />}
                    {setting.id === 'session_timeout' && <Clock className="w-4 h-4" />}
                    {setting.id === 'require_approval' && <AlertTriangle className="w-4 h-4" />}
                    {setting.id === 'audit_logging' && <Shield className="w-4 h-4" />}
                    {setting.id === 'ip_whitelist' && <Lock className="w-4 h-4" />}
                    {setting.id === 'mfa_required' && <Shield className="w-4 h-4" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{setting.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                <Badge variant={setting.enabled ? 'default' : 'secondary'}>
                  {setting.enabled ? 'ON' : 'OFF'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={setting.id}>Enable {setting.name}</Label>
                <Switch
                  id={setting.id}
                  checked={setting.enabled}
                  onCheckedChange={() => toggleSetting(setting.id)}
                />
              </div>
              
              {setting.type === 'input' && setting.enabled && (
                <div className="space-y-2">
                  <Label htmlFor={`${setting.id}_value`}>
                    {setting.id === 'session_timeout' ? 'Minutes' : 'Value'}
                  </Label>
                  <Input
                    id={`${setting.id}_value`}
                    type="number"
                    value={setting.value || ''}
                    onChange={(e) => updateSettingValue(setting.id, e.target.value)}
                    placeholder="Enter value"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="holographic-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityScore < 80 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Improve Security Score</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable more security features to better protect your family system.
                  </p>
                </div>
              </div>
            )}
            {!settings.find(s => s.id === 'content_filtering')?.enabled && (
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg">
                <Eye className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Enable Content Filtering</h4>
                  <p className="text-sm text-muted-foreground">
                    Protect children by filtering inappropriate content.
                  </p>
                </div>
              </div>
            )}
            {!settings.find(s => s.id === 'mfa_required')?.enabled && (
              <div className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg">
                <Shield className="w-4 h-4 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Enable Multi-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security for admin accounts.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;
