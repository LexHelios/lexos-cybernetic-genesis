
import express from 'express';
const router = express.Router();

// In-memory storage for demo purposes
// In production, this would be stored in a database
let configurationData = {
  accessLevels: [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access - for parents/guardians',
      permissions: ['*'],
      userCount: 2,
      color: 'bg-red-500',
      createdAt: new Date().toISOString()
    },
    {
      id: 'family',
      name: 'Family Member',
      description: 'Standard access for family members',
      permissions: ['system.view', 'agents.view', 'chat.use'],
      userCount: 3,
      color: 'bg-blue-500',
      createdAt: new Date().toISOString()
    },
    {
      id: 'child',
      name: 'Child',
      description: 'Limited access for children with content filtering',
      permissions: ['chat.use', 'games.play'],
      userCount: 2,
      color: 'bg-green-500',
      createdAt: new Date().toISOString()
    }
  ],
  familyMembers: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@family.com',
      accessLevel: 'admin',
      lastActive: '2 minutes ago',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Jane Doe',
      email: 'jane@family.com',
      accessLevel: 'family',
      lastActive: '1 hour ago',
      status: 'active',
      createdAt: new Date().toISOString()
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
      value: 30
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

// Get all configuration
router.get('/', (req, res) => {
  res.json(configurationData);
});

// Save configuration
router.post('/', (req, res) => {
  try {
    const updates = req.body;
    Object.assign(configurationData, updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Access Level endpoints
router.post('/access-levels', (req, res) => {
  try {
    const newLevel = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    configurationData.accessLevels.push(newLevel);
    res.json(newLevel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/access-levels/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = configurationData.accessLevels.findIndex(level => level.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Access level not found' });
    }
    
    configurationData.accessLevels[index] = {
      ...configurationData.accessLevels[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    res.json(configurationData.accessLevels[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/access-levels/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = configurationData.accessLevels.findIndex(level => level.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Access level not found' });
    }
    
    configurationData.accessLevels.splice(index, 1);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Family Member endpoints
router.post('/family-members', (req, res) => {
  try {
    const newMember = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    configurationData.familyMembers.push(newMember);
    res.json(newMember);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/family-members/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = configurationData.familyMembers.findIndex(member => member.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    
    configurationData.familyMembers[index] = {
      ...configurationData.familyMembers[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    res.json(configurationData.familyMembers[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/family-members/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = configurationData.familyMembers.findIndex(member => member.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    
    configurationData.familyMembers.splice(index, 1);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Security Settings endpoints
router.put('/security-settings/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, value } = req.body;
    
    const setting = configurationData.securitySettings.find(s => s.id === id);
    if (!setting) {
      return res.status(404).json({ error: 'Security setting not found' });
    }
    
    setting.enabled = enabled;
    if (value !== undefined) {
      setting.value = value;
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
