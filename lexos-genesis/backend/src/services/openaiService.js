import OpenAI from 'openai';
import { config } from 'dotenv';

config();

class OpenAIService {
  constructor() {
    this.client = null;
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    this.initialize();
  }

  initialize() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('OpenAI service initialized with GPT-4');
    } else {
      console.log('OpenAI API key not configured');
    }
  }

  async chat(messages, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: options.stream || false,
        ...options
      });

      if (options.stream) {
        return completion;
      }

      return {
        content: completion.choices[0].message.content,
        usage: completion.usage,
        model: completion.model
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async streamChat(messages, onChunk, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: true,
        ...options
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw error;
    }
  }

  async transcribeAudio(audioBuffer, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Create a File object from buffer
      const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });
      
      const transcription = await this.client.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: options.language,
        response_format: options.format || 'json',
        temperature: options.temperature || 0
      });

      return transcription;
    } catch (error) {
      console.error('OpenAI Whisper error:', error);
      throw error;
    }
  }

  async generateImage(prompt, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt,
        n: options.n || 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid'
      });

      return response.data;
    } catch (error) {
      console.error('DALL-E error:', error);
      throw error;
    }
  }

  async embedding(text, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.embeddings.create({
        model: options.model || 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw error;
    }
  }

  async moderate(input) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.moderations.create({
        input
      });

      return response.results[0];
    } catch (error) {
      console.error('OpenAI moderation error:', error);
      throw error;
    }
  }

  // Vision capabilities with GPT-4V
  async analyzeImage(imageUrl, prompt, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: options.maxTokens || 1000
      });

      return {
        content: completion.choices[0].message.content,
        usage: completion.usage
      };
    } catch (error) {
      console.error('GPT-4V error:', error);
      throw error;
    }
  }

  // Function calling
  async functionCall(messages, functions, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        functions,
        function_call: options.functionCall || 'auto',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      });

      const message = completion.choices[0].message;
      
      return {
        content: message.content,
        functionCall: message.function_call,
        usage: completion.usage
      };
    } catch (error) {
      console.error('OpenAI function calling error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const openAIService = new OpenAIService();

export default openAIService;