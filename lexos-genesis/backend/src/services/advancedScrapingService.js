import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import browserAutomationService from './browserAutomationService.js';
import grokService from './grokService.js';
import multiModelCodingService from './multiModelCodingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AdvancedScrapingService {
  constructor() {
    this.scrapyProjectsDir = path.join(__dirname, '../../scrapy-projects');
    this.resultsDir = path.join(__dirname, '../../scraping-results');
    this.toolsConfig = {
      scrapy: {
        installed: false,
        command: 'scrapy',
        features: ['crawling', 'pipelines', 'middleware', 'export-formats']
      },
      zenrows: {
        installed: false,
        apiKey: process.env.ZENROWS_API_KEY,
        features: ['js-rendering', 'captcha-solving', 'proxy-rotation']
      },
      crawl4ai: {
        installed: false,
        command: 'crawl4ai',
        features: ['ml-extraction', 'smart-parsing', 'content-understanding']
      },
      requestsHtml: {
        installed: false,
        module: 'requests_html',
        features: ['simple-api', 'js-support', 'async-support']
      },
      mechanicalSoup: {
        installed: false,
        module: 'mechanicalsoup',
        features: ['form-handling', 'session-management', 'lightweight']
      },
      lxml: {
        installed: false,
        module: 'lxml',
        features: ['fast-parsing', 'xpath', 'xslt', 'validation']
      }
    };
    this.initialize();
  }

  async initialize() {
    // Create directories
    await fs.mkdir(this.scrapyProjectsDir, { recursive: true });
    await fs.mkdir(this.resultsDir, { recursive: true });
    
    // Check installed tools
    await this.checkInstalledTools();
    
    console.log('Advanced scraping service initialized');
    console.log('Available tools:', Object.entries(this.toolsConfig)
      .filter(([_, config]) => config.installed)
      .map(([name]) => name)
      .join(', '));
  }

  async checkInstalledTools() {
    // Check Scrapy
    try {
      await this.executeCommand('scrapy version');
      this.toolsConfig.scrapy.installed = true;
    } catch (error) {
      console.log('Scrapy not installed');
    }

    // Check Python modules
    const pythonModules = ['requests_html', 'mechanicalsoup', 'lxml', 'crawl4ai'];
    for (const module of pythonModules) {
      try {
        await this.executeCommand(`python3 -c "import ${module}"`);
        const toolName = module === 'requests_html' ? 'requestsHtml' : 
                         module === 'mechanicalsoup' ? 'mechanicalSoup' :
                         module === 'crawl4ai' ? 'crawl4ai' : module;
        this.toolsConfig[toolName].installed = true;
      } catch (error) {
        // Module not installed
      }
    }

    // Check ZenRows (API key based)
    if (process.env.ZENROWS_API_KEY) {
      this.toolsConfig.zenrows.installed = true;
    }
  }

  async executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const proc = spawn(cmd, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr || stdout}`));
        }
      });
    });
  }

  // Create and run Scrapy spider
  async createScrapySpider(config) {
    const {
      name,
      startUrls,
      allowedDomains = [],
      extractionRules = {},
      followLinks = true,
      maxDepth = 2,
      exportFormat = 'json'
    } = config;

    if (!this.toolsConfig.scrapy.installed) {
      throw new Error('Scrapy is not installed. Run: pip install scrapy');
    }

    const projectName = `project_${Date.now()}`;
    const projectPath = path.join(this.scrapyProjectsDir, projectName);
    
    // Create Scrapy project
    await this.executeCommand(`scrapy startproject ${projectName}`, {
      cwd: this.scrapyProjectsDir
    });

    // Generate spider code
    const spiderCode = this.generateScrapySpider({
      name,
      startUrls,
      allowedDomains,
      extractionRules,
      followLinks,
      maxDepth
    });

    // Write spider file
    const spiderPath = path.join(projectPath, `${projectName}/spiders/${name}.py`);
    await fs.writeFile(spiderPath, spiderCode);

    // Run spider
    const outputPath = path.join(this.resultsDir, `${name}_${Date.now()}.${exportFormat}`);
    await this.executeCommand(
      `scrapy crawl ${name} -o ${outputPath} -t ${exportFormat}`,
      { cwd: projectPath }
    );

    // Read results
    const results = await fs.readFile(outputPath, 'utf-8');
    
    return {
      success: true,
      projectPath,
      outputPath,
      results: exportFormat === 'json' ? JSON.parse(results) : results,
      format: exportFormat
    };
  }

  generateScrapySpider(config) {
    const {
      name,
      startUrls,
      allowedDomains,
      extractionRules,
      followLinks,
      maxDepth
    } = config;

    const extractors = Object.entries(extractionRules)
      .map(([field, selector]) => {
        if (typeof selector === 'string') {
          return `            '${field}': response.css('${selector}').get(),`;
        } else if (selector.xpath) {
          return `            '${field}': response.xpath('${selector.xpath}').get(),`;
        } else if (selector.regex) {
          return `            '${field}': response.css('${selector.css}').re_first(r'${selector.regex}'),`;
        }
      })
      .join('\n');

    return `import scrapy

class ${name.charAt(0).toUpperCase() + name.slice(1)}Spider(scrapy.Spider):
    name = '${name}'
    allowed_domains = ${JSON.stringify(allowedDomains)}
    start_urls = ${JSON.stringify(startUrls)}
    custom_settings = {
        'DEPTH_LIMIT': ${maxDepth},
        'ROBOTSTXT_OBEY': True,
        'CONCURRENT_REQUESTS': 16,
        'DOWNLOAD_DELAY': 0.5,
        'USER_AGENT': 'Mozilla/5.0 (compatible; LexOS-Scraper/1.0)'
    }

    def parse(self, response):
        # Extract data
        yield {
${extractors}
            'url': response.url,
            'title': response.css('title::text').get(),
        }
        
        ${followLinks ? `
        # Follow links
        for href in response.css('a::attr(href)'):
            yield response.follow(href, self.parse)` : ''}
`;
  }

  // ZenRows scraping with anti-bot bypass
  async scrapeWithZenRows(url, options = {}) {
    if (!this.toolsConfig.zenrows.installed) {
      throw new Error('ZenRows API key not configured');
    }

    const {
      javascript = true,
      premium = false,
      waitFor = '',
      customHeaders = {},
      cssSelector = ''
    } = options;

    try {
      const params = new URLSearchParams({
        url,
        apikey: this.toolsConfig.zenrows.apiKey,
        js_render: javascript.toString(),
        premium_proxy: premium.toString()
      });

      if (waitFor) params.append('wait_for', waitFor);
      if (cssSelector) params.append('css_selector', cssSelector);

      Object.entries(customHeaders).forEach(([key, value]) => {
        params.append(`custom_headers[${key}]`, value);
      });

      const response = await fetch(`https://api.zenrows.com/v1/?${params}`);
      const html = await response.text();

      // Parse with AI if requested
      if (options.aiParse) {
        const analysis = await this.parseWithAI(html, options.aiPrompt);
        return {
          success: true,
          html,
          aiAnalysis: analysis,
          url,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        html,
        url,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('ZenRows scraping error:', error);
      throw error;
    }
  }

  // Crawl4AI ML-powered scraping
  async scrapeWithCrawl4AI(url, options = {}) {
    if (!this.toolsConfig.crawl4ai.installed) {
      // Fallback to AI-enhanced Playwright
      return await this.aiEnhancedScraping(url, options);
    }

    const {
      extractionModel = 'auto',
      contentType = 'article',
      includeMetadata = true
    } = options;

    try {
      const pythonScript = `
import asyncio
from crawl4ai import AsyncWebCrawler
import json

async def crawl():
    async with AsyncWebCrawler(verbose=True) as crawler:
        result = await crawler.arun(
            url="${url}",
            bypass_cache=True,
            extract_content=True,
            extraction_strategy="${extractionModel}"
        )
        print(json.dumps({
            'content': result.extracted_content,
            'metadata': result.metadata,
            'success': result.success
        }))

asyncio.run(crawl())
`;

      const result = await this.executeCommand(`python3 -c "${pythonScript}"`);
      return JSON.parse(result);

    } catch (error) {
      console.error('Crawl4AI error:', error);
      // Fallback to AI-enhanced scraping
      return await this.aiEnhancedScraping(url, options);
    }
  }

  // AI-enhanced scraping (fallback/enhancement)
  async aiEnhancedScraping(url, options = {}) {
    const {
      targetData = 'auto',
      screenshot = true,
      contentType = 'general'
    } = options;

    // Use Playwright for rendering
    const scrapingResult = await browserAutomationService.scrapeAndAnalyze(url, {
      screenshot,
      analyze: false,
      extractors: {}
    });

    // Generate extraction prompt based on content type
    let extractionPrompt = '';
    switch (contentType) {
      case 'article':
        extractionPrompt = `Extract from this webpage:
1. Main article title
2. Author information
3. Publication date
4. Article body text (clean, no ads)
5. Key topics/tags
6. Related links
Format as structured JSON.`;
        break;
      case 'product':
        extractionPrompt = `Extract product information:
1. Product name and description
2. Price (current and original if discounted)
3. Availability/stock status
4. Product specifications
5. Customer ratings/reviews summary
6. Image URLs
Format as structured JSON.`;
        break;
      case 'contact':
        extractionPrompt = `Extract contact information:
1. Company/person name
2. Email addresses
3. Phone numbers
4. Physical addresses
5. Social media links
6. Business hours
Format as structured JSON.`;
        break;
      default:
        extractionPrompt = `Extract all meaningful structured data from this webpage. 
Identify the main content type and extract relevant information accordingly.
Format as structured JSON.`;
    }

    // Use AI to extract structured data
    const aiExtraction = await multiModelCodingService.solveCodingTask(
      extractionPrompt + '\n\nHTML Content:\n' + scrapingResult.data.text?.substring(0, 10000),
      '',
      { temperature: 0.1 }
    );

    try {
      // Parse AI response as JSON
      const structuredData = JSON.parse(
        aiExtraction.content.match(/```json\n([\s\S]*?)\n```/)?.[1] || 
        aiExtraction.content
      );

      return {
        success: true,
        url,
        structuredData,
        rawData: scrapingResult.data,
        screenshot: scrapingResult.screenshot,
        timestamp: new Date().toISOString(),
        extractionMethod: 'ai-enhanced'
      };
    } catch (error) {
      return {
        success: true,
        url,
        aiAnalysis: aiExtraction.content,
        rawData: scrapingResult.data,
        screenshot: scrapingResult.screenshot,
        timestamp: new Date().toISOString(),
        extractionMethod: 'ai-enhanced'
      };
    }
  }

  // Requests-HTML simple scraping
  async scrapeWithRequestsHTML(url, options = {}) {
    if (!this.toolsConfig.requestsHtml.installed) {
      throw new Error('requests-html not installed. Run: pip install requests-html');
    }

    const {
      javascript = false,
      timeout = 10,
      cssSelectors = {}
    } = options;

    const pythonScript = `
from requests_html import HTMLSession
import json

session = HTMLSession()
r = session.get('${url}', timeout=${timeout})
${javascript ? 'r.html.render(timeout=20)' : ''}

data = {
    'title': r.html.find('title', first=True).text if r.html.find('title', first=True) else None,
    'url': r.url,
    'status': r.status_code,
    'links': list(r.html.absolute_links)[:50],
}

# Extract custom selectors
selectors = ${JSON.stringify(cssSelectors)}
for key, selector in selectors.items():
    elements = r.html.find(selector)
    data[key] = [elem.text for elem in elements] if len(elements) > 1 else (elements[0].text if elements else None)

print(json.dumps(data))
session.close()
`;

    try {
      const result = await this.executeCommand(`python3 -c "${pythonScript}"`);
      return JSON.parse(result);
    } catch (error) {
      console.error('Requests-HTML error:', error);
      throw error;
    }
  }

  // MechanicalSoup form automation
  async automateFormWithMechanicalSoup(url, formData, options = {}) {
    if (!this.toolsConfig.mechanicalSoup.installed) {
      throw new Error('MechanicalSoup not installed. Run: pip install mechanicalsoup');
    }

    const {
      formSelector = 'form',
      submitButton = '[type="submit"]',
      screenshot = true
    } = options;

    const pythonScript = `
import mechanicalsoup
import json

browser = mechanicalsoup.StatefulBrowser()
browser.open('${url}')

# Select form
browser.select_form('${formSelector}')

# Fill form
form_data = ${JSON.stringify(formData)}
for field, value in form_data.items():
    try:
        browser[field] = value
    except:
        pass

# Submit form
response = browser.submit_selected()

result = {
    'success': True,
    'final_url': browser.url,
    'title': browser.page.title.string if browser.page.title else None,
    'status_code': response.status_code,
    'form_errors': []
}

# Check for common error patterns
error_elements = browser.page.select('.error, .alert-danger, [class*="error"]')
result['form_errors'] = [elem.get_text(strip=True) for elem in error_elements]

print(json.dumps(result))
`;

    try {
      const result = await this.executeCommand(`python3 -c "${pythonScript}"`);
      const jsonResult = JSON.parse(result);

      // Take screenshot if requested
      if (screenshot) {
        const screenshotResult = await browserAutomationService.scrapeAndAnalyze(
          jsonResult.final_url,
          { screenshot: true, analyze: false }
        );
        jsonResult.screenshot = screenshotResult.screenshot;
      }

      return jsonResult;
    } catch (error) {
      console.error('MechanicalSoup error:', error);
      throw error;
    }
  }

  // LXML fast parsing
  async parseWithLXML(htmlContent, options = {}) {
    if (!this.toolsConfig.lxml.installed) {
      throw new Error('lxml not installed. Run: pip install lxml');
    }

    const {
      xpathQueries = {},
      cssSelectors = {},
      returnFormat = 'json'
    } = options;

    const pythonScript = `
from lxml import html, etree
import json

# Parse HTML
tree = html.fromstring('''${htmlContent.replace(/'/g, "\\'")}''')

results = {}

# XPath queries
xpath_queries = ${JSON.stringify(xpathQueries)}
for key, xpath in xpath_queries.items():
    elements = tree.xpath(xpath)
    if elements:
        if isinstance(elements[0], str):
            results[key] = elements
        else:
            results[key] = [elem.text_content() if hasattr(elem, 'text_content') else str(elem) for elem in elements]
    else:
        results[key] = None

# CSS selectors
css_selectors = ${JSON.stringify(cssSelectors)}
for key, selector in css_selectors.items():
    elements = tree.cssselect(selector)
    results[key] = [elem.text_content() for elem in elements] if elements else None

print(json.dumps(results))
`;

    try {
      const result = await this.executeCommand(`python3 -c "${pythonScript}"`);
      return JSON.parse(result);
    } catch (error) {
      console.error('LXML parsing error:', error);
      throw error;
    }
  }

  // Generate scraping code based on requirements
  async generateScrapingCode(requirements, options = {}) {
    const {
      language = 'python',
      framework = 'auto',
      includeErrorHandling = true,
      includeDataStorage = true
    } = options;

    const prompt = `Generate ${language} web scraping code for the following requirements:

Requirements: ${requirements}

Constraints:
- Use ${framework === 'auto' ? 'the most appropriate framework' : framework}
- ${includeErrorHandling ? 'Include comprehensive error handling' : 'Basic error handling only'}
- ${includeDataStorage ? 'Include code to save scraped data' : 'Return data only'}
- Make the code production-ready
- Include comments explaining each step
- Handle rate limiting and retries
- Respect robots.txt

Return complete, runnable code.`;

    const result = await multiModelCodingService.solveCodingTask(prompt, '', {
      language,
      temperature: 0.3
    });

    return {
      code: result.content,
      language,
      framework: result.content.includes('scrapy') ? 'scrapy' :
                 result.content.includes('requests_html') ? 'requests-html' :
                 result.content.includes('mechanicalsoup') ? 'mechanicalsoup' :
                 result.content.includes('playwright') ? 'playwright' :
                 result.content.includes('selenium') ? 'selenium' : 'unknown',
      model: result.model
    };
  }

  // Parse HTML/text with AI
  async parseWithAI(content, customPrompt = '') {
    const prompt = customPrompt || `Parse this content and extract all meaningful information. 
Identify the content type and structure the data accordingly. 
Return as clean, structured JSON.`;

    const result = await multiModelCodingService.solveCodingTask(
      prompt + '\n\nContent:\n' + content.substring(0, 15000),
      '',
      { temperature: 0.1 }
    );

    return result.content;
  }

  // Get tool recommendations based on task
  async recommendTools(requirements) {
    const analysis = await multiModelCodingService.solveCodingTask(
      `Analyze these web scraping requirements and recommend the best tools:

Requirements: ${requirements}

Consider:
1. JavaScript rendering needs
2. Anti-bot protection (CAPTCHAs, rate limiting)
3. Scale (single page vs entire site)
4. Data structure complexity
5. Authentication requirements
6. Performance needs

Available tools:
- Scrapy: Full-featured crawler with pipelines
- ZenRows: Handles JS+CAPTCHA with proxy management
- Playwright/Puppeteer: Browser automation
- Requests-HTML: Simple scraping with JS support
- MechanicalSoup: Form handling and sessions
- LXML: Fast XML/HTML parsing
- Crawl4AI: ML-powered extraction

Recommend the best tool(s) and explain why.`,
      '',
      { temperature: 0.5 }
    );

    return {
      recommendations: analysis.content,
      requirements
    };
  }

  // Batch scraping orchestration
  async batchScrape(tasks, options = {}) {
    const {
      parallel = 3,
      delayBetween = 1000,
      toolPreference = 'auto'
    } = options;

    const results = [];
    const chunks = [];
    
    // Split tasks into chunks for parallel processing
    for (let i = 0; i < tasks.length; i += parallel) {
      chunks.push(tasks.slice(i, i + parallel));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (task) => {
        try {
          let result;
          
          // Auto-select tool based on task requirements
          if (toolPreference === 'auto') {
            if (task.javascript || task.captcha) {
              result = await this.scrapeWithZenRows(task.url, task.options);
            } else if (task.form) {
              result = await this.automateFormWithMechanicalSoup(task.url, task.form, task.options);
            } else if (task.complex) {
              result = await this.createScrapySpider(task);
            } else {
              result = await this.scrapeWithRequestsHTML(task.url, task.options);
            }
          } else {
            // Use specified tool
            const toolMethod = `scrapeWith${toolPreference.charAt(0).toUpperCase() + toolPreference.slice(1)}`;
            if (this[toolMethod]) {
              result = await this[toolMethod](task.url, task.options);
            }
          }
          
          return { ...task, success: true, result };
        } catch (error) {
          return { ...task, success: false, error: error.message };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }
    }

    return {
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }

  // Get available tools status
  getToolsStatus() {
    return Object.entries(this.toolsConfig).map(([name, config]) => ({
      name,
      installed: config.installed,
      features: config.features,
      command: config.command,
      module: config.module
    }));
  }
}

// Create singleton instance
const advancedScrapingService = new AdvancedScrapingService();

export default advancedScrapingService;