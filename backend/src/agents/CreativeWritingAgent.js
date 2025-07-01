import { EnhancedBaseAgent } from './EnhancedBaseAgent.js';

export class CreativeWritingAgent extends EnhancedBaseAgent {
  constructor(config) {
    super(config);
    this.genres = [
      'fantasy', 'sci-fi', 'mystery', 'romance', 'thriller',
      'horror', 'literary', 'humor', 'poetry', 'screenplay'
    ];
    this.creativeWorks = [];
  }
  
  async handleCustomTask(task) {
    switch (task.type) {
      case 'write_story':
        return this.writeStory(task);
      case 'write_poem':
        return this.writePoem(task);
      case 'generate_ideas':
        return this.generateIdeas(task);
      case 'continue_story':
        return this.continueStory(task);
      case 'create_character':
        return this.createCharacter(task);
      case 'world_building':
        return this.worldBuilding(task);
      default:
        return super.handleCustomTask(task);
    }
  }
  
  async writeStory(task) {
    const {
      prompt,
      genre = 'general',
      length = 'short',
      style = 'narrative',
      tone = 'engaging'
    } = task;
    
    const storyPrompt = `
Write a ${length} ${genre} story with a ${tone} tone in ${style} style.

Prompt: ${prompt}

Create an engaging story with:
- Strong opening
- Developed characters
- Clear plot
- Vivid descriptions
- Satisfying conclusion

Story:`;

    const story = await this.generate(storyPrompt, {
      temperature: 0.8,
      max_tokens: length === 'short' ? 1000 : 3000
    });
    
    this.creativeWorks.push({
      type: 'story',
      genre,
      content: story,
      prompt,
      timestamp: Date.now()
    });
    
    return {
      story,
      genre,
      length,
      wordCount: story.split(' ').length
    };
  }
  
  async writePoem(task) {
    const {
      theme,
      style = 'free verse',
      mood = 'contemplative',
      length = 'medium'
    } = task;
    
    const poemPrompt = `
Write a ${style} poem about ${theme} with a ${mood} mood.

Create a ${length} poem that:
- Captures the essence of ${theme}
- Uses vivid imagery
- Employs appropriate poetic devices
- Evokes emotion

Poem:`;

    const poem = await this.generate(poemPrompt, {
      temperature: 0.9,
      max_tokens: 500
    });
    
    this.creativeWorks.push({
      type: 'poem',
      style,
      content: poem,
      theme,
      timestamp: Date.now()
    });
    
    return {
      poem,
      style,
      theme,
      mood
    };
  }
  
  async generateIdeas(task) {
    const {
      topic,
      type = 'story',
      count = 5,
      detail = 'brief'
    } = task;
    
    const ideasPrompt = `
Generate ${count} creative ${type} ideas related to ${topic}.

For each idea, provide:
${detail === 'brief' ? '- One-line concept' : `- Title
- Brief synopsis
- Key elements
- Unique angle`}

Ideas:`;

    const ideas = await this.generate(ideasPrompt, {
      temperature: 0.9,
      max_tokens: 1000
    });
    
    return {
      ideas,
      topic,
      type,
      count
    };
  }
  
  async continueStory(task) {
    const {
      story,
      direction = null,
      length = 500
    } = task;
    
    const continuationPrompt = `
Continue this story:

${story}

${direction ? `Take the story in this direction: ${direction}` : 'Continue naturally'}

Write approximately ${length} words that:
- Maintain consistency with the existing story
- Advance the plot
- Keep the same tone and style

Continuation:`;

    const continuation = await this.generate(continuationPrompt, {
      temperature: 0.8,
      max_tokens: Math.ceil(length * 1.5)
    });
    
    return {
      continuation,
      originalLength: story.split(' ').length,
      addedLength: continuation.split(' ').length
    };
  }
  
  async createCharacter(task) {
    const {
      role,
      genre = 'general',
      depth = 'detailed'
    } = task;
    
    const characterPrompt = `
Create a ${depth} character profile for a ${role} in a ${genre} setting.

Include:
${depth === 'basic' ? `- Name
- Age
- Appearance
- Key personality traits
- Main motivation` : `- Full name and nicknames
- Age and birthday
- Physical appearance (detailed)
- Personality traits (5-7)
- Background/history
- Motivations and goals
- Fears and weaknesses
- Relationships
- Special abilities/skills
- Character arc potential
- Memorable quirks
- Speaking style`}

Character Profile:`;

    const character = await this.generate(characterPrompt, {
      temperature: 0.8,
      max_tokens: depth === 'basic' ? 500 : 1500
    });
    
    return {
      character,
      role,
      genre,
      depth
    };
  }
  
  async worldBuilding(task) {
    const {
      type = 'fantasy',
      scope = 'overview',
      focus = null
    } = task;
    
    const worldPrompt = `
Create a ${scope} of a ${type} world.

${focus ? `Focus on: ${focus}` : 'Cover all major aspects'}

Include:
${scope === 'overview' ? `- World name and general concept
- Geography basics
- Major civilizations
- Magic/technology level
- Key conflicts` : `- Detailed geography and climate
- Multiple cultures and societies
- Political systems
- Economic structures
- History and timeline
- Magic/technology systems
- Flora and fauna
- Languages and customs
- Conflicts and tensions
- Mysteries and legends`}

World Description:`;

    const world = await this.generate(worldPrompt, {
      temperature: 0.8,
      max_tokens: scope === 'overview' ? 1000 : 2500
    });
    
    return {
      world,
      type,
      scope,
      focus
    };
  }
  
  getCreativeWorks() {
    return this.creativeWorks;
  }
  
  getWorksByType(type) {
    return this.creativeWorks.filter(work => work.type === type);
  }
}