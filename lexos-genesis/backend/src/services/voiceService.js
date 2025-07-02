import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VoiceService {
  constructor() {
    this.whisperModel = 'medium'; // small, medium, or large
    this.ttsEngine = 'espeak'; // Will use Vicuna for natural TTS
    this.wakeWords = ['lexos', 'lex', 'hey lex', 'okay lex'];
    this.isListening = false;
    this.activeStreams = new Map();
    this.languageCode = 'en'; // Default language
    this.vicunaEndpoint = 'http://localhost:11434/api/generate';
  }

  // Initialize Whisper for real-time transcription
  async initializeWhisper() {
    console.log(`Initializing Whisper ${this.whisperModel} model...`);
    // Whisper will be called on-demand for each audio chunk
    return true;
  }

  // Process audio stream with Whisper
  async processAudioStream(audioBuffer, sessionId) {
    try {
      // Save audio buffer temporarily
      const tempFile = path.join('/tmp', `audio_${sessionId}_${Date.now()}.wav`);
      await fs.promises.writeFile(tempFile, audioBuffer);

      // Run Whisper transcription
      const transcript = await this.transcribeWithWhisper(tempFile);
      
      // Clean up temp file
      await fs.promises.unlink(tempFile).catch(() => {});

      // Check for wake word
      const hasWakeWord = this.checkWakeWord(transcript.text);
      
      return {
        text: transcript.text,
        language: transcript.language,
        hasWakeWord,
        confidence: transcript.confidence || 0.9
      };
    } catch (error) {
      console.error('Audio processing error:', error);
      throw error;
    }
  }

  // Transcribe audio using Whisper
  async transcribeWithWhisper(audioFile) {
    return new Promise((resolve, reject) => {
      const whisperArgs = [
        '-m', `/home/user/.cache/whisper/${this.whisperModel}.pt`,
        '-f', audioFile,
        '--language', 'auto', // Auto-detect language
        '--task', 'transcribe',
        '--output-format', 'json',
        '--no-timestamps'
      ];

      const whisper = spawn('whisper', whisperArgs);
      let output = '';
      let error = '';

      whisper.stdout.on('data', (data) => {
        output += data.toString();
      });

      whisper.stderr.on('data', (data) => {
        error += data.toString();
      });

      whisper.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve({
              text: result.text || '',
              language: result.language || 'en',
              confidence: 0.95
            });
          } catch (e) {
            // Fallback for non-JSON output
            resolve({
              text: output.trim(),
              language: 'en',
              confidence: 0.9
            });
          }
        } else {
          reject(new Error(`Whisper failed: ${error}`));
        }
      });
    });
  }

  // Check if transcript contains wake word
  checkWakeWord(text) {
    const lowerText = text.toLowerCase();
    return this.wakeWords.some(word => lowerText.includes(word));
  }

  // Generate speech using Vicuna 13B for natural language
  async generateSpeechWithVicuna(text, voice = 'default') {
    try {
      // First, use Vicuna to make the response more natural
      const naturalText = await this.makeNaturalWithVicuna(text);
      
      // Then use TTS to generate audio
      return await this.textToSpeech(naturalText, voice);
    } catch (error) {
      console.error('Vicuna TTS error:', error);
      // Fallback to direct TTS
      return await this.textToSpeech(text, voice);
    }
  }

  // Make text more natural using Vicuna
  async makeNaturalWithVicuna(text) {
    try {
      const response = await fetch(this.vicunaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'vicuna:13b',
          prompt: `Convert this text to natural, conversational speech. Keep the meaning but make it sound like a friendly AI assistant: "${text}"`,
          stream: false,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response || text;
      }
    } catch (error) {
      console.error('Vicuna processing error:', error);
    }
    return text;
  }

  // Text to speech conversion
  async textToSpeech(text, voice = 'default') {
    return new Promise((resolve, reject) => {
      const tempFile = path.join('/tmp', `tts_${Date.now()}.wav`);
      
      // Use espeak for now, can be replaced with better TTS
      const tts = spawn('espeak', [
        '-w', tempFile,
        '-v', voice === 'female' ? 'en+f3' : 'en+m3',
        '-s', '160', // Speed
        '-p', '50',  // Pitch
        text
      ]);

      tts.on('close', (code) => {
        if (code === 0) {
          fs.promises.readFile(tempFile)
            .then(data => {
              fs.promises.unlink(tempFile).catch(() => {});
              resolve(data);
            })
            .catch(reject);
        } else {
          reject(new Error('TTS generation failed'));
        }
      });
    });
  }

  // Start continuous listening session
  startListeningSession(sessionId, websocket) {
    this.activeStreams.set(sessionId, {
      ws: websocket,
      isActive: true,
      buffer: Buffer.alloc(0),
      lastActivity: Date.now()
    });

    console.log(`Started listening session: ${sessionId}`);
    this.isListening = true;
  }

  // Process incoming audio chunk
  async processAudioChunk(sessionId, audioChunk) {
    const session = this.activeStreams.get(sessionId);
    if (!session || !session.isActive) return;

    // Accumulate audio chunks
    session.buffer = Buffer.concat([session.buffer, audioChunk]);
    session.lastActivity = Date.now();

    // Process when we have enough audio (e.g., 1 second worth)
    if (session.buffer.length > 16000) { // Assuming 16kHz sample rate
      const audioToProcess = session.buffer;
      session.buffer = Buffer.alloc(0);

      try {
        const result = await this.processAudioStream(audioToProcess, sessionId);
        
        // Send transcription result
        if (session.ws && session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({
            type: 'transcription',
            sessionId,
            ...result
          }));

          // If wake word detected, mark session as active
          if (result.hasWakeWord) {
            session.wakeWordDetected = true;
            session.wakeWordTime = Date.now();
          }
        }
      } catch (error) {
        console.error('Chunk processing error:', error);
      }
    }
  }

  // Stop listening session
  stopListeningSession(sessionId) {
    const session = this.activeStreams.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeStreams.delete(sessionId);
      console.log(`Stopped listening session: ${sessionId}`);
    }

    if (this.activeStreams.size === 0) {
      this.isListening = false;
    }
  }

  // Handle multilingual translation
  async translateAudio(audioBuffer, targetLanguage = 'en') {
    try {
      const tempFile = path.join('/tmp', `translate_${Date.now()}.wav`);
      await fs.promises.writeFile(tempFile, audioBuffer);

      // Use Whisper with translation task
      const whisperArgs = [
        '-m', `/home/user/.cache/whisper/${this.whisperModel}.pt`,
        '-f', tempFile,
        '--task', 'translate', // This translates to English
        '--output-format', 'json'
      ];

      const result = await new Promise((resolve, reject) => {
        const whisper = spawn('whisper', whisperArgs);
        let output = '';

        whisper.stdout.on('data', (data) => {
          output += data.toString();
        });

        whisper.on('close', (code) => {
          if (code === 0) {
            try {
              const parsed = JSON.parse(output);
              resolve({
                translatedText: parsed.text,
                originalLanguage: parsed.language,
                success: true
              });
            } catch (e) {
              resolve({
                translatedText: output.trim(),
                success: true
              });
            }
          } else {
            reject(new Error('Translation failed'));
          }
        });
      });

      await fs.promises.unlink(tempFile).catch(() => {});
      return result;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  // Get supported languages
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' }
    ];
  }

  // Cleanup inactive sessions
  cleanupInactiveSessions() {
    const timeout = 60000; // 1 minute
    const now = Date.now();

    for (const [sessionId, session] of this.activeStreams) {
      if (now - session.lastActivity > timeout) {
        this.stopListeningSession(sessionId);
      }
    }
  }
}

// Create singleton instance
const voiceService = new VoiceService();

// Initialize on startup
voiceService.initializeWhisper().catch(console.error);

// Cleanup inactive sessions periodically
setInterval(() => {
  voiceService.cleanupInactiveSessions();
}, 30000);

export default voiceService;