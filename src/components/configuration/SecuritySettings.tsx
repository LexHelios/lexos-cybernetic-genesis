
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, Eye, Clock, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { configurationService, SecuritySetting } from '@/services/configurationService';

const SecuritySettings: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const config = await configurationService.loadConfiguration();
      setSettings(config.securitySettings);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load security settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (settingId: string, enabled: boolean) => {
    try {
      const success = await configurationService.updateSecuritySetting(settingId, enabled);
      
      if (success) {
        setSettings(prev => prev.map(setting => 
          setting.id === settingId 
            ? { ...setting, enabled }
            : setting
        ));
        
        toast({
          title: "Success",
          description: `${settings.find(s => s.id === settingId)?.name} ${enabled ? 'enabled' : 'disabled'}`
        });
      } else {
        throw new Error('Failed to update setting');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update security setting",
        variant: "destructive"
      });
    }
  };

  const updateSettingValue = async (settingId: string, value: any) => {
    try {
      const setting = settings.find(s => s.id === settingId);
      if (!setting) return;
      
      const success = await configurationService.updateSecuritySetting(settingId, setting.enabled, value);
      
      if (success) {
        setSettings(prev => prev.map(s => 
          s.id === settingId 
            ? { ...s, value }
            : s
        ));
        
        toast({
          title: "Success",
          description: "Setting updated successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update setting value",
        variant: "destructive"
      });
    }
  };

  const securityScore = Math.round((settings.filter(s => s.enabled).length / settings.length) * 100);

  const getIconForSetting = (settingId: string) => {
    switch (settingId) {
      case 'content_filtering':
        return <Eye className="w-4 h-4" />;
      case 'session_timeout':
        return <Clock className="w-4 h-4" />;
      case 'audit_logging':
        return <Shield className="w-4 h-4" />;
      case 'mfa_required':
        return <Lock className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading security settings...</div>;
  }

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
              {securityScore >= 80 ? 'Strong' : securityScore >= 60 ? 'Good' : 'Moderate'}
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
                    {getIconForSetting(setting.id)}
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
                  onCheckedChange={(enabled) => toggleSetting(setting.id, enabled)}
                />
              </div>
              
              {/* Special handling for session timeout setting */}
              {setting.id === 'session_timeout' && setting.enabled && (
                <div className="space-y-2">
                  <Label htmlFor="timeout-value">Timeout (minutes)</Label>
                  <Input
                    id="timeout-value"
                    type="number"
                    min="5"
                    max="1440"
                    value={setting.value || 30}
                    onChange={(e) => updateSettingValue(setting.id, parseInt(e.target.value))}
                    className="w-24"
                  />
                </div>
              )}

              {/* Show current status */}
              <div className="text-xs text-muted-foreground">
                Status: {setting.enabled ? (
                  <span className="text-green-400">Active and protecting your system</span>
                ) : (
                  <span className="text-yellow-400">Disabled - consider enabling for better security</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Recommendations */}
      <Card className="holographic-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {securityScore < 80 && (
              <p className="text-yellow-400 text-sm">
                • Consider enabling more security features to improve your security score
              </p>
            )}
            {!settings.find(s => s.id === 'mfa_required')?.enabled && (
              <p className="text-yellow-400 text-sm">
                • Enable Multi-Factor Authentication for admin accounts for enhanced security
              </p>
            )}
            {!settings.find(s => s.id === 'audit_logging')?.enabled && (
              <p className="text-yellow-400 text-sm">
                • Enable audit logging to track all system activities
              </p>
            )}
            {securityScore === 100 && (
              <p className="text-green-400 text-sm">
                ✓ Excellent! All security features are enabled and protecting your system
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;
