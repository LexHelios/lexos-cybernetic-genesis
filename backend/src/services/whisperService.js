import { pipeline, env } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import wav from 'node-wav';

const execAsync = promisify(exec);

// Configure transformers to use local models
env.localURL = '/models/';
env.allowRemoteModels = true;

class WhisperService {
  constructor() {
    this.transcriber = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.modelName = 'Xenova/whisper-tiny';
    this.tempDir = path.join(process.cwd(), 'temp-audio');
  }

  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    await this.initPromise;
  }

  async _doInitialize() {
    try {
      console.log('Initializing Whisper transcription service...');
      
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });
      
      // Initialize the automatic speech recognition pipeline
      this.transcriber = await pipeline('automatic-speech-recognition', this.modelName);
      
      this.isInitialized = true;
      console.log('Whisper service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Whisper service:', error);
      throw error;
    }
  }

  async transcribeAudio(audioBuffer, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const {
        language = 'en',
        task = 'transcribe',
        return_timestamps = false,
        chunk_length_s = 30,
        stride_length_s = 5
      } = options;

      // Generate unique filename
      const tempFileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const inputPath = path.join(this.tempDir, `${tempFileName}.webm`);
      const outputPath = path.join(this.tempDir, `${tempFileName}.wav`);

      try {
        // Save the audio buffer to a temporary file
        await fs.writeFile(inputPath, audioBuffer);

        // Convert to WAV using ffmpeg for better compatibility
        await execAsync(
          `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputPath}"`
        );

        // Read the WAV file
        const wavBuffer = await fs.readFile(outputPath);
        const wavData = wav.decode(wavBuffer);

        // Prepare audio for transcription
        const audioData = new Float32Array(wavData.channelData[0]);

        // Transcribe the audio
        const result = await this.transcriber(audioData, {
          language,
          task,
          return_timestamps,
          chunk_length_s,
          stride_length_s,
          sampling_rate: wavData.sampleRate
        });

        // Clean up temporary files
        await Promise.all([
          fs.unlink(inputPath).catch(() => {}),
          fs.unlink(outputPath).catch(() => {})
        ]);

        return {
          text: result.text,
          timestamps: result.chunks || [],
          language: result.language || language,
          duration: wavData.channelData[0].length / wavData.sampleRate
        };
      } catch (error) {
        // Clean up on error
        await Promise.all([
          fs.unlink(inputPath).catch(() => {}),
          fs.unlink(outputPath).catch(() => {})
        ]);
        throw error;
      }
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  async transcribeStream(audioStream, onPartialResult) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const chunks = [];
    let chunkDuration = 0;
    const sampleRate = 16000;
    const chunkSize = sampleRate * 5; // 5 seconds chunks

    return new Promise((resolve, reject) => {
      audioStream.on('data', async (chunk) => {
        chunks.push(chunk);
        chunkDuration += chunk.length / sampleRate;

        // Process chunks every 5 seconds for real-time feedback
        if (chunkDuration >= 5) {
          const audioBuffer = Buffer.concat(chunks);
          chunks.length = 0;
          chunkDuration = 0;

          try {
            const result = await this.transcribeAudio(audioBuffer, {
              return_timestamps: true
            });
            
            if (onPartialResult) {
              onPartialResult(result);
            }
          } catch (error) {
            console.error('Error processing audio chunk:', error);
          }
        }
      });

      audioStream.on('end', async () => {
        // Process any remaining audio
        if (chunks.length > 0) {
          const audioBuffer = Buffer.concat(chunks);
          try {
            const result = await this.transcribeAudio(audioBuffer, {
              return_timestamps: true
            });
            resolve(result);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve({ text: '', timestamps: [] });
        }
      });

      audioStream.on('error', reject);
    });
  }

  async detectLanguage(audioBuffer) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Transcribe with language detection
      const result = await this.transcribeAudio(audioBuffer, {
        language: null, // Auto-detect
        return_timestamps: false
      });

      return result.language || 'en';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // Default to English
    }
  }

  async cleanup() {
    // Clean up temporary directory
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.tempDir, file)).catch(() => {}))
      );
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Export singleton instance
export const whisperService = new WhisperService();
export default whisperService;