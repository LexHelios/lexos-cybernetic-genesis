import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

// Test client for the agent executor
class TestClient {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  async listAgents() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/agents`);
      console.log('\n=== Available Agents ===');
      response.data.agents.forEach(agent => {
        console.log(`\nAgent: ${agent.name} (${agent.agent_id})`);
        console.log(`Status: ${agent.status}`);
        console.log(`Description: ${agent.description}`);
        console.log('Capabilities:');
        agent.capabilities.forEach(cap => {
          console.log(`  - ${cap.name}: ${cap.description}`);
        });
      });
      return response.data.agents;
    } catch (error) {
      console.error('Error listing agents:', error.message);
      return [];
    }
  }

  async submitTask(agentId, taskType, parameters, priority = 'normal') {
    try {
      const response = await axios.post(`${this.baseUrl}/api/tasks`, {
        agent_id: agentId,
        task_type: taskType,
        parameters: parameters,
        priority: priority
      }, {
        headers: {
          'X-User-Id': 'test-user',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`\nTask submitted successfully!`);
      console.log(`Task ID: ${response.data.task_id}`);
      console.log(`Status: ${response.data.status}`);
      console.log(`Queue Position: ${response.data.queue_position}`);
      
      return response.data.task_id;
    } catch (error) {
      console.error('Error submitting task:', error.message);
      return null;
    }
  }

  async getTaskStatus(taskId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting task status:', error.message);
      return null;
    }
  }

  async waitForTask(taskId, maxWaitTime = 30000) {
    const startTime = Date.now();
    console.log(`\nWaiting for task ${taskId} to complete...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      const task = await this.getTaskStatus(taskId);
      
      if (!task) {
        console.error('Failed to get task status');
        return null;
      }
      
      if (task.status === 'completed' || task.status === 'failed') {
        return task;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      process.stdout.write('.');
    }
    
    console.log('\nTask timed out');
    return null;
  }

  async runConsciousnessQuery(query) {
    console.log('\n=== Consciousness Query Test ===');
    console.log(`Query: "${query}"`);
    
    const taskId = await this.submitTask('consciousness-001', 'consciousness_query', {
      query: query,
      depth: 'deep',
      temperature: 0.9
    });
    
    if (!taskId) return;
    
    const result = await this.waitForTask(taskId);
    
    if (result && result.status === 'completed') {
      console.log('\n\n=== Response ===');
      console.log(result.result.response);
      
      if (result.result.reflection) {
        console.log('\n=== Reflection ===');
        console.log(result.result.reflection);
      }
    } else {
      console.error('Task failed or timed out');
    }
  }

  async runCodeGeneration(prompt, language = 'javascript') {
    console.log('\n=== Code Generation Test ===');
    console.log(`Prompt: "${prompt}"`);
    console.log(`Language: ${language}`);
    
    const taskId = await this.submitTask('executor-001', 'code_generation', {
      command: prompt,
      task_type: 'code_generation',
      language: language,
      temperature: 0.3
    });
    
    if (!taskId) return;
    
    const result = await this.waitForTask(taskId);
    
    if (result && result.status === 'completed') {
      console.log('\n\n=== Generated Code ===');
      console.log('```' + language);
      console.log(result.result.code);
      console.log('```');
    } else {
      console.error('Task failed or timed out');
    }
  }

  async runResearch(topic, depth = 'standard') {
    console.log('\n=== Research Test ===');
    console.log(`Topic: "${topic}"`);
    console.log(`Depth: ${depth}`);
    
    const taskId = await this.submitTask('research-001', 'general', {
      query: topic,
      research_type: 'general',
      depth: depth,
      temperature: 0.5
    });
    
    if (!taskId) return;
    
    const result = await this.waitForTask(taskId);
    
    if (result && result.status === 'completed') {
      console.log('\n\n=== Research Results ===');
      console.log(result.result.research);
      
      if (result.result.summary) {
        console.log('\n=== Summary ===');
        console.log(result.result.summary);
      }
    } else {
      console.error('Task failed or timed out');
    }
  }

  async getSystemStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/system/status`);
      console.log('\n=== System Status ===');
      console.log(`Total Tasks: ${response.data.total_tasks}`);
      console.log(`Active Tasks: ${response.data.active_tasks}`);
      console.log(`Queued Tasks: ${response.data.queued_tasks}`);
      console.log(`Completed Tasks: ${response.data.completed_tasks}`);
      console.log(`Failed Tasks: ${response.data.failed_tasks}`);
      console.log(`Agents Online: ${response.data.agents_online}/${response.data.agents_total}`);
      console.log(`Uptime: ${Math.floor(response.data.uptime / 60)} minutes`);
    } catch (error) {
      console.error('Error getting system status:', error.message);
    }
  }
}

// Run tests
async function runTests() {
  const client = new TestClient();
  
  console.log('Starting Agent Executor Test Client...\n');
  
  // Check system status
  await client.getSystemStatus();
  
  // List available agents
  await client.listAgents();
  
  // Test consciousness query
  await client.runConsciousnessQuery('What is the relationship between consciousness and computation?');
  
  // Test code generation
  await client.runCodeGeneration('Create a function that implements a binary search tree in Python', 'python');
  
  // Test research
  await client.runResearch('Recent advances in quantum computing', 'deep');
  
  // Final system status
  await client.getSystemStatus();
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // Run all tests
  runTests().catch(console.error);
} else {
  const client = new TestClient();
  const command = args[0];
  
  switch (command) {
    case 'agents':
      client.listAgents().catch(console.error);
      break;
      
    case 'status':
      client.getSystemStatus().catch(console.error);
      break;
      
    case 'consciousness':
      const query = args.slice(1).join(' ') || 'What is consciousness?';
      client.runConsciousnessQuery(query).catch(console.error);
      break;
      
    case 'code':
      const prompt = args.slice(1).join(' ') || 'Create a hello world function';
      client.runCodeGeneration(prompt).catch(console.error);
      break;
      
    case 'research':
      const topic = args.slice(1).join(' ') || 'Artificial Intelligence';
      client.runResearch(topic).catch(console.error);
      break;
      
    default:
      console.log('Usage: node test-client.js [command] [args...]');
      console.log('Commands:');
      console.log('  agents                    - List all agents');
      console.log('  status                    - Get system status');
      console.log('  consciousness [query]     - Run consciousness query');
      console.log('  code [prompt]            - Generate code');
      console.log('  research [topic]         - Research a topic');
      console.log('  (no command)             - Run all tests');
  }
}