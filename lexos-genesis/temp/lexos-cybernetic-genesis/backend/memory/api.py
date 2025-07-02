
"""
Memory Management API for LexOS AI Consciousness System
Provides CRUD operations and advanced memory functions for all memory types
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import asdict
import numpy as np
from pathlib import Path

from schemas.memory_models import (
    MemoryEntry, MemoryType, EmotionalValence, MemoryConfig
)

logger = logging.getLogger(__name__)

class MemoryAPI:
    """Comprehensive memory management system for AI agents"""
    
    def __init__(self, db_path: str = "backend/data/lexos.db"):
        self.db_path = db_path
        self.config = MemoryConfig()
        
    def get_connection(self) -> sqlite3.Connection:
        """Get database connection with optimizations"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        # Enable WAL mode for better concurrency
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=10000")
        conn.execute("PRAGMA temp_store=memory")
        return conn
    
    # ==================== EPISODIC MEMORY ====================
    
    def store_episodic_memory(
        self,
        agent_id: str,
        session_id: str,
        event_type: str,
        content: str,
        summary: Optional[str] = None,
        participants: Optional[List[str]] = None,
        location_context: Optional[str] = None,
        emotional_valence: float = 0.0,
        emotional_intensity: float = 0.0,
        importance: float = 0.5,
        lessons_learned: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """Store a new episodic memory"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Calculate temporal context
            temporal_context = self._generate_temporal_context()
            
            # Auto-generate summary if not provided
            if not summary and len(content) > 200:
                summary = content[:200] + "..."
            
            cursor.execute("""
                INSERT INTO episodic_memory (
                    agent_id, session_id, event_type, content, summary,
                    participants, location_context, temporal_context,
                    importance, emotional_valence, emotional_intensity,
                    lessons_learned, tags, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent_id, session_id, event_type, content, summary,
                json.dumps(participants or []),
                location_context,
                temporal_context,
                importance,
                emotional_valence,
                emotional_intensity,
                lessons_learned,
                json.dumps(tags or []),
                json.dumps(metadata or {})
            ))
            
            memory_id = cursor.lastrowid
            
            # Create associations with recent memories (only if not in test mode)
            try:
                self._create_temporal_associations(agent_id, memory_id, "episodic")
            except sqlite3.OperationalError as e:
                if "database is locked" in str(e):
                    logger.warning(f"Skipping temporal associations due to database lock: {e}")
                else:
                    raise
            
            logger.info(f"Stored episodic memory {memory_id} for agent {agent_id}")
            return memory_id
    
    def retrieve_episodic_memories(
        self,
        agent_id: str,
        session_id: Optional[str] = None,
        event_type: Optional[str] = None,
        importance_threshold: float = 0.0,
        limit: int = 50,
        include_emotional: bool = False
    ) -> List[Dict[str, Any]]:
        """Retrieve episodic memories with filtering"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = """
                SELECT * FROM episodic_memory 
                WHERE agent_id = ? AND importance >= ?
            """
            params = [agent_id, importance_threshold]
            
            if session_id:
                query += " AND session_id = ?"
                params.append(session_id)
            
            if event_type:
                query += " AND event_type = ?"
                params.append(event_type)
            
            if include_emotional:
                query += " AND (emotional_intensity > 0.3 OR ABS(emotional_valence) > 0.3)"
            
            query += " ORDER BY importance DESC, created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            memories = []
            
            for row in cursor.fetchall():
                memory = dict(row)
                memory['participants'] = json.loads(memory['participants'] or '[]')
                memory['tags'] = json.loads(memory['tags'] or '[]')
                memory['metadata'] = json.loads(memory['metadata'] or '{}')
                memories.append(memory)
                
                # Update access tracking
                self._update_memory_access(memory['id'], "episodic")
            
            return memories
    
    # ==================== SEMANTIC MEMORY ====================
    
    def store_semantic_memory(
        self,
        agent_id: str,
        concept: str,
        definition: str,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        relationships: Optional[Dict[str, List[str]]] = None,
        confidence: float = 0.5,
        source: Optional[str] = None,
        evidence: Optional[str] = None,
        importance: float = 0.5,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """Store semantic knowledge"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if concept already exists
            cursor.execute("""
                SELECT id FROM semantic_memory 
                WHERE agent_id = ? AND concept = ?
            """, (agent_id, concept))
            
            existing = cursor.fetchone()
            
            if existing:
                # Update existing concept
                cursor.execute("""
                    UPDATE semantic_memory SET
                        definition = ?, category = ?, subcategory = ?,
                        relationships = ?, confidence = ?, source = ?,
                        evidence = ?, importance = ?, tags = ?,
                        updated_at = CURRENT_TIMESTAMP, metadata = ?
                    WHERE id = ?
                """, (
                    definition, category, subcategory,
                    json.dumps(relationships or {}),
                    confidence, source, evidence, importance,
                    json.dumps(tags or []),
                    json.dumps(metadata or {}),
                    existing['id']
                ))
                memory_id = existing['id']
            else:
                # Insert new concept
                cursor.execute("""
                    INSERT INTO semantic_memory (
                        agent_id, concept, definition, category, subcategory,
                        relationships, confidence, source, evidence,
                        importance, tags, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    agent_id, concept, definition, category, subcategory,
                    json.dumps(relationships or {}),
                    confidence, source, evidence, importance,
                    json.dumps(tags or []),
                    json.dumps(metadata or {})
                ))
                memory_id = cursor.lastrowid
            
            # Create semantic associations
            if relationships:
                self._create_semantic_associations(agent_id, memory_id, relationships)
            
            logger.info(f"Stored semantic memory {memory_id} for concept '{concept}'")
            return memory_id
    
    def retrieve_semantic_memory(
        self,
        agent_id: str,
        concept: Optional[str] = None,
        category: Optional[str] = None,
        confidence_threshold: float = 0.0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Retrieve semantic knowledge"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = """
                SELECT * FROM semantic_memory 
                WHERE agent_id = ? AND confidence >= ?
            """
            params = [agent_id, confidence_threshold]
            
            if concept:
                query += " AND concept LIKE ?"
                params.append(f"%{concept}%")
            
            if category:
                query += " AND category = ?"
                params.append(category)
            
            query += " ORDER BY importance DESC, confidence DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            memories = []
            
            for row in cursor.fetchall():
                memory = dict(row)
                memory['relationships'] = json.loads(memory['relationships'] or '{}')
                memory['tags'] = json.loads(memory['tags'] or '[]')
                memory['metadata'] = json.loads(memory['metadata'] or '{}')
                memories.append(memory)
                
                # Update access tracking
                self._update_memory_access(memory['id'], "semantic")
            
            return memories
    
    # ==================== PROCEDURAL MEMORY ====================
    
    def store_procedural_memory(
        self,
        agent_id: str,
        skill_name: str,
        skill_type: str,
        procedure_steps: List[str],
        conditions: Optional[Dict[str, Any]] = None,
        success_criteria: Optional[str] = None,
        proficiency_level: float = 0.0,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """Store procedural knowledge/skills"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO procedural_memory (
                    agent_id, skill_name, skill_type, procedure_steps,
                    conditions, success_criteria, proficiency_level,
                    tags, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent_id, skill_name, skill_type,
                json.dumps(procedure_steps),
                json.dumps(conditions or {}),
                success_criteria, proficiency_level,
                json.dumps(tags or []),
                json.dumps(metadata or {})
            ))
            
            memory_id = cursor.lastrowid
            logger.info(f"Stored procedural memory {memory_id} for skill '{skill_name}'")
            return memory_id
    
    def update_skill_proficiency(
        self,
        agent_id: str,
        skill_name: str,
        success: bool,
        improvement_notes: Optional[str] = None
    ) -> bool:
        """Update skill proficiency based on usage outcome"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, usage_frequency, success_rate, proficiency_level
                FROM procedural_memory 
                WHERE agent_id = ? AND skill_name = ?
            """, (agent_id, skill_name))
            
            skill = cursor.fetchone()
            if not skill:
                return False
            
            # Calculate new metrics
            new_frequency = skill['usage_frequency'] + 1
            old_success_rate = skill['success_rate']
            new_success_rate = (old_success_rate * skill['usage_frequency'] + (1 if success else 0)) / new_frequency
            
            # Adjust proficiency based on success rate and frequency
            proficiency_adjustment = 0.01 if success else -0.005
            new_proficiency = min(1.0, max(0.0, skill['proficiency_level'] + proficiency_adjustment))
            
            cursor.execute("""
                UPDATE procedural_memory SET
                    usage_frequency = ?, success_rate = ?, proficiency_level = ?,
                    last_used = CURRENT_TIMESTAMP, improvement_notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                new_frequency, new_success_rate, new_proficiency,
                improvement_notes, skill['id']
            ))
            
            logger.info(f"Updated skill '{skill_name}' proficiency to {new_proficiency:.3f}")
            return True
    
    # ==================== EMOTIONAL MEMORY ====================
    
    def store_emotional_memory(
        self,
        agent_id: str,
        trigger_stimulus: str,
        emotion_type: str,
        valence: float,
        arousal: float,
        intensity: float,
        context: Optional[str] = None,
        behavioral_tendency: Optional[str] = None,
        coping_strategy: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """Store emotional memory"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Simulate physiological response based on emotion
            physiological_response = self._generate_physiological_response(
                emotion_type, valence, arousal, intensity
            )
            
            cursor.execute("""
                INSERT INTO emotional_memory (
                    agent_id, trigger_stimulus, emotion_type, valence,
                    arousal, intensity, context, physiological_response,
                    behavioral_tendency, coping_strategy, tags, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent_id, trigger_stimulus, emotion_type, valence,
                arousal, intensity, context,
                json.dumps(physiological_response),
                behavioral_tendency, coping_strategy,
                json.dumps(tags or []),
                json.dumps(metadata or {})
            ))
            
            memory_id = cursor.lastrowid
            
            # Create emotional associations with recent memories
            if intensity > self.config.EMOTIONAL_SIGNIFICANCE_THRESHOLD:
                self._create_emotional_associations(agent_id, memory_id, emotion_type)
            
            logger.info(f"Stored emotional memory {memory_id} for emotion '{emotion_type}'")
            return memory_id
    
    def retrieve_emotional_patterns(
        self,
        agent_id: str,
        emotion_type: Optional[str] = None,
        trigger_pattern: Optional[str] = None,
        intensity_threshold: float = 0.3,
        limit: int = 30
    ) -> List[Dict[str, Any]]:
        """Retrieve emotional patterns and triggers"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = """
                SELECT * FROM emotional_memory 
                WHERE agent_id = ? AND intensity >= ?
            """
            params = [agent_id, intensity_threshold]
            
            if emotion_type:
                query += " AND emotion_type = ?"
                params.append(emotion_type)
            
            if trigger_pattern:
                query += " AND trigger_stimulus LIKE ?"
                params.append(f"%{trigger_pattern}%")
            
            query += " ORDER BY intensity DESC, created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            memories = []
            
            for row in cursor.fetchall():
                memory = dict(row)
                memory['physiological_response'] = json.loads(memory['physiological_response'] or '{}')
                memory['tags'] = json.loads(memory['tags'] or '[]')
                memory['metadata'] = json.loads(memory['metadata'] or '{}')
                memories.append(memory)
                
                # Update access tracking
                self._update_memory_access(memory['id'], "emotional")
            
            return memories
    
    # ==================== WORKING MEMORY ====================
    
    def add_to_working_memory(
        self,
        agent_id: str,
        session_id: str,
        content_type: str,
        content: str,
        priority: float = 0.5,
        capacity_weight: float = 1.0,
        expires_in_minutes: Optional[int] = None,
        source_memory_id: Optional[int] = None,
        source_memory_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """Add item to working memory"""
        
        # Check working memory capacity
        if not self._check_working_memory_capacity(agent_id, session_id, capacity_weight):
            # Remove least important items to make space
            self._cleanup_working_memory(agent_id, session_id, capacity_weight)
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            expires_at = None
            if expires_in_minutes:
                expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
            else:
                expires_at = datetime.utcnow() + timedelta(minutes=self.config.WORKING_MEMORY_TIMEOUT_MINUTES)
            
            cursor.execute("""
                INSERT INTO working_memory (
                    agent_id, session_id, content_type, content, priority,
                    capacity_weight, source_memory_id, source_memory_type,
                    expires_at, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent_id, session_id, content_type, content, priority,
                capacity_weight, source_memory_id, source_memory_type,
                expires_at, json.dumps(metadata or {})
            ))
            
            memory_id = cursor.lastrowid
            logger.info(f"Added item {memory_id} to working memory")
            return memory_id
    
    def get_working_memory(
        self,
        agent_id: str,
        session_id: str,
        content_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve current working memory contents"""
        
        # Clean up expired items first
        self._cleanup_expired_working_memory(agent_id, session_id)
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = """
                SELECT * FROM working_memory 
                WHERE agent_id = ? AND session_id = ?
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            """
            params = [agent_id, session_id]
            
            if content_type:
                query += " AND content_type = ?"
                params.append(content_type)
            
            query += " ORDER BY priority DESC, activation_level DESC"
            
            cursor.execute(query, params)
            memories = []
            
            for row in cursor.fetchall():
                memory = dict(row)
                memory['metadata'] = json.loads(memory['metadata'] or '{}')
                memories.append(memory)
                
                # Update last accessed
                cursor.execute("""
                    UPDATE working_memory SET last_accessed = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, (memory['id'],))
            
            return memories
    
    # ==================== MEMORY ASSOCIATIONS ====================
    
    def create_memory_association(
        self,
        agent_id: str,
        memory1_id: int,
        memory1_type: str,
        memory2_id: int,
        memory2_type: str,
        association_type: str,
        strength: float = 0.5,
        direction: str = "bidirectional",
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """Create association between memories"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if association already exists
            cursor.execute("""
                SELECT id, strength, reinforcement_count FROM memory_associations
                WHERE agent_id = ? AND memory1_id = ? AND memory1_type = ?
                AND memory2_id = ? AND memory2_type = ?
            """, (agent_id, memory1_id, memory1_type, memory2_id, memory2_type))
            
            existing = cursor.fetchone()
            
            if existing:
                # Strengthen existing association
                new_strength = min(1.0, existing['strength'] + 0.1)
                new_count = existing['reinforcement_count'] + 1
                
                cursor.execute("""
                    UPDATE memory_associations SET
                        strength = ?, reinforcement_count = ?,
                        last_reinforced = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (new_strength, new_count, existing['id']))
                
                return existing['id']
            else:
                # Create new association
                cursor.execute("""
                    INSERT INTO memory_associations (
                        agent_id, memory1_id, memory1_type, memory2_id, memory2_type,
                        association_type, strength, direction, context, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    agent_id, memory1_id, memory1_type, memory2_id, memory2_type,
                    association_type, strength, direction, context,
                    json.dumps(metadata or {})
                ))
                
                return cursor.lastrowid
    
    def find_associated_memories(
        self,
        agent_id: str,
        memory_id: int,
        memory_type: str,
        association_types: Optional[List[str]] = None,
        min_strength: float = 0.3,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Find memories associated with a given memory"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = """
                SELECT ma.*, 
                       CASE 
                           WHEN ma.memory1_id = ? AND ma.memory1_type = ? 
                           THEN ma.memory2_id 
                           ELSE ma.memory1_id 
                       END as related_memory_id,
                       CASE 
                           WHEN ma.memory1_id = ? AND ma.memory1_type = ? 
                           THEN ma.memory2_type 
                           ELSE ma.memory1_type 
                       END as related_memory_type
                FROM memory_associations ma
                WHERE ma.agent_id = ? AND ma.strength >= ?
                AND ((ma.memory1_id = ? AND ma.memory1_type = ?) 
                     OR (ma.memory2_id = ? AND ma.memory2_type = ?))
            """
            params = [
                memory_id, memory_type, memory_id, memory_type,
                agent_id, min_strength,
                memory_id, memory_type, memory_id, memory_type
            ]
            
            if association_types:
                placeholders = ','.join(['?' for _ in association_types])
                query += f" AND ma.association_type IN ({placeholders})"
                params.extend(association_types)
            
            query += " ORDER BY ma.strength DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    # ==================== MEMORY CONSOLIDATION ====================
    
    def start_memory_consolidation(
        self,
        agent_id: str,
        consolidation_type: str = "reflection"
    ) -> int:
        """Start memory consolidation process"""
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO memory_consolidation (
                    agent_id, consolidation_type, status
                ) VALUES (?, ?, 'running')
            """, (agent_id, consolidation_type))
            
            consolidation_id = cursor.lastrowid
            
            # Perform consolidation
            stats = self._perform_consolidation(agent_id, consolidation_type)
            
            # Update consolidation record
            cursor.execute("""
                UPDATE memory_consolidation SET
                    memories_processed = ?, memories_strengthened = ?,
                    memories_weakened = ?, new_associations = ?,
                    completed_at = CURRENT_TIMESTAMP, status = 'completed'
                WHERE id = ?
            """, (
                stats['processed'], stats['strengthened'],
                stats['weakened'], stats['new_associations'],
                consolidation_id
            ))
            
            logger.info(f"Completed memory consolidation {consolidation_id} for agent {agent_id}")
            return consolidation_id
    
    # ==================== MEMORY SEARCH AND RETRIEVAL ====================
    
    def search_memories(
        self,
        agent_id: str,
        query: str,
        memory_types: Optional[List[str]] = None,
        importance_threshold: float = 0.2,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Search across all memory types"""
        
        results = []
        
        if not memory_types or "episodic" in memory_types:
            episodic = self._search_episodic_memories(agent_id, query, importance_threshold, limit // 4)
            results.extend([{**mem, 'memory_type': 'episodic'} for mem in episodic])
        
        if not memory_types or "semantic" in memory_types:
            semantic = self._search_semantic_memories(agent_id, query, importance_threshold, limit // 4)
            results.extend([{**mem, 'memory_type': 'semantic'} for mem in semantic])
        
        if not memory_types or "procedural" in memory_types:
            procedural = self._search_procedural_memories(agent_id, query, limit // 4)
            results.extend([{**mem, 'memory_type': 'procedural'} for mem in procedural])
        
        if not memory_types or "emotional" in memory_types:
            emotional = self._search_emotional_memories(agent_id, query, limit // 4)
            results.extend([{**mem, 'memory_type': 'emotional'} for mem in emotional])
        
        # Sort by relevance (importance * recency)
        for result in results:
            recency_score = self._calculate_recency_score(result.get('created_at', ''))
            result['relevance_score'] = result.get('importance', 0.5) * recency_score
        
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        return results[:limit]
    
    # ==================== HELPER METHODS ====================
    
    def _generate_temporal_context(self) -> str:
        """Generate temporal context for episodic memories"""
        now = datetime.utcnow()
        return json.dumps({
            'timestamp': now.isoformat(),
            'day_of_week': now.strftime('%A'),
            'time_of_day': self._get_time_of_day(now.hour),
            'season': self._get_season(now.month)
        })
    
    def _get_time_of_day(self, hour: int) -> str:
        """Get time of day category"""
        if 5 <= hour < 12:
            return 'morning'
        elif 12 <= hour < 17:
            return 'afternoon'
        elif 17 <= hour < 21:
            return 'evening'
        else:
            return 'night'
    
    def _get_season(self, month: int) -> str:
        """Get season based on month"""
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'autumn'
    
    def _generate_physiological_response(
        self, emotion_type: str, valence: float, arousal: float, intensity: float
    ) -> Dict[str, Any]:
        """Generate simulated physiological response to emotion"""
        base_response = {
            'heart_rate_change': arousal * intensity * 20,  # BPM change
            'breathing_rate_change': arousal * intensity * 5,  # Breaths per minute change
            'muscle_tension': intensity * 0.8,
            'stress_hormones': max(0, -valence) * intensity,
            'energy_level': valence * intensity
        }
        
        # Emotion-specific adjustments
        emotion_modifiers = {
            'joy': {'energy_level': 0.8, 'muscle_tension': -0.2},
            'fear': {'heart_rate_change': 30, 'stress_hormones': 0.9},
            'anger': {'muscle_tension': 0.9, 'heart_rate_change': 25},
            'sadness': {'energy_level': -0.6, 'breathing_rate_change': -2},
            'surprise': {'heart_rate_change': 15, 'muscle_tension': 0.3},
            'disgust': {'muscle_tension': 0.4, 'stress_hormones': 0.3}
        }
        
        if emotion_type in emotion_modifiers:
            for key, modifier in emotion_modifiers[emotion_type].items():
                if key in base_response:
                    base_response[key] += modifier
        
        return base_response
    
    def _update_memory_access(self, memory_id: int, memory_type: str):
        """Update memory access tracking"""
        table_map = {
            'episodic': 'episodic_memory',
            'semantic': 'semantic_memory',
            'procedural': 'procedural_memory',
            'emotional': 'emotional_memory'
        }
        
        if memory_type not in table_map:
            return
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                UPDATE {table_map[memory_type]} SET
                    accessed_at = CURRENT_TIMESTAMP,
                    access_count = access_count + 1
                WHERE id = ?
            """, (memory_id,))
    
    def _create_temporal_associations(self, agent_id: str, memory_id: int, memory_type: str):
        """Create temporal associations with recent memories"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Find recent episodic memories
                cursor.execute("""
                    SELECT id FROM episodic_memory 
                    WHERE agent_id = ? AND id != ?
                    AND created_at > datetime('now', '-1 hour')
                    ORDER BY created_at DESC LIMIT 3
                """, (agent_id, memory_id))
                
                recent_memories = cursor.fetchall()
                
                for recent in recent_memories:
                    try:
                        self.create_memory_association(
                            agent_id, memory_id, memory_type,
                            recent['id'], 'episodic',
                            'temporal', strength=0.4
                        )
                    except sqlite3.OperationalError:
                        # Skip if database is locked
                        continue
        except sqlite3.OperationalError:
            # Skip if database is locked
            pass
    
    def _create_semantic_associations(self, agent_id: str, memory_id: int, relationships: Dict[str, List[str]]):
        """Create semantic associations based on relationships"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            for relation_type, related_concepts in relationships.items():
                for concept in related_concepts:
                    # Find related semantic memory
                    cursor.execute("""
                        SELECT id FROM semantic_memory 
                        WHERE agent_id = ? AND concept = ?
                    """, (agent_id, concept))
                    
                    related = cursor.fetchone()
                    if related:
                        self.create_memory_association(
                            agent_id, memory_id, 'semantic',
                            related['id'], 'semantic',
                            'semantic', strength=0.6
                        )
    
    def _create_emotional_associations(self, agent_id: str, memory_id: int, emotion_type: str):
        """Create emotional associations with similar emotional memories"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Find memories with similar emotions
            cursor.execute("""
                SELECT id FROM emotional_memory 
                WHERE agent_id = ? AND emotion_type = ? AND id != ?
                ORDER BY intensity DESC LIMIT 3
            """, (agent_id, emotion_type, memory_id))
            
            similar_emotions = cursor.fetchall()
            
            for similar in similar_emotions:
                self.create_memory_association(
                    agent_id, memory_id, 'emotional',
                    similar['id'], 'emotional',
                    'emotional', strength=0.5
                )
    
    def _check_working_memory_capacity(self, agent_id: str, session_id: str, new_weight: float) -> bool:
        """Check if working memory has capacity for new item"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT SUM(capacity_weight) as total_weight
                FROM working_memory 
                WHERE agent_id = ? AND session_id = ?
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            """, (agent_id, session_id))
            
            result = cursor.fetchone()
            current_weight = result['total_weight'] or 0
            
            return (current_weight + new_weight) <= self.config.WORKING_MEMORY_CAPACITY
    
    def _cleanup_working_memory(self, agent_id: str, session_id: str, needed_capacity: float):
        """Remove least important items from working memory to make space"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get items sorted by priority (lowest first)
            cursor.execute("""
                SELECT id, capacity_weight FROM working_memory 
                WHERE agent_id = ? AND session_id = ?
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                ORDER BY priority ASC, activation_level ASC
            """, (agent_id, session_id))
            
            items = cursor.fetchall()
            freed_capacity = 0
            
            for item in items:
                if freed_capacity >= needed_capacity:
                    break
                
                cursor.execute("DELETE FROM working_memory WHERE id = ?", (item['id'],))
                freed_capacity += item['capacity_weight']
                logger.info(f"Removed working memory item {item['id']} to free capacity")
    
    def _cleanup_expired_working_memory(self, agent_id: str, session_id: str):
        """Remove expired items from working memory"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                DELETE FROM working_memory 
                WHERE agent_id = ? AND session_id = ?
                AND expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
            """, (agent_id, session_id))
            
            if cursor.rowcount > 0:
                logger.info(f"Cleaned up {cursor.rowcount} expired working memory items")
    
    def _perform_consolidation(self, agent_id: str, consolidation_type: str) -> Dict[str, int]:
        """Perform memory consolidation process"""
        stats = {
            'processed': 0,
            'strengthened': 0,
            'weakened': 0,
            'new_associations': 0
        }
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Apply memory decay
            self._apply_memory_decay(cursor, agent_id)
            
            # Strengthen frequently accessed memories
            strengthened = self._strengthen_important_memories(cursor, agent_id)
            stats['strengthened'] = strengthened
            
            # Create new associations based on co-occurrence
            new_associations = self._create_consolidation_associations(cursor, agent_id)
            stats['new_associations'] = new_associations
            
            # Count processed memories
            cursor.execute("""
                SELECT COUNT(*) as total FROM (
                    SELECT id FROM episodic_memory WHERE agent_id = ?
                    UNION ALL
                    SELECT id FROM semantic_memory WHERE agent_id = ?
                    UNION ALL
                    SELECT id FROM procedural_memory WHERE agent_id = ?
                    UNION ALL
                    SELECT id FROM emotional_memory WHERE agent_id = ?
                )
            """, (agent_id, agent_id, agent_id, agent_id))
            
            stats['processed'] = cursor.fetchone()['total']
        
        return stats
    
    def _apply_memory_decay(self, cursor: sqlite3.Cursor, agent_id: str):
        """Apply decay to memory importance over time"""
        decay_rate = self.config.MEMORY_DECAY_RATE
        
        # Decay episodic memories
        cursor.execute("""
            UPDATE episodic_memory SET
                importance = importance * ?,
                decay_factor = decay_factor * ?
            WHERE agent_id = ? AND accessed_at < datetime('now', '-1 day')
        """, (decay_rate, decay_rate, agent_id))
        
        # Decay emotional memories (faster decay)
        emotional_decay = self.config.EMOTIONAL_DECAY_RATE
        cursor.execute("""
            UPDATE emotional_memory SET
                intensity = intensity * ?,
                decay_factor = decay_factor * ?
            WHERE agent_id = ? AND accessed_at < datetime('now', '-1 day')
        """, (emotional_decay, emotional_decay, agent_id))
    
    def _strengthen_important_memories(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Strengthen frequently accessed or important memories"""
        boost_factor = self.config.ACCESS_BOOST_FACTOR
        strengthened = 0
        
        # Strengthen episodic memories
        cursor.execute("""
            UPDATE episodic_memory SET
                importance = MIN(1.0, importance * ?)
            WHERE agent_id = ? AND (
                access_count > 3 OR 
                importance > ? OR
                emotional_intensity > ?
            )
        """, (boost_factor, agent_id, self.config.HIGH_IMPORTANCE_THRESHOLD, 
              self.config.EMOTIONAL_SIGNIFICANCE_THRESHOLD))
        
        strengthened += cursor.rowcount
        
        # Strengthen semantic memories
        cursor.execute("""
            UPDATE semantic_memory SET
                importance = MIN(1.0, importance * ?)
            WHERE agent_id = ? AND (
                access_count > 5 OR 
                confidence > 0.8
            )
        """, (boost_factor, agent_id))
        
        strengthened += cursor.rowcount
        
        return strengthened
    
    def _create_consolidation_associations(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Create new associations during consolidation"""
        new_associations = 0
        
        # Find co-occurring episodic memories (same session, close in time)
        cursor.execute("""
            SELECT e1.id as id1, e2.id as id2
            FROM episodic_memory e1
            JOIN episodic_memory e2 ON e1.session_id = e2.session_id
            WHERE e1.agent_id = ? AND e2.agent_id = ?
            AND e1.id < e2.id
            AND ABS(julianday(e1.created_at) - julianday(e2.created_at)) < 0.042  -- 1 hour
            AND NOT EXISTS (
                SELECT 1 FROM memory_associations ma
                WHERE ma.agent_id = ? 
                AND ma.memory1_id = e1.id AND ma.memory1_type = 'episodic'
                AND ma.memory2_id = e2.id AND ma.memory2_type = 'episodic'
            )
            LIMIT 10
        """, (agent_id, agent_id, agent_id))
        
        co_occurring = cursor.fetchall()
        
        for pair in co_occurring:
            self.create_memory_association(
                agent_id, pair['id1'], 'episodic',
                pair['id2'], 'episodic',
                'temporal', strength=0.3
            )
            new_associations += 1
        
        return new_associations
    
    def _search_episodic_memories(self, agent_id: str, query: str, importance_threshold: float, limit: int) -> List[Dict[str, Any]]:
        """Search episodic memories"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM episodic_memory 
                WHERE agent_id = ? AND importance >= ?
                AND (content LIKE ? OR summary LIKE ? OR event_type LIKE ?)
                ORDER BY importance DESC, created_at DESC
                LIMIT ?
            """, (agent_id, importance_threshold, f"%{query}%", f"%{query}%", f"%{query}%", limit))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def _search_semantic_memories(self, agent_id: str, query: str, importance_threshold: float, limit: int) -> List[Dict[str, Any]]:
        """Search semantic memories"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM semantic_memory 
                WHERE agent_id = ? AND importance >= ?
                AND (concept LIKE ? OR definition LIKE ? OR category LIKE ?)
                ORDER BY importance DESC, confidence DESC
                LIMIT ?
            """, (agent_id, importance_threshold, f"%{query}%", f"%{query}%", f"%{query}%", limit))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def _search_procedural_memories(self, agent_id: str, query: str, limit: int) -> List[Dict[str, Any]]:
        """Search procedural memories"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM procedural_memory 
                WHERE agent_id = ?
                AND (skill_name LIKE ? OR skill_type LIKE ? OR procedure_steps LIKE ?)
                ORDER BY proficiency_level DESC, usage_frequency DESC
                LIMIT ?
            """, (agent_id, f"%{query}%", f"%{query}%", f"%{query}%", limit))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def _search_emotional_memories(self, agent_id: str, query: str, limit: int) -> List[Dict[str, Any]]:
        """Search emotional memories"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM emotional_memory 
                WHERE agent_id = ?
                AND (trigger_stimulus LIKE ? OR emotion_type LIKE ? OR context LIKE ?)
                ORDER BY intensity DESC, created_at DESC
                LIMIT ?
            """, (agent_id, f"%{query}%", f"%{query}%", f"%{query}%", limit))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def _calculate_recency_score(self, created_at_str: str) -> float:
        """Calculate recency score for memory relevance"""
        try:
            created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
            age_hours = (datetime.utcnow() - created_at).total_seconds() / 3600
            # Exponential decay with half-life of 24 hours
            return np.exp(-age_hours / 24)
        except:
            return 0.5  # Default score if parsing fails
