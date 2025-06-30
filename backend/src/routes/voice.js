import express from 'express';
import multer from 'multer';

const router = express.Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedMimes = [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/ogg',
      'audio/flac',
      'audio/x-wav',
      'audio/x-m4a'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Middleware to verify authentication
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Initialize Whisper service on startup
router.get('/initialize', authenticate, async (req, res) => {
  try {
    await whisperService.initialize();
    res.json({ 
      success: true, 
      message: 'Whisper service initialized successfully' 
    });
  } catch (error) {
    console.error('Failed to initialize Whisper:', error);
    res.status(500).json({ 
      error: 'Failed to initialize voice transcription service',
      details: error.message 
    });
  }
});

// Transcribe audio file
router.post('/transcribe', authenticate, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const options = {
      language: req.body.language || 'en',
      task: req.body.task || 'transcribe',
      return_timestamps: req.body.timestamps === 'true',
      chunk_length_s: parseInt(req.body.chunk_length) || 30,
      stride_length_s: parseInt(req.body.stride_length) || 5
    };

    const result = await whisperService.transcribeAudio(req.file.buffer, options);

    res.json({
      success: true,
      transcription: result
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      details: error.message 
    });
  }
});

// Process voice command
router.post('/command', authenticate, async (req, res) => {
  try {
    const { transcript, context } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    const result = await voiceCommandService.processCommand(transcript, {
      ...context,
      userId: req.user.userId
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Command processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process voice command',
      details: error.message 
    });
  }
});

// Transcribe and process command in one request
router.post('/transcribe-command', authenticate, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // First transcribe the audio
    const transcriptionResult = await whisperService.transcribeAudio(req.file.buffer, {
      language: req.body.language || 'en'
    });

    // Then process the command
    const commandResult = await voiceCommandService.processCommand(
      transcriptionResult.text,
      {
        userId: req.user.userId,
        ...req.body.context
      }
    );

    res.json({
      success: true,
      transcription: transcriptionResult,
      command: commandResult
    });
  } catch (error) {
    console.error('Transcribe and command error:', error);
    res.status(500).json({ 
      error: 'Failed to process voice input',
      details: error.message 
    });
  }
});

// Detect language from audio
router.post('/detect-language', authenticate, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const language = await whisperService.detectLanguage(req.file.buffer);

    res.json({
      success: true,
      language
    });
  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({ 
      error: 'Failed to detect language',
      details: error.message 
    });
  }
});

// Get available voice commands
router.get('/commands', authenticate, async (req, res) => {
  try {
    const helpResult = await voiceCommandService.getHelp('', { userId: req.user.userId });
    
    res.json({
      success: true,
      commands: helpResult.commands,
      examples: helpResult.examples
    });
  } catch (error) {
    console.error('Error getting commands:', error);
    res.status(500).json({ 
      error: 'Failed to get voice commands',
      details: error.message 
    });
  }
});

// Get voice service status
router.get('/status', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      status: {
        whisperInitialized: whisperService.isInitialized,
        modelName: whisperService.modelName,
        supportedLanguages: [
          'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'
        ],
        maxAudioSize: '50MB',
        supportedFormats: [
          'webm', 'wav', 'mp3', 'ogg', 'flac', 'm4a'
        ]
      }
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ 
      error: 'Failed to get voice service status',
      details: error.message 
    });
  }
});

export default router;