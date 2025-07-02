import { BaseAgent } from './BaseAgent.js';
import { AgentCapability } from '../types/index.js';
import axios from 'axios';

export class ResearchAgent extends BaseAgent {
  constructor() {
    super('research-001', 'Research Agent', 'Information gathering and research system', 'llama3.2');
    
    // Add capabilities
    this.addCapability(new AgentCapability(
      'Information Synthesis',
      'Synthesize information from multiple sources',
      '1.0.0'
    ));
    
    this.addCapability(new AgentCapability(
      'Fact Checking',
      'Verify and validate information',
      '1.0.0'
    ));
    
    this.addCapability(new AgentCapability(
      'Research Planning',
      'Create comprehensive research plans',
      '1.0.0'
    ));
    
    this.addCapability(new AgentCapability(
      'Knowledge Extraction',
      'Extract key insights from text',
      '1.0.0'
    ));
  }

  async processTask(task) {
    console.log(`ResearchAgent processing task ${task.task_id}`);
    
    const { 
      query,
      research_type = 'general',
      depth = 'standard',
      temperature = 0.5,
      max_tokens = 2000 
    } = task.parameters;
    
    switch (research_type) {
      case 'synthesis':
        return await this.synthesizeInformation(query, { temperature, max_tokens });
        
      case 'fact_check':
        return await this.factCheck(query, { temperature: 0.1, max_tokens });
        
      case 'research_plan':
        return await this.createResearchPlan(query, { temperature, max_tokens });
        
      case 'extraction':
        return await this.extractKnowledge(query, task.parameters.text, { temperature, max_tokens });
        
      case 'general':
      default:
        return await this.generalResearch(query, depth, { temperature, max_tokens });
    }
  }

  async generalResearch(query, depth, options) {
    const systemPrompt = `You are an expert research assistant. Provide comprehensive, accurate, and well-structured information.
Include relevant details, cite sources when possible, and organize information clearly.
Depth level: ${depth}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Research the following topic: ${query}` }
    ];

    const response = await this.chat(messages, options);
    
    if (response.success) {
      let result = {
        research: response.message.content,
        depth: depth,
        model: this.model,
        timestamp: Date.now()
      };
      
      // For deep research, add summary and key points
      if (depth === 'deep') {
        const summaryMessages = [
          { role: 'system', content: 'You are an expert at creating concise summaries and extracting key points.' },
          { role: 'user', content: `Based on this research, provide:
1. A brief executive summary (2-3 sentences)
2. 5 key takeaways as bullet points

Research:
${response.message.content}` }
        ];
        
        const summaryResponse = await this.chat(summaryMessages, { temperature: 0.3, max_tokens: 500 });
        
        if (summaryResponse.success) {
          result.summary = summaryResponse.message.content;
        }
      }
      
      return result;
    } else {
      throw new Error(response.error || 'Failed to conduct research');
    }
  }

  async synthesizeInformation(query, options) {
    const systemPrompt = `You are an expert at synthesizing information from multiple perspectives.
Analyze the topic from different angles and create a comprehensive synthesis.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Synthesize information about: ${query}

Consider:
1. Different perspectives and viewpoints
2. Historical context if relevant
3. Current state and trends
4. Future implications
5. Potential controversies or debates` }
    ];

    const response = await this.chat(messages, options);
    
    if (response.success) {
      return {
        synthesis: response.message.content,
        model: this.model,
        timestamp: Date.now()
      };
    } else {
      throw new Error(response.error || 'Failed to synthesize information');
    }
  }

  async factCheck(claim, options) {
    const systemPrompt = `You are a fact-checking expert. Analyze claims for accuracy and provide evidence-based assessments.
Be objective and thorough in your analysis.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Fact-check the following claim: "${claim}"

Provide:
1. Verdict: TRUE, FALSE, PARTIALLY TRUE, or UNVERIFIABLE
2. Evidence supporting or refuting the claim
3. Context that might be missing
4. Sources or types of sources that would verify this` }
    ];

    const response = await this.chat(messages, options);
    
    if (response.success) {
      return {
        fact_check: response.message.content,
        claim: claim,
        model: this.model,
        timestamp: Date.now()
      };
    } else {
      throw new Error(response.error || 'Failed to fact-check claim');
    }
  }

  async createResearchPlan(topic, options) {
    const systemPrompt = `You are an expert research planner. Create detailed, actionable research plans.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create a comprehensive research plan for: ${topic}

Include:
1. Research objectives
2. Key questions to answer
3. Methodology and approach
4. Potential sources and resources
5. Timeline and milestones
6. Expected deliverables
7. Potential challenges and mitigation strategies` }
    ];

    const response = await this.chat(messages, options);
    
    if (response.success) {
      return {
        research_plan: response.message.content,
        topic: topic,
        model: this.model,
        timestamp: Date.now()
      };
    } else {
      throw new Error(response.error || 'Failed to create research plan');
    }
  }

  async extractKnowledge(query, text, options) {
    const systemPrompt = `You are an expert at extracting and organizing knowledge from text.
Focus on identifying key concepts, relationships, and insights.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract knowledge related to "${query}" from the following text:

${text}

Provide:
1. Key concepts and definitions
2. Important relationships and connections
3. Main insights and conclusions
4. Notable quotes or data points
5. Questions raised or areas for further research` }
    ];

    const response = await this.chat(messages, options);
    
    if (response.success) {
      return {
        extraction: response.message.content,
        query: query,
        model: this.model,
        timestamp: Date.now()
      };
    } else {
      throw new Error(response.error || 'Failed to extract knowledge');
    }
  }
}