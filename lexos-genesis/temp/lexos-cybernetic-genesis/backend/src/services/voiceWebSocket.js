import { WebSocketServer } from 'ws';
import { whisperService } from './whisperService.js';
import VoiceCommandService from './voiceCommandService.js';
import chatService from './chatService.js';
import AuthService from './authService.js';

class VoiceWebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.activeTranscriptions = new Map();
  }

  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/voice'
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('Voice WebSocket service initialized');
  }

  async handleConnection(ws, req) {
    const clientId = this.generateClientId();
    
    // Extract auth token from query params or headers
    const token = this.extractToken(req);
    let userId = null;

    try {
      if (token) {
        const authService = new AuthService();
        const decoded = authService.verifyToken(token);
        userId = decoded.userId;
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Authentication failed'
      }));
      ws.close();
      return;
    }

    const client = {
      id: clientId,
      ws,
      userId,
      audioChunks: [],
      transcriptionSession: null,
      isRecording: false
    };

    this.clients.set(clientId, client);

    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnect(clientId));
    ws.on('error', (error) => this.handleError(clientId, error));

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Voice WebSocket connected'
    }));
  }

  async handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Handle binary audio data
      if (data instanceof Buffer || data instanceof ArrayBuffer) {
        this.handleAudioData(clientId, data);
        return;
      }

      // Handle JSON messages
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'start_recording':
          await this.startRecording(clientId, message);
          break;

        case 'stop_recording':
          await this.stopRecording(clientId);
          break;

        case 'audio_chunk':
          await this.handleAudioChunk(clientId, message.data);
          break;

        case 'transcribe':
          await this.transcribeAudio(clientId, message.audio);
          break;

        case 'command':
          await this.processVoiceCommand(clientId, message.transcript);
          break;

        case 'stream_start':
          await this.startStreaming(clientId, message);
          break;

        case 'stream_end':
          await this.endStreaming(clientId);
          break;

        default:
          this.sendToClient(clientId, {
            type: 'error',
            error: `Unknown message type: ${message.type}`
          });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendToClient(clientId, {
        type: 'error',
        error: error.message
      });
    }
  }

  async startRecording(clientId, options = {}) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.isRecording = true;
    client.audioChunks = [];
    client.recordingOptions = options;

    this.sendToClient(clientId, {
      type: 'recording_started',
      timestamp: new Date().toISOString()
    });
  }

  async stopRecording(clientId) {
    const client = this.clients.get(clientId);
    if (!client || !client.isRecording) return;

    client.isRecording = false;

    if (client.audioChunks.length > 0) {
      const audioBuffer = Buffer.concat(client.audioChunks);
      await this.transcribeAudio(clientId, audioBuffer);
    }

    client.audioChunks = [];

    this.sendToClient(clientId, {
      type: 'recording_stopped',
      timestamp: new Date().toISOString()
    });
  }

  async handleAudioData(clientId, audioData) {
    const client = this.clients.get(clientId);
    if (!client || !client.isRecording) return;

    const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);
    client.audioChunks.push(buffer);

    // For real-time transcription, process chunks periodically
    if (client.recordingOptions?.realtime) {
      const totalSize = client.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      
      // Process every ~3 seconds of audio (assuming 16kHz, 16-bit)
      if (totalSize >= 16000 * 2 * 3) {
        const audioBuffer = Buffer.concat(client.audioChunks);
        client.audioChunks = []; // Reset for next chunk
        
        this.transcribeAudioChunk(clientId, audioBuffer, true);
      }
    }
  }

  async handleAudioChunk(clientId, audioData) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Handle base64 encoded audio
    const buffer = Buffer.from(audioData, 'base64');
    
    if (client.isRecording) {
      client.audioChunks.push(buffer);
    } else {
      // Direct transcription of single chunk
      await this.transcribeAudio(clientId, buffer);
    }
  }

  async transcribeAudio(clientId, audioBuffer) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      this.sendToClient(clientId, {
        type: 'transcription_started'
      });

      const result = await whisperService.transcribeAudio(audioBuffer, {
        language: client.recordingOptions?.language || 'en',
        return_timestamps: client.recordingOptions?.timestamps || false
      });

      this.sendToClient(clientId, {
        type: 'transcription_complete',
        result: {
          text: result.text,
          timestamps: result.timestamps,
          language: result.language,
          duration: result.duration
        }
      });

      // Auto-process as command if enabled
      if (client.recordingOptions?.autoCommand && result.text) {
        await this.processVoiceCommand(clientId, result.text);
      }

    } catch (error) {
      console.error('Transcription error:', error);
      this.sendToClient(clientId, {
        type: 'transcription_error',
        error: error.message
      });
    }
  }

  async transcribeAudioChunk(clientId, audioBuffer, isPartial = false) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const result = await whisperService.transcribeAudio(audioBuffer, {
        language: client.recordingOptions?.language || 'en',
        return_timestamps: false
      });

      this.sendToClient(clientId, {
        type: isPartial ? 'partial_transcription' : 'transcription_complete',
        result: {
          text: result.text,
          isPartial
        }
      });

    } catch (error) {
      console.error('Chunk transcription error:', error);
    }
  }

  async processVoiceCommand(clientId, transcript) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const voiceCommandService = new VoiceCommandService();
      const result = await voiceCommandService.processCommand(transcript, {
        userId: client.userId,
        clientId
      });

      if (result.isChat) {
        // If not a command, process as chat message
        const chatResponse = await chatService.processMessage({
          message: transcript,
          userId: client.userId,
          context: { source: 'voice' }
        });

        this.sendToClient(clientId, {
          type: 'chat_response',
          response: chatResponse
        });
      } else {
        // Send command result
        this.sendToClient(clientId, {
          type: 'command_result',
          result
        });

        // Handle navigation commands
        if (result.result?.action === 'navigate') {
          this.sendToClient(clientId, {
            type: 'navigate',
            route: result.result.route
          });
        }
      }
    } catch (error) {
      console.error('Command processing error:', error);
      this.sendToClient(clientId, {
        type: 'command_error',
        error: error.message
      });
    }
  }

  async startStreaming(clientId, options = {}) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.transcriptionSession = {
      startTime: Date.now(),
      options,
      partialResults: []
    };

    this.sendToClient(clientId, {
      type: 'streaming_started'
    });
  }

  async endStreaming(clientId) {
    const client = this.clients.get(clientId);
    if (!client || !client.transcriptionSession) return;

    const session = client.transcriptionSession;
    client.transcriptionSession = null;

    this.sendToClient(clientId, {
      type: 'streaming_ended',
      duration: Date.now() - session.startTime,
      results: session.partialResults
    });
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      // Clean up any ongoing operations
      if (client.isRecording) {
        this.stopRecording(clientId);
      }
      
      this.clients.delete(clientId);
      console.log(`Voice client disconnected: ${clientId}`);
    }
  }

  handleError(clientId, error) {
    console.error(`Voice WebSocket error for client ${clientId}:`, error);
    this.handleDisconnect(clientId);
  }

  extractToken(req) {
    // Try to get token from query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryToken = url.searchParams.get('token');
    if (queryToken) return queryToken;

    // Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  generateClientId() {
    return `voice_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  broadcast(message, excludeClientId = null) {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }
}

// Export singleton instance
export const voiceWebSocketService = new VoiceWebSocketService();
export default voiceWebSocketService;