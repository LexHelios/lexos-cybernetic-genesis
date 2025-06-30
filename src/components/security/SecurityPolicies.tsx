
import React, { useState, useEffect } from 'react';
import { Shield, Lock, Settings, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { useToast } from '../ui/use-toast';
import { securityService, SecurityPolicy } from '../../services/security';

// Define proper policy rule structure
interface PolicyRule {
  // Password policy
  minLength?: number;
  requireSpecialChars?: boolean;
  requireNumbers?: boolean;
  requireUppercase?: boolean;
  maxAge?: number;
  preventReuse?: boolean;
  
  // Access control
  enforceRBAC?: boolean;
  sessionTimeout?: number;
  concurrentSessions?: number;
  requireMFA?: boolean;
  
  // Network security
  enableFirewall?: boolean;
  enableDDoSProtection?: boolean;
  enableIPWhitelisting?: boolean;
  allowedPorts?: string;
}

const SecurityPolicies: React.FC = () => {
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Default policy rules
  const [policyRules, setPolicyRules] = useState<PolicyRule>({
    minLength: 8,
    requireSpecialChars: true,
    requireNumbers: true,
    requireUppercase: true,
    maxAge: 90,
    preventReuse: true,
    enforceRBAC: true,
    sessionTimeout: 30,
    concurrentSessions: 3,
    requireMFA: false,
    enableFirewall: true,
    enableDDoSProtection: true,
    enableIPWhitelisting: false,
    allowedPorts: '80,443,22'
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const { policies } = await securityService.getSecurityPolicies();
      setPolicies(policies);
      
      // Load policy rules from the first policy if available
      if (policies.length > 0 && policies[0].rules && policies[0].rules.length > 0) {
        setPolicyRules(prev => ({ ...prev, ...policies[0].rules[0] }));
      }
    } catch (error) {
      console.error('Failed to load security policies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security policies',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePolicyRule = (key: keyof PolicyRule, value: any) => {
    setPolicyRules(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const savePolicies = async () => {
    try {
      setSaving(true);
      
      // Update the first policy or create a new one
      if (policies.length > 0) {
        const updatedPolicy = {
          ...policies[0],
          rules: [policyRules],
          updatedAt: new Date().toISOString()
        };
        
        await securityService.updateSecurityPolicy(policies[0].id, updatedPolicy);
      }
      
      toast({
        title: 'Success',
        description: 'Security policies updated successfully'
      });
      
      loadPolicies();
    } catch (error) {
      console.error('Failed to save security policies:', error);
      toast({
        title: 'Error',
        description: 'Failed to save security policies',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-warning-orange/30 bg-warning-orange/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-warning-orange" />
                <span>Security Policies</span>
              </CardTitle>
              <CardDescription>Configure system-wide security policies and rules</CardDescription>
            </div>
            <Button onClick={savePolicies} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password Policy */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-primary" />
              <h3 className="text-lg font-semibold">Password Policy</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-length">Minimum Length</Label>
                <Input
                  id="min-length"
                  type="number"
                  value={policyRules.minLength || 8}
                  onChange={(e) => updatePolicyRule('minLength', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-age">Password Age (days)</Label>
                <Input
                  id="max-age"
                  type="number"
                  value={policyRules.maxAge || 90}
                  onChange={(e) => updatePolicyRule('maxAge', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="require-special">Require Special Characters</Label>
                <Switch
                  id="require-special"
                  checked={policyRules.requireSpecialChars || false}
                  onCheckedChange={(checked) => updatePolicyRule('requireSpecialChars', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="require-numbers">Require Numbers</Label>
                <Switch
                  id="require-numbers"
                  checked={policyRules.requireNumbers || false}
                  onCheckedChange={(checked) => updatePolicyRule('requireNumbers', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="require-uppercase">Require Uppercase Letters</Label>
                <Switch
                  id="require-uppercase"
                  checked={policyRules.requireUppercase || false}
                  onCheckedChange={(checked) => updatePolicyRule('requireUppercase', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="prevent-reuse">Prevent Password Reuse</Label>
                <Switch
                  id="prevent-reuse"
                  checked={policyRules.preventReuse || false}
                  onCheckedChange={(checked) => updatePolicyRule('preventReuse', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Access Control Policy */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-primary" />
              <h3 className="text-lg font-semibold">Access Control</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={policyRules.sessionTimeout || 30}
                  onChange={(e) => updatePolicyRule('sessionTimeout', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="concurrent-sessions">Max Concurrent Sessions</Label>
                <Input
                  id="concurrent-sessions"
                  type="number"
                  value={policyRules.concurrentSessions || 3}
                  onChange={(e) => updatePolicyRule('concurrentSessions', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="enforce-rbac">Enforce Role-Based Access Control</Label>
                <Switch
                  id="enforce-rbac"
                  checked={policyRules.enforceRBAC || false}
                  onCheckedChange={(checked) => updatePolicyRule('enforceRBAC', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="require-mfa">Require Multi-Factor Authentication</Label>
                <Switch
                  id="require-mfa"
                  checked={policyRules.requireMFA || false}
                  onCheckedChange={(checked) => updatePolicyRule('requireMFA', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Network Security Policy */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-lg font-semibold">Network Security</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-firewall">Enable Firewall Protection</Label>
                <Switch
                  id="enable-firewall"
                  checked={policyRules.enableFirewall || false}
                  onCheckedChange={(checked) => updatePolicyRule('enableFirewall', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-ddos">Enable DDoS Protection</Label>
                <Switch
                  id="enable-ddos"
                  checked={policyRules.enableDDoSProtection || false}
                  onCheckedChange={(checked) => updatePolicyRule('enableDDoSProtection', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-whitelist">Enable IP Whitelisting</Label>
                <Switch
                  id="enable-whitelist"
                  checked={policyRules.enableIPWhitelisting || false}
                  onCheckedChange={(checked) => updatePolicyRule('enableIPWhitelisting', checked)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="allowed-ports">Allowed Ports (comma-separated)</Label>
              <Input
                id="allowed-ports"
                value={policyRules.allowedPorts || ''}
                onChange={(e) => updatePolicyRule('allowedPorts', e.target.value)}
                placeholder="80,443,22"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityPolicies;
