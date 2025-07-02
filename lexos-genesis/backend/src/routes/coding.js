import express from 'express';
import anthropicService from '../services/anthropicService.js';
import openAIService from '../services/openaiService.js';
import multiModelCodingService from '../services/multiModelCodingService.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// General coding task
router.post('/task', verifyToken, async (req, res) => {
  try {
    const { task, code, language, stream } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task description is required' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const messages = [
        {
          role: 'system',
          content: `You are an expert ${language || 'programming'} developer. Provide clean, efficient, and well-commented code.`
        },
        {
          role: 'user',
          content: task + (code ? '\n\nCurrent code:\n```\n' + code + '\n```' : '')
        }
      ];

      try {
        // Try GPT-4 first
        await openAIService.streamChat(
          messages,
          (chunk) => {
            res.write(`data: ${JSON.stringify({ content: chunk, model: 'gpt-4' })}\n\n`);
          }
        );
      } catch (error) {
        // Fallback to Claude Opus
        res.write(`data: ${JSON.stringify({ info: 'Switching to Claude Opus...' })}\n\n`);
        await anthropicService.streamChat(
          messages,
          (chunk) => {
            res.write(`data: ${JSON.stringify({ content: chunk, model: 'claude-opus' })}\n\n`);
          }
        );
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Use multi-model approach for better results
      const result = await multiModelCodingService.solveCodingTask(task, code, { 
        stream: false,
        language 
      });
      res.json({
        success: true,
        ...result
      });
    }
  } catch (error) {
    console.error('Coding task error:', error);
    res.status(500).json({ error: 'Failed to process coding task' });
  }
});

// Code review
router.post('/review', verifyToken, async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required for review' });
    }

    const result = await multiModelCodingService.reviewCode(code, language);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Code review error:', error);
    res.status(500).json({ error: 'Failed to review code' });
  }
});

// Generate tests
router.post('/tests', verifyToken, async (req, res) => {
  try {
    const { code, framework = 'jest' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required to generate tests' });
    }

    const result = await multiModelCodingService.generateTests(code, framework);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ error: 'Failed to generate tests' });
  }
});

// Refactor code
router.post('/refactor', verifyToken, async (req, res) => {
  try {
    const { code, requirements } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required for refactoring' });
    }

    const task = `Refactor this code${requirements ? ' with requirements: ' + requirements : ''}`;
    const result = await multiModelCodingService.solveCodingTask(task, code);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Refactoring error:', error);
    res.status(500).json({ error: 'Failed to refactor code' });
  }
});

// Debug code
router.post('/debug', verifyToken, async (req, res) => {
  try {
    const { code, error: errorMessage } = req.body;

    if (!code || !errorMessage) {
      return res.status(400).json({ error: 'Code and error message are required' });
    }

    const result = await multiModelCodingService.debugCode(code, errorMessage);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Debugging error:', error);
    res.status(500).json({ error: 'Failed to debug code' });
  }
});

// Explain code
router.post('/explain', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = await multiModelCodingService.explainCode(code);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Code explanation error:', error);
    res.status(500).json({ error: 'Failed to explain code' });
  }
});

// Optimize code
router.post('/optimize', verifyToken, async (req, res) => {
  try {
    const { code, metric = 'performance' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required for optimization' });
    }

    const result = await multiModelCodingService.optimizeCode(code, metric);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: 'Failed to optimize code' });
  }
});

// Convert code between languages
router.post('/convert', verifyToken, async (req, res) => {
  try {
    const { code, fromLang, toLang } = req.body;

    if (!code || !fromLang || !toLang) {
      return res.status(400).json({ 
        error: 'Code, source language, and target language are required' 
      });
    }

    const result = await multiModelCodingService.convertCode(code, fromLang, toLang);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Code conversion error:', error);
    res.status(500).json({ error: 'Failed to convert code' });
  }
});

// Compare Claude vs GPT-4 for a task
router.post('/compare', verifyToken, async (req, res) => {
  try {
    const { task, code } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an expert programmer. Provide clean, efficient, and well-commented code.'
      },
      {
        role: 'user',
        content: task + (code ? '\n\nCurrent code:\n```\n' + code + '\n```' : '')
      }
    ];

    // Run both in parallel
    const [claudeResult, gptResult] = await Promise.allSettled([
      anthropicService.chat(messages, { temperature: 0.3 }),
      openAIService.chat(messages, { temperature: 0.3 })
    ]);

    res.json({
      success: true,
      claude: claudeResult.status === 'fulfilled' ? claudeResult.value : { error: claudeResult.reason.message },
      gpt4: gptResult.status === 'fulfilled' ? gptResult.value : { error: gptResult.reason.message }
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: 'Failed to compare models' });
  }
});

// Get available models and their status
router.get('/models', verifyToken, async (req, res) => {
  try {
    const modelStatus = multiModelCodingService.getModelStatus();
    res.json({
      success: true,
      models: modelStatus
    });
  } catch (error) {
    console.error('Model status error:', error);
    res.status(500).json({ error: 'Failed to get model status' });
  }
});

// Multi-model comparison endpoint
router.post('/multi-compare', verifyToken, async (req, res) => {
  try {
    const { task, code, models } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    const requestedModels = models || ['gemini-2.5', 'claude-opus', 'gpt-4'];
    const results = {};

    // Run task on multiple models in parallel
    const promises = requestedModels.map(async (modelName) => {
      try {
        const result = await multiModelCodingService.executeWithModel(modelName, task, code || '');
        return { model: modelName, result, success: true };
      } catch (error) {
        return { model: modelName, error: error.message, success: false };
      }
    });

    const responses = await Promise.allSettled(promises);
    
    responses.forEach((response, index) => {
      const modelName = requestedModels[index];
      if (response.status === 'fulfilled') {
        results[modelName] = response.value;
      } else {
        results[modelName] = { 
          success: false, 
          error: response.reason?.message || 'Unknown error' 
        };
      }
    });

    res.json({
      success: true,
      task,
      results,
      comparison: Object.keys(results).map(model => ({
        model,
        success: results[model].success,
        preview: results[model].success ? 
          results[model].result.content?.substring(0, 200) + '...' : 
          results[model].error
      }))
    });
  } catch (error) {
    console.error('Multi-model comparison error:', error);
    res.status(500).json({ error: 'Failed to run multi-model comparison' });
  }
});

export default router;