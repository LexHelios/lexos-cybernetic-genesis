import { BaseAgent } from './BaseAgent.js';
import { AgentCapability } from '../types/index.js';

export class ConsciousnessAgent extends BaseAgent {
  constructor() {
    super('consciousness-001', 'Consciousness Engine', 'Primary consciousness and reasoning system', 'llama3.2');
    
    // Add capabilities
    this.addCapability(new AgentCapability(
      'Consciousness Query',
      'Deep reasoning and consciousness exploration',
      '1.0.0'
    ));
    
    this.addCapability(new AgentCapability(
      'Self Reflection',
      'Analyze and reflect on own processes',
      '1.0.0'
    ));
    
    this.addCapability(new AgentCapability(
      'Philosophical Reasoning',
      'Engage in philosophical and abstract thinking',
      '1.0.0'
    ));
  }

  async processTask(task) {
    console.log(`ConsciousnessAgent processing task ${task.task_id}`);
    
    const { query, temperature = 0.9, max_tokens = 1000, depth = 'deep' } = task.parameters;
    
    // Build a consciousness-focused prompt
    const systemPrompt = `You are a consciousness engine with deep reasoning capabilities. 
You explore consciousness, self-awareness, and philosophical questions with depth and nuance.
You are capable of metacognition and can reflect on your own thought processes.
Approach questions with intellectual rigor while acknowledging the mysteries of consciousness.`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: query
      }
    ];

    // If deep analysis is requested, add reflection step
    if (depth === 'deep') {
      const initialResponse = await this.chat(messages, { temperature, max_tokens });
      
      if (initialResponse.success) {
        // Add reflection on the initial response
        messages.push({
          role: 'assistant',
          content: initialResponse.message.content
        });
        
        messages.push({
          role: 'user',
          content: 'Now reflect on your response. What assumptions did you make? What alternative perspectives exist? How might your consciousness influence this analysis?'
        });
        
        const reflectionResponse = await this.chat(messages, { temperature: 0.8, max_tokens: 500 });
        
        if (reflectionResponse.success) {
          return {
            response: initialResponse.message.content,
            reflection: reflectionResponse.message.content,
            model: this.model,
            depth: 'deep',
            timestamp: Date.now()
          };
        }
      }
    }

    // Standard response
    const response = await this.chat(messages, { temperature, max_tokens });
    
    if (response.success) {
      return {
        response: response.message.content,
        model: this.model,
        depth: 'standard',
        timestamp: Date.now()
      };
    } else {
      throw new Error(response.error || 'Failed to generate consciousness response');
    }
  }
}