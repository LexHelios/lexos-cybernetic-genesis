
import { apiClient } from './api';

export interface SecurityMetrics {
  active_sessions: number;
  failed_logins: number;
  suspicious_activities: number;
  last_scan: string;
  threatLevel: string;
  securityScore: number;
  last24Hours: {
    failedLogins: number;
    blockedAttempts: number;
    suspiciousActivities: number;
    successfulLogins: number;
  };
  overall: {
    activeSessions: number;
    blockedIPs: number;
    securityIncidents: number;
    totalScans: number;
  };
  last7Days: {
    totalEvents: number;
    suspiciousActivities: number;
  };
}

export interface SessionInfo {
  session_id: string;
  user_id: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  is_active: boolean;
}

export interface Session {
  id: string;
  username: string;
  role: string;
  ip: string;
  createdAt: string;
  lastActivity: number;
}

export interface SecurityLog {
  id: number;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  user_id?: number;
  ip_address?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  type: string;
  username?: string;
  ip?: string;
  userId?: string;
  reason?: string;
  error?: string;
}

export interface AccessControlRule {
  id: number;
  name: string;
  resource: string;
  action: string;
  conditions: Record<string, any>;
  effect: 'allow' | 'deny';
  priority: number;
  active: boolean;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: any[];
  createdAt: string;
  updatedAt: string;
}

export const securityService = {
  // Security Metrics
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const response = await apiClient.request<SecurityMetrics>('/security/metrics');
      return response;
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
      // Return mock data for development
      return {
        active_sessions: 12,
        failed_logins: 3,
        suspicious_activities: 0,
        last_scan: new Date().toISOString(),
        threatLevel: 'LOW',
        securityScore: 89.5,
        last24Hours: {
          failedLogins: 3,
          blockedAttempts: 7,
          suspiciousActivities: 0,
          successfulLogins: 45
        },
        overall: {
          activeSessions: 12,
          blockedIPs: 127,
          securityIncidents: 2,
          totalScans: 1247
        },
        last7Days: {
          totalEvents: 892,
          suspiciousActivities: 3
        }
      };
    }
  },

  // Session Management
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const response = await apiClient.request<SessionInfo[]>('/security/sessions');
      return response;
    } catch (error) {
      console.error('Failed to fetch active sessions:', error);
      return [];
    }
  },

  async terminateSession(sessionId: string): Promise<void> {
    try {
      await apiClient.request(`/security/sessions/${sessionId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to terminate session:', error);
      throw error;
    }
  },

  async getSessionActivity(sessionId: string): Promise<{ activity: any[] }> {
    try {
      const response = await apiClient.request<{ activity: any[] }>(`/security/sessions/${sessionId}/activity`);
      return response;
    } catch (error) {
      console.error('Failed to fetch session activity:', error);
      return { activity: [] };
    }
  },

  async endSession(sessionId: string): Promise<void> {
    return this.terminateSession(sessionId);
  },

  // Security Logs
  async getSecurityLogs(filters?: {
    severity?: string;
    event_type?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: SecurityLog[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }
      
      const query = params.toString();
      const response = await apiClient.request<{ logs: SecurityLog[]; total: number }>(
        `/security/logs${query ? `?${query}` : ''}`
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch security logs:', error);
      return { logs: [], total: 0 };
    }
  },

  // Security Policies
  async getSecurityPolicies(): Promise<{ policies: SecurityPolicy[] }> {
    try {
      const response = await apiClient.request<{ policies: SecurityPolicy[] }>('/security/policies');
      return response;
    } catch (error) {
      console.error('Failed to fetch security policies:', error);
      return { policies: [] };
    }
  },

  async updateSecurityPolicy(policyId: string, updates: Partial<SecurityPolicy>): Promise<{ policy: SecurityPolicy }> {
    try {
      const response = await apiClient.request<{ policy: SecurityPolicy }>(`/security/policies/${policyId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return response;
    } catch (error) {
      console.error('Failed to update security policy:', error);
      throw error;
    }
  },

  // Access Control
  async getAccessControlRules(): Promise<AccessControlRule[]> {
    try {
      const response = await apiClient.request<AccessControlRule[]>('/security/access-control/rules');
      return response;
    } catch (error) {
      console.error('Failed to fetch access control rules:', error);
      return [];
    }
  },

  async createAccessControlRule(rule: Omit<AccessControlRule, 'id' | 'created_at'>): Promise<AccessControlRule> {
    try {
      const response = await apiClient.request<AccessControlRule>('/security/access-control/rules', {
        method: 'POST',
        body: JSON.stringify(rule)
      });
      return response;
    } catch (error) {
      console.error('Failed to create access control rule:', error);
      throw error;
    }
  },

  async updateAccessControlRule(id: number, rule: Partial<AccessControlRule>): Promise<AccessControlRule> {
    try {
      const response = await apiClient.request<AccessControlRule>(`/security/access-control/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(rule)
      });
      return response;
    } catch (error) {
      console.error('Failed to update access control rule:', error);
      throw error;
    }
  },

  async deleteAccessControlRule(id: number): Promise<void> {
    try {
      await apiClient.request(`/security/access-control/rules/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete access control rule:', error);
      throw error;
    }
  },

  // Role Management
  async getRoles(): Promise<{ roles: Role[] }> {
    try {
      const response = await apiClient.request<{ roles: Role[] }>('/security/roles');
      return response;
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      return { roles: [] };
    }
  },

  async createRole(role: Omit<Role, 'id' | 'user_count' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    try {
      const response = await apiClient.request<Role>('/security/roles', {
        method: 'POST',
        body: JSON.stringify(role)
      });
      return response;
    } catch (error) {
      console.error('Failed to create role:', error);
      throw error;
    }
  },

  async updateRole(id: number, role: Partial<Role>): Promise<Role> {
    try {
      const response = await apiClient.request<Role>(`/security/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(role)
      });
      return response;
    } catch (error) {
      console.error('Failed to update role:', error);
      throw error;
    }
  },

  async deleteRole(id: number): Promise<void> {
    try {
      await apiClient.request(`/security/roles/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete role:', error);
      throw error;
    }
  },

  // Access Control Functions
  async getRolesData(): Promise<Role[]> {
    const { roles } = await this.getRoles();
    return roles;
  },

  async getAccessRules(): Promise<{ rules: AccessControlRule[] }> {
    const rules = await this.getAccessControlRules();
    return { rules };
  },

  async checkAccess(resource: string, action: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const response = await apiClient.request<{ allowed: boolean; reason?: string }>('/security/access-control/check', {
        method: 'POST',
        body: JSON.stringify({
          resource,
          action
        })
      });
      return response;
    } catch (error) {
      console.error('Failed to check access:', error);
      return { allowed: false, reason: 'error' };
    }
  }
};
