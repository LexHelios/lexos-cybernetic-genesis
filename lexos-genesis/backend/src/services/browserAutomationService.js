import puppeteer from 'puppeteer';
import playwright from 'playwright';
import grokService from './grokService.js';
import multiModelCodingService from './multiModelCodingService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BrowserAutomationService {
  constructor() {
    this.puppeteerBrowser = null;
    this.playwrightBrowsers = {
      chromium: null,
      firefox: null,
      webkit: null
    };
    this.screenshotDir = path.join(__dirname, '../../temp/screenshots');
    this.recordingsDir = path.join(__dirname, '../../temp/recordings');
    this.initialize();
  }

  async initialize() {
    // Create directories
    await fs.mkdir(this.screenshotDir, { recursive: true });
    await fs.mkdir(this.recordingsDir, { recursive: true });
    console.log('Browser automation service initialized');
  }

  // Puppeteer methods
  async launchPuppeteer(options = {}) {
    if (!this.puppeteerBrowser) {
      this.puppeteerBrowser = await puppeteer.launch({
        headless: options.headless !== false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        ...options
      });
    }
    return this.puppeteerBrowser;
  }

  async closePuppeteer() {
    if (this.puppeteerBrowser) {
      await this.puppeteerBrowser.close();
      this.puppeteerBrowser = null;
    }
  }

  // Playwright methods
  async launchPlaywright(browserType = 'chromium', options = {}) {
    if (!this.playwrightBrowsers[browserType]) {
      const browser = await playwright[browserType].launch({
        headless: options.headless !== false,
        ...options
      });
      this.playwrightBrowsers[browserType] = browser;
    }
    return this.playwrightBrowsers[browserType];
  }

  async closePlaywright(browserType = 'chromium') {
    if (this.playwrightBrowsers[browserType]) {
      await this.playwrightBrowsers[browserType].close();
      this.playwrightBrowsers[browserType] = null;
    }
  }

  // Web scraping with AI analysis
  async scrapeAndAnalyze(url, options = {}) {
    const {
      engine = 'puppeteer',
      browserType = 'chromium',
      waitFor = 'networkidle2',
      screenshot = true,
      fullPage = true,
      analyze = true,
      extractors = {}
    } = options;

    let browser, page, result;

    try {
      // Launch browser based on engine choice
      if (engine === 'puppeteer') {
        browser = await this.launchPuppeteer(options);
        page = await browser.newPage();
      } else {
        browser = await this.launchPlaywright(browserType, options);
        page = await browser.newPage();
      }

      // Set viewport
      await page.setViewport({
        width: options.width || 1920,
        height: options.height || 1080
      });

      // Navigate to URL
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { 
        waitUntil: waitFor,
        timeout: options.timeout || 30000 
      });

      // Wait for any specific selectors
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector);
      }

      // Extract data
      result = {
        url,
        title: await page.title(),
        timestamp: new Date().toISOString(),
        data: {}
      };

      // Run custom extractors
      for (const [key, extractor] of Object.entries(extractors)) {
        try {
          if (typeof extractor === 'string') {
            // CSS selector
            result.data[key] = await page.$$eval(extractor, elements => 
              elements.map(el => el.textContent?.trim())
            );
          } else if (typeof extractor === 'function') {
            // Custom function
            result.data[key] = await page.evaluate(extractor);
          }
        } catch (error) {
          console.error(`Extractor ${key} failed:`, error.message);
          result.data[key] = null;
        }
      }

      // Extract all text content if no specific extractors
      if (Object.keys(extractors).length === 0) {
        result.data.text = await page.evaluate(() => document.body.innerText);
        result.data.links = await page.$$eval('a', links => 
          links.map(link => ({
            text: link.textContent?.trim(),
            href: link.href
          }))
        );
        result.data.images = await page.$$eval('img', images => 
          images.map(img => ({
            src: img.src,
            alt: img.alt,
            title: img.title
          }))
        );
      }

      // Take screenshot
      if (screenshot) {
        const screenshotPath = path.join(
          this.screenshotDir, 
          `${Date.now()}_${url.replace(/[^a-z0-9]/gi, '_')}.png`
        );
        await page.screenshot({ 
          path: screenshotPath,
          fullPage 
        });
        result.screenshot = screenshotPath;

        // Analyze screenshot with AI if requested
        if (analyze && result.screenshot) {
          const analysis = await this.analyzePageWithAI(
            result.screenshot,
            result.data.text || '',
            options.analysisPrompt
          );
          result.aiAnalysis = analysis;
        }
      }

      // Get page metrics
      if (engine === 'puppeteer') {
        result.metrics = await page.metrics();
      }

      return result;

    } catch (error) {
      console.error('Web scraping error:', error);
      throw error;
    } finally {
      if (page && !options.keepOpen) {
        await page.close();
      }
    }
  }

  // Analyze page with AI vision
  async analyzePageWithAI(screenshotPath, pageText = '', customPrompt = '') {
    try {
      const defaultPrompt = `Analyze this webpage screenshot and text content. Provide insights on:
1. Page layout and design
2. User experience elements
3. Content structure and organization
4. Accessibility considerations
5. Key information and CTAs
6. Technical observations
${customPrompt ? '\nAdditional analysis: ' + customPrompt : ''}

Page text content:
${pageText.substring(0, 2000)}...`;

      const analysis = await grokService.analyzeImageWithText(
        `file://${screenshotPath}`,
        defaultPrompt
      );

      return analysis.content;
    } catch (error) {
      console.error('AI analysis error:', error);
      return null;
    }
  }

  // Automated testing with AI-generated scripts
  async generateAndRunTest(url, testDescription, options = {}) {
    try {
      // Generate test script using AI
      const testScript = await multiModelCodingService.solveCodingTask(
        `Generate a Puppeteer/Playwright test script for: ${testDescription}
        
        Target URL: ${url}
        
        Requirements:
        1. Use modern async/await syntax
        2. Include proper error handling
        3. Add meaningful assertions
        4. Include comments explaining each step
        5. Make it robust with proper waits
        
        Return only the executable JavaScript code.`,
        '',
        { language: 'javascript' }
      );

      // Create test function from generated code
      const testFunction = new Function('page', 'expect', testScript.content);

      // Run the test
      const result = await this.runGeneratedTest(url, testFunction, options);
      
      return {
        success: result.success,
        testScript: testScript.content,
        results: result.results,
        screenshot: result.screenshot,
        error: result.error
      };

    } catch (error) {
      console.error('Test generation/execution error:', error);
      throw error;
    }
  }

  // Run a generated test
  async runGeneratedTest(url, testFunction, options = {}) {
    const { engine = 'playwright', browserType = 'chromium' } = options;
    let browser, page;

    try {
      // Launch browser
      if (engine === 'puppeteer') {
        browser = await this.launchPuppeteer(options);
        page = await browser.newPage();
      } else {
        browser = await this.launchPlaywright(browserType, options);
        page = await browser.newPage();
      }

      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Simple expect function for assertions
      const expect = (value) => ({
        toBe: (expected) => {
          if (value !== expected) {
            throw new Error(`Expected ${expected} but got ${value}`);
          }
        },
        toContain: (substring) => {
          if (!value.includes(substring)) {
            throw new Error(`Expected "${value}" to contain "${substring}"`);
          }
        },
        toBeTruthy: () => {
          if (!value) {
            throw new Error(`Expected truthy value but got ${value}`);
          }
        }
      });

      // Run the test
      const results = await testFunction(page, expect);

      // Take final screenshot
      const screenshotPath = path.join(
        this.screenshotDir,
        `test_${Date.now()}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });

      return {
        success: true,
        results,
        screenshot: screenshotPath
      };

    } catch (error) {
      // Take error screenshot
      let errorScreenshot = null;
      if (page) {
        errorScreenshot = path.join(
          this.screenshotDir,
          `error_${Date.now()}.png`
        );
        await page.screenshot({ path: errorScreenshot, fullPage: true });
      }

      return {
        success: false,
        error: error.message,
        screenshot: errorScreenshot
      };

    } finally {
      if (page && !options.keepOpen) {
        await page.close();
      }
    }
  }

  // Form automation
  async automateForm(url, formData, options = {}) {
    const { engine = 'playwright', submitButton = 'button[type="submit"]' } = options;
    let browser, page;

    try {
      // Launch browser
      if (engine === 'puppeteer') {
        browser = await this.launchPuppeteer(options);
        page = await browser.newPage();
      } else {
        browser = await this.launchPlaywright('chromium', options);
        page = await browser.newPage();
      }

      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Fill form fields
      for (const [selector, value] of Object.entries(formData)) {
        const element = await page.$(selector);
        if (element) {
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          const type = await element.evaluate(el => el.type);

          if (tagName === 'select') {
            await page.selectOption(selector, value);
          } else if (type === 'checkbox' || type === 'radio') {
            if (value) {
              await page.check(selector);
            }
          } else {
            await page.fill(selector, value.toString());
          }
        }
      }

      // Take pre-submission screenshot
      const preSubmitScreenshot = path.join(
        this.screenshotDir,
        `form_pre_${Date.now()}.png`
      );
      await page.screenshot({ path: preSubmitScreenshot });

      // Submit form
      if (submitButton) {
        await page.click(submitButton);
        await page.waitForLoadState('networkidle');
      }

      // Take post-submission screenshot
      const postSubmitScreenshot = path.join(
        this.screenshotDir,
        `form_post_${Date.now()}.png`
      );
      await page.screenshot({ path: postSubmitScreenshot });

      // Get result
      const result = {
        success: true,
        url: page.url(),
        title: await page.title(),
        screenshots: {
          preSubmit: preSubmitScreenshot,
          postSubmit: postSubmitScreenshot
        }
      };

      // Check for success/error messages
      const messages = await page.$$eval(
        '.success, .error, .alert, [role="alert"]',
        elements => elements.map(el => ({
          type: el.className,
          text: el.textContent?.trim()
        }))
      );
      
      if (messages.length > 0) {
        result.messages = messages;
      }

      return result;

    } catch (error) {
      console.error('Form automation error:', error);
      throw error;
    } finally {
      if (page && !options.keepOpen) {
        await page.close();
      }
    }
  }

  // PDF generation from webpage
  async generatePDF(url, options = {}) {
    const { engine = 'puppeteer' } = options;
    let browser, page;

    try {
      // Launch browser
      if (engine === 'puppeteer') {
        browser = await this.launchPuppeteer(options);
        page = await browser.newPage();
      } else {
        browser = await this.launchPlaywright('chromium', options);
        page = await browser.newPage();
      }

      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Generate PDF
      const pdfPath = path.join(
        this.screenshotDir,
        `${Date.now()}_${url.replace(/[^a-z0-9]/gi, '_')}.pdf`
      );

      const pdfOptions = {
        path: pdfPath,
        format: options.format || 'A4',
        printBackground: options.printBackground !== false,
        margin: options.margin || {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        ...options.pdfOptions
      };

      await page.pdf(pdfOptions);

      return {
        success: true,
        path: pdfPath,
        url,
        title: await page.title()
      };

    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    } finally {
      if (page && !options.keepOpen) {
        await page.close();
      }
    }
  }

  // Record page interactions
  async recordSession(url, duration = 30000, options = {}) {
    const browser = await this.launchPlaywright('chromium', {
      ...options,
      headless: false // Recording works better with headful mode
    });

    try {
      const context = await browser.newContext({
        recordVideo: {
          dir: this.recordingsDir,
          size: { width: 1920, height: 1080 }
        }
      });

      const page = await context.newPage();
      await page.goto(url);

      // Record for specified duration
      await new Promise(resolve => setTimeout(resolve, duration));

      // Close to save video
      await context.close();

      // Get video path
      const videos = await fs.readdir(this.recordingsDir);
      const latestVideo = videos
        .filter(f => f.endsWith('.webm'))
        .sort((a, b) => b.localeCompare(a))[0];

      return {
        success: true,
        videoPath: path.join(this.recordingsDir, latestVideo),
        duration
      };

    } catch (error) {
      console.error('Recording error:', error);
      throw error;
    }
  }

  // Monitor website changes
  async monitorChanges(url, selectors = [], interval = 3600000) {
    const checkForChanges = async () => {
      try {
        const result = await this.scrapeAndAnalyze(url, {
          extractors: selectors.reduce((acc, sel) => {
            acc[sel] = sel;
            return acc;
          }, {}),
          analyze: false
        });

        // Compare with previous snapshot
        // This would need a database to store snapshots
        console.log(`Monitored ${url} at ${new Date().toISOString()}`);
        
        return result;
      } catch (error) {
        console.error(`Monitoring error for ${url}:`, error);
      }
    };

    // Initial check
    await checkForChanges();

    // Set up interval
    const intervalId = setInterval(checkForChanges, interval);
    
    return {
      stop: () => clearInterval(intervalId),
      interval
    };
  }

  // Accessibility testing
  async testAccessibility(url, options = {}) {
    const browser = await this.launchPlaywright('chromium', options);
    
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      // Inject axe-core for accessibility testing
      await page.addScriptTag({
        url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js'
      });

      // Run accessibility tests
      const results = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.axe.run((err, results) => {
            if (err) throw err;
            resolve(results);
          });
        });
      });

      // Take screenshot with violations highlighted
      if (results.violations.length > 0) {
        // Highlight violations on page
        await page.evaluate((violations) => {
          violations.forEach(violation => {
            violation.nodes.forEach(node => {
              const elements = Array.from(document.querySelectorAll(node.target.join(',')));
              elements.forEach(el => {
                el.style.outline = '3px solid red';
                el.style.outlineOffset = '2px';
              });
            });
          });
        }, results.violations);

        const screenshotPath = path.join(
          this.screenshotDir,
          `accessibility_${Date.now()}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        results.screenshot = screenshotPath;
      }

      return {
        success: true,
        url,
        timestamp: new Date().toISOString(),
        results: {
          violations: results.violations,
          passes: results.passes.length,
          incomplete: results.incomplete.length,
          inapplicable: results.inapplicable.length
        }
      };

    } catch (error) {
      console.error('Accessibility testing error:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  // Performance testing
  async testPerformance(url, options = {}) {
    const browser = await this.launchPuppeteer(options);
    
    try {
      const page = await browser.newPage();
      
      // Enable performance metrics
      await page.evaluateOnNewDocument(() => {
        window.performance.mark('pageStart');
      });

      const startTime = Date.now();
      await page.goto(url, { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      // Get performance metrics
      const metrics = await page.metrics();
      const performanceTiming = await page.evaluate(() => {
        const timing = window.performance.timing;
        return {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          firstPaint: timing.responseEnd - timing.navigationStart,
          domInteractive: timing.domInteractive - timing.navigationStart,
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          tcp: timing.connectEnd - timing.connectStart,
          request: timing.responseStart - timing.requestStart,
          response: timing.responseEnd - timing.responseStart,
          domProcessing: timing.domComplete - timing.domLoading
        };
      });

      // Get resource timing
      const resourceTiming = await page.evaluate(() => {
        return window.performance.getEntriesByType('resource').map(resource => ({
          name: resource.name,
          duration: resource.duration,
          size: resource.transferSize,
          type: resource.initiatorType
        }));
      });

      // Coverage analysis
      await page.coverage.startCSSCoverage();
      await page.coverage.startJSCoverage();
      
      // Navigate and interact
      await page.reload({ waitUntil: 'networkidle2' });
      
      const coverage = {
        css: await page.coverage.stopCSSCoverage(),
        js: await page.coverage.stopJSCoverage()
      };

      // Calculate unused bytes
      const calculateUnused = (coverage) => {
        let totalBytes = 0;
        let usedBytes = 0;
        
        for (const entry of coverage) {
          totalBytes += entry.text.length;
          for (const range of entry.ranges) {
            usedBytes += range.end - range.start;
          }
        }
        
        return {
          total: totalBytes,
          used: usedBytes,
          unused: totalBytes - usedBytes,
          percentUnused: ((totalBytes - usedBytes) / totalBytes * 100).toFixed(2)
        };
      };

      return {
        success: true,
        url,
        timestamp: new Date().toISOString(),
        performance: {
          loadTime,
          metrics,
          timing: performanceTiming,
          resources: {
            count: resourceTiming.length,
            totalSize: resourceTiming.reduce((sum, r) => sum + (r.size || 0), 0),
            byType: resourceTiming.reduce((acc, r) => {
              acc[r.type] = (acc[r.type] || 0) + 1;
              return acc;
            }, {})
          },
          coverage: {
            css: calculateUnused(coverage.css),
            js: calculateUnused(coverage.js)
          }
        }
      };

    } catch (error) {
      console.error('Performance testing error:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  // Cleanup old files
  async cleanup(olderThanHours = 24) {
    const dirs = [this.screenshotDir, this.recordingsDir];
    const now = Date.now();
    const threshold = olderThanHours * 60 * 60 * 1000;

    for (const dir of dirs) {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > threshold) {
          await fs.unlink(filePath);
          console.log(`Cleaned up: ${file}`);
        }
      }
    }
  }
}

// Create singleton instance
const browserAutomationService = new BrowserAutomationService();

// Cleanup every 24 hours
setInterval(() => {
  browserAutomationService.cleanup(48).catch(console.error);
}, 24 * 60 * 60 * 1000);

export default browserAutomationService;