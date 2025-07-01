
"""
Memory System Integration for LexOS Agents
Connects agent personalities to their memory systems and enables memory-driven behavior
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple

from memory.api import MemoryAPI
from memory.consolidator import MemoryConsolidator
from memory.backup import MemoryBackupManager
from schemas.memory_models import MemoryType, MemoryConfig

logger = logging.getLogger(__name__)

class AgentMemoryInterface:
    """Interface between AI agents and their memory systems"""
    
    def __init__(self, agent_id: str, memory_api: MemoryAPI):
        self.agent_id = agent_id
        self.memory_api = memory_api
        self.config = MemoryConfig()
        self.current_session_id = None
        self.working_memory_cache = {}
        
    def start_session(self, session_id: str):
        """Start a new interaction session"""
        self.current_session_id = session_id
        self.working_memory_cache = {}
        
        # Load relevant memories into working memory
        self._load_session_context()
        
        logger.info(f"Started session {session_id} for agent {self.agent_id}")
    
    def end_session(self):
        """End current session and trigger consolidation"""
        if self.current_session_id:
            # Store session summary in episodic memory
            self._store_session_summary()
            
            # Clear working memory
            self._clear_working_memory()
            
            logger.info(f"Ended session {self.current_session_id} for agent {self.agent_id}")
            self.current_session_id = None
    
    def process_perception(
        self,
        content: str,
        perception_type: str = "input",
        emotional_context: Optional[Dict[str, float]] = None,
        importance: float = 0.5
    ) -> int:
        """Process incoming perception and store in memory"""
        
        # Store in episodic memory
        episodic_id = self.memory_api.store_episodic_memory(
            agent_id=self.agent_id,
            session_id=self.current_session_id or "no_session",
            event_type=perception_type,
            content=content,
            emotional_valence=emotional_context.get('valence', 0.0) if emotional_context else 0.0,
            emotional_intensity=emotional_context.get('intensity', 0.0) if emotional_context else 0.0,
            importance=importance,
            metadata={'perception_timestamp': datetime.utcnow().isoformat()}
        )
        
        # Add to working memory if important enough
        if importance > 0.6:
            self.memory_api.add_to_working_memory(
                agent_id=self.agent_id,
                session_id=self.current_session_id or "no_session",
                content_type="perception",
                content=content,
                priority=importance,
                source_memory_id=episodic_id,
                source_memory_type="episodic"
            )
        
        # Process emotional response if provided
        if emotional_context and emotional_context.get('intensity', 0) > 0.3:
            self._process_emotional_response(content, emotional_context)
        
        return episodic_id
    
    def retrieve_relevant_memories(
        self,
        query: str,
        memory_types: Optional[List[str]] = None,
        limit: int = 10,
        importance_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Retrieve memories relevant to current context"""
        
        # Search across memory types
        relevant_memories = self.memory_api.search_memories(
            agent_id=self.agent_id,
            query=query,
            memory_types=memory_types,
            importance_threshold=importance_threshold,
            limit=limit
        )
        
        # Update access tracking for retrieved memories
        for memory in relevant_memories:
            self.memory_api._update_memory_access(
                memory['id'], 
                memory['memory_type']
            )
        
        return relevant_memories
    
    def make_decision(
        self,
        context: str,
        options: List[str],
        decision_type: str = "general"
    ) -> Dict[str, Any]:
        """Make decision based on memory and experience"""
        
        decision_context = {
            'context': context,
            'options': options,
            'decision_type': decision_type,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Retrieve relevant procedural memories
        procedural_memories = self._get_relevant_procedures(decision_type, context)
        
        # Retrieve similar past experiences
        past_experiences = self.retrieve_relevant_memories(
            query=f"{decision_type} {context}",
            memory_types=["episodic"],
            limit=5
        )
        
        # Retrieve relevant knowledge
        knowledge = self.retrieve_relevant_memories(
            query=context,
            memory_types=["semantic"],
            limit=3
        )
        
        # Get emotional associations
        emotional_context = self._get_emotional_context(context)
        
        # Calculate decision scores (simplified heuristic)
        decision_scores = self._calculate_decision_scores(
            options, procedural_memories, past_experiences, knowledge, emotional_context
        )
        
        # Select best option
        best_option = max(decision_scores.items(), key=lambda x: x[1])
        
        decision_result = {
            'selected_option': best_option[0],
            'confidence': best_option[1],
            'reasoning': {
                'procedural_influence': len(procedural_memories),
                'experience_influence': len(past_experiences),
                'knowledge_influence': len(knowledge),
                'emotional_influence': emotional_context.get('intensity', 0)
            },
            'context': decision_context
        }
        
        # Store decision in episodic memory
        self.memory_api.store_episodic_memory(
            agent_id=self.agent_id,
            session_id=self.current_session_id or "no_session",
            event_type="decision",
            content=f"Decision: {best_option[0]} for context: {context}",
            importance=0.7,
            metadata=decision_result
        )
        
        return decision_result
    
    def learn_from_outcome(
        self,
        action: str,
        outcome: str,
        success: bool,
        feedback: Optional[str] = None
    ):
        """Learn from action outcomes and update memories"""
        
        # Store learning experience
        learning_content = f"Action: {action}, Outcome: {outcome}, Success: {success}"
        if feedback:
            learning_content += f", Feedback: {feedback}"
        
        episodic_id = self.memory_api.store_episodic_memory(
            agent_id=self.agent_id,
            session_id=self.current_session_id or "no_session",
            event_type="learning",
            content=learning_content,
            lessons_learned=feedback or ("Successful approach" if success else "Approach needs improvement"),
            importance=0.8 if success else 0.9,  # Failures are often more important to remember
            emotional_valence=0.5 if success else -0.3,
            emotional_intensity=0.6
        )
        
        # Update procedural memory if applicable
        self._update_procedural_knowledge(action, success, feedback)
        
        # Store emotional response to outcome
        emotion_type = "satisfaction" if success else "disappointment"
        self.memory_api.store_emotional_memory(
            agent_id=self.agent_id,
            trigger_stimulus=f"outcome of {action}",
            emotion_type=emotion_type,
            valence=0.6 if success else -0.4,
            arousal=0.5,
            intensity=0.6,
            context=learning_content,
            resolution_outcome="positive learning" if success else "learning opportunity"
        )
        
        logger.info(f"Agent {self.agent_id} learned from outcome: {action} -> {success}")
    
    def get_personality_context(self) -> Dict[str, Any]:
        """Get personality-relevant memory context"""
        
        # Get recent emotional patterns
        emotional_patterns = self.memory_api.retrieve_emotional_patterns(
            agent_id=self.agent_id,
            limit=10
        )
        
        # Get core knowledge areas
        knowledge_areas = self.memory_api.retrieve_semantic_memory(
            agent_id=self.agent_id,
            limit=20
        )
        
        # Get key skills
        skills = self._get_agent_skills()
        
        # Get recent significant experiences
        significant_experiences = self.memory_api.retrieve_episodic_memories(
            agent_id=self.agent_id,
            importance_threshold=0.7,
            limit=15
        )
        
        return {
            'emotional_patterns': emotional_patterns,
            'knowledge_areas': knowledge_areas,
            'skills': skills,
            'significant_experiences': significant_experiences,
            'memory_summary': self._generate_memory_summary()
        }
    
    def update_importance_scores(self, context: str):
        """Update memory importance based on current context"""
        
        # Find memories related to current context
        related_memories = self.retrieve_relevant_memories(
            query=context,
            limit=20,
            importance_threshold=0.1
        )
        
        # Boost importance of relevant memories
        for memory in related_memories:
            if memory['memory_type'] == 'episodic':
                with self.memory_api.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE episodic_memory SET
                            importance = MIN(1.0, importance * 1.1),
                            accessed_at = CURRENT_TIMESTAMP,
                            access_count = access_count + 1
                        WHERE id = ?
                    """, (memory['id'],))
    
    def _load_session_context(self):
        """Load relevant context into working memory for session"""
        if not self.current_session_id:
            return
        
        # Load recent important memories
        recent_memories = self.memory_api.retrieve_episodic_memories(
            agent_id=self.agent_id,
            importance_threshold=0.7,
            limit=5
        )
        
        for memory in recent_memories:
            self.memory_api.add_to_working_memory(
                agent_id=self.agent_id,
                session_id=self.current_session_id,
                content_type="context",
                content=memory['summary'] or memory['content'][:200],
                priority=memory['importance'],
                source_memory_id=memory['id'],
                source_memory_type="episodic"
            )
    
    def _store_session_summary(self):
        """Store summary of session in episodic memory"""
        if not self.current_session_id:
            return
        
        # Get working memory contents for session
        working_memories = self.memory_api.get_working_memory(
            agent_id=self.agent_id,
            session_id=self.current_session_id
        )
        
        if working_memories:
            # Create session summary
            session_content = f"Session {self.current_session_id} with {len(working_memories)} interactions"
            
            # Calculate session importance based on working memory
            avg_priority = sum(wm['priority'] for wm in working_memories) / len(working_memories)
            
            self.memory_api.store_episodic_memory(
                agent_id=self.agent_id,
                session_id=self.current_session_id,
                event_type="session_summary",
                content=session_content,
                importance=avg_priority,
                metadata={
                    'session_length': len(working_memories),
                    'avg_priority': avg_priority
                }
            )
    
    def _clear_working_memory(self):
        """Clear working memory for current session"""
        if not self.current_session_id:
            return
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM working_memory 
                WHERE agent_id = ? AND session_id = ?
            """, (self.agent_id, self.current_session_id))
    
    def _process_emotional_response(self, stimulus: str, emotional_context: Dict[str, float]):
        """Process and store emotional response"""
        
        # Determine emotion type based on valence and arousal
        valence = emotional_context.get('valence', 0.0)
        arousal = emotional_context.get('arousal', 0.5)
        intensity = emotional_context.get('intensity', 0.5)
        
        if valence > 0.3 and arousal > 0.5:
            emotion_type = "excitement"
        elif valence > 0.3 and arousal < 0.5:
            emotion_type = "contentment"
        elif valence < -0.3 and arousal > 0.5:
            emotion_type = "anxiety"
        elif valence < -0.3 and arousal < 0.5:
            emotion_type = "sadness"
        else:
            emotion_type = "neutral"
        
        self.memory_api.store_emotional_memory(
            agent_id=self.agent_id,
            trigger_stimulus=stimulus,
            emotion_type=emotion_type,
            valence=valence,
            arousal=arousal,
            intensity=intensity,
            context=f"Session: {self.current_session_id}"
        )
    
    def _get_relevant_procedures(self, decision_type: str, context: str) -> List[Dict[str, Any]]:
        """Get procedural memories relevant to decision"""
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM procedural_memory 
                WHERE agent_id = ? 
                AND (skill_type LIKE ? OR skill_name LIKE ? OR procedure_steps LIKE ?)
                ORDER BY proficiency_level DESC, success_rate DESC
                LIMIT 5
            """, (
                self.agent_id,
                f"%{decision_type}%",
                f"%{context}%",
                f"%{context}%"
            ))
            
            procedures = []
            for row in cursor.fetchall():
                procedure = dict(row)
                procedure['procedure_steps'] = json.loads(procedure['procedure_steps'] or '[]')
                procedure['conditions'] = json.loads(procedure['conditions'] or '{}')
                procedures.append(procedure)
            
            return procedures
    
    def _get_emotional_context(self, context: str) -> Dict[str, float]:
        """Get emotional associations with context"""
        
        emotional_memories = self.memory_api.retrieve_emotional_patterns(
            agent_id=self.agent_id,
            trigger_pattern=context,
            limit=5
        )
        
        if not emotional_memories:
            return {'valence': 0.0, 'arousal': 0.5, 'intensity': 0.0}
        
        # Average emotional response to similar contexts
        avg_valence = sum(em['valence'] for em in emotional_memories) / len(emotional_memories)
        avg_arousal = sum(em['arousal'] for em in emotional_memories) / len(emotional_memories)
        avg_intensity = sum(em['intensity'] for em in emotional_memories) / len(emotional_memories)
        
        return {
            'valence': avg_valence,
            'arousal': avg_arousal,
            'intensity': avg_intensity
        }
    
    def _calculate_decision_scores(
        self,
        options: List[str],
        procedures: List[Dict[str, Any]],
        experiences: List[Dict[str, Any]],
        knowledge: List[Dict[str, Any]],
        emotional_context: Dict[str, float]
    ) -> Dict[str, float]:
        """Calculate decision scores for options"""
        
        scores = {option: 0.5 for option in options}  # Base score
        
        # Procedural influence
        for procedure in procedures:
            for option in options:
                if any(option.lower() in step.lower() for step in procedure['procedure_steps']):
                    scores[option] += procedure['proficiency_level'] * 0.3
        
        # Experience influence
        for experience in experiences:
            for option in options:
                if option.lower() in experience['content'].lower():
                    # Positive experiences boost score, negative ones reduce it
                    influence = experience['importance'] * 0.2
                    if experience.get('emotional_valence', 0) < 0:
                        influence *= -1
                    scores[option] += influence
        
        # Knowledge influence
        for knowledge_item in knowledge:
            for option in options:
                if option.lower() in knowledge_item['definition'].lower():
                    scores[option] += knowledge_item['confidence'] * 0.1
        
        # Emotional influence
        emotional_bias = emotional_context.get('valence', 0) * emotional_context.get('intensity', 0)
        for option in options:
            # Positive emotions bias toward more positive/active options
            if emotional_bias > 0 and ('positive' in option.lower() or 'active' in option.lower()):
                scores[option] += emotional_bias * 0.2
            elif emotional_bias < 0 and ('negative' in option.lower() or 'passive' in option.lower()):
                scores[option] += abs(emotional_bias) * 0.2
        
        # Normalize scores
        max_score = max(scores.values())
        min_score = min(scores.values())
        if max_score > min_score:
            for option in scores:
                scores[option] = (scores[option] - min_score) / (max_score - min_score)
        
        return scores
    
    def _update_procedural_knowledge(self, action: str, success: bool, feedback: Optional[str]):
        """Update procedural memory based on action outcome"""
        
        # Find related procedural memories
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, skill_name FROM procedural_memory 
                WHERE agent_id = ? 
                AND (skill_name LIKE ? OR procedure_steps LIKE ?)
            """, (self.agent_id, f"%{action}%", f"%{action}%"))
            
            related_skills = cursor.fetchall()
            
            for skill in related_skills:
                self.memory_api.update_skill_proficiency(
                    agent_id=self.agent_id,
                    skill_name=skill['skill_name'],
                    success=success,
                    improvement_notes=feedback
                )
    
    def _get_agent_skills(self) -> List[Dict[str, Any]]:
        """Get agent's procedural skills"""
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT skill_name, skill_type, proficiency_level, success_rate, usage_frequency
                FROM procedural_memory 
                WHERE agent_id = ?
                ORDER BY proficiency_level DESC, usage_frequency DESC
                LIMIT 10
            """, (self.agent_id,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def _generate_memory_summary(self) -> Dict[str, Any]:
        """Generate summary of agent's memory state"""
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # Count memories by type
            cursor.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM episodic_memory WHERE agent_id = ?) as episodic_count,
                    (SELECT COUNT(*) FROM semantic_memory WHERE agent_id = ?) as semantic_count,
                    (SELECT COUNT(*) FROM procedural_memory WHERE agent_id = ?) as procedural_count,
                    (SELECT COUNT(*) FROM emotional_memory WHERE agent_id = ?) as emotional_count
            """, (self.agent_id, self.agent_id, self.agent_id, self.agent_id))
            
            counts = dict(cursor.fetchone())
            
            # Get importance distribution
            cursor.execute("""
                SELECT AVG(importance) as avg_importance, MAX(importance) as max_importance
                FROM episodic_memory WHERE agent_id = ?
            """, (self.agent_id,))
            
            importance_stats = dict(cursor.fetchone())
            
            # Get recent activity
            cursor.execute("""
                SELECT COUNT(*) as recent_memories
                FROM episodic_memory 
                WHERE agent_id = ? AND created_at > datetime('now', '-24 hours')
            """, (self.agent_id,))
            
            recent_activity = cursor.fetchone()['recent_memories']
            
            return {
                'memory_counts': counts,
                'importance_stats': importance_stats,
                'recent_activity': recent_activity,
                'total_memories': sum(counts.values())
            }

class MemoryDrivenAgent:
    """Enhanced agent class with integrated memory system"""
    
    def __init__(self, agent_id: str, name: str, personality: Dict[str, Any]):
        self.agent_id = agent_id
        self.name = name
        self.personality = personality
        
        # Initialize memory systems
        self.memory_api = MemoryAPI()
        self.memory_interface = AgentMemoryInterface(agent_id, self.memory_api)
        self.consolidator = MemoryConsolidator(self.memory_api)
        self.backup_manager = MemoryBackupManager(self.memory_api)
        
        # Initialize with personality-based memories
        self._initialize_personality_memories()
        
        logger.info(f"Initialized memory-driven agent: {name} ({agent_id})")
    
    def _initialize_personality_memories(self):
        """Initialize agent with personality-based semantic memories"""
        
        # Store personality traits as semantic memories
        for trait, value in self.personality.get('traits', {}).items():
            self.memory_api.store_semantic_memory(
                agent_id=self.agent_id,
                concept=f"personality_trait_{trait}",
                definition=f"I have {trait} with intensity {value}",
                category="personality",
                confidence=0.9,
                importance=0.8,
                source="personality_initialization"
            )
        
        # Store capabilities as procedural memories
        for capability in self.personality.get('capabilities', []):
            self.memory_api.store_procedural_memory(
                agent_id=self.agent_id,
                skill_name=capability,
                skill_type="capability",
                procedure_steps=[f"Apply {capability} to solve problems"],
                proficiency_level=0.7,
                metadata={'source': 'personality_initialization'}
            )
        
        # Store backstory as episodic memory
        if self.personality.get('backstory'):
            self.memory_api.store_episodic_memory(
                agent_id=self.agent_id,
                session_id="initialization",
                event_type="backstory",
                content=self.personality['backstory'],
                importance=0.9,
                metadata={'source': 'personality_initialization'}
            )
    
    def start_conversation(self, session_id: str):
        """Start a new conversation session"""
        self.memory_interface.start_session(session_id)
    
    def end_conversation(self):
        """End current conversation session"""
        self.memory_interface.end_session()
    
    def process_input(self, user_input: str, context: Dict[str, Any] = None) -> str:
        """Process user input with memory integration"""
        
        # Store perception
        self.memory_interface.process_perception(
            content=user_input,
            perception_type="user_input",
            importance=0.6
        )
        
        # Retrieve relevant memories
        relevant_memories = self.memory_interface.retrieve_relevant_memories(
            query=user_input,
            limit=5
        )
        
        # Generate response based on memories and personality
        response = self._generate_response(user_input, relevant_memories, context)
        
        # Store response as episodic memory
        self.memory_interface.process_perception(
            content=f"Response: {response}",
            perception_type="agent_response",
            importance=0.5
        )
        
        return response
    
    def _generate_response(
        self, 
        user_input: str, 
        relevant_memories: List[Dict[str, Any]], 
        context: Dict[str, Any] = None
    ) -> str:
        """Generate response based on memories and personality"""
        
        # This is a simplified response generation
        # In a real implementation, this would integrate with an LLM
        
        memory_context = ""
        if relevant_memories:
            memory_context = f"Based on my memories: {relevant_memories[0]['content'][:100]}..."
        
        personality_context = f"As someone who is {', '.join(self.personality.get('traits', {}).keys())}"
        
        response = f"{personality_context}, I understand your input about '{user_input}'. {memory_context}"
        
        return response
    
    def learn_from_feedback(self, feedback: str, success: bool):
        """Learn from user feedback"""
        self.memory_interface.learn_from_outcome(
            action="conversation_response",
            outcome=feedback,
            success=success,
            feedback=feedback
        )
    
    def get_memory_summary(self) -> Dict[str, Any]:
        """Get comprehensive memory summary"""
        return self.memory_interface.get_personality_context()
    
    def backup_memories(self) -> str:
        """Create backup of agent memories"""
        return self.backup_manager.create_full_backup(self.agent_id)
    
    def consolidate_memories(self, consolidation_type: str = "reflection"):
        """Trigger memory consolidation"""
        return self.consolidator.consolidate_agent_memories(self.agent_id, consolidation_type)
