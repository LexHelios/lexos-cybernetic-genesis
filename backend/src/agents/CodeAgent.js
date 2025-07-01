import { EnhancedBaseAgent } from './EnhancedBaseAgent.js';

export class CodeAgent extends EnhancedBaseAgent {
  constructor(config) {
    super(config);
    this.supportedLanguages = [
      'javascript', 'typescript', 'python', 'java', 'c++', 
      'rust', 'go', 'ruby', 'php', 'swift', 'kotlin'
    ];
    this.codeHistory = [];
  }
  
  async handleCustomTask(task) {
    switch (task.type) {
      case 'generate_code':
        return this.generateCode(task);
      case 'debug':
        return this.debugCode(task);
      case 'refactor':
        return this.refactorCode(task);
      case 'review':
        return this.reviewCode(task);
      case 'optimize':
        return this.optimizeCode(task);
      case 'explain':
        return this.explainCode(task);
      default:
        return super.handleCustomTask(task);
    }
  }
  
  async generateCode(task) {
    const { 
      description, 
      language = 'javascript', 
      framework = null,
      requirements = [],
      style = 'clean'
    } = task;
    
    const codePrompt = `
Generate ${style} ${language} code for the following:

Description: ${description}
${framework ? `Framework: ${framework}` : ''}
${requirements.length > 0 ? `Requirements:\n${requirements.map(r => `- ${r}`).join('\n')}` : ''}

Provide:
1. Complete, working code
2. Necessary imports
3. Error handling
4. Brief comments for complex logic
5. Example usage if applicable

Code:`;

    const code = await this.generate(codePrompt, {
      temperature: 0.3,
      max_tokens: 2000
    });
    
    this.codeHistory.push({
      type: 'generation',
      language,
      description,
      code,
      timestamp: Date.now()
    });
    
    return {
      code,
      language,
      framework,
      description
    };
  }
  
  async debugCode(task) {
    const { code, error, language = 'javascript' } = task;
    
    const debugPrompt = `
Debug the following ${language} code that's producing an error:

Code:
\`\`\`${language}
${code}
\`\`\`

Error message:
${error}

Provide:
1. Identified issue(s)
2. Root cause analysis
3. Fixed code
4. Explanation of the fix
5. Prevention tips`;

    const debugResult = await this.generate(debugPrompt, {
      temperature: 0.2,
      max_tokens: 1500
    });
    
    return {
      analysis: debugResult,
      language,
      originalError: error
    };
  }
  
  async refactorCode(task) {
    const { 
      code, 
      language = 'javascript',
      goals = ['readability', 'performance', 'maintainability'],
      preserveBehavior = true
    } = task;
    
    const refactorPrompt = `
Refactor the following ${language} code to improve ${goals.join(', ')}:

Original code:
\`\`\`${language}
${code}
\`\`\`

Requirements:
- ${preserveBehavior ? 'Preserve exact behavior' : 'Improve behavior if beneficial'}
- Focus on: ${goals.join(', ')}
- Follow best practices for ${language}

Provide:
1. Refactored code
2. List of changes made
3. Justification for each change`;

    const refactored = await this.generate(refactorPrompt, {
      temperature: 0.3,
      max_tokens: 2000
    });
    
    return {
      refactoredCode: refactored,
      goals,
      language
    };
  }
  
  async reviewCode(task) {
    const { code, language = 'javascript', criteria = [] } = task;
    
    const defaultCriteria = [
      'correctness', 'efficiency', 'readability', 
      'maintainability', 'security', 'best practices'
    ];
    
    const reviewCriteria = criteria.length > 0 ? criteria : defaultCriteria;
    
    const reviewPrompt = `
Perform a comprehensive code review of the following ${language} code:

Code:
\`\`\`${language}
${code}
\`\`\`

Review criteria: ${reviewCriteria.join(', ')}

Provide:
1. Overall assessment (rating 1-10)
2. Strengths
3. Issues found (categorized by severity)
4. Specific suggestions for improvement
5. Security concerns (if any)`;

    const review = await this.generate(reviewPrompt, {
      temperature: 0.4,
      max_tokens: 1500
    });
    
    return {
      review,
      language,
      criteria: reviewCriteria
    };
  }
  
  async optimizeCode(task) {
    const { 
      code, 
      language = 'javascript',
      targetMetric = 'performance',
      constraints = []
    } = task;
    
    const optimizePrompt = `
Optimize the following ${language} code for ${targetMetric}:

Code:
\`\`\`${language}
${code}
\`\`\`

${constraints.length > 0 ? `Constraints:\n${constraints.map(c => `- ${c}`).join('\n')}` : ''}

Provide:
1. Optimized code
2. Performance improvements made
3. Trade-offs (if any)
4. Benchmark comparisons (conceptual)
5. Further optimization opportunities`;

    const optimized = await this.generate(optimizePrompt, {
      temperature: 0.3,
      max_tokens: 2000
    });
    
    return {
      optimizedCode: optimized,
      targetMetric,
      language
    };
  }
  
  async explainCode(task) {
    const { 
      code, 
      language = 'javascript',
      level = 'intermediate',
      focus = null
    } = task;
    
    const explainPrompt = `
Explain the following ${language} code at ${level} level:

Code:
\`\`\`${language}
${code}
\`\`\`

${focus ? `Focus on: ${focus}` : ''}

Provide:
1. Overview of what the code does
2. Step-by-step breakdown
3. Key concepts used
4. Potential use cases
5. Common pitfalls or gotchas`;

    const explanation = await this.generate(explainPrompt, {
      temperature: 0.5,
      max_tokens: 1500
    });
    
    return {
      explanation,
      language,
      level
    };
  }
  
  getCodeHistory() {
    return this.codeHistory;
  }
  
  clearCodeHistory() {
    this.codeHistory = [];
  }
}