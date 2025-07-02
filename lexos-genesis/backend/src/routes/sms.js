import express from 'express';
import twilioService from '../services/twilioService.js';
import { verifyToken } from './auth.js';
import twilio from 'twilio';
const { MessagingResponse } = twilio.twiml;

const router = express.Router();

// Webhook for incoming SMS messages from Twilio
router.post('/webhook', async (req, res) => {
  try {
    const { Body, From, MessageSid, NumMedia } = req.body;
    
    // Extract media URLs if present
    const mediaUrls = [];
    const numMedia = parseInt(NumMedia) || 0;
    
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = req.body[`MediaUrl${i}`];
      if (mediaUrl) {
        mediaUrls.push(mediaUrl);
      }
    }
    
    console.log(`Incoming SMS from ${From}: ${Body}`);
    
    // Process the message
    const result = await twilioService.handleIncomingSMS(Body, From, MessageSid, mediaUrls);
    
    // Respond with TwiML (empty response since we handle replies in the service)
    const twiml = new MessagingResponse();
    res.type('text/xml').send(twiml.toString());
    
  } catch (error) {
    console.error('SMS webhook error:', error);
    
    // Send error response via TwiML
    const twiml = new MessagingResponse();
    twiml.message('Sorry, I encountered an error. Please try again.');
    res.type('text/xml').send(twiml.toString());
  }
});

// Send SMS message (authenticated endpoint)
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { to, message, mediaUrl } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }
    
    const options = mediaUrl ? { mediaUrl } : {};
    const result = await twilioService.sendSMS(to, message, options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send MMS with image (authenticated endpoint)
router.post('/send-mms', verifyToken, async (req, res) => {
  try {
    const { to, message, imageUrl } = req.body;
    
    if (!to || !message || !imageUrl) {
      return res.status(400).json({ error: 'Phone number, message, and image URL are required' });
    }
    
    const result = await twilioService.sendMMS(to, message, imageUrl);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Send MMS error:', error);
    res.status(500).json({ error: 'Failed to send MMS' });
  }
});

// Broadcast message to multiple numbers
router.post('/broadcast', verifyToken, async (req, res) => {
  try {
    const { phoneNumbers, message, mediaUrl } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || !message) {
      return res.status(400).json({ error: 'Phone numbers array and message are required' });
    }
    
    if (phoneNumbers.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 phone numbers allowed per broadcast' });
    }
    
    const options = mediaUrl ? { mediaUrl } : {};
    const results = await twilioService.broadcast(phoneNumbers, message, options);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      summary: {
        total: results.length,
        successful,
        failed
      },
      results
    });
  } catch (error) {
    console.error('Broadcast SMS error:', error);
    res.status(500).json({ error: 'Failed to broadcast messages' });
  }
});

// Schedule message
router.post('/schedule', verifyToken, async (req, res) => {
  try {
    const { to, message, sendAt, mediaUrl } = req.body;
    
    if (!to || !message || !sendAt) {
      return res.status(400).json({ error: 'Phone number, message, and sendAt time are required' });
    }
    
    const options = mediaUrl ? { mediaUrl } : {};
    const result = await twilioService.scheduleMessage(to, message, sendAt, options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Schedule SMS error:', error);
    res.status(500).json({ error: 'Failed to schedule message' });
  }
});

// Get conversation history for a phone number
router.get('/conversation/:phoneNumber', verifyToken, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { limit = 50 } = req.query;
    
    // Get conversation from service memory
    const history = twilioService.getConversationHistory(phoneNumber);
    
    // Also get Twilio message history
    const twilioHistory = await twilioService.getMessageHistory(phoneNumber, parseInt(limit));
    
    res.json({
      success: true,
      phoneNumber,
      conversationHistory: history,
      twilioHistory,
      totalMessages: history.length
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

// Clear conversation history
router.delete('/conversation/:phoneNumber', verifyToken, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    twilioService.clearConversationHistory(phoneNumber);
    
    res.json({
      success: true,
      message: `Conversation history cleared for ${phoneNumber}`
    });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ error: 'Failed to clear conversation history' });
  }
});

// Get user profile
router.get('/profile/:phoneNumber', verifyToken, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const profile = twilioService.getUserProfile(phoneNumber);
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/profile/:phoneNumber', verifyToken, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { preferences, subscription } = req.body;
    
    const profile = twilioService.getUserProfile(phoneNumber);
    
    if (preferences) {
      profile.preferences = { ...profile.preferences, ...preferences };
    }
    
    if (subscription) {
      profile.subscription = subscription;
    }
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Get analytics
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const analytics = await twilioService.getAnalytics();
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get message history from Twilio
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { phoneNumber, limit = 50 } = req.query;
    
    const messages = await twilioService.getMessageHistory(phoneNumber, parseInt(limit));
    
    res.json({
      success: true,
      messages,
      total: messages.length
    });
  } catch (error) {
    console.error('Get message history error:', error);
    res.status(500).json({ error: 'Failed to get message history' });
  }
});

// Test SMS functionality
router.post('/test', verifyToken, async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Phone number is required for test' });
    }
    
    const testMessage = `LEX AI Test Message 🤖
    
Time: ${new Date().toLocaleString()}
Phone: ${twilioService.phoneNumber}

Reply with any message to start chatting!

Available commands:
/help - Show help
/status - System status
/budget - Budget info`;
    
    const result = await twilioService.sendSMS(to, testMessage);
    
    res.json({
      success: true,
      message: 'Test message sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Test SMS error:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

// Get service status
router.get('/status', async (req, res) => {
  try {
    const status = {
      service: 'Twilio SMS',
      phoneNumber: twilioService.phoneNumber,
      initialized: !!twilioService.client,
      activeConversations: twilioService.conversationHistory.size,
      totalUsers: twilioService.userProfiles.size,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/sms/webhook`
    };
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Get SMS status error:', error);
    res.status(500).json({ error: 'Failed to get service status' });
  }
});

// Handle status delivery reports (optional)
router.post('/status', async (req, res) => {
  try {
    const { MessageSid, MessageStatus, To, From } = req.body;
    
    console.log(`Message ${MessageSid} to ${To} status: ${MessageStatus}`);
    
    // You can store delivery status in database here
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Status webhook error:', error);
    res.status(500).send('Error');
  }
});

export default router;