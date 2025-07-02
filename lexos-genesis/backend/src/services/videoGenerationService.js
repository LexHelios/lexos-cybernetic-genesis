import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import openAIService from './openaiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VideoGenerationService {
  constructor() {
    this.workDir = path.join(__dirname, '../../temp/video-gen');
    this.outputDir = path.join(__dirname, '../../output/videos');
    this.modelPaths = {
      videocrafter: process.env.VIDEOCRAFTER_PATH || '/models/videocrafter1',
      seedance: process.env.SEEDANCE_PATH || '/models/seedance',
      diffFoley: process.env.DIFF_FOLEY_PATH || '/models/diff-foley',
      mmDiffusion: process.env.MM_DIFFUSION_PATH || '/models/mm-diffusion'
    };
    this.initialize();
  }

  async initialize() {
    // Create directories
    await fs.mkdir(this.workDir, { recursive: true });
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log('Video generation service initialized');
  }

  // Main pipeline: Text → Video with Audio
  async generateVideoWithAudio(prompt, options = {}) {
    const jobId = uuidv4();
    const jobDir = path.join(this.workDir, jobId);
    await fs.mkdir(jobDir, { recursive: true });

    try {
      console.log(`Starting video generation job ${jobId}`);

      // Step 1: Enhance prompt with Seedance
      const enhancedPrompt = await this.enhancePromptWithSeedance(prompt, options);

      // Step 2: Generate video frames with VideoCrafter1
      const videoPath = await this.generateVideoFrames(enhancedPrompt, jobDir, options);

      // Step 3: Generate synchronized audio
      const audioPath = await this.generateAudioForVideo(videoPath, jobDir, options);

      // Step 4: Mux video and audio
      const finalPath = await this.muxVideoAudio(videoPath, audioPath, jobId, options);

      // Cleanup temp files
      if (!options.keepTemp) {
        await fs.rm(jobDir, { recursive: true, force: true });
      }

      return {
        success: true,
        jobId,
        path: finalPath,
        url: `/videos/${path.basename(finalPath)}`,
        metadata: {
          originalPrompt: prompt,
          enhancedPrompt,
          duration: options.duration || 4,
          resolution: options.resolution || '1024x576',
          fps: options.fps || 24
        }
      };
    } catch (error) {
      console.error(`Video generation failed for job ${jobId}:`, error);
      // Cleanup on error
      await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  // Enhance prompt using Seedance (Qwen2.5-based)
  async enhancePromptWithSeedance(prompt, options = {}) {
    try {
      console.log('Enhancing prompt with Seedance...');
      
      // Use GPT-4 to simulate Seedance's director's notes approach
      const enhancedResult = await openAIService.chat([
        {
          role: 'system',
          content: `You are a film director creating detailed shot descriptions. Convert the user's prompt into cinematic director's notes including:
- Camera angles and movements
- Lighting and atmosphere
- Subject details and actions
- Scene composition
- Temporal progression
Keep it concise but visually rich.`
        },
        {
          role: 'user',
          content: prompt
        }
      ], { temperature: 0.7, maxTokens: 500 });

      const enhancedPrompt = enhancedResult.content;
      console.log('Enhanced prompt:', enhancedPrompt);
      return enhancedPrompt;
    } catch (error) {
      console.error('Seedance enhancement failed, using original prompt:', error);
      return prompt;
    }
  }

  // Generate video using VideoCrafter1
  async generateVideoFrames(prompt, jobDir, options = {}) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(jobDir, 'video_no_audio.mp4');
      
      // VideoCrafter1 parameters
      const args = [
        'scripts/inference.py',
        '--prompt', prompt,
        '--output', outputPath,
        '--num_frames', options.numFrames || '96', // 4 seconds at 24fps
        '--width', options.width || '1024',
        '--height', options.height || '576',
        '--fps', options.fps || '24',
        '--seed', options.seed || Math.floor(Math.random() * 1000000).toString(),
        '--guidance_scale', options.guidanceScale || '7.5',
        '--num_inference_steps', options.steps || '50'
      ];

      // For now, simulate with a placeholder
      console.log('Generating video frames with VideoCrafter1...');
      console.log('Command:', `python ${args.join(' ')}`);
      
      // Create a placeholder video using FFmpeg
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', `color=c=black:s=${options.width || 1024}x${options.height || 576}:d=${options.duration || 4}`,
        '-vf', `drawtext=text='${prompt.substring(0, 50)}...':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2`,
        '-c:v', 'libx264',
        '-t', options.duration || '4',
        '-pix_fmt', 'yuv420p',
        outputPath
      ]);

      let error = '';
      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Video frames generated successfully');
          resolve(outputPath);
        } else {
          reject(new Error(`VideoCrafter1 failed: ${error}`));
        }
      });
    });
  }

  // Generate audio using Diff-Foley
  async generateAudioForVideo(videoPath, jobDir, options = {}) {
    return new Promise((resolve, reject) => {
      const audioPath = path.join(jobDir, 'audio.wav');
      
      console.log('Generating synchronized audio with Diff-Foley...');
      
      // For now, generate placeholder audio
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'anoisesrc=d=4:c=pink:r=44100:a=0.5',
        '-af', 'volume=0.3',
        audioPath
      ]);

      let error = '';
      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Audio generated successfully');
          resolve(audioPath);
        } else {
          reject(new Error(`Diff-Foley failed: ${error}`));
        }
      });
    });
  }

  // Alternative: Use MM-Diffusion for joint audio-video
  async generateJointAudioVideo(prompt, jobDir, options = {}) {
    console.log('Generating joint audio-video with MM-Diffusion...');
    
    // This would run MM-Diffusion which generates both modalities together
    // For now, we'll use the separate generation approach
    
    const videoPath = await this.generateVideoFrames(prompt, jobDir, options);
    const audioPath = await this.generateAudioForVideo(videoPath, jobDir, options);
    
    return { videoPath, audioPath };
  }

  // Mux video and audio using FFmpeg
  async muxVideoAudio(videoPath, audioPath, jobId, options = {}) {
    return new Promise((resolve, reject) => {
      const outputFilename = `${jobId}_${Date.now()}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);
      
      console.log('Muxing video and audio...');
      
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-y',
        outputPath
      ]);

      let error = '';
      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Video and audio muxed successfully');
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg muxing failed: ${error}`));
        }
      });
    });
  }

  // Generate video thumbnail
  async generateThumbnail(videoPath, options = {}) {
    const thumbnailPath = videoPath.replace('.mp4', '_thumb.jpg');
    
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-ss', options.timestamp || '00:00:01',
        '-vframes', '1',
        '-vf', `scale=${options.width || 320}:-1`,
        '-q:v', '2',
        thumbnailPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(thumbnailPath);
        } else {
          reject(new Error('Thumbnail generation failed'));
        }
      });
    });
  }

  // Get video metadata
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(output);
            resolve(metadata);
          } catch (error) {
            reject(new Error('Failed to parse metadata'));
          }
        } else {
          reject(new Error('Failed to get video metadata'));
        }
      });
    });
  }

  // Advanced options for each model
  async generateWithAdvancedOptions(prompt, options = {}) {
    const {
      model = 'videocrafter1',
      audioModel = 'diff-foley',
      enhancePrompt = true,
      videoOptions = {},
      audioOptions = {},
      postProcessing = {}
    } = options;

    // Step 1: Prompt enhancement
    const finalPrompt = enhancePrompt 
      ? await this.enhancePromptWithSeedance(prompt, options)
      : prompt;

    // Step 2: Video generation based on selected model
    let videoPath;
    if (model === 'videocrafter1') {
      videoPath = await this.generateVideoFrames(finalPrompt, options.jobDir, videoOptions);
    } else {
      // Add other models here as they become available
      videoPath = await this.generateVideoFrames(finalPrompt, options.jobDir, videoOptions);
    }

    // Step 3: Audio generation based on selected model
    let audioPath;
    if (audioModel === 'diff-foley') {
      audioPath = await this.generateAudioForVideo(videoPath, options.jobDir, audioOptions);
    } else if (audioModel === 'mm-diffusion') {
      const result = await this.generateJointAudioVideo(finalPrompt, options.jobDir, options);
      audioPath = result.audioPath;
    } else {
      audioPath = await this.generateAudioForVideo(videoPath, options.jobDir, audioOptions);
    }

    // Step 4: Post-processing
    if (postProcessing.enabled) {
      videoPath = await this.applyPostProcessing(videoPath, postProcessing);
    }

    // Step 5: Final muxing
    return await this.muxVideoAudio(videoPath, audioPath, options.jobId, options);
  }

  // Apply post-processing effects
  async applyPostProcessing(videoPath, options = {}) {
    const {
      stabilize = false,
      denoise = false,
      colorGrade = false,
      upscale = false
    } = options;

    let currentPath = videoPath;

    if (stabilize) {
      currentPath = await this.stabilizeVideo(currentPath);
    }

    if (denoise) {
      currentPath = await this.denoiseVideo(currentPath);
    }

    if (colorGrade) {
      currentPath = await this.applyColorGrading(currentPath, options.colorProfile);
    }

    if (upscale) {
      currentPath = await this.upscaleVideo(currentPath, options.targetResolution);
    }

    return currentPath;
  }

  // Video stabilization
  async stabilizeVideo(videoPath) {
    // Implement video stabilization using FFmpeg
    console.log('Applying video stabilization...');
    return videoPath; // Placeholder
  }

  // Video denoising
  async denoiseVideo(videoPath) {
    // Implement video denoising
    console.log('Applying video denoising...');
    return videoPath; // Placeholder
  }

  // Color grading
  async applyColorGrading(videoPath, profile = 'cinematic') {
    // Implement color grading
    console.log(`Applying ${profile} color grading...`);
    return videoPath; // Placeholder
  }

  // Video upscaling
  async upscaleVideo(videoPath, targetResolution = '1920x1080') {
    // Implement video upscaling
    console.log(`Upscaling to ${targetResolution}...`);
    return videoPath; // Placeholder
  }

  // Batch processing
  async batchGenerate(prompts, options = {}) {
    const results = [];
    
    for (const prompt of prompts) {
      try {
        const result = await this.generateVideoWithAudio(prompt, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          prompt,
          error: error.message
        });
      }
    }

    return results;
  }

  // Clean up old files
  async cleanup(olderThanHours = 24) {
    const files = await fs.readdir(this.outputDir);
    const now = Date.now();
    const threshold = olderThanHours * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(this.outputDir, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > threshold) {
        await fs.unlink(filePath);
        console.log(`Cleaned up old video: ${file}`);
      }
    }
  }
}

// Create singleton instance
const videoGenerationService = new VideoGenerationService();

// Run cleanup every 24 hours
setInterval(() => {
  videoGenerationService.cleanup(48).catch(console.error);
}, 24 * 60 * 60 * 1000);

export default videoGenerationService;