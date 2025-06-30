
import { apiClient } from './api';

export interface SecurityMetrics {
  overall: {
    blockedAttempts: number;
    suspiciousActivities: number;
    securityIncidents: number;
    totalScans: number;
    blockedIPs: number;
    activeSessions: number;
  };
  last24Hours: {
    totalEvents: number;
    failedLogins: number;
    successfulLogins: number;
    blockedAttempts: number;
    suspiciousActivities: number;
  };
  last7Days: {
    totalEvents: number;
    failedLogins: number;
    successfulLogins: number;
    blockedAttempts: number;
    suspiciousActivities: number;
  };
  threatLevel: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  securityScore: number;
}

export interface SecurityLog {
  id: string;
  type: string;
  timestamp: number;
  ip?: string;
  userId?: string;
  username?: string;
  reason?: string;
  [key: string]: any;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  enabled: boolean;
  rules: Record<string, any>;
}

export interface BlockedIP {
  ip: string;
  reason: string;
  timestamp: number;
  permanent: boolean;
  until?: number;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inherits: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface AccessRule {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  roles: string[];
  resources: string[];
  actions: string[];
  conditions: any[];
  createdAt: number;
  updatedAt?: number;
}

export interface Session {
  id: string;
  userId: string;
  username: string;
  role: string;
  ip: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

export interface Resource {
  id: string;
  name: string;
  actions: string[];
}

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface SecurityReport {
  generatedAt: number;
  systemInfo: {
    name: string;
    version: string;
  };
  metrics: SecurityMetrics;
  policies: SecurityPolicy[];
  recentEvents: SecurityLog[];
  recommendations: {
    severity: string;
    category: string;
    message: string;
    action: string;
  }[];
}

class SecurityService {
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const response = await apiClient.request('/security/metrics', { method: 'GET' });
    return response.data;
  }

  async getSecurityLogs(params?: {
    type?: string;
    startTime?: number;
    endTime?: number;
    ip?: string;
    userId?: string;
    limit?: number;
  }): Promise<{ logs: SecurityLog[] }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const query = queryParams.toString();
    const response = await apiClient.request(`/security/logs${query ? `?${query}` : ''}`, { method: 'GET' });
    return response.data;
  }

  async getSecurityPolicies(): Promise<{ policies: SecurityPolicy[] }> {
    const response = await apiClient.request('/security/policies', { method: 'GET' });
    return response.data;
  }

  async updateSecurityPolicy(policyId: string, updates: Partial<SecurityPolicy>): Promise<{ policy: SecurityPolicy }> {
    const response = await apiClient.request(`/security/policies/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async getBlockedIPs(): Promise<{ blockedIPs: BlockedIP[] }> {
    const response = await apiClient.request('/security/blocked-ips', { method: 'GET' });
    return response.data;
  }

  async blockIP(ip: string, duration?: number, reason?: string): Promise<{ success: boolean; blockInfo: BlockedIP }> {
    const response = await apiClient.request('/security/block-ip', {
      method: 'POST',
      body: JSON.stringify({ ip, duration, reason }),
    });
    return response.data;
  }

  async unblockIP(ip: string): Promise<{ success: boolean }> {
    const response = await apiClient.request(`/security/block-ip/${ip}`, { method: 'DELETE' });
    return response.data;
  }

  async setupMFA(): Promise<{ mfaSetup: MFASetup }> {
    const response = await apiClient.request('/security/mfa/setup', { method: 'POST' });
    return response.data;
  }

  async verifyMFA(token: string, secret: string): Promise<{ valid: boolean }> {
    const response = await apiClient.request('/security/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ token, secret }),
    });
    return response.data;
  }

  async getSecurityReport(): Promise<{ report: SecurityReport }> {
    const response = await apiClient.request('/security/report', { method: 'GET' });
    return response.data;
  }

  // Access Control methods
  async getRoles(): Promise<{ roles: Role[] }> {
    const response = await apiClient.request('/access/roles', { method: 'GET' });
    return response.data;
  }

  async createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ role: Role }> {
    const response = await apiClient.request('/access/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
    return response.data;
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<{ role: Role }> {
    const response = await apiClient.request(`/access/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async deleteRole(roleId: string): Promise<{ success: boolean }> {
    const response = await apiClient.request(`/access/roles/${roleId}`, { method: 'DELETE' });
    return response.data;
  }

  async getAccessRules(): Promise<{ rules: AccessRule[] }> {
    const response = await apiClient.request('/access/rules', { method: 'GET' });
    return response.data;
  }

  async createAccessRule(ruleData: Omit<AccessRule, 'createdAt' | 'updatedAt'>): Promise<{ rule: AccessRule }> {
    const response = await apiClient.request('/access/rules', {
      method: 'POST',
      body: JSON.stringify(ruleData),
    });
    return response.data;
  }

  async updateAccessRule(ruleId: string, updates: Partial<AccessRule>): Promise<{ rule: AccessRule }> {
    const response = await apiClient.request(`/access/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async deleteAccessRule(ruleId: string): Promise<{ success: boolean }> {
    const response = await apiClient.request(`/access/rules/${ruleId}`, { method: 'DELETE' });
    return response.data;
  }

  async getActiveSessions(): Promise<{ sessions: Session[] }> {
    const response = await apiClient.request('/access/sessions', { method: 'GET' });
    return response.data;
  }

  async getSessionActivity(sessionId: string): Promise<{ activity: any[] }> {
    const response = await apiClient.request(`/access/sessions/${sessionId}/activity`, { method: 'GET' });
    return response.data;
  }

  async endSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await apiClient.request(`/access/sessions/${sessionId}`, { method: 'DELETE' });
    return response.data;
  }

  async getResources(): Promise<{ resources: Resource[] }> {
    const response = await apiClient.request('/access/resources', { method: 'GET' });
    return response.data;
  }

  async checkAccess(resource: string, action: string): Promise<{ allowed: boolean; reason: string }> {
    const response = await apiClient.request('/access/check', {
      method: 'POST',
      body: JSON.stringify({ resource, action }),
    });
    return response.data;
  }
}

export const securityService = new SecurityService();
