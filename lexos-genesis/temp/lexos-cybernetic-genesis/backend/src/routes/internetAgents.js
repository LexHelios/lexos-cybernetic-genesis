import express from 'express';

const router = express.Router();

// Get all internet agents status
router.get('/status', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const internetAgents = [];
    
    for (const [id, agent] of agentManager.agents) {
      if (['web-scraper', 'api-monitor', 'social-intel', 'network-recon'].includes(agent.id)) {
        internetAgents.push(agent.getStatus());
      }
    }

    res.json({
      success: true,
      agents: internetAgents,
      totalAgents: internetAgents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Web Scraping Agent endpoints
router.post('/web-scraper/scrape', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const webScraper = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'web-scraper');

    if (!webScraper) {
      return res.status(404).json({ error: 'Web scraping agent not found' });
    }

    const { url, options = {} } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await webScraper.executeTask({
      action: 'scrape_page',
      url,
      options
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/web-scraper/search', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const webScraper = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'web-scraper');

    if (!webScraper) {
      return res.status(404).json({ error: 'Web scraping agent not found' });
    }

    const { query, options = {} } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await webScraper.executeTask({
      action: 'search_web',
      query,
      options
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/web-scraper/screenshot', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const webScraper = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'web-scraper');

    if (!webScraper) {
      return res.status(404).json({ error: 'Web scraping agent not found' });
    }

    const { url, options = {} } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await webScraper.executeTask({
      action: 'screenshot',
      url,
      options
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Monitor Agent endpoints
router.post('/api-monitor/test', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const apiMonitor = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'api-monitor');

    if (!apiMonitor) {
      return res.status(404).json({ error: 'API monitor agent not found' });
    }

    const { endpoint, options = {} } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const result = await apiMonitor.executeTask({
      action: 'test_endpoint',
      endpoint,
      options
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api-monitor/security-scan', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const apiMonitor = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'api-monitor');

    if (!apiMonitor) {
      return res.status(404).json({ error: 'API monitor agent not found' });
    }

    const { baseUrl, options = {} } = req.body;
    if (!baseUrl) {
      return res.status(400).json({ error: 'Base URL is required' });
    }

    const result = await apiMonitor.executeTask({
      action: 'scan_security',
      baseUrl,
      options
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api-monitor/rate-limit-test', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const apiMonitor = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'api-monitor');

    if (!apiMonitor) {
      return res.status(404).json({ error: 'API monitor agent not found' });
    }

    const { endpoint, options = {} } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const result = await apiMonitor.executeTask({
      action: 'test_rate_limits',
      endpoint,
      options
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Social Intelligence Agent endpoints
router.get('/social-intel/trends', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const socialIntel = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'social-intel');

    if (!socialIntel) {
      return res.status(404).json({ error: 'Social intelligence agent not found' });
    }

    const { platform = 'all', limit = 30 } = req.query;

    const result = await socialIntel.executeTask({
      action: 'monitor_trends',
      platform,
      options: { limit: parseInt(limit) }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/social-intel/reddit/:subreddit', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const socialIntel = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'social-intel');

    if (!socialIntel) {
      return res.status(404).json({ error: 'Social intelligence agent not found' });
    }

    const { subreddit } = req.params;
    const { limit = 25 } = req.query;

    const result = await socialIntel.executeTask({
      action: 'monitor_reddit',
      subreddit,
      options: { limit: parseInt(limit) }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/social-intel/sentiment', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const socialIntel = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'social-intel');

    if (!socialIntel) {
      return res.status(404).json({ error: 'Social intelligence agent not found' });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await socialIntel.executeTask({
      action: 'analyze_sentiment',
      content
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Network Reconnaissance Agent endpoints
router.post('/network-recon/port-scan', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const networkRecon = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'network-recon');

    if (!networkRecon) {
      return res.status(404).json({ error: 'Network reconnaissance agent not found' });
    }

    const { target, options = {} } = req.body;
    if (!target) {
      return res.status(400).json({ error: 'Target is required' });
    }

    const result = await networkRecon.executeTask({
      action: 'port_scan',
      target,
      options
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/network-recon/subdomain-discovery', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const networkRecon = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'network-recon');

    if (!networkRecon) {
      return res.status(404).json({ error: 'Network reconnaissance agent not found' });
    }

    const { domain, options = {} } = req.body;
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const result = await networkRecon.executeTask({
      action: 'subdomain_discovery',
      domain,
      options
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/network-recon/whois', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const networkRecon = Array.from(agentManager.agents.values())
      .find(agent => agent.id === 'network-recon');

    if (!networkRecon) {
      return res.status(404).json({ error: 'Network reconnaissance agent not found' });
    }

    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const result = await networkRecon.executeTask({
      action: 'whois_lookup',
      domain
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch operations
router.post('/batch/web-intelligence', async (req, res) => {
  try {
    const agentManager = req.app.get('agentManager');
    const { targets, operations = ['scrape', 'security_scan', 'social_trends'] } = req.body;

    if (!targets || !Array.isArray(targets)) {
      return res.status(400).json({ error: 'Targets array is required' });
    }

    const results = {};

    // Web scraping
    if (operations.includes('scrape')) {
      const webScraper = Array.from(agentManager.agents.values())
        .find(agent => agent.id === 'web-scraper');
      
      if (webScraper) {
        results.scraping = await webScraper.executeTask({
          action: 'scrape_multiple',
          urls: targets,
          options: { concurrency: 3 }
        });
      }
    }

    // Security scanning
    if (operations.includes('security_scan')) {
      const apiMonitor = Array.from(agentManager.agents.values())
        .find(agent => agent.id === 'api-monitor');
      
      if (apiMonitor) {
        results.security = [];
        for (const target of targets.slice(0, 5)) { // Limit to 5 for security scans
          const scanResult = await apiMonitor.executeTask({
            action: 'scan_security',
            baseUrl: target
          });
          results.security.push({ target, result: scanResult });
        }
      }
    }

    // Social trends
    if (operations.includes('social_trends')) {
      const socialIntel = Array.from(agentManager.agents.values())
        .find(agent => agent.id === 'social-intel');
      
      if (socialIntel) {
        results.socialTrends = await socialIntel.executeTask({
          action: 'monitor_trends',
          platform: 'all'
        });
      }
    }

    res.json({
      success: true,
      operations,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;