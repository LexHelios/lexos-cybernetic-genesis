# Voice Integration with Whisper

## Overview

The Lexos Genesis system now features comprehensive voice transcription and command processing capabilities powered by OpenAI's Whisper model. This integration enables hands-free interaction throughout the system, from simple transcription to complex voice commands for controlling agents and navigating the interface.

## Features

### 1. Voice Transcription Service
- **Real-time transcription**: Stream audio for immediate text conversion
- **Batch transcription**: Process complete audio files
- **Multi-language support**: Supports 10+ languages including English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, and Korean
- **Automatic language detection**: Automatically identifies the spoken language
- **Word-level timestamps**: Optional timestamps for precise audio-text alignment

### 2. Voice Command Processing
- **Natural language understanding**: Interprets conversational commands
- **Agent control**: Start, stop, and manage agents with voice
- **Task management**: Create and monitor tasks verbally
- **System navigation**: Navigate between pages using voice commands
- **Workflow execution**: Trigger complex workflows with simple commands

### 3. Frontend Components

#### VoiceInput Component
- **Visual feedback**: Audio level visualization during recording
- **Flexible sizing**: Small, medium, and large button options
- **Real-time processing**: Optional real-time transcription
- **Error handling**: Graceful handling of permission and connection issues

#### VoiceCommandPanel
- **Command history**: Track recent voice commands and results
- **Help system**: Built-in command documentation
- **Visual feedback**: Real-time status updates
- **Category organization**: Commands grouped by function

#### Voice Settings
- **Service configuration**: Language, quality, and processing options
- **Audio settings**: Gain control, echo cancellation, noise suppression
- **Microphone testing**: Built-in microphone test functionality
- **Advanced parameters**: Chunk length and stride configuration

### 4. WebSocket Integration
- **Real-time streaming**: Low-latency audio streaming
- **Bidirectional communication**: Send audio, receive transcriptions
- **Session management**: Persistent connections with automatic reconnection
- **Authentication**: Secure token-based authentication

## Architecture

### Backend Services

#### WhisperService (`/backend/src/services/whisperService.js`)
- Manages Whisper model initialization and inference
- Handles audio format conversion (WebM to WAV)
- Provides transcription with configurable options
- Manages temporary file cleanup

#### VoiceCommandService (`/backend/src/services/voiceCommandService.js`)
- Processes transcribed text as commands
- Routes commands to appropriate handlers
- Supports natural language interpretation
- Integrates with existing agent and task systems

#### VoiceWebSocketService (`/backend/src/services/voiceWebSocket.js`)
- Manages WebSocket connections for real-time audio
- Handles streaming transcription
- Coordinates command processing
- Manages client sessions

### Frontend Integration

#### Custom Hook (`/src/hooks/useVoiceRecording.ts`)
- Manages recording state and audio capture
- Handles WebSocket communication
- Provides audio level monitoring
- Manages transcription results

#### Voice Components
- **VoiceInput**: Core recording button with visualization
- **VoiceCommandPanel**: Command interface with history
- **VoiceSettings**: Configuration interface

## API Endpoints

### REST API

#### `GET /api/voice/initialize`
Initialize the Whisper service (called automatically on first use)

#### `POST /api/voice/transcribe`
Transcribe an audio file
```json
{
  "audio": "base64_encoded_audio",
  "language": "en",
  "timestamps": true
}
```

#### `POST /api/voice/command`
Process a voice command
```json
{
  "transcript": "start research agent",
  "context": {}
}
```

#### `GET /api/voice/status`
Get voice service status and configuration

### WebSocket API

Connect to `ws://localhost:3001/ws/voice?token=YOUR_TOKEN`

#### Messages

**Start Recording**
```json
{
  "type": "start_recording",
  "language": "en",
  "realtime": false,
  "autoCommand": true
}
```

**Audio Chunk** (Binary data or base64)
```json
{
  "type": "audio_chunk",
  "data": "base64_audio_data"
}
```

**Stop Recording**
```json
{
  "type": "stop_recording"
}
```

## Voice Commands

### Agent Control
- "Start [agent name] agent" - Activate a specific agent
- "Stop [agent name] agent" - Deactivate an agent
- "List agents" / "Show agents" - Display all agents
- "Check agent status" - Get status of current agent

### Task Management
- "Create task [description]" - Create a new task
- "Run task [id]" - Execute a specific task
- "Check task status" - Get current task status
- "List tasks" - Show all tasks
- "Cancel task [id]" - Cancel a running task

### Navigation
- "Go to dashboard" - Navigate to dashboard
- "Open analytics" - Go to analytics page
- "Show knowledge graph" - Display knowledge graph
- "Go back" - Navigate to previous page

### System Control
- "Check system status" - Get system overview
- "Clear task queue" - Empty the task queue
- "Help" - Show available commands

## Configuration

### Environment Variables
```env
# No additional environment variables required
# Whisper runs locally using @xenova/transformers
```

### Frontend Configuration
Voice settings are stored in localStorage:
```javascript
{
  "enabled": true,
  "language": "en",
  "realtime": false,
  "autoCommand": true,
  "timestamps": false,
  "audioGain": 1.0,
  "echoCancellation": true,
  "noiseSuppression": true
}
```

## Usage Examples

### Basic Voice Input
```tsx
import { VoiceInput } from '@/components/voice/VoiceInput';

<VoiceInput
  onTranscript={(text) => console.log('Transcribed:', text)}
  size="md"
  showVisualization={true}
/>
```

### Voice Commands with Feedback
```tsx
<VoiceInput
  autoCommand={true}
  onCommand={(result) => {
    if (result.success) {
      toast({ title: 'Command executed', description: result.message });
    }
  }}
/>
```

### Full Voice Command Panel
```tsx
import { VoiceCommandPanel } from '@/components/voice/VoiceCommandPanel';

<VoiceCommandPanel />
```

## Security Considerations

1. **Authentication**: All voice endpoints require authentication tokens
2. **Audio Privacy**: Audio is processed locally, not sent to external services
3. **Permission Handling**: Explicit microphone permissions required
4. **Rate Limiting**: API endpoints include rate limiting
5. **Input Validation**: All transcripts are validated before command execution

## Performance Optimization

1. **Model Loading**: Whisper model loads on first use and persists
2. **Audio Compression**: WebM format reduces bandwidth usage
3. **Chunk Processing**: Large audio files processed in chunks
4. **Caching**: Frequently used commands cached for faster response
5. **Resource Management**: Automatic cleanup of temporary files

## Troubleshooting

### Common Issues

1. **Microphone Access Denied**
   - Check browser permissions
   - Ensure HTTPS connection (or localhost)
   - Test microphone in Voice Settings

2. **Transcription Errors**
   - Verify Whisper service is initialized
   - Check audio quality and format
   - Ensure sufficient system resources

3. **WebSocket Connection Failed**
   - Verify backend is running
   - Check authentication token
   - Ensure WebSocket port is accessible

4. **Command Not Recognized**
   - Use command help to see available commands
   - Check command syntax and parameters
   - Verify agent/task names are correct

## Future Enhancements

1. **Speaker Diarization**: Identify different speakers
2. **Custom Wake Words**: Activate with voice trigger
3. **Offline Mode**: Full offline transcription support
4. **Voice Synthesis**: Text-to-speech responses
5. **Multi-modal Commands**: Combine voice with gestures
6. **Custom Command Training**: User-defined voice commands
7. **Emotion Detection**: Analyze speaker emotions
8. **Background Noise Filtering**: Advanced noise cancellation

## Dependencies

### Backend
- `@xenova/transformers`: Whisper model inference
- `fluent-ffmpeg`: Audio format conversion
- `multer`: File upload handling
- `node-wav`: WAV file processing

### Frontend
- Web Audio API: Audio capture and processing
- MediaRecorder API: Audio recording
- WebSocket API: Real-time communication

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited WebM support (falls back to other formats)
- Mobile: Supported with appropriate permissions