import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { BaseAgent } from './BaseAgent.js';

/**
 * NEXUS WEB SCRAPING AGENT - UNLEASHED ON THE INTERNET!
 * This agent can scrape ANY website, bypass restrictions, and gather intelligence
 */
export class WebScrapingAgent extends BaseAgent {
  constructor() {
    super('web-scraper', 'Web Intelligence Agent');
    this.browser = null;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    this.capabilities = [
      'web_scraping',
      'content_extraction',
      'javascript_execution',
      'form_submission',
      'screenshot_capture',
      'pdf_generation',
      'proxy_rotation',
      'anti_detection'
    ];
  }

  async initialize() {
    try {
      // Launch headless browser with stealth mode
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      console.log('🕷️ Web Scraping Agent initialized - READY TO CRAWL THE INTERNET!');
      return true;
    } catch (error) {
      console.error('Failed to initialize Web Scraping Agent:', error);
      return false;
    }
  }

  async executeTask(task) {
    const { action, url, options = {} } = task;

    switch (action) {
      case 'scrape_page':
        return await this.scrapePage(url, options);
      case 'scrape_multiple':
        return await this.scrapeMultiplePages(task.urls, options);
      case 'extract_data':
        return await this.extractStructuredData(url, options);
      case 'monitor_changes':
        return await this.monitorPageChanges(url, options);
      case 'search_web':
        return await this.searchWeb(task.query, options);
      case 'download_file':
        return await this.downloadFile(url, options);
      case 'screenshot':
        return await this.takeScreenshot(url, options);
      default:
        throw new Error(`Unknown web scraping action: ${action}`);
    }
  }

  async scrapePage(url, options = {}) {
    const page = await this.browser.newPage();
    
    try {
      // Set random user agent
      const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
      await page.setUserAgent(userAgent);

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to page
      await page.goto(url, { 
        waitUntil: options.waitUntil || 'networkidle2',
        timeout: options.timeout || 30000
      });

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }

      // Execute custom JavaScript if provided
      if (options.executeScript) {
        await page.evaluate(options.executeScript);
      }

      // Extract content
      const content = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          html: document.documentElement.outerHTML,
          text: document.body.innerText,
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.innerText,
            href: a.href
          })),
          images: Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt
          })),
          metadata: {
            description: document.querySelector('meta[name="description"]')?.content,
            keywords: document.querySelector('meta[name="keywords"]')?.content,
            author: document.querySelector('meta[name="author"]')?.content
          }
        };
      });

      // Custom selectors extraction
      if (options.selectors) {
        content.customData = {};
        for (const [key, selector] of Object.entries(options.selectors)) {
          content.customData[key] = await page.evaluate((sel) => {
            const elements = document.querySelectorAll(sel);
            return Array.from(elements).map(el => ({
              text: el.innerText,
              html: el.innerHTML,
              attributes: Object.fromEntries(
                Array.from(el.attributes).map(attr => [attr.name, attr.value])
              )
            }));
          }, selector);
        }
      }

      return {
        success: true,
        data: content,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      await page.close();
    }
  }

  async scrapeMultiplePages(urls, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 3;
    
    // Process URLs in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => this.scrapePage(url, options));
      const batchResults = await Promise.allSettled(batchPromises);
      
      results.push(...batchResults.map((result, index) => ({
        url: batch[index],
        result: result.status === 'fulfilled' ? result.value : { success: false, error: result.reason.message }
      })));

      // Delay between batches to be respectful
      if (i + concurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, options.delay || 1000));
      }
    }

    return {
      success: true,
      totalUrls: urls.length,
      results,
      timestamp: new Date().toISOString()
    };
  }

  async searchWeb(query, options = {}) {
    const searchEngines = {
      google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    };

    const engine = options.engine || 'google';
    const searchUrl = searchEngines[engine];

    if (!searchUrl) {
      throw new Error(`Unsupported search engine: ${engine}`);
    }

    const result = await this.scrapePage(searchUrl, {
      ...options,
      selectors: {
        results: engine === 'google' ? '.g' : engine === 'bing' ? '.b_algo' : '.result'
      }
    });

    return {
      success: result.success,
      query,
      engine,
      results: result.data?.customData?.results || [],
      timestamp: new Date().toISOString()
    };
  }

  async takeScreenshot(url, options = {}) {
    const page = await this.browser.newPage();
    
    try {
      await page.setViewport({ 
        width: options.width || 1920, 
        height: options.height || 1080 
      });

      await page.goto(url, { waitUntil: 'networkidle2' });

      const screenshot = await page.screenshot({
        type: options.format || 'png',
        fullPage: options.fullPage || false,
        quality: options.quality || 90
      });

      return {
        success: true,
        screenshot: screenshot.toString('base64'),
        url,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      await page.close();
    }
  }

  async downloadFile(url, options = {}) {
    try {
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        timeout: options.timeout || 30000,
        headers: {
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
        }
      });

      return {
        success: true,
        data: Buffer.from(response.data).toString('base64'),
        contentType: response.headers['content-type'],
        size: response.data.byteLength,
        url,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async monitorPageChanges(url, options = {}) {
    const interval = options.interval || 60000; // 1 minute default
    const maxChecks = options.maxChecks || 10;
    let checks = 0;
    let lastContent = null;

    const changes = [];

    while (checks < maxChecks) {
      const result = await this.scrapePage(url, options);
      
      if (result.success) {
        const currentContent = result.data.html;
        
        if (lastContent && currentContent !== lastContent) {
          changes.push({
            timestamp: new Date().toISOString(),
            changeDetected: true,
            contentLength: currentContent.length,
            previousLength: lastContent.length
          });
        }
        
        lastContent = currentContent;
      }

      checks++;
      
      if (checks < maxChecks) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    return {
      success: true,
      url,
      totalChecks: checks,
      changesDetected: changes.length,
      changes,
      timestamp: new Date().toISOString()
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      type: 'web-scraper',
      status: this.browser ? 'active' : 'inactive',
      capabilities: this.capabilities,
      browserActive: !!this.browser
    };
  }
}