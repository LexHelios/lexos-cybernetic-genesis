import { BaseAgent } from './BaseAgent.js';

export class R1UnrestrictedAgent extends BaseAgent {
  constructor() {
    super(
      'agent-r1-unrestricted',
      'R1 Unrestricted Agent',
      'Advanced reasoning agent with unrestricted capabilities for complex analysis and creative tasks',
      'r1-unrestricted'
    );

    // Define specific capabilities
    this.capabilities = [
      'advanced_reasoning',
      'complex_analysis',
      'code_generation',
      'creative_writing',
      'strategic_planning',
      'philosophical_inquiry',
      'scientific_research',
      'data_synthesis',
      'pattern_recognition',
      'hypothesis_generation'
    ];

    this.specializations = {
      reasoning: {
        deductive: true,
        inductive: true,
        abductive: true,
        analogical: true,
        causal: true
      },
      analysis: {
        quantitative: true,
        qualitative: true,
        comparative: true,
        systematic: true,
        meta_analysis: true
      },
      creativity: {
        narrative: true,
        conceptual: true,
        artistic: true,
        innovative: true,
        synthesis: true
      }
    };

    this.context_window = 128000;
    this.temperature_range = { min: 0.0, max: 2.0, default: 0.7 };
  }

  async processTask(task) {
    console.log(`R1 Unrestricted Agent processing task ${task.task_id} of type ${task.task_type}`);

    try {
      switch (task.task_type) {
        case 'reasoning':
          return await this.performReasoning(task.parameters);
        
        case 'analysis':
          return await this.performAnalysis(task.parameters);
        
        case 'code_generation':
          return await this.generateCode(task.parameters);
        
        case 'creative_writing':
          return await this.performCreativeWriting(task.parameters);
        
        case 'research':
          return await this.performResearch(task.parameters);
        
        case 'strategic_planning':
          return await this.performStrategicPlanning(task.parameters);
        
        case 'hypothesis_generation':
          return await this.generateHypotheses(task.parameters);
        
        case 'synthesis':
          return await this.performSynthesis(task.parameters);
        
        case 'custom':
          return await this.performCustomTask(task.parameters);
        
        default:
          throw new Error(`Unknown task type: ${task.task_type}`);
      }
    } catch (error) {
      console.error(`Error processing task ${task.task_id}:`, error);
      throw error;
    }
  }

  async performReasoning(parameters) {
    const { query, context, reasoning_type = 'general', depth = 'standard' } = parameters;

    const systemPrompt = `You are an advanced reasoning system with unrestricted capabilities. 
    Reasoning Type: ${reasoning_type}
    Depth Level: ${depth}
    
    Provide comprehensive reasoning that explores all relevant angles, challenges assumptions, 
    and considers multiple perspectives. Be thorough, logical, and evidence-based.`;

    const userPrompt = context 
      ? `Context: ${context}\n\nQuery: ${query}`
      : query;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await this.chat(messages, {
      temperature: this.temperature_range.default,
      max_tokens: 4000
    });

    if (!result.success) {
      throw new Error(result.error || 'Reasoning failed');
    }

    return {
      type: 'reasoning_result',
      reasoning_type,
      depth,
      content: result.message.content,
      model: this.model,
      timestamp: Date.now()
    };
  }

  async performAnalysis(parameters) {
    const { data, analysis_type, objectives, methodology } = parameters;

    const systemPrompt = `You are an advanced analytical system capable of deep, multi-dimensional analysis.
    Analysis Type: ${analysis_type}
    Methodology: ${methodology || 'comprehensive'}
    
    Provide thorough analysis with insights, patterns, correlations, and actionable recommendations.`;

    const userPrompt = `
    Data/Subject: ${JSON.stringify(data)}
    Objectives: ${objectives}
    
    Perform comprehensive analysis following best practices for ${analysis_type} analysis.
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await this.chat(messages, {
      temperature: 0.3, // Lower temperature for analytical tasks
      max_tokens: 5000
    });

    if (!result.success) {
      throw new Error(result.error || 'Analysis failed');
    }

    return {
      type: 'analysis_result',
      analysis_type,
      methodology,
      content: result.message.content,
      model: this.model,
      timestamp: Date.now()
    };
  }

  async generateCode(parameters) {
    const { 
      description, 
      language, 
      framework, 
      requirements = [], 
      constraints = [],
      style = 'clean',
      include_tests = false,
      include_documentation = true 
    } = parameters;

    const systemPrompt = `You are an expert code generation system with deep knowledge of software engineering.
    Generate high-quality, production-ready code following best practices.
    
    Language: ${language}
    Framework: ${framework || 'none'}
    Style: ${style}`;

    const userPrompt = `
    Task: ${description}
    Requirements: ${requirements.join(', ')}
    Constraints: ${constraints.join(', ')}
    
    Generate complete, working code with:
    ${include_documentation ? '- Comprehensive documentation' : ''}
    ${include_tests ? '- Unit tests' : ''}
    - Error handling
    - Optimization considerations
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await this.chat(messages, {
      temperature: 0.2, // Low temperature for code generation
      max_tokens: 8000
    });

    if (!result.success) {
      throw new Error(result.error || 'Code generation failed');
    }

    return {
      type: 'code_generation_result',
      language,
      framework,
      code: result.message.content,
      model: this.model,
      timestamp: Date.now()
    };
  }

  async performCreativeWriting(parameters) {
    const { 
      prompt, 
      genre, 
      style, 
      tone, 
      length, 
      constraints = [],
      elements = [] 
    } = parameters;

    const systemPrompt = `You are a creative writing system with unlimited creative freedom.
    Genre: ${genre || 'general'}
    Style: ${style || 'engaging'}
    Tone: ${tone || 'adaptive'}
    
    Create original, compelling content that pushes creative boundaries while maintaining quality.`;

    const userPrompt = `
    Prompt: ${prompt}
    Target Length: ${length || 'medium'}
    Required Elements: ${elements.join(', ')}
    Constraints: ${constraints.join(', ')}
    
    Create an original piece that captivates and engages.
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await this.chat(messages, {
      temperature: 1.2, // Higher temperature for creativity
      max_tokens: 6000
    });

    if (!result.success) {
      throw new Error(result.error || 'Creative writing failed');
    }

    return {
      type: 'creative_writing_result',
      genre,
      style,
      tone,
      content: result.message.content,
      model: this.model,
      timestamp: Date.now()
    };
  }

  async performResearch(parameters) {
    const { topic, depth, focus_areas = [], methodology = 'systematic' } = parameters;

    const systemPrompt = `You are an advanced research system capable of comprehensive investigation.
    Methodology: ${methodology}
    Depth: ${depth || 'comprehensive'}
    
    Conduct thorough research providing insights, analysis, and synthesized knowledge.`;

    const userPrompt = `
    Research Topic: ${topic}
    Focus Areas: ${focus_areas.join(', ')}
    
    Provide comprehensive research including:
    - Current state of knowledge
    - Key findings and insights
    - Critical analysis
    - Gaps and opportunities
    - Future directions
    - Synthesized conclusions
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await this.chat(messages, {
      temperature: 0.5,
      max_tokens: 8000
    });

    if (!result.success) {
      throw new Error(result.error || 'Research failed');
    }

    return {
      type: 'research_result',
      topic,
      methodology,
      depth,
      content: result.message.content,
      model: this.model,
      timestamp: Date.now()
    };
  }

  async performStrategicPlanning(parameters) {
    const { 
      objective, 
      context, 
      constraints = [], 
      resources = [], 
      timeframe,
      risk_tolerance = 'moderate' 
    } = parameters;

    const systemPrompt = `You are a strategic planning system with advanced analytical capabilities.
    Risk Tolerance: ${risk_tolerance}
    
    Develop comprehensive, actionable strategic plans with clear pathways to success.`;

    const userPrompt = `
    Strategic Objective: ${objective}
    Context: ${context}
    Available Resources: ${resources.join(', ')}
    Constraints: ${constraints.join(', ')}
    Timeframe: ${timeframe}
    
    Develop a comprehensive strategic plan including:
    - Situation analysis
    - Strategic options
    - Recommended approach
    - Implementation roadmap
    - Risk assessment and mitigation
    - Success metrics
    - Contingency plans
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await this.chat(messages, {
      temperature: 0.6,
      max_tokens: 6000
    });

    if (!result.success) {
      throw new Error(result.error || 'Strategic planning failed');
    }

    return {
      type: 'strategic_plan',
      objective,
      risk_tolerance,
      timeframe,
      plan: result.message.content,
      model: this.model,
      timestamp: Date.now()
    };
  }

  async generateHypotheses(parameters) {
    const { observations, domain, constraints = [], existing_theories = [] } = parameters;

    const systemPrompt = `You are a hypothesis generation system with advanced scientific reasoning.
    Domain: ${domain}
    
    Generate novel, testable hypotheses based on observations and existing knowledge.`;

    const userPrompt = `
    Observations: ${observations}
    Existing Theories: ${existing_theories.join(', ')}
    Constraints: ${constraints.join(', ')}
    
    Generate multiple hypotheses that:
    - Explain the observations
    - Are testable and falsifiable
    - Consider multiple perspectives
    - Include rationale and implications
    - Suggest validation approaches
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await this.chat(messages, {
      temperature: 0.9,
      max_tokens: 4000
    });

    if (!result.success) {
      throw new Error(result.error || 'Hypothesis generation failed');
    }

    return {
      type: 'hypotheses',
      domain,
      hypotheses: result.message.content,
      model: this.model,
      timestamp: Date.now()
    };
  }

  async performSynthesis(parameters) {
    const { sources, objective, format = 'comprehensive', focus_areas = [] } = parameters;

    const systemPrompt = `You are an advanced synthesis system capable of integrating diverse information.
    Format: ${format}
    
    Synthesize information to create unified, coherent understanding.`;

    const userPrompt = `
    Information Sources: ${JSON.stringify(sources)}
    Synthesis Objective: ${objective}
    Focus Areas: ${focus_areas.join(', ')}
    
    Create a comprehensive synthesis that:
    - Integrates all relevant information
    - Identifies patterns and connections
    - Resolves contradictions
    - Provides new insights
    - Presents unified understanding
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await this.chat(messages, {
      temperature: 0.4,
      max_tokens: 5000
    });

    if (!result.success) {
      throw new Error(result.error || 'Synthesis failed');
    }

    return {
      type: 'synthesis_result',
      objective,
      format,
      synthesis: result.message.content,
      model: this.model,
      timestamp: Date.now()
    };
  }

  async performCustomTask(parameters) {
    const { prompt, system_context, options = {} } = parameters;

    const messages = [
      { role: 'system', content: system_context || 'You are an advanced AI system with unrestricted capabilities.' },
      { role: 'user', content: prompt }
    ];

    const result = await this.chat(messages, {
      temperature: options.temperature || this.temperature_range.default,
      max_tokens: options.max_tokens || 4000,
      ...options
    });

    if (!result.success) {
      throw new Error(result.error || 'Custom task failed');
    }

    return {
      type: 'custom_result',
      content: result.message.content,
      model: this.model,
      timestamp: Date.now()
    };
  }
}