import { EnhancedBaseAgent } from './EnhancedBaseAgent.js';

export class ReasoningAgent extends EnhancedBaseAgent {
  constructor(config) {
    super(config);
    this.thoughtChain = [];
    this.maxSteps = 10;
  }
  
  async handleCustomTask(task) {
    switch (task.type) {
      case 'deep_analysis':
        return this.performDeepAnalysis(task);
      case 'multi_step_reasoning':
        return this.performMultiStepReasoning(task);
      case 'proof':
        return this.generateProof(task);
      case 'solve':
        return this.solveProblem(task);
      default:
        return super.handleCustomTask(task);
    }
  }
  
  async performDeepAnalysis(task) {
    const { query, context, depth = 'comprehensive' } = task;
    
    const analysisPrompt = `
You are a deep reasoning agent. Perform a ${depth} analysis of the following:

Query: ${query}
${context ? `Context: ${context}` : ''}

Provide:
1. Initial observations
2. Key assumptions
3. Logical breakdown
4. Deep insights
5. Implications
6. Conclusions

Think step by step, showing your reasoning process.`;

    const response = await this.generate(analysisPrompt, {
      temperature: 0.5,
      max_tokens: 2000
    });
    
    // Store in thought chain
    this.thoughtChain.push({
      type: 'deep_analysis',
      query,
      analysis: response,
      timestamp: Date.now()
    });
    
    return {
      analysis: response,
      thoughtChainLength: this.thoughtChain.length
    };
  }
  
  async performMultiStepReasoning(task) {
    const { problem, maxSteps = this.maxSteps } = task;
    const steps = [];
    let currentProblem = problem;
    let solved = false;
    
    for (let i = 0; i < maxSteps && !solved; i++) {
      const stepPrompt = `
Step ${i + 1} of multi-step reasoning:

Current problem state: ${currentProblem}
Previous steps: ${steps.map((s, idx) => `${idx + 1}. ${s.summary}`).join('\n')}

What is the next logical step? If the problem is solved, start your response with "SOLVED:".
Otherwise, start with "STEP:" and explain your reasoning.`;

      const response = await this.generate(stepPrompt, {
        temperature: 0.4,
        max_tokens: 500
      });
      
      if (response.startsWith('SOLVED:')) {
        solved = true;
        steps.push({
          step: i + 1,
          type: 'solution',
          content: response.substring(7).trim(),
          summary: 'Final solution reached'
        });
      } else {
        const content = response.startsWith('STEP:') ? 
          response.substring(5).trim() : response;
        
        steps.push({
          step: i + 1,
          type: 'reasoning',
          content,
          summary: this.summarizeStep(content)
        });
        
        // Update problem state based on this step
        currentProblem = await this.updateProblemState(currentProblem, content);
      }
    }
    
    this.thoughtChain.push({
      type: 'multi_step_reasoning',
      problem,
      steps,
      solved,
      timestamp: Date.now()
    });
    
    return {
      solved,
      steps,
      totalSteps: steps.length,
      conclusion: solved ? steps[steps.length - 1].content : 'Maximum steps reached without solution'
    };
  }
  
  async generateProof(task) {
    const { statement, type = 'mathematical' } = task;
    
    const proofPrompt = `
Generate a rigorous ${type} proof for the following statement:

Statement: ${statement}

Structure your proof with:
1. Given information
2. What to prove
3. Proof strategy
4. Step-by-step proof
5. Conclusion (QED)

Use formal notation where appropriate.`;

    const proof = await this.generate(proofPrompt, {
      temperature: 0.3,
      max_tokens: 1500
    });
    
    return {
      statement,
      type,
      proof,
      timestamp: Date.now()
    };
  }
  
  async solveProblem(task) {
    const { problem, constraints = [], approach = 'systematic' } = task;
    
    const solvingPrompt = `
Solve the following problem using a ${approach} approach:

Problem: ${problem}
${constraints.length > 0 ? `Constraints: ${constraints.join(', ')}` : ''}

Show your work:
1. Problem understanding
2. Approach selection
3. Solution process
4. Verification
5. Final answer`;

    const solution = await this.generate(solvingPrompt, {
      temperature: 0.4,
      max_tokens: 1500
    });
    
    return {
      problem,
      solution,
      approach,
      constraints
    };
  }
  
  summarizeStep(stepContent) {
    // Extract first meaningful sentence or key action
    const sentences = stepContent.split(/[.!?]+/);
    return sentences[0]?.trim() || stepContent.substring(0, 50) + '...';
  }
  
  async updateProblemState(currentState, stepResult) {
    // Use LLM to update problem state based on step result
    const updatePrompt = `
Given the current problem state and the result of the last step, what is the new problem state?

Current state: ${currentState}
Step result: ${stepResult}

Provide only the updated problem state, concisely.`;

    return this.generate(updatePrompt, {
      temperature: 0.3,
      max_tokens: 200
    });
  }
  
  getThoughtChain() {
    return this.thoughtChain;
  }
  
  clearThoughtChain() {
    this.thoughtChain = [];
  }
}