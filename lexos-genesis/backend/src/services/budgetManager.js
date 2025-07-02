import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BudgetManager {
  constructor() {
    this.globalBudgetLimit = parseFloat(process.env.LLM_BUDGET_LIMIT || '100');
    this.budgetFile = path.join(__dirname, '../../data/global-budget.json');
    this.services = {
      openai: { limit: 100, cost: 0 },
      anthropic: { limit: 100, cost: 0 },
      gemini: { limit: 100, cost: 0 },
      grok: { limit: 100, cost: 0 }
    };
    this.globalUsage = {
      totalCost: 0,
      serviceBreakdown: {},
      resetDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    };
    this.initialize();
  }

  async initialize() {
    await this.loadGlobalUsage();
    console.log(`Global LLM Budget Manager initialized with $${this.globalBudgetLimit} monthly limit`);
    console.log(`Current global usage: $${this.globalUsage.totalCost.toFixed(2)}`);
  }

  async loadGlobalUsage() {
    try {
      const data = await fs.readFile(this.budgetFile, 'utf-8');
      this.globalUsage = JSON.parse(data);
      
      // Reset monthly if needed
      const resetDate = new Date(this.globalUsage.resetDate);
      const now = new Date();
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        this.globalUsage = {
          totalCost: 0,
          serviceBreakdown: {},
          resetDate: now.toISOString(),
          lastUpdate: now.toISOString()
        };
        await this.saveGlobalUsage();
      }
    } catch (error) {
      // File doesn't exist, create it
      await this.saveGlobalUsage();
    }
  }

  async saveGlobalUsage() {
    await fs.mkdir(path.dirname(this.budgetFile), { recursive: true });
    this.globalUsage.lastUpdate = new Date().toISOString();
    await fs.writeFile(this.budgetFile, JSON.stringify(this.globalUsage, null, 2));
  }

  // Check if a service can make a request within budget
  async checkServiceBudget(serviceName, estimatedCost = 0) {
    await this.loadGlobalUsage();
    
    const currentServiceCost = this.globalUsage.serviceBreakdown[serviceName] || 0;
    const newGlobalTotal = this.globalUsage.totalCost + estimatedCost;
    const newServiceTotal = currentServiceCost + estimatedCost;

    // Check global budget
    if (newGlobalTotal > this.globalBudgetLimit) {
      throw new Error(`Global monthly budget limit of $${this.globalBudgetLimit} would be exceeded. Current: $${this.globalUsage.totalCost.toFixed(2)}, Estimated request: $${estimatedCost.toFixed(4)}`);
    }

    // Check individual service budget
    const serviceLimit = this.services[serviceName]?.limit || 100;
    if (newServiceTotal > serviceLimit) {
      throw new Error(`${serviceName} monthly budget limit of $${serviceLimit} would be exceeded. Current: $${currentServiceCost.toFixed(2)}, Estimated request: $${estimatedCost.toFixed(4)}`);
    }

    return {
      approved: true,
      globalRemaining: this.globalBudgetLimit - newGlobalTotal,
      serviceRemaining: serviceLimit - newServiceTotal,
      globalUsage: this.globalUsage.totalCost,
      serviceUsage: currentServiceCost
    };
  }

  // Record actual cost after a request
  async recordUsage(serviceName, actualCost, metadata = {}) {
    await this.loadGlobalUsage();
    
    this.globalUsage.totalCost += actualCost;
    
    if (!this.globalUsage.serviceBreakdown[serviceName]) {
      this.globalUsage.serviceBreakdown[serviceName] = 0;
    }
    this.globalUsage.serviceBreakdown[serviceName] += actualCost;

    // Store additional metadata if provided
    if (metadata.tokens || metadata.model) {
      if (!this.globalUsage.metadata) {
        this.globalUsage.metadata = {};
      }
      if (!this.globalUsage.metadata[serviceName]) {
        this.globalUsage.metadata[serviceName] = { requests: 0, tokens: 0, models: {} };
      }
      
      this.globalUsage.metadata[serviceName].requests += 1;
      if (metadata.tokens) {
        this.globalUsage.metadata[serviceName].tokens += metadata.tokens;
      }
      if (metadata.model) {
        if (!this.globalUsage.metadata[serviceName].models[metadata.model]) {
          this.globalUsage.metadata[serviceName].models[metadata.model] = 0;
        }
        this.globalUsage.metadata[serviceName].models[metadata.model] += actualCost;
      }
    }

    await this.saveGlobalUsage();
    
    console.log(`[Budget] ${serviceName} used $${actualCost.toFixed(4)} - Global: $${this.globalUsage.totalCost.toFixed(2)}/$${this.globalBudgetLimit}`);
    
    // Warn if approaching limits
    const globalPercent = (this.globalUsage.totalCost / this.globalBudgetLimit) * 100;
    const servicePercent = (this.globalUsage.serviceBreakdown[serviceName] / (this.services[serviceName]?.limit || 100)) * 100;
    
    if (globalPercent > 80) {
      console.warn(`[Budget] WARNING: Global budget at ${globalPercent.toFixed(1)}%`);
    }
    if (servicePercent > 80) {
      console.warn(`[Budget] WARNING: ${serviceName} budget at ${servicePercent.toFixed(1)}%`);
    }
  }

  // Get budget status for all services
  async getBudgetStatus() {
    await this.loadGlobalUsage();
    
    const status = {
      global: {
        limit: this.globalBudgetLimit,
        used: this.globalUsage.totalCost,
        remaining: this.globalBudgetLimit - this.globalUsage.totalCost,
        percentUsed: (this.globalUsage.totalCost / this.globalBudgetLimit * 100).toFixed(2)
      },
      services: {},
      resetDate: this.globalUsage.resetDate,
      lastUpdate: this.globalUsage.lastUpdate
    };

    for (const [serviceName, config] of Object.entries(this.services)) {
      const used = this.globalUsage.serviceBreakdown[serviceName] || 0;
      status.services[serviceName] = {
        limit: config.limit,
        used: used,
        remaining: config.limit - used,
        percentUsed: (used / config.limit * 100).toFixed(2),
        available: used < config.limit
      };
    }

    return status;
  }

  // Check if any service is available for requests
  async getAvailableServices() {
    const status = await this.getBudgetStatus();
    const available = [];
    
    // Check global budget first
    if (status.global.remaining <= 0) {
      return [];
    }

    for (const [serviceName, serviceStatus] of Object.entries(status.services)) {
      if (serviceStatus.available && serviceStatus.remaining > 0.01) { // At least 1 cent remaining
        available.push({
          name: serviceName,
          remaining: serviceStatus.remaining,
          percentUsed: serviceStatus.percentUsed
        });
      }
    }

    return available.sort((a, b) => b.remaining - a.remaining);
  }

  // Get recommendations for which service to use
  async getServiceRecommendation(taskType = 'general', estimatedCost = 0.01) {
    const available = await this.getAvailableServices();
    
    if (available.length === 0) {
      return {
        recommended: null,
        reason: 'All services have exceeded their budget limits',
        alternatives: []
      };
    }

    // Service preferences by task type
    const preferences = {
      'vision': ['grok', 'gpt-4', 'gemini', 'claude'],
      'coding': ['gemini', 'claude', 'gpt-4', 'grok'],
      'creative': ['grok', 'claude', 'gpt-4', 'gemini'],
      'analysis': ['claude', 'gpt-4', 'gemini', 'grok'],
      'general': ['gpt-4', 'claude', 'gemini', 'grok']
    };

    const preferredOrder = preferences[taskType] || preferences.general;
    
    // Find the best available service based on preferences and budget
    for (const preferred of preferredOrder) {
      const found = available.find(service => 
        service.name === preferred || 
        service.name.includes(preferred.replace('-', ''))
      );
      
      if (found && found.remaining >= estimatedCost) {
        return {
          recommended: found.name,
          reason: `Best available for ${taskType} tasks with sufficient budget`,
          budgetRemaining: found.remaining,
          alternatives: available.filter(s => s.name !== found.name).slice(0, 2)
        };
      }
    }

    // Fallback to service with most budget remaining
    const fallback = available[0];
    return {
      recommended: fallback.name,
      reason: 'Fallback to service with most budget remaining',
      budgetRemaining: fallback.remaining,
      alternatives: available.slice(1, 3)
    };
  }

  // Reset all budgets (admin function)
  async resetAllBudgets() {
    this.globalUsage = {
      totalCost: 0,
      serviceBreakdown: {},
      resetDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    };
    await this.saveGlobalUsage();
    console.log('All LLM budgets have been reset');
  }

  // Set custom budget limits
  async updateBudgetLimits(globalLimit, serviceLimits = {}) {
    this.globalBudgetLimit = globalLimit;
    
    for (const [service, limit] of Object.entries(serviceLimits)) {
      if (this.services[service]) {
        this.services[service].limit = limit;
      }
    }

    console.log(`Budget limits updated - Global: $${globalLimit}`);
    return await this.getBudgetStatus();
  }

  // Get detailed usage analytics
  async getUsageAnalytics() {
    await this.loadGlobalUsage();
    
    const analytics = {
      summary: await this.getBudgetStatus(),
      trends: {
        dailyAverage: this.calculateDailyAverage(),
        projectedMonthlyTotal: this.projectMonthlyTotal(),
        efficiencyMetrics: this.calculateEfficiency()
      },
      recommendations: await this.generateRecommendations()
    };

    return analytics;
  }

  calculateDailyAverage() {
    const daysSinceReset = Math.max(1, Math.ceil((new Date() - new Date(this.globalUsage.resetDate)) / (1000 * 60 * 60 * 24)));
    return this.globalUsage.totalCost / daysSinceReset;
  }

  projectMonthlyTotal() {
    const dailyAvg = this.calculateDailyAverage();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    return dailyAvg * daysInMonth;
  }

  calculateEfficiency() {
    const metadata = this.globalUsage.metadata || {};
    const efficiency = {};
    
    for (const [service, data] of Object.entries(metadata)) {
      const cost = this.globalUsage.serviceBreakdown[service] || 0;
      efficiency[service] = {
        costPerRequest: data.requests > 0 ? cost / data.requests : 0,
        costPerToken: data.tokens > 0 ? cost / data.tokens : 0,
        requests: data.requests,
        tokens: data.tokens
      };
    }
    
    return efficiency;
  }

  async generateRecommendations() {
    const status = await this.getBudgetStatus();
    const recommendations = [];
    
    // Budget optimization recommendations
    if (parseFloat(status.global.percentUsed) > 80) {
      recommendations.push({
        type: 'budget_warning',
        message: 'Global budget usage is high. Consider optimizing requests or increasing budget.',
        priority: 'high'
      });
    }

    // Service distribution recommendations
    const serviceUsage = Object.values(status.services);
    const avgUsage = serviceUsage.reduce((sum, s) => sum + parseFloat(s.percentUsed), 0) / serviceUsage.length;
    
    for (const [service, data] of Object.entries(status.services)) {
      if (parseFloat(data.percentUsed) > avgUsage * 1.5) {
        recommendations.push({
          type: 'load_balancing',
          message: `${service} is being used heavily. Consider distributing load to other services.`,
          priority: 'medium'
        });
      }
    }

    return recommendations;
  }
}

// Create singleton instance
const budgetManager = new BudgetManager();

export default budgetManager;