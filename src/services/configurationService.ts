
import { apiClient } from './api';

export interface AccessLevel {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  accessLevel: string;
  lastActive: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface SecuritySetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  value?: any;
}

export interface ConfigurationData {
  accessLevels: AccessLevel[];
  familyMembers: FamilyMember[];
  securitySettings: SecuritySetting[];
}

class ConfigurationService {
  private config: ConfigurationData = {
    accessLevels: [],
    familyMembers: [],
    securitySettings: []
  };

  async loadConfiguration(): Promise<ConfigurationData> {
    try {
      const response = await apiClient.request<ConfigurationData>('/api/configuration');
      this.config = response;
      return response;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      // Return default configuration
      return this.getDefaultConfiguration();
    }
  }

  async saveConfiguration(config: Partial<ConfigurationData>): Promise<boolean> {
    try {
      await apiClient.request('/api/configuration', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      
      // Update local config
      Object.assign(this.config, config);
      return true;
    } catch (error) {
      console.error('Failed to save configuration:', error);
      return false;
    }
  }

  // Access Level methods
  async createAccessLevel(accessLevel: Omit<AccessLevel, 'id' | 'createdAt'>): Promise<AccessLevel> {
    try {
      const newLevel = await apiClient.request<AccessLevel>('/api/configuration/access-levels', {
        method: 'POST',
        body: JSON.stringify(accessLevel)
      });
      
      this.config.accessLevels.push(newLevel);
      return newLevel;
    } catch (error) {
      console.error('Failed to create access level:', error);
      throw error;
    }
  }

  async updateAccessLevel(id: string, updates: Partial<AccessLevel>): Promise<AccessLevel> {
    try {
      const updated = await apiClient.request<AccessLevel>(`/api/configuration/access-levels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      const index = this.config.accessLevels.findIndex(level => level.id === id);
      if (index !== -1) {
        this.config.accessLevels[index] = updated;
      }
      
      return updated;
    } catch (error) {
      console.error('Failed to update access level:', error);
      throw error;
    }
  }

  async deleteAccessLevel(id: string): Promise<boolean> {
    try {
      await apiClient.request(`/api/configuration/access-levels/${id}`, {
        method: 'DELETE'
      });
      
      this.config.accessLevels = this.config.accessLevels.filter(level => level.id !== id);
      return true;
    } catch (error) {
      console.error('Failed to delete access level:', error);
      return false;
    }
  }

  // Family Member methods
  async createFamilyMember(member: Omit<FamilyMember, 'id' | 'createdAt'>): Promise<FamilyMember> {
    try {
      const newMember = await apiClient.request<FamilyMember>('/api/configuration/family-members', {
        method: 'POST',
        body: JSON.stringify(member)
      });
      
      this.config.familyMembers.push(newMember);
      return newMember;
    } catch (error) {
      console.error('Failed to create family member:', error);
      throw error;
    }
  }

  async updateFamilyMember(id: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    try {
      const updated = await apiClient.request<FamilyMember>(`/api/configuration/family-members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      const index = this.config.familyMembers.findIndex(member => member.id === id);
      if (index !== -1) {
        this.config.familyMembers[index] = updated;
      }
      
      return updated;
    } catch (error) {
      console.error('Failed to update family member:', error);
      throw error;
    }
  }

  async deleteFamilyMember(id: string): Promise<boolean> {
    try {
      await apiClient.request(`/api/configuration/family-members/${id}`, {
        method: 'DELETE'
      });
      
      this.config.familyMembers = this.config.familyMembers.filter(member => member.id !== id);
      return true;
    } catch (error) {
      console.error('Failed to delete family member:', error);
      return false;
    }
  }

  // Security Settings methods
  async updateSecuritySetting(id: string, enabled: boolean, value?: any): Promise<boolean> {
    try {
      await apiClient.request(`/api/configuration/security-settings/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled, value })
      });
      
      const setting = this.config.securitySettings.find(s => s.id === id);
      if (setting) {
        setting.enabled = enabled;
        if (value !== undefined) {
          setting.value = value;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update security setting:', error);
      return false;
    }
  }

  private getDefaultConfiguration(): ConfigurationData {
    return {
      accessLevels: [
        {
          id: 'admin',
          name: 'Administrator',
          description: 'Full system access - for parents/guardians',
          permissions: ['*'],
          userCount: 2,
          color: 'bg-red-500'
        },
        {
          id: 'family',
          name: 'Family Member',
          description: 'Standard access for family members',
          permissions: ['system.view', 'agents.view', 'chat.use'],
          userCount: 3,
          color: 'bg-blue-500'
        },
        {
          id: 'child',
          name: 'Child',
          description: 'Limited access for children with content filtering',
          permissions: ['chat.use', 'games.play'],
          userCount: 2,
          color: 'bg-green-500'
        }
      ],
      familyMembers: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@family.com',
          accessLevel: 'admin',
          lastActive: '2 minutes ago',
          status: 'active'
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@family.com',
          accessLevel: 'family',
          lastActive: '1 hour ago',
          status: 'active'
        }
      ],
      securitySettings: [
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
          enabled: true,
          value: 30 // minutes
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
      ]
    };
  }

  getConfiguration(): ConfigurationData {
    return this.config;
  }
}

export const configurationService = new ConfigurationService();
