import express from 'express';
import videoGenerationService from '../services/videoGenerationService.js';
import { verifyToken } from './auth.js';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Store active generation jobs
const activeJobs = new Map();

// Generate video from text prompt
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const {
      prompt,
      duration = 4,
      resolution = '1024x576',
      fps = 24,
      enhancePrompt = true,
      audioModel = 'diff-foley',
      postProcessing = {},
      seed
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Parse resolution
    const [width, height] = resolution.split('x').map(Number);
    
    const options = {
      duration,
      width,
      height,
      fps,
      seed,
      enhancePrompt,
      audioModel,
      postProcessing,
      numFrames: fps * duration
    };

    // Start async generation
    const jobPromise = videoGenerationService.generateVideoWithAudio(prompt, options);
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    activeJobs.set(jobId, {
      id: jobId,
      status: 'processing',
      prompt,
      startTime: Date.now(),
      promise: jobPromise
    });

    // Handle completion/error asynchronously
    jobPromise
      .then(result => {
        activeJobs.set(jobId, {
          ...activeJobs.get(jobId),
          status: 'completed',
          result,
          endTime: Date.now()
        });
      })
      .catch(error => {
        activeJobs.set(jobId, {
          ...activeJobs.get(jobId),
          status: 'failed',
          error: error.message,
          endTime: Date.now()
        });
      });

    // Return job ID immediately
    res.json({
      success: true,
      jobId,
      message: 'Video generation started',
      estimatedTime: duration * 15 // Rough estimate in seconds
    });
  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({ error: 'Failed to start video generation' });
  }
});

// Check generation status
router.get('/status/:jobId', verifyToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = activeJobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const response = {
      jobId: job.id,
      status: job.status,
      prompt: job.prompt,
      startTime: job.startTime,
      endTime: job.endTime,
      elapsedTime: (job.endTime || Date.now()) - job.startTime
    };

    if (job.status === 'completed' && job.result) {
      response.result = {
        url: job.result.url,
        metadata: job.result.metadata
      };
    } else if (job.status === 'failed') {
      response.error = job.error;
    }

    res.json(response);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check job status' });
  }
});

// Download generated video
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../output/videos',
      filename
    );

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = await fs.readFile(filePath);
    res.send(fileStream);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download video' });
  }
});

// Get video thumbnail
router.get('/thumbnail/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const videoPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../output/videos',
      filename
    );

    // Generate thumbnail
    const thumbnailPath = await videoGenerationService.generateThumbnail(videoPath);

    // Send thumbnail
    const thumbnail = await fs.readFile(thumbnailPath);
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(thumbnail);
  } catch (error) {
    console.error('Thumbnail error:', error);
    res.status(500).json({ error: 'Failed to generate thumbnail' });
  }
});

// Get video metadata
router.get('/metadata/:filename', verifyToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const videoPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../output/videos',
      filename
    );

    const metadata = await videoGenerationService.getVideoMetadata(videoPath);
    res.json(metadata);
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: 'Failed to get video metadata' });
  }
});

// Advanced generation with options
router.post('/generate-advanced', verifyToken, async (req, res) => {
  try {
    const {
      prompt,
      model = 'videocrafter1',
      audioModel = 'diff-foley',
      enhancePrompt = true,
      videoOptions = {},
      audioOptions = {},
      postProcessing = {}
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const jobDir = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../temp/video-gen',
      jobId
    );

    const options = {
      model,
      audioModel,
      enhancePrompt,
      videoOptions,
      audioOptions,
      postProcessing,
      jobId,
      jobDir
    };

    // Start async generation
    const jobPromise = videoGenerationService.generateWithAdvancedOptions(prompt, options);
    
    activeJobs.set(jobId, {
      id: jobId,
      status: 'processing',
      prompt,
      options,
      startTime: Date.now(),
      promise: jobPromise
    });

    // Handle completion/error
    jobPromise
      .then(result => {
        activeJobs.set(jobId, {
          ...activeJobs.get(jobId),
          status: 'completed',
          result: {
            path: result,
            url: `/api/video/download/${path.basename(result)}`
          },
          endTime: Date.now()
        });
      })
      .catch(error => {
        activeJobs.set(jobId, {
          ...activeJobs.get(jobId),
          status: 'failed',
          error: error.message,
          endTime: Date.now()
        });
      });

    res.json({
      success: true,
      jobId,
      message: 'Advanced video generation started'
    });
  } catch (error) {
    console.error('Advanced generation error:', error);
    res.status(500).json({ error: 'Failed to start advanced generation' });
  }
});

// Batch generation
router.post('/batch', verifyToken, async (req, res) => {
  try {
    const { prompts, options = {} } = req.body;

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: 'Prompts array is required' });
    }

    if (prompts.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 prompts allowed per batch' });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Start batch processing
    const batchPromise = videoGenerationService.batchGenerate(prompts, options);
    
    activeJobs.set(batchId, {
      id: batchId,
      type: 'batch',
      status: 'processing',
      prompts,
      startTime: Date.now(),
      promise: batchPromise
    });

    // Handle completion
    batchPromise
      .then(results => {
        activeJobs.set(batchId, {
          ...activeJobs.get(batchId),
          status: 'completed',
          results,
          endTime: Date.now()
        });
      })
      .catch(error => {
        activeJobs.set(batchId, {
          ...activeJobs.get(batchId),
          status: 'failed',
          error: error.message,
          endTime: Date.now()
        });
      });

    res.json({
      success: true,
      batchId,
      message: 'Batch generation started',
      count: prompts.length
    });
  } catch (error) {
    console.error('Batch generation error:', error);
    res.status(500).json({ error: 'Failed to start batch generation' });
  }
});

// List recent videos
router.get('/list', verifyToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const outputDir = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../output/videos'
    );

    const files = await fs.readdir(outputDir);
    const videos = [];

    // Get file stats and sort by creation time
    for (const file of files) {
      if (file.endsWith('.mp4')) {
        const filePath = path.join(outputDir, file);
        const stats = await fs.stat(filePath);
        videos.push({
          filename: file,
          url: `/api/video/download/${file}`,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        });
      }
    }

    // Sort by creation time (newest first)
    videos.sort((a, b) => b.created - a.created);

    // Apply pagination
    const paginatedVideos = videos.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      videos: paginatedVideos,
      total: videos.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('List videos error:', error);
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

// Clean up old videos and jobs
router.post('/cleanup', verifyToken, async (req, res) => {
  try {
    const { olderThanHours = 48 } = req.body;

    // Clean up files
    await videoGenerationService.cleanup(olderThanHours);

    // Clean up old jobs from memory
    const now = Date.now();
    const threshold = olderThanHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [jobId, job] of activeJobs.entries()) {
      if (job.endTime && (now - job.endTime > threshold)) {
        activeJobs.delete(jobId);
        cleaned++;
      }
    }

    res.json({
      success: true,
      message: `Cleaned up videos older than ${olderThanHours} hours`,
      jobsCleaned: cleaned
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to clean up' });
  }
});

// Get available models and options
router.get('/models', async (req, res) => {
  res.json({
    videoModels: [
      {
        id: 'videocrafter1',
        name: 'VideoCrafter1',
        description: 'High-quality text-to-video generation',
        maxDuration: 10,
        resolutions: ['512x512', '1024x576', '1280x720'],
        fps: [8, 12, 24, 30]
      }
    ],
    audioModels: [
      {
        id: 'diff-foley',
        name: 'Diff-Foley',
        description: 'Video-to-audio generation for synchronized sound',
        features: ['synchronized', 'environmental', 'effects']
      },
      {
        id: 'mm-diffusion',
        name: 'MM-Diffusion',
        description: 'Joint audio-video generation',
        features: ['joint-generation', 'synchronized', 'music']
      }
    ],
    postProcessing: {
      stabilize: 'Video stabilization',
      denoise: 'Noise reduction',
      colorGrade: 'Color grading (cinematic, vibrant, noir)',
      upscale: 'Resolution upscaling'
    }
  });
});

// Clean up old jobs periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [jobId, job] of activeJobs.entries()) {
    if (job.endTime && (now - job.endTime > oneHour * 24)) {
      activeJobs.delete(jobId);
    }
  }
}, 60 * 60 * 1000);

export default router;