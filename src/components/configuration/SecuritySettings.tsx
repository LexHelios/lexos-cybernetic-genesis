
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, Clock, Lock } from 'lucide-react';

interface SecuritySetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const SecuritySettings: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySetting[]>([
    {
      id: 'content_filtering',
      name: 'Content Filtering',
      description: 'Filter inappropriate content for child accounts',
      enabled: true
    },
    {
      id: 'session_timeout',
      name: 'Session Timeout',
      description: 'Automatically log out users after inactivity',
      enabled: true
    },
    {
      id: 'audit_logging',
      name: 'Audit Logging',
      description: 'Log all user activities for security monitoring',
      enabled: true
    },
    {
      id: 'mfa_required',
      name: 'Multi-Factor Authentication',
      description: 'Require MFA for admin accounts',
      enabled: false
    }
  ]);

  const toggleSetting = (settingId: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === settingId 
        ? { ...setting, enabled: !setting.enabled }
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
            <Badge variant={securityScore >= 80 ? 'default' : 'secondary'}>
              {securityScore >= 80 ? 'Strong' : 'Moderate'}
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
                    {setting.id === 'audit_logging' && <Shield className="w-4 h-4" />}
                    {setting.id === 'mfa_required' && <Lock className="w-4 h-4" />}
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
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor={setting.id}>Enable {setting.name}</Label>
                <Switch
                  id={setting.id}
                  checked={setting.enabled}
                  onCheckedChange={() => toggleSetting(setting.id)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SecuritySettings;
