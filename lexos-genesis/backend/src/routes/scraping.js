import express from 'express';
import advancedScrapingService from '../services/advancedScrapingService.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Get available scraping tools status
router.get('/tools/status', verifyToken, async (req, res) => {
  try {
    const status = advancedScrapingService.getToolsStatus();
    res.json({
      success: true,
      tools: status
    });
  } catch (error) {
    console.error('Tools status error:', error);
    res.status(500).json({ error: 'Failed to get tools status' });
  }
});

// Create and run Scrapy spider
router.post('/scrapy/spider', verifyToken, async (req, res) => {
  try {
    const {
      name,
      startUrls,
      allowedDomains,
      extractionRules,
      followLinks = true,
      maxDepth = 2,
      exportFormat = 'json'
    } = req.body;

    if (!name || !startUrls || !Array.isArray(startUrls)) {
      return res.status(400).json({ error: 'Name and startUrls array are required' });
    }

    const result = await advancedScrapingService.createScrapySpider({
      name,
      startUrls,
      allowedDomains,
      extractionRules,
      followLinks,
      maxDepth,
      exportFormat
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Scrapy spider error:', error);
    res.status(500).json({ error: error.message || 'Failed to run Scrapy spider' });
  }
});

// ZenRows scraping
router.post('/zenrows/scrape', verifyToken, async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await advancedScrapingService.scrapeWithZenRows(url, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('ZenRows scraping error:', error);
    res.status(500).json({ error: error.message || 'Failed to scrape with ZenRows' });
  }
});

// Crawl4AI ML-powered scraping
router.post('/crawl4ai/scrape', verifyToken, async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await advancedScrapingService.scrapeWithCrawl4AI(url, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Crawl4AI scraping error:', error);
    res.status(500).json({ error: error.message || 'Failed to scrape with Crawl4AI' });
  }
});

// AI-enhanced scraping
router.post('/ai-enhanced/scrape', verifyToken, async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await advancedScrapingService.aiEnhancedScraping(url, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('AI-enhanced scraping error:', error);
    res.status(500).json({ error: 'Failed to perform AI-enhanced scraping' });
  }
});

// Requests-HTML scraping
router.post('/requests-html/scrape', verifyToken, async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await advancedScrapingService.scrapeWithRequestsHTML(url, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Requests-HTML scraping error:', error);
    res.status(500).json({ error: error.message || 'Failed to scrape with Requests-HTML' });
  }
});

// MechanicalSoup form automation
router.post('/mechanicalsoup/form', verifyToken, async (req, res) => {
  try {
    const { url, formData, options = {} } = req.body;

    if (!url || !formData) {
      return res.status(400).json({ error: 'URL and formData are required' });
    }

    const result = await advancedScrapingService.automateFormWithMechanicalSoup(
      url,
      formData,
      options
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('MechanicalSoup form error:', error);
    res.status(500).json({ error: error.message || 'Failed to automate form' });
  }
});

// LXML parsing
router.post('/lxml/parse', verifyToken, async (req, res) => {
  try {
    const { html, options = {} } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    const result = await advancedScrapingService.parseWithLXML(html, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('LXML parsing error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse with LXML' });
  }
});

// Generate scraping code
router.post('/generate/code', verifyToken, async (req, res) => {
  try {
    const { requirements, options = {} } = req.body;

    if (!requirements) {
      return res.status(400).json({ error: 'Requirements are required' });
    }

    const result = await advancedScrapingService.generateScrapingCode(
      requirements,
      options
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Code generation error:', error);
    res.status(500).json({ error: 'Failed to generate scraping code' });
  }
});

// Parse content with AI
router.post('/ai/parse', verifyToken, async (req, res) => {
  try {
    const { content, prompt } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await advancedScrapingService.parseWithAI(content, prompt);

    res.json({
      success: true,
      parsed: result
    });
  } catch (error) {
    console.error('AI parsing error:', error);
    res.status(500).json({ error: 'Failed to parse with AI' });
  }
});

// Get tool recommendations
router.post('/recommend', verifyToken, async (req, res) => {
  try {
    const { requirements } = req.body;

    if (!requirements) {
      return res.status(400).json({ error: 'Requirements are required' });
    }

    const result = await advancedScrapingService.recommendTools(requirements);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Tool recommendation error:', error);
    res.status(500).json({ error: 'Failed to get tool recommendations' });
  }
});

// Batch scraping
router.post('/batch', verifyToken, async (req, res) => {
  try {
    const { tasks, options = {} } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Tasks array is required' });
    }

    if (tasks.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 tasks allowed per batch' });
    }

    const result = await advancedScrapingService.batchScrape(tasks, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Batch scraping error:', error);
    res.status(500).json({ error: 'Failed to perform batch scraping' });
  }
});

// Auto-select best tool and scrape
router.post('/auto', verifyToken, async (req, res) => {
  try {
    const { url, requirements, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Analyze requirements to select best tool
    let result;
    const reqLower = (requirements || '').toLowerCase();

    if (reqLower.includes('javascript') || reqLower.includes('captcha') || reqLower.includes('anti-bot')) {
      // Use ZenRows for anti-bot challenges
      result = await advancedScrapingService.scrapeWithZenRows(url, {
        ...options,
        javascript: true,
        premium: reqLower.includes('captcha')
      });
    } else if (reqLower.includes('form') || reqLower.includes('login') || reqLower.includes('submit')) {
      // Use MechanicalSoup for forms
      const formData = options.formData || {};
      result = await advancedScrapingService.automateFormWithMechanicalSoup(url, formData, options);
    } else if (reqLower.includes('crawl') || reqLower.includes('spider') || reqLower.includes('entire site')) {
      // Use Scrapy for crawling
      result = await advancedScrapingService.createScrapySpider({
        name: 'auto_spider',
        startUrls: [url],
        allowedDomains: [new URL(url).hostname],
        extractionRules: options.extractionRules || {},
        followLinks: true,
        maxDepth: options.maxDepth || 2
      });
    } else if (reqLower.includes('ml') || reqLower.includes('smart') || reqLower.includes('ai')) {
      // Use AI-enhanced scraping
      result = await advancedScrapingService.aiEnhancedScraping(url, options);
    } else {
      // Default to Requests-HTML for simple scraping
      result = await advancedScrapingService.scrapeWithRequestsHTML(url, options);
    }

    res.json({
      success: true,
      method: result.extractionMethod || 'auto-selected',
      ...result
    });
  } catch (error) {
    console.error('Auto scraping error:', error);
    res.status(500).json({ error: 'Failed to auto-scrape' });
  }
});

// Scraping templates/examples
router.get('/templates', async (req, res) => {
  res.json({
    success: true,
    templates: {
      ecommerce: {
        extractionRules: {
          title: 'h1.product-title',
          price: '.price-now',
          description: '.product-description',
          images: 'img.product-image::attr(src)',
          rating: '.rating-value',
          availability: '.stock-status'
        }
      },
      article: {
        extractionRules: {
          title: 'h1, article h1',
          author: '.author-name, .byline',
          date: 'time, .published-date',
          content: 'article .content, .article-body',
          tags: '.tag, .category'
        }
      },
      realestate: {
        extractionRules: {
          address: '.property-address',
          price: '.listing-price',
          bedrooms: '.bedrooms',
          bathrooms: '.bathrooms',
          sqft: '.square-feet',
          description: '.listing-description',
          images: '.gallery img::attr(src)'
        }
      },
      jobListing: {
        extractionRules: {
          title: '.job-title',
          company: '.company-name',
          location: '.job-location',
          salary: '.salary-range',
          description: '.job-description',
          requirements: '.requirements li',
          benefits: '.benefits li'
        }
      }
    }
  });
});

export default router;