import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { securityService, SecurityMetrics, SecurityPolicy, Role, AccessRule, Session } from '../services/security';

export const useSecurityMetrics = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await securityService.getSecurityMetrics();
      setMetrics(data);
      setError(null);
    } catch (err) {
      const errorMessage = 'Failed to load security metrics';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return { metrics, loading, error, refresh: loadMetrics };
};

export const useSecurityPolicies = () => {
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const { policies } = await securityService.getSecurityPolicies();
      setPolicies(policies);
      setError(null);
    } catch (err) {
      const errorMessage = 'Failed to load security policies';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updatePolicy = async (policyId: string, updates: Partial<SecurityPolicy>) => {
    try {
      const { policy } = await securityService.updateSecurityPolicy(policyId, updates);
      setPolicies(prev => prev.map(p => p.id === policyId ? policy : p));
      toast({
        title: 'Success',
        description: 'Security policy updated successfully'
      });
      return policy;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update security policy',
        variant: 'destructive'
      });
      throw err;
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  return { policies, loading, error, refresh: loadPolicies, updatePolicy };
};

export const useAccessControl = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadAccessControl = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesData, rulesData] = await Promise.all([
        securityService.getRoles(),
        securityService.getAccessRules()
      ]);
      setRoles(rolesData.roles);
      setRules(rulesData.rules);
      setError(null);
    } catch (err) {
      const errorMessage = 'Failed to load access control data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const checkAccess = async (resource: string, action: string) => {
    try {
      const result = await securityService.checkAccess(resource, action);
      return result;
    } catch (err) {
      console.error('Access check failed:', err);
      return { allowed: false, reason: 'error' };
    }
  };

  useEffect(() => {
    loadAccessControl();
  }, [loadAccessControl]);

  return {
    roles,
    rules,
    loading,
    error,
    refresh: loadAccessControl,
    checkAccess
  };
};

export const useActiveSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const { sessions } = await securityService.getActiveSessions();
      setSessions(sessions);
      setError(null);
    } catch (err) {
      const errorMessage = 'Failed to load active sessions';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const terminateSession = async (sessionId: string) => {
    try {
      await securityService.endSession(sessionId);
      toast({
        title: 'Success',
        description: 'Session terminated successfully'
      });
      await loadSessions();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to terminate session',
        variant: 'destructive'
      });
      throw err;
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    refresh: loadSessions,
    terminateSession
  };
};