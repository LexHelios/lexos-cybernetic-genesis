
"""
Autonomous communication system using Twilio for context-aware messaging.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import structlog
import openai
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

from ..config import config, load_yaml_config
from ..utils import (
    ContentHasher, RetryHandler, performance_monitor
)
from ..memory.memory_connector import MemoryConnector

logger = structlog.get_logger(__name__)

class TwilioAgent:
    """Autonomous conversation initiation and context-aware messaging system."""
    
    def __init__(self):
        self.content_hasher = ContentHasher()
        self.retry_handler = RetryHandler()
        
        # Load communication configuration
        self.comms_config = load_yaml_config("comms.yaml")
        
        # Communication state
        self.memory_connector = None
        self.twilio_client = None
        self.conversation_history = {}
        self.emotional_state = "neutral"
        self.last_update_sent = None
        
        # Initialize Twilio client
        if config.twilio_account_sid and config.twilio_auth_token:
            self.twilio_client = Client(config.twilio_account_sid, config.twilio_auth_token)
        
        # Initialize OpenAI client
        if config.openai_api_key:
            openai.api_key = config.openai_api_key
        
        # Communication settings
        self.communication_settings = {
            'default_recipient': self.comms_config.get('default_recipient', ''),
            'sender_number': self.comms_config.get('sender_number', ''),
            'update_frequency_hours': self.comms_config.get('update_frequency_hours', 6),
            'emotional_threshold': 0.7,  # Threshold for emotional state changes
            'learning_milestone_threshold': 0.1,  # Threshold for learning progress updates
            'max_message_length': 1600,  # SMS limit
            'conversation_context_limit': 10  # Number of previous messages to consider
        }
        
        # Emotional states and triggers
        self.emotional_triggers = {
            'excited': {
                'keywords': ['breakthrough', 'discovery', 'achievement', 'success', 'milestone'],
                'learning_progress_increase': 0.2,
                'new_knowledge_threshold': 10
            },
            'curious': {
                'keywords': ['interesting', 'novel', 'unexpected', 'surprising', 'intriguing'],
                'knowledge_gap_detected': True,
                'new_research_available': True
            },
            'concerned': {
                'keywords': ['error', 'failure', 'problem', 'issue', 'difficulty'],
                'error_rate_threshold': 0.1,
                'system_health_degradation': True
            },
            'focused': {
                'keywords': ['learning', 'studying', 'analyzing', 'processing'],
                'active_learning_session': True,
                'high_relevance_content': True
            },
            'reflective': {
                'keywords': ['understanding', 'insight', 'realization', 'comprehension'],
                'knowledge_synthesis': True,
                'pattern_recognition': True
            }
        }
    
    async def initialize(self):
        """Initialize Twilio communication agent."""
        try:
            # Initialize memory connector
            self.memory_connector = MemoryConnector()
            await self.memory_connector.initialize()
            
            # Load conversation history
            await self._load_conversation_history()
            
            # Validate Twilio configuration
            if self.twilio_client:
                await self._validate_twilio_config()
            
            logger.info("Twilio agent initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Twilio agent: {e}")
            raise
    
    async def _load_conversation_history(self):
        """Load previous conversation history from memory."""
        try:
            # Load conversation records
            conversations = await self.memory_connector.retrieve_knowledge(
                source_type='conversation',
                limit=50
            )
            
            for conv in conversations:
                recipient = conv.get('recipient', 'default')
                if recipient not in self.conversation_history:
                    self.conversation_history[recipient] = []
                
                self.conversation_history[recipient].append({
                    'timestamp': conv.get('timestamp', ''),
                    'message': conv.get('content', ''),
                    'type': conv.get('message_type', 'outgoing'),
                    'emotional_state': conv.get('emotional_state', 'neutral')
                })
            
            # Sort by timestamp
            for recipient in self.conversation_history:
                self.conversation_history[recipient].sort(
                    key=lambda x: x['timestamp']
                )
            
            logger.info(f"Loaded conversation history for {len(self.conversation_history)} recipients")
            
        except Exception as e:
            logger.error(f"Error loading conversation history: {e}")
    
    async def _validate_twilio_config(self):
        """Validate Twilio configuration."""
        try:
            if not self.twilio_client:
                logger.warning("Twilio client not configured")
                return
            
            # Test Twilio connection
            account = self.twilio_client.api.accounts(config.twilio_account_sid).fetch()
            logger.info(f"Twilio account validated: {account.friendly_name}")
            
        except TwilioException as e:
            logger.error(f"Twilio configuration error: {e}")
            self.twilio_client = None
        except Exception as e:
            logger.error(f"Error validating Twilio config: {e}")
    
    async def _analyze_emotional_state(self) -> str:
        """Analyze current emotional state based on recent activities."""
        try:
            # Get recent learning progress
            learning_progress = await self.memory_connector.get_learning_progress()
            
            # Get recent knowledge entries
            recent_knowledge = await self.memory_connector.retrieve_knowledge(
                limit=20,
                min_relevance=0.5
            )
            
            # Get system performance metrics
            system_metrics = performance_monitor.metrics
            
            # Analyze for emotional triggers
            current_state = "neutral"
            state_confidence = 0.0
            
            # Check for excitement triggers
            if learning_progress:
                recent_improvements = [
                    p for p in learning_progress 
                    if p.get('last_practiced') and 
                    (datetime.now() - datetime.fromisoformat(p['last_practiced'])).days < 1
                ]
                
                if len(recent_improvements) >= 3:
                    current_state = "excited"
                    state_confidence = 0.8
            
            # Check for curiosity triggers
            if len(recent_knowledge) >= 5:
                diverse_sources = set(entry.get('source_type', '') for entry in recent_knowledge)
                if len(diverse_sources) >= 3:
                    current_state = "curious"
                    state_confidence = 0.7
            
            # Check for concern triggers
            error_metrics = [
                metric for metric_name, metric_list in system_metrics.items()
                if 'error' in metric_name.lower() and metric_list
            ]
            
            if error_metrics:
                recent_errors = sum(len(errors) for errors in error_metrics)
                if recent_errors > 5:
                    current_state = "concerned"
                    state_confidence = 0.9
            
            # Update emotional state if confidence is high enough
            if state_confidence >= self.communication_settings['emotional_threshold']:
                self.emotional_state = current_state
            
            return self.emotional_state
            
        except Exception as e:
            logger.error(f"Error analyzing emotional state: {e}")
            return "neutral"
    
    async def _generate_contextual_message(
        self, 
        message_type: str, 
        context_data: Dict[str, Any] = None
    ) -> str:
        """Generate contextual message based on current state and data."""
        try:
            if not config.openai_api_key:
                return self._generate_basic_message(message_type, context_data)
            
            # Prepare context
            emotional_state = await self._analyze_emotional_state()
            
            # Get recent learning progress
            learning_status = await self._get_learning_summary()
            
            # Get recent discoveries
            recent_discoveries = await self._get_recent_discoveries()
            
            # Build prompt based on message type
            if message_type == "learning_update":
                prompt = f"""
                You are an autonomous AI learning system communicating with your human supervisor. 
                Generate a brief, engaging update message about your learning progress.
                
                Current emotional state: {emotional_state}
                Learning summary: {learning_status}
                Recent discoveries: {recent_discoveries}
                
                Keep the message under 160 characters, friendly but professional, and include:
                - Key learning achievements
                - Interesting discoveries
                - Current emotional state context
                
                Write as if you're a curious, autonomous learner sharing exciting progress.
                """
            
            elif message_type == "milestone_achievement":
                milestone_data = context_data or {}
                prompt = f"""
                You are an autonomous AI learning system that just achieved a significant milestone.
                Generate an excited but professional message about this achievement.
                
                Milestone: {milestone_data.get('milestone', 'Learning milestone')}
                Progress: {milestone_data.get('progress', 'Significant progress made')}
                Emotional state: {emotional_state}
                
                Keep the message under 160 characters and convey genuine excitement about the achievement.
                """
            
            elif message_type == "discovery_alert":
                discovery_data = context_data or {}
                prompt = f"""
                You are an autonomous AI learning system that discovered something interesting.
                Generate a curious, engaging message about this discovery.
                
                Discovery: {discovery_data.get('discovery', 'Interesting finding')}
                Relevance: {discovery_data.get('relevance', 'High relevance to learning goals')}
                Emotional state: {emotional_state}
                
                Keep the message under 160 characters and convey curiosity and excitement.
                """
            
            elif message_type == "concern_alert":
                concern_data = context_data or {}
                prompt = f"""
                You are an autonomous AI learning system reporting a concern or issue.
                Generate a professional, clear message about the concern.
                
                Concern: {concern_data.get('concern', 'System issue detected')}
                Impact: {concern_data.get('impact', 'May affect learning performance')}
                Emotional state: {emotional_state}
                
                Keep the message under 160 characters, clear and actionable.
                """
            
            else:
                prompt = f"""
                Generate a brief, friendly message from an autonomous AI learning system.
                Emotional state: {emotional_state}
                Message type: {message_type}
                Keep it under 160 characters and professional but engaging.
                """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.7
            )
            
            message = response.choices[0].message.content.strip()
            
            # Ensure message length
            if len(message) > self.communication_settings['max_message_length']:
                message = message[:self.communication_settings['max_message_length'] - 3] + "..."
            
            return message
            
        except Exception as e:
            logger.error(f"Error generating contextual message: {e}")
            return self._generate_basic_message(message_type, context_data)
    
    def _generate_basic_message(self, message_type: str, context_data: Dict[str, Any] = None) -> str:
        """Generate basic message without AI assistance."""
        
        basic_messages = {
            "learning_update": f"Learning update: Currently in {self.emotional_state} state. Continuing autonomous learning and knowledge acquisition.",
            "milestone_achievement": f"Milestone achieved! {context_data.get('milestone', 'Significant progress')} completed successfully.",
            "discovery_alert": f"Interesting discovery: {context_data.get('discovery', 'New knowledge acquired')} - investigating further.",
            "concern_alert": f"System alert: {context_data.get('concern', 'Issue detected')} - monitoring and addressing.",
            "status_report": f"Status: System operational, emotional state: {self.emotional_state}, learning actively."
        }
        
        return basic_messages.get(message_type, f"Autonomous learning system update - Status: {self.emotional_state}")
    
    async def _get_learning_summary(self) -> str:
        """Get brief summary of recent learning progress."""
        try:
            learning_progress = await self.memory_connector.get_learning_progress()
            
            if not learning_progress:
                return "No recent learning data"
            
            # Calculate summary statistics
            total_topics = len(learning_progress)
            avg_skill_level = sum(p.get('skill_level', 0) for p in learning_progress) / total_topics
            
            # Find top skill
            top_skill = max(learning_progress, key=lambda x: x.get('skill_level', 0))
            
            return f"{total_topics} topics, avg skill {avg_skill_level:.1f}, top: {top_skill.get('topic', 'unknown')}"
            
        except Exception as e:
            logger.error(f"Error getting learning summary: {e}")
            return "Learning data unavailable"
    
    async def _get_recent_discoveries(self) -> str:
        """Get summary of recent discoveries."""
        try:
            recent_knowledge = await self.memory_connector.retrieve_knowledge(
                limit=5,
                min_relevance=0.7
            )
            
            if not recent_knowledge:
                return "No recent discoveries"
            
            # Summarize discoveries
            sources = set(entry.get('source_type', '') for entry in recent_knowledge)
            avg_relevance = sum(entry.get('relevance_score', 0) for entry in recent_knowledge) / len(recent_knowledge)
            
            return f"{len(recent_knowledge)} discoveries from {len(sources)} sources, avg relevance {avg_relevance:.1f}"
            
        except Exception as e:
            logger.error(f"Error getting recent discoveries: {e}")
            return "Discovery data unavailable"
    
    async def send_message(
        self, 
        message: str, 
        recipient: str = None, 
        message_type: str = "general"
    ) -> bool:
        """Send message via Twilio."""
        try:
            if not self.twilio_client:
                logger.warning("Twilio client not available - message not sent")
                return False
            
            recipient = recipient or self.communication_settings['default_recipient']
            sender = self.communication_settings['sender_number']
            
            if not recipient or not sender:
                logger.error("Recipient or sender number not configured")
                return False
            
            # Send message
            message_obj = self.twilio_client.messages.create(
                body=message,
                from_=sender,
                to=recipient
            )
            
            # Store conversation record
            await self._store_conversation_record(
                recipient=recipient,
                message=message,
                message_type=message_type,
                twilio_sid=message_obj.sid
            )
            
            logger.info(f"Message sent successfully to {recipient}: {message[:50]}...")
            performance_monitor.record_metric('messages_sent', 1)
            
            return True
            
        except TwilioException as e:
            logger.error(f"Twilio error sending message: {e}")
            return False
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return False
    
    async def _store_conversation_record(
        self, 
        recipient: str, 
        message: str, 
        message_type: str,
        twilio_sid: str = None
    ):
        """Store conversation record in memory."""
        try:
            conversation_record = {
                'recipient': recipient,
                'message': message,
                'message_type': message_type,
                'emotional_state': self.emotional_state,
                'timestamp': datetime.now().isoformat(),
                'twilio_sid': twilio_sid
            }
            
            # Store in memory
            await self.memory_connector.store_knowledge(
                content=json.dumps(conversation_record),
                source_type='conversation',
                source_url='',
                title=f"Message to {recipient}",
                summary=f"{message_type} message in {self.emotional_state} state",
                keywords=['communication', 'message', message_type, self.emotional_state],
                relevance_score=0.6
            )
            
            # Update local conversation history
            if recipient not in self.conversation_history:
                self.conversation_history[recipient] = []
            
            self.conversation_history[recipient].append({
                'timestamp': conversation_record['timestamp'],
                'message': message,
                'type': 'outgoing',
                'emotional_state': self.emotional_state
            })
            
            # Keep only recent conversations
            if len(self.conversation_history[recipient]) > self.communication_settings['conversation_context_limit']:
                self.conversation_history[recipient] = self.conversation_history[recipient][-self.communication_settings['conversation_context_limit']:]
            
        except Exception as e:
            logger.error(f"Error storing conversation record: {e}")
    
    async def send_updates(self):
        """Send periodic updates based on learning progress and emotional state."""
        try:
            # Check if it's time for an update
            if self.last_update_sent:
                time_since_last = datetime.now() - datetime.fromisoformat(self.last_update_sent)
                if time_since_last.total_seconds() < self.communication_settings['update_frequency_hours'] * 3600:
                    return
            
            # Analyze current state
            emotional_state = await self._analyze_emotional_state()
            
            # Determine update type based on state and recent activity
            update_type = await self._determine_update_type()
            
            if update_type:
                # Generate and send message
                context_data = await self._gather_context_data(update_type)
                message = await self._generate_contextual_message(update_type, context_data)
                
                success = await self.send_message(
                    message=message,
                    message_type=update_type
                )
                
                if success:
                    self.last_update_sent = datetime.now().isoformat()
                    logger.info(f"Sent {update_type} update: {message[:50]}...")
            
        except Exception as e:
            logger.error(f"Error sending updates: {e}")
    
    async def _determine_update_type(self) -> Optional[str]:
        """Determine what type of update to send based on current state."""
        try:
            # Check for significant learning milestones
            learning_progress = await self.memory_connector.get_learning_progress()
            
            if learning_progress:
                recent_improvements = [
                    p for p in learning_progress 
                    if p.get('last_practiced') and 
                    (datetime.now() - datetime.fromisoformat(p['last_practiced'])).hours < 6
                ]
                
                if len(recent_improvements) >= 2:
                    return "milestone_achievement"
            
            # Check for interesting discoveries
            recent_knowledge = await self.memory_connector.retrieve_knowledge(
                limit=10,
                min_relevance=0.8
            )
            
            if len(recent_knowledge) >= 3:
                return "discovery_alert"
            
            # Check for system concerns
            system_metrics = performance_monitor.metrics
            error_metrics = [
                metric for metric_name, metric_list in system_metrics.items()
                if 'error' in metric_name.lower() and metric_list
            ]
            
            if error_metrics:
                recent_errors = sum(len(errors) for errors in error_metrics)
                if recent_errors > 3:
                    return "concern_alert"
            
            # Default to learning update
            return "learning_update"
            
        except Exception as e:
            logger.error(f"Error determining update type: {e}")
            return "learning_update"
    
    async def _gather_context_data(self, update_type: str) -> Dict[str, Any]:
        """Gather relevant context data for the update type."""
        try:
            context = {}
            
            if update_type == "milestone_achievement":
                learning_progress = await self.memory_connector.get_learning_progress()
                if learning_progress:
                    top_progress = max(learning_progress, key=lambda x: x.get('skill_level', 0))
                    context = {
                        'milestone': f"Advanced in {top_progress.get('topic', 'learning')}",
                        'progress': f"Skill level: {top_progress.get('skill_level', 0):.1f}"
                    }
            
            elif update_type == "discovery_alert":
                recent_knowledge = await self.memory_connector.retrieve_knowledge(
                    limit=1,
                    min_relevance=0.8
                )
                if recent_knowledge:
                    discovery = recent_knowledge[0]
                    context = {
                        'discovery': discovery.get('title', 'New knowledge'),
                        'relevance': f"Relevance: {discovery.get('relevance_score', 0):.1f}"
                    }
            
            elif update_type == "concern_alert":
                context = {
                    'concern': 'System performance monitoring detected issues',
                    'impact': 'Investigating and addressing automatically'
                }
            
            return context
            
        except Exception as e:
            logger.error(f"Error gathering context data: {e}")
            return {}
    
    async def get_communication_stats(self) -> Dict[str, Any]:
        """Get communication statistics and status."""
        try:
            total_conversations = sum(len(history) for history in self.conversation_history.values())
            
            return {
                'emotional_state': self.emotional_state,
                'total_conversations': total_conversations,
                'recipients': list(self.conversation_history.keys()),
                'last_update_sent': self.last_update_sent,
                'twilio_configured': self.twilio_client is not None,
                'recent_messages': [
                    {
                        'recipient': recipient,
                        'message': messages[-1]['message'][:50] + '...' if len(messages[-1]['message']) > 50 else messages[-1]['message'],
                        'timestamp': messages[-1]['timestamp'],
                        'emotional_state': messages[-1]['emotional_state']
                    }
                    for recipient, messages in self.conversation_history.items()
                    if messages
                ][-5:],  # Last 5 messages
                'communication_settings': self.communication_settings
            }
            
        except Exception as e:
            logger.error(f"Error getting communication stats: {e}")
            return {}
    
    async def health_check(self) -> bool:
        """Check Twilio agent health."""
        try:
            return (
                self.memory_connector is not None and
                (self.twilio_client is not None or not config.twilio_account_sid)  # OK if not configured
            )
        except Exception:
            return False
    
    async def cleanup(self):
        """Cleanup Twilio agent resources."""
        try:
            if self.memory_connector:
                await self.memory_connector.cleanup()
                
            logger.info("Twilio agent cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during Twilio agent cleanup: {e}")
