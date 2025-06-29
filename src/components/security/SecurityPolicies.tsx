import React, { useEffect, useState } from 'react';
import { Shield, Lock, Key, Settings, Check, X, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Separator } from '../ui/separator';
import { securityService, SecurityPolicy } from '../../services/security';
import { useToast } from '../../hooks/use-toast';

const SecurityPolicies: React.FC = () => {
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const { policies } = await securityService.getSecurityPolicies();
      setPolicies(policies);
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

  const updatePolicy = async (policyId: string, updates: Partial<SecurityPolicy>) => {
    try {
      setSaving(policyId);
      const { policy } = await securityService.updateSecurityPolicy(policyId, updates);
      setPolicies(policies.map(p => p.id === policyId ? policy : p));
      toast({
        title: 'Success',
        description: 'Security policy updated successfully'
      });
    } catch (error) {
      console.error('Failed to update policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to update security policy',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  const updatePolicyRule = (policyId: string, rulePath: string, value: any) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    const updatedRules = { ...policy.rules };
    const keys = rulePath.split('.');
    let current: any = updatedRules;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    updatePolicy(policyId, { rules: updatedRules });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-muted" />
            <CardContent className="h-32 bg-muted mt-2" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Security Policies</AlertTitle>
        <AlertDescription>
          Configure security policies to protect your system. Changes take effect immediately.
        </AlertDescription>
      </Alert>

      {policies.map((policy) => (
        <Card key={policy.id} className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle>{policy.name}</CardTitle>
                  <CardDescription>Policy ID: {policy.id}</CardDescription>
                </div>
              </div>
              <Switch
                checked={policy.enabled}
                onCheckedChange={(checked) => updatePolicy(policy.id, { enabled: checked })}
                disabled={saving === policy.id}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {policy.id === 'password_policy' && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-minLength`}>Minimum Password Length</Label>
                    <Input
                      id={`${policy.id}-minLength`}
                      type="number"
                      value={policy.rules.minLength}
                      onChange={(e) => updatePolicyRule(policy.id, 'minLength', parseInt(e.target.value))}
                      className="w-20"
                      min="6"
                      max="32"
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-requireSpecialChars`}>Require Special Characters</Label>
                    <Switch
                      id={`${policy.id}-requireSpecialChars`}
                      checked={policy.rules.requireSpecialChars}
                      onCheckedChange={(checked) => updatePolicyRule(policy.id, 'requireSpecialChars', checked)}
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-requireNumbers`}>Require Numbers</Label>
                    <Switch
                      id={`${policy.id}-requireNumbers`}
                      checked={policy.rules.requireNumbers}
                      onCheckedChange={(checked) => updatePolicyRule(policy.id, 'requireNumbers', checked)}
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-requireUppercase`}>Require Uppercase Letters</Label>
                    <Switch
                      id={`${policy.id}-requireUppercase`}
                      checked={policy.rules.requireUppercase}
                      onCheckedChange={(checked) => updatePolicyRule(policy.id, 'requireUppercase', checked)}
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-maxAge`}>Password Max Age (days)</Label>
                    <Input
                      id={`${policy.id}-maxAge`}
                      type="number"
                      value={policy.rules.maxAge}
                      onChange={(e) => updatePolicyRule(policy.id, 'maxAge', parseInt(e.target.value))}
                      className="w-20"
                      min="0"
                      max="365"
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-preventReuse`}>Prevent Password Reuse (last N passwords)</Label>
                    <Input
                      id={`${policy.id}-preventReuse`}
                      type="number"
                      value={policy.rules.preventReuse}
                      onChange={(e) => updatePolicyRule(policy.id, 'preventReuse', parseInt(e.target.value))}
                      className="w-20"
                      min="0"
                      max="24"
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                </div>
              </>
            )}
            
            {policy.id === 'access_control' && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-enforceRBAC`}>Enforce Role-Based Access Control</Label>
                    <Switch
                      id={`${policy.id}-enforceRBAC`}
                      checked={policy.rules.enforceRBAC}
                      onCheckedChange={(checked) => updatePolicyRule(policy.id, 'enforceRBAC', checked)}
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-sessionTimeout`}>Session Timeout (minutes)</Label>
                    <Input
                      id={`${policy.id}-sessionTimeout`}
                      type="number"
                      value={policy.rules.sessionTimeout}
                      onChange={(e) => updatePolicyRule(policy.id, 'sessionTimeout', parseInt(e.target.value))}
                      className="w-20"
                      min="5"
                      max="1440"
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-concurrentSessions`}>Max Concurrent Sessions</Label>
                    <Input
                      id={`${policy.id}-concurrentSessions`}
                      type="number"
                      value={policy.rules.concurrentSessions}
                      onChange={(e) => updatePolicyRule(policy.id, 'concurrentSessions', parseInt(e.target.value))}
                      className="w-20"
                      min="1"
                      max="10"
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Roles Requiring MFA</Label>
                    <div className="flex flex-wrap gap-2">
                      {policy.rules.requireMFA?.map((role: string) => (
                        <div key={role} className="flex items-center space-x-1 bg-muted px-2 py-1 rounded-md">
                          <span className="text-sm">{role}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => {
                              const updated = policy.rules.requireMFA.filter((r: string) => r !== role);
                              updatePolicyRule(policy.id, 'requireMFA', updated);
                            }}
                            disabled={!policy.enabled || saving === policy.id}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {policy.id === 'network_security' && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-enableFirewall`}>Enable Firewall</Label>
                    <Switch
                      id={`${policy.id}-enableFirewall`}
                      checked={policy.rules.enableFirewall}
                      onCheckedChange={(checked) => updatePolicyRule(policy.id, 'enableFirewall', checked)}
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-enableDDoSProtection`}>Enable DDoS Protection</Label>
                    <Switch
                      id={`${policy.id}-enableDDoSProtection`}
                      checked={policy.rules.enableDDoSProtection}
                      onCheckedChange={(checked) => updatePolicyRule(policy.id, 'enableDDoSProtection', checked)}
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${policy.id}-enableIPWhitelisting`}>Enable IP Whitelisting</Label>
                    <Switch
                      id={`${policy.id}-enableIPWhitelisting`}
                      checked={policy.rules.enableIPWhitelisting}
                      onCheckedChange={(checked) => updatePolicyRule(policy.id, 'enableIPWhitelisting', checked)}
                      disabled={!policy.enabled || saving === policy.id}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Allowed Ports</Label>
                    <div className="flex flex-wrap gap-2">
                      {policy.rules.allowedPorts?.map((port: number) => (
                        <div key={port} className="flex items-center space-x-1 bg-muted px-2 py-1 rounded-md">
                          <span className="text-sm font-mono">{port}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => {
                              const updated = policy.rules.allowedPorts.filter((p: number) => p !== port);
                              updatePolicyRule(policy.id, 'allowedPorts', updated);
                            }}
                            disabled={!policy.enabled || saving === policy.id}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {saving === policy.id && (
              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                Saving changes...
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SecurityPolicies;