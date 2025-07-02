import express from 'express';
import multer from 'multer';
import voiceService from '../services/voiceService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Process voice command
router.post('/process', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const sessionId = req.body.sessionId || uuidv4();
    const result = await voiceService.processAudioStream(req.file.buffer, sessionId);

    // If wake word detected, process with orchestrator
    if (result.hasWakeWord) {
      // Remove wake word from text for processing
      const command = result.text.toLowerCase()
        .replace(/^(hey |okay |)lex(os|)?,?\s*/i, '')
        .trim();

      res.json({
        success: true,
        sessionId,
        transcript: result.text,
        command,
        language: result.language,
        wakeWordDetected: true
      });
    } else {
      res.json({
        success: true,
        sessionId,
        transcript: result.text,
        language: result.language,
        wakeWordDetected: false
      });
    }
  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

// Text to speech
router.post('/synthesize', async (req, res) => {
  try {
    const { text, voice = 'default', useVicuna = true } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    let audioBuffer;
    if (useVicuna) {
      audioBuffer = await voiceService.generateSpeechWithVicuna(text, voice);
    } else {
      audioBuffer = await voiceService.textToSpeech(text, voice);
    }

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

// Start continuous listening session
router.post('/start-listening', (req, res) => {
  const sessionId = req.body.sessionId || uuidv4();
  
  // This would typically upgrade to WebSocket
  res.json({
    success: true,
    sessionId,
    message: 'Use WebSocket connection for real-time audio streaming',
    wsEndpoint: `/ws/voice/${sessionId}`
  });
});

// Stop listening session
router.post('/stop-listening', (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'No session ID provided' });
  }

  voiceService.stopListeningSession(sessionId);
  res.json({ success: true });
});

// Translate audio
router.post('/translate', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const targetLanguage = req.body.targetLanguage || 'en';
    const result = await voiceService.translateAudio(req.file.buffer, targetLanguage);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Failed to translate audio' });
  }
});

// Get supported languages
router.get('/languages', (req, res) => {
  res.json({
    languages: voiceService.getSupportedLanguages()
  });
});

// Configure voice settings
router.post('/configure', (req, res) => {
  const { whisperModel, wakeWords, languageCode } = req.body;

  if (whisperModel && ['small', 'medium', 'large'].includes(whisperModel)) {
    voiceService.whisperModel = whisperModel;
  }

  if (wakeWords && Array.isArray(wakeWords)) {
    voiceService.wakeWords = wakeWords;
  }

  if (languageCode) {
    voiceService.languageCode = languageCode;
  }

  res.json({
    success: true,
    config: {
      whisperModel: voiceService.whisperModel,
      wakeWords: voiceService.wakeWords,
      languageCode: voiceService.languageCode
    }
  });
});

export default router;