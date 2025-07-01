import { EnhancedBaseAgent } from './EnhancedBaseAgent.js';

export class WebScraperAgent extends EnhancedBaseAgent {
  constructor(config) {
    super(config);
    this.scrapingHistory = [];
  }
  
  async handleCustomTask(task) {
    switch (task.type) {
      case 'analyze_url':
        return this.analyzeUrl(task);
      case 'extract_data':
        return this.extractData(task);
      case 'generate_selectors':
        return this.generateSelectors(task);
      case 'parse_content':
        return this.parseContent(task);
      case 'create_scraping_plan':
        return this.createScrapingPlan(task);
      default:
        return super.handleCustomTask(task);
    }
  }
  
  async analyzeUrl(task) {
    const { url, requirements = [] } = task;
    
    const analysisPrompt = `
Analyze this URL for web scraping: ${url}

Requirements: ${requirements.length > 0 ? requirements.join(', ') : 'General data extraction'}

Provide:
1. Likely page structure (SPA, static HTML, etc.)
2. Data types available
3. Potential challenges (auth, dynamic loading, rate limits)
4. Recommended scraping approach
5. Required tools (BeautifulSoup, Selenium, etc.)`;

    const analysis = await this.generate(analysisPrompt, {
      temperature: 0.4,
      max_tokens: 800
    });
    
    this.scrapingHistory.push({
      type: 'url_analysis',
      url,
      analysis,
      timestamp: Date.now()
    });
    
    return {
      url,
      analysis,
      requirements
    };
  }
  
  async extractData(task) {
    const { html, dataTypes, format = 'json' } = task;
    
    const extractionPrompt = `
Extract the following data types from this HTML:
Data types: ${dataTypes.join(', ')}

HTML snippet:
${html.substring(0, 2000)}${html.length > 2000 ? '...' : ''}

Provide extracted data in ${format} format with clear structure.`;

    const extractedData = await this.generate(extractionPrompt, {
      temperature: 0.2,
      max_tokens: 1500
    });
    
    return {
      data: extractedData,
      format,
      dataTypes
    };
  }
  
  async generateSelectors(task) {
    const { html, targets } = task;
    
    const selectorPrompt = `
Generate CSS selectors for extracting these targets from the HTML:
Targets: ${targets.join(', ')}

HTML structure:
${html.substring(0, 1500)}${html.length > 1500 ? '...' : ''}

For each target, provide:
1. CSS selector
2. Alternative XPath
3. Extraction method (text, attribute, etc.)
4. Potential issues`;

    const selectors = await this.generate(selectorPrompt, {
      temperature: 0.3,
      max_tokens: 1000
    });
    
    return {
      selectors,
      targets
    };
  }
  
  async parseContent(task) {
    const { content, contentType = 'html', schema = null } = task;
    
    const parsingPrompt = `
Parse this ${contentType} content and extract structured data:

${schema ? `Expected schema: ${JSON.stringify(schema, null, 2)}` : 'Extract all meaningful data'}

Content:
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Provide parsed data in clean JSON format.`;

    const parsed = await this.generate(parsingPrompt, {
      temperature: 0.2,
      max_tokens: 1500
    });
    
    return {
      parsed,
      contentType,
      schema
    };
  }
  
  async createScrapingPlan(task) {
    const {
      urls,
      objectives,
      constraints = [],
      technology = 'python'
    } = task;
    
    const planPrompt = `
Create a comprehensive web scraping plan for:

URLs: ${urls.join(', ')}
Objectives: ${objectives.join(', ')}
Constraints: ${constraints.length > 0 ? constraints.join(', ') : 'None specified'}
Technology: ${technology}

Provide:
1. Step-by-step scraping strategy
2. Required libraries/tools
3. Data extraction logic
4. Error handling approach
5. Rate limiting strategy
6. Data storage plan
7. Sample code structure`;

    const plan = await this.generate(planPrompt, {
      temperature: 0.4,
      max_tokens: 2000
    });
    
    this.scrapingHistory.push({
      type: 'scraping_plan',
      urls,
      objectives,
      plan,
      timestamp: Date.now()
    });
    
    return {
      plan,
      urls,
      objectives,
      technology
    };
  }
  
  getScrapingHistory() {
    return this.scrapingHistory;
  }
  
  getHistoryByUrl(url) {
    return this.scrapingHistory.filter(entry => 
      entry.url === url || (entry.urls && entry.urls.includes(url))
    );
  }
}