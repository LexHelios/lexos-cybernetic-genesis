import express from 'express';
import browserAutomationService from '../services/browserAutomationService.js';
import { verifyToken } from './auth.js';
import path from 'path';

const router = express.Router();

// Scrape and analyze a webpage
router.post('/scrape', verifyToken, async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const result = await browserAutomationService.scrapeAndAnalyze(url, options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape webpage' });
  }
});

// Generate and run automated test
router.post('/test/generate', verifyToken, async (req, res) => {
  try {
    const { url, testDescription, options = {} } = req.body;
    
    if (!url || !testDescription) {
      return res.status(400).json({ error: 'URL and test description are required' });
    }
    
    const result = await browserAutomationService.generateAndRunTest(
      url,
      testDescription,
      options
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ error: 'Failed to generate and run test' });
  }
});

// Automate form filling
router.post('/form/automate', verifyToken, async (req, res) => {
  try {
    const { url, formData, options = {} } = req.body;
    
    if (!url || !formData) {
      return res.status(400).json({ error: 'URL and form data are required' });
    }
    
    const result = await browserAutomationService.automateForm(url, formData, options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Form automation error:', error);
    res.status(500).json({ error: 'Failed to automate form' });
  }
});

// Generate PDF from webpage
router.post('/pdf/generate', verifyToken, async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const result = await browserAutomationService.generatePDF(url, options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Record browser session
router.post('/record', verifyToken, async (req, res) => {
  try {
    const { url, duration = 30000, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (duration > 300000) { // Max 5 minutes
      return res.status(400).json({ error: 'Maximum recording duration is 5 minutes' });
    }
    
    const result = await browserAutomationService.recordSession(url, duration, options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Recording error:', error);
    res.status(500).json({ error: 'Failed to record session' });
  }
});

// Test accessibility
router.post('/accessibility/test', verifyToken, async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const result = await browserAutomationService.testAccessibility(url, options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Accessibility testing error:', error);
    res.status(500).json({ error: 'Failed to test accessibility' });
  }
});

// Test performance
router.post('/performance/test', verifyToken, async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const result = await browserAutomationService.testPerformance(url, options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Performance testing error:', error);
    res.status(500).json({ error: 'Failed to test performance' });
  }
});

// Monitor website changes
router.post('/monitor/start', verifyToken, async (req, res) => {
  try {
    const { url, selectors = [], interval = 3600000 } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (interval < 60000) { // Minimum 1 minute
      return res.status(400).json({ error: 'Minimum interval is 1 minute' });
    }
    
    const monitor = await browserAutomationService.monitorChanges(url, selectors, interval);
    
    res.json({
      success: true,
      message: 'Monitoring started',
      interval,
      url
    });
  } catch (error) {
    console.error('Monitoring error:', error);
    res.status(500).json({ error: 'Failed to start monitoring' });
  }
});

// Batch scraping
router.post('/batch/scrape', verifyToken, async (req, res) => {
  try {
    const { urls, options = {} } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'URLs array is required' });
    }
    
    if (urls.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 URLs allowed per batch' });
    }
    
    const results = [];
    
    for (const url of urls) {
      try {
        const result = await browserAutomationService.scrapeAndAnalyze(url, {
          ...options,
          analyze: false // Skip AI analysis for batch operations
        });
        results.push({ url, success: true, data: result });
      } catch (error) {
        results.push({ url, success: false, error: error.message });
      }
    }
    
    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Batch scraping error:', error);
    res.status(500).json({ error: 'Failed to perform batch scraping' });
  }
});

// Custom script execution
router.post('/execute', verifyToken, async (req, res) => {
  try {
    const { url, script, options = {} } = req.body;
    
    if (!url || !script) {
      return res.status(400).json({ error: 'URL and script are required' });
    }
    
    const { engine = 'puppeteer' } = options;
    let browser, page;
    
    try {
      // Launch browser
      if (engine === 'puppeteer') {
        browser = await browserAutomationService.launchPuppeteer(options);
        page = await browser.newPage();
      } else {
        browser = await browserAutomationService.launchPlaywright('chromium', options);
        page = await browser.newPage();
      }
      
      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Execute custom script
      const result = await page.evaluate(script);
      
      // Take screenshot
      const screenshotPath = path.join(
        browserAutomationService.screenshotDir,
        `custom_${Date.now()}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      res.json({
        success: true,
        result,
        screenshot: screenshotPath,
        url: page.url()
      });
      
    } finally {
      if (page) await page.close();
    }
  } catch (error) {
    console.error('Script execution error:', error);
    res.status(500).json({ error: 'Failed to execute script' });
  }
});

// Get automation capabilities
router.get('/capabilities', async (req, res) => {
  res.json({
    success: true,
    capabilities: {
      engines: ['puppeteer', 'playwright'],
      browsers: ['chromium', 'firefox', 'webkit'],
      features: [
        'web-scraping',
        'form-automation',
        'test-generation',
        'pdf-generation',
        'session-recording',
        'accessibility-testing',
        'performance-testing',
        'change-monitoring',
        'ai-analysis'
      ],
      limits: {
        maxBatchSize: 10,
        maxRecordingDuration: 300000, // 5 minutes
        minMonitoringInterval: 60000 // 1 minute
      }
    }
  });
});

// Cleanup old files
router.post('/cleanup', verifyToken, async (req, res) => {
  try {
    const { olderThanHours = 24 } = req.body;
    
    await browserAutomationService.cleanup(olderThanHours);
    
    res.json({
      success: true,
      message: `Cleaned up files older than ${olderThanHours} hours`
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup files' });
  }
});

export default router;