
"""
Memory Consolidation System for LexOS AI Consciousness
Handles automated memory consolidation, cleanup, and optimization
"""

import sqlite3
import json
import logging
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import schedule

from memory.api import MemoryAPI
from schemas.memory_models import MemoryConfig

logger = logging.getLogger(__name__)

@dataclass
class ConsolidationStats:
    """Statistics from a consolidation run"""
    agent_id: str
    consolidation_type: str
    memories_processed: int
    memories_strengthened: int
    memories_weakened: int
    memories_forgotten: int
    new_associations: int
    duration_seconds: float
    timestamp: datetime

class MemoryConsolidator:
    """Automated memory consolidation and maintenance system"""
    
    def __init__(self, memory_api: MemoryAPI):
        self.memory_api = memory_api
        self.config = MemoryConfig()
        self.is_running = False
        self.consolidation_thread = None
        self.stats_history: List[ConsolidationStats] = []
        
    def start_scheduler(self):
        """Start the automated consolidation scheduler"""
        if self.is_running:
            logger.warning("Consolidation scheduler already running")
            return
        
        self.is_running = True
        
        # Schedule different types of consolidation
        schedule.every(self.config.CONSOLIDATION_INTERVAL_HOURS).hours.do(
            self._run_reflection_consolidation
        )
        
        schedule.every().day.at("02:00").do(
            self._run_sleep_consolidation
        )
        
        schedule.every(self.config.CLEANUP_INTERVAL_DAYS).days.do(
            self._run_memory_cleanup
        )
        
        # Start scheduler thread
        self.consolidation_thread = threading.Thread(
            target=self._scheduler_loop,
            daemon=True
        )
        self.consolidation_thread.start()
        
        logger.info("Memory consolidation scheduler started")
    
    def stop_scheduler(self):
        """Stop the consolidation scheduler"""
        self.is_running = False
        schedule.clear()
        
        if self.consolidation_thread:
            self.consolidation_thread.join(timeout=5)
        
        logger.info("Memory consolidation scheduler stopped")
    
    def _scheduler_loop(self):
        """Main scheduler loop"""
        while self.is_running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Error in consolidation scheduler: {e}")
                time.sleep(300)  # Wait 5 minutes on error
    
    def _run_reflection_consolidation(self):
        """Run reflection-based consolidation for all active agents"""
        logger.info("Starting reflection consolidation")
        
        active_agents = self._get_active_agents()
        
        for agent_id in active_agents:
            try:
                self.consolidate_agent_memories(agent_id, "reflection")
            except Exception as e:
                logger.error(f"Error consolidating memories for agent {agent_id}: {e}")
    
    def _run_sleep_consolidation(self):
        """Run sleep-like consolidation (deeper processing)"""
        logger.info("Starting sleep consolidation")
        
        active_agents = self._get_active_agents()
        
        for agent_id in active_agents:
            try:
                self.consolidate_agent_memories(agent_id, "sleep")
                self._optimize_memory_structure(agent_id)
            except Exception as e:
                logger.error(f"Error in sleep consolidation for agent {agent_id}: {e}")
    
    def _run_memory_cleanup(self):
        """Run memory cleanup and archiving"""
        logger.info("Starting memory cleanup")
        
        all_agents = self._get_all_agents()
        
        for agent_id in all_agents:
            try:
                self.cleanup_agent_memories(agent_id)
            except Exception as e:
                logger.error(f"Error cleaning up memories for agent {agent_id}: {e}")
    
    def consolidate_agent_memories(
        self,
        agent_id: str,
        consolidation_type: str = "reflection"
    ) -> ConsolidationStats:
        """Consolidate memories for a specific agent"""
        
        start_time = time.time()
        logger.info(f"Starting {consolidation_type} consolidation for agent {agent_id}")
        
        stats = ConsolidationStats(
            agent_id=agent_id,
            consolidation_type=consolidation_type,
            memories_processed=0,
            memories_strengthened=0,
            memories_weakened=0,
            memories_forgotten=0,
            new_associations=0,
            duration_seconds=0,
            timestamp=datetime.utcnow()
        )
        
        try:
            with self.memory_api.get_connection() as conn:
                cursor = conn.cursor()
                
                # Start consolidation record
                cursor.execute("""
                    INSERT INTO memory_consolidation (
                        agent_id, consolidation_type, status
                    ) VALUES (?, ?, 'running')
                """, (agent_id, consolidation_type))
                
                consolidation_id = cursor.lastrowid
                
                # Perform consolidation based on type
                if consolidation_type == "reflection":
                    stats = self._perform_reflection_consolidation(agent_id, stats)
                elif consolidation_type == "sleep":
                    stats = self._perform_sleep_consolidation(agent_id, stats)
                elif consolidation_type == "rehearsal":
                    stats = self._perform_rehearsal_consolidation(agent_id, stats)
                
                # Update consolidation record
                stats.duration_seconds = time.time() - start_time
                
                cursor.execute("""
                    UPDATE memory_consolidation SET
                        memories_processed = ?, memories_strengthened = ?,
                        memories_weakened = ?, memories_forgotten = ?,
                        new_associations = ?, completed_at = CURRENT_TIMESTAMP,
                        status = 'completed'
                    WHERE id = ?
                """, (
                    stats.memories_processed, stats.memories_strengthened,
                    stats.memories_weakened, stats.memories_forgotten,
                    stats.new_associations, consolidation_id
                ))
                
                self.stats_history.append(stats)
                
                logger.info(
                    f"Completed {consolidation_type} consolidation for agent {agent_id} "
                    f"in {stats.duration_seconds:.2f}s: "
                    f"{stats.memories_processed} processed, "
                    f"{stats.memories_strengthened} strengthened, "
                    f"{stats.new_associations} new associations"
                )
                
        except Exception as e:
            logger.error(f"Error during consolidation for agent {agent_id}: {e}")
            # Mark consolidation as failed
            with self.memory_api.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE memory_consolidation SET
                        status = 'failed', completed_at = CURRENT_TIMESTAMP
                    WHERE agent_id = ? AND status = 'running'
                """, (agent_id,))
        
        return stats
    
    def _perform_reflection_consolidation(
        self,
        agent_id: str,
        stats: ConsolidationStats
    ) -> ConsolidationStats:
        """Perform reflection-based consolidation (lighter processing)"""
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Apply gentle memory decay
            stats.memories_weakened += self._apply_gentle_decay(cursor, agent_id)
            
            # 2. Strengthen recently accessed important memories
            stats.memories_strengthened += self._strengthen_recent_important(cursor, agent_id)
            
            # 3. Create associations between co-occurring memories
            stats.new_associations += self._create_reflection_associations(cursor, agent_id)
            
            # 4. Update procedural memory based on recent usage
            self._update_procedural_proficiency(cursor, agent_id)
            
            # 5. Count total memories processed
            stats.memories_processed = self._count_agent_memories(cursor, agent_id)
        
        return stats
    
    def _perform_sleep_consolidation(
        self,
        agent_id: str,
        stats: ConsolidationStats
    ) -> ConsolidationStats:
        """Perform sleep-like consolidation (deeper processing)"""
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Apply stronger memory decay
            stats.memories_weakened += self._apply_strong_decay(cursor, agent_id)
            
            # 2. Strengthen highly important memories
            stats.memories_strengthened += self._strengthen_important_memories(cursor, agent_id)
            
            # 3. Create complex associations across memory types
            stats.new_associations += self._create_cross_modal_associations(cursor, agent_id)
            
            # 4. Consolidate episodic memories into semantic knowledge
            semantic_created = self._consolidate_episodic_to_semantic(cursor, agent_id)
            stats.memories_strengthened += semantic_created
            
            # 5. Forget very low importance memories
            stats.memories_forgotten += self._forget_low_importance_memories(cursor, agent_id)
            
            # 6. Update emotional memory patterns
            self._update_emotional_patterns(cursor, agent_id)
            
            # 7. Count total memories processed
            stats.memories_processed = self._count_agent_memories(cursor, agent_id)
        
        return stats
    
    def _perform_rehearsal_consolidation(
        self,
        agent_id: str,
        stats: ConsolidationStats
    ) -> ConsolidationStats:
        """Perform rehearsal-based consolidation (targeted strengthening)"""
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Strengthen memories related to current goals/tasks
            stats.memories_strengthened += self._strengthen_goal_related_memories(cursor, agent_id)
            
            # 2. Rehearse important procedural memories
            self._rehearse_procedural_memories(cursor, agent_id)
            
            # 3. Strengthen emotional memories with high intensity
            stats.memories_strengthened += self._strengthen_emotional_memories(cursor, agent_id)
            
            # 4. Create associations between rehearsed memories
            stats.new_associations += self._create_rehearsal_associations(cursor, agent_id)
            
            # 5. Count total memories processed
            stats.memories_processed = self._count_agent_memories(cursor, agent_id)
        
        return stats
    
    def cleanup_agent_memories(self, agent_id: str) -> Dict[str, int]:
        """Clean up and archive old memories for an agent"""
        
        cleanup_stats = {
            'archived': 0,
            'deleted': 0,
            'associations_cleaned': 0
        }
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Archive very old, low-importance memories
            archive_threshold = datetime.utcnow() - timedelta(days=self.config.ARCHIVE_THRESHOLD_DAYS)
            
            # Archive episodic memories
            cursor.execute("""
                UPDATE episodic_memory SET
                    metadata = json_set(COALESCE(metadata, '{}'), '$.archived', 1)
                WHERE agent_id = ? AND importance < ? 
                AND created_at < ? AND json_extract(metadata, '$.archived') IS NULL
            """, (agent_id, self.config.LOW_IMPORTANCE_THRESHOLD, archive_threshold))
            
            cleanup_stats['archived'] += cursor.rowcount
            
            # 2. Delete forgotten memories (very low importance, very old)
            forgotten_threshold = datetime.utcnow() - timedelta(days=self.config.ARCHIVE_THRESHOLD_DAYS * 2)
            
            cursor.execute("""
                DELETE FROM episodic_memory 
                WHERE agent_id = ? AND importance < ? 
                AND created_at < ? AND access_count = 0
            """, (agent_id, self.config.FORGOTTEN_MEMORY_THRESHOLD, forgotten_threshold))
            
            cleanup_stats['deleted'] += cursor.rowcount
            
            # 3. Clean up weak associations
            cursor.execute("""
                DELETE FROM memory_associations 
                WHERE agent_id = ? AND strength < ?
                AND last_reinforced < datetime('now', '-30 days')
            """, (agent_id, self.config.WEAK_ASSOCIATION_THRESHOLD))
            
            cleanup_stats['associations_cleaned'] += cursor.rowcount
            
            # 4. Clean up expired working memory
            cursor.execute("""
                DELETE FROM working_memory 
                WHERE agent_id = ? AND expires_at < CURRENT_TIMESTAMP
            """, (agent_id,))
            
            # 5. Vacuum database if significant cleanup occurred
            if cleanup_stats['deleted'] > 100:
                cursor.execute("VACUUM")
        
        logger.info(f"Cleaned up memories for agent {agent_id}: {cleanup_stats}")
        return cleanup_stats
    
    def _optimize_memory_structure(self, agent_id: str):
        """Optimize memory structure and relationships"""
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Merge similar semantic memories
            self._merge_similar_semantic_memories(cursor, agent_id)
            
            # 2. Strengthen frequently co-occurring associations
            self._strengthen_frequent_associations(cursor, agent_id)
            
            # 3. Create hierarchical relationships in semantic memory
            self._create_hierarchical_relationships(cursor, agent_id)
            
            # 4. Update memory importance based on association strength
            self._update_importance_from_associations(cursor, agent_id)
    
    def _apply_gentle_decay(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Apply gentle decay to memories"""
        decay_rate = 0.98  # Very gentle decay
        
        cursor.execute("""
            UPDATE episodic_memory SET
                importance = importance * ?
            WHERE agent_id = ? AND accessed_at < datetime('now', '-2 days')
        """, (decay_rate, agent_id))
        
        return cursor.rowcount
    
    def _apply_strong_decay(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Apply stronger decay to memories"""
        decay_rate = self.config.MEMORY_DECAY_RATE
        
        cursor.execute("""
            UPDATE episodic_memory SET
                importance = importance * ?,
                decay_factor = decay_factor * ?
            WHERE agent_id = ? AND accessed_at < datetime('now', '-1 day')
        """, (decay_rate, decay_rate, agent_id))
        
        weakened = cursor.rowcount
        
        # Also decay emotional memories
        emotional_decay = self.config.EMOTIONAL_DECAY_RATE
        cursor.execute("""
            UPDATE emotional_memory SET
                intensity = intensity * ?,
                decay_factor = decay_factor * ?
            WHERE agent_id = ? AND accessed_at < datetime('now', '-1 day')
        """, (emotional_decay, emotional_decay, agent_id))
        
        weakened += cursor.rowcount
        return weakened
    
    def _strengthen_recent_important(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Strengthen recently accessed important memories"""
        boost_factor = 1.05
        
        cursor.execute("""
            UPDATE episodic_memory SET
                importance = MIN(1.0, importance * ?)
            WHERE agent_id = ? AND accessed_at > datetime('now', '-1 day')
            AND (importance > ? OR emotional_intensity > ?)
        """, (boost_factor, agent_id, 
              self.config.HIGH_IMPORTANCE_THRESHOLD,
              self.config.EMOTIONAL_SIGNIFICANCE_THRESHOLD))
        
        return cursor.rowcount
    
    def _strengthen_important_memories(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Strengthen highly important memories"""
        boost_factor = self.config.ACCESS_BOOST_FACTOR
        
        cursor.execute("""
            UPDATE episodic_memory SET
                importance = MIN(1.0, importance * ?),
                consolidation_level = consolidation_level + 1
            WHERE agent_id = ? AND (
                importance > ? OR 
                access_count > 5 OR
                emotional_intensity > ?
            )
        """, (boost_factor, agent_id,
              self.config.HIGH_IMPORTANCE_THRESHOLD,
              self.config.EMOTIONAL_SIGNIFICANCE_THRESHOLD))
        
        strengthened = cursor.rowcount
        
        # Also strengthen important semantic memories
        cursor.execute("""
            UPDATE semantic_memory SET
                importance = MIN(1.0, importance * ?)
            WHERE agent_id = ? AND (
                confidence > 0.8 OR access_count > 10
            )
        """, (boost_factor, agent_id))
        
        strengthened += cursor.rowcount
        return strengthened
    
    def _create_reflection_associations(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Create associations during reflection"""
        new_associations = 0
        
        # Find memories from the same session that aren't associated
        cursor.execute("""
            SELECT e1.id as id1, e2.id as id2, e1.session_id
            FROM episodic_memory e1
            JOIN episodic_memory e2 ON e1.session_id = e2.session_id
            WHERE e1.agent_id = ? AND e2.agent_id = ?
            AND e1.id < e2.id
            AND ABS(julianday(e1.created_at) - julianday(e2.created_at)) < 0.125  -- 3 hours
            AND NOT EXISTS (
                SELECT 1 FROM memory_associations ma
                WHERE ma.agent_id = ? 
                AND ma.memory1_id = e1.id AND ma.memory1_type = 'episodic'
                AND ma.memory2_id = e2.id AND ma.memory2_type = 'episodic'
            )
            LIMIT 5
        """, (agent_id, agent_id, agent_id))
        
        pairs = cursor.fetchall()
        
        for pair in pairs:
            self.memory_api.create_memory_association(
                agent_id, pair['id1'], 'episodic',
                pair['id2'], 'episodic',
                'temporal', strength=0.3
            )
            new_associations += 1
        
        return new_associations
    
    def _create_cross_modal_associations(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Create associations across different memory types"""
        new_associations = 0
        
        # Associate episodic memories with related semantic concepts
        cursor.execute("""
            SELECT e.id as episodic_id, s.id as semantic_id
            FROM episodic_memory e
            JOIN semantic_memory s ON s.agent_id = e.agent_id
            WHERE e.agent_id = ? 
            AND (e.content LIKE '%' || s.concept || '%' OR e.summary LIKE '%' || s.concept || '%')
            AND NOT EXISTS (
                SELECT 1 FROM memory_associations ma
                WHERE ma.agent_id = ? 
                AND ma.memory1_id = e.id AND ma.memory1_type = 'episodic'
                AND ma.memory2_id = s.id AND ma.memory2_type = 'semantic'
            )
            LIMIT 10
        """, (agent_id, agent_id))
        
        pairs = cursor.fetchall()
        
        for pair in pairs:
            self.memory_api.create_memory_association(
                agent_id, pair['episodic_id'], 'episodic',
                pair['semantic_id'], 'semantic',
                'semantic', strength=0.4
            )
            new_associations += 1
        
        return new_associations
    
    def _consolidate_episodic_to_semantic(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Consolidate repeated episodic patterns into semantic knowledge"""
        consolidated = 0
        
        # Find repeated patterns in episodic memories
        cursor.execute("""
            SELECT event_type, COUNT(*) as frequency,
                   GROUP_CONCAT(lessons_learned, '; ') as combined_lessons
            FROM episodic_memory 
            WHERE agent_id = ? AND lessons_learned IS NOT NULL
            AND lessons_learned != ''
            GROUP BY event_type
            HAVING COUNT(*) >= 3
        """, (agent_id,))
        
        patterns = cursor.fetchall()
        
        for pattern in patterns:
            # Create or update semantic memory for this pattern
            concept = f"Pattern: {pattern['event_type']}"
            definition = f"Learned pattern from {pattern['frequency']} experiences: {pattern['combined_lessons']}"
            
            # Check if this semantic memory already exists
            cursor.execute("""
                SELECT id FROM semantic_memory 
                WHERE agent_id = ? AND concept = ?
            """, (agent_id, concept))
            
            existing = cursor.fetchone()
            
            if existing:
                # Update existing
                cursor.execute("""
                    UPDATE semantic_memory SET
                        definition = ?, confidence = MIN(1.0, confidence + 0.1),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (definition, existing['id']))
            else:
                # Create new
                cursor.execute("""
                    INSERT INTO semantic_memory (
                        agent_id, concept, definition, category,
                        confidence, source, importance
                    ) VALUES (?, ?, ?, 'learned_pattern', 0.7, 'episodic_consolidation', 0.6)
                """, (agent_id, concept, definition))
                
                consolidated += 1
        
        return consolidated
    
    def _forget_low_importance_memories(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Forget memories with very low importance"""
        
        cursor.execute("""
            DELETE FROM episodic_memory 
            WHERE agent_id = ? AND importance < ?
            AND access_count = 0 
            AND created_at < datetime('now', '-30 days')
        """, (agent_id, self.config.FORGOTTEN_MEMORY_THRESHOLD))
        
        forgotten = cursor.rowcount
        
        # Also forget very weak emotional memories
        cursor.execute("""
            DELETE FROM emotional_memory 
            WHERE agent_id = ? AND intensity < 0.1
            AND access_count = 0
            AND created_at < datetime('now', '-14 days')
        """, (agent_id,))
        
        forgotten += cursor.rowcount
        return forgotten
    
    def _update_procedural_proficiency(self, cursor: sqlite3.Cursor, agent_id: str):
        """Update procedural memory proficiency based on recent usage"""
        
        # Decay unused skills
        cursor.execute("""
            UPDATE procedural_memory SET
                proficiency_level = MAX(0.0, proficiency_level - 0.01)
            WHERE agent_id = ? 
            AND (last_used IS NULL OR last_used < datetime('now', '-7 days'))
        """, (agent_id,))
    
    def _update_emotional_patterns(self, cursor: sqlite3.Cursor, agent_id: str):
        """Update emotional memory patterns and coping strategies"""
        
        # Find successful coping strategies
        cursor.execute("""
            SELECT emotion_type, coping_strategy, COUNT(*) as usage_count,
                   AVG(CASE WHEN resolution_outcome LIKE '%positive%' OR resolution_outcome LIKE '%success%' 
                       THEN 1 ELSE 0 END) as success_rate
            FROM emotional_memory 
            WHERE agent_id = ? AND coping_strategy IS NOT NULL
            AND resolution_outcome IS NOT NULL
            GROUP BY emotion_type, coping_strategy
            HAVING COUNT(*) >= 2
        """, (agent_id,))
        
        strategies = cursor.fetchall()
        
        for strategy in strategies:
            if strategy['success_rate'] > 0.6:  # Successful strategy
                # Store as procedural memory
                skill_name = f"Coping with {strategy['emotion_type']}"
                procedure_steps = [f"Apply strategy: {strategy['coping_strategy']}"]
                
                cursor.execute("""
                    INSERT OR REPLACE INTO procedural_memory (
                        agent_id, skill_name, skill_type, procedure_steps,
                        proficiency_level, success_rate
                    ) VALUES (?, ?, 'emotional_regulation', ?, ?, ?)
                """, (
                    agent_id, skill_name, json.dumps(procedure_steps),
                    min(1.0, strategy['usage_count'] * 0.1),
                    strategy['success_rate']
                ))
    
    def _strengthen_goal_related_memories(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Strengthen memories related to current goals"""
        # This would need integration with goal/task tracking system
        # For now, strengthen recent high-importance memories
        
        cursor.execute("""
            UPDATE episodic_memory SET
                importance = MIN(1.0, importance * 1.1)
            WHERE agent_id = ? AND importance > 0.7
            AND created_at > datetime('now', '-3 days')
        """, (agent_id,))
        
        return cursor.rowcount
    
    def _rehearse_procedural_memories(self, cursor: sqlite3.Cursor, agent_id: str):
        """Rehearse important procedural memories"""
        
        cursor.execute("""
            UPDATE procedural_memory SET
                proficiency_level = MIN(1.0, proficiency_level + 0.02),
                accessed_at = CURRENT_TIMESTAMP,
                access_count = access_count + 1
            WHERE agent_id = ? AND (
                usage_frequency > 5 OR 
                success_rate > 0.8 OR
                proficiency_level > 0.7
            )
        """, (agent_id,))
    
    def _strengthen_emotional_memories(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Strengthen high-intensity emotional memories"""
        
        cursor.execute("""
            UPDATE emotional_memory SET
                intensity = MIN(1.0, intensity * 1.05)
            WHERE agent_id = ? AND intensity > ?
        """, (agent_id, self.config.EMOTIONAL_SIGNIFICANCE_THRESHOLD))
        
        return cursor.rowcount
    
    def _create_rehearsal_associations(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Create associations between rehearsed memories"""
        # Similar to reflection associations but with higher strength
        new_associations = 0
        
        cursor.execute("""
            SELECT e1.id as id1, e2.id as id2
            FROM episodic_memory e1
            JOIN episodic_memory e2 ON e1.agent_id = e2.agent_id
            WHERE e1.agent_id = ? AND e1.id < e2.id
            AND e1.importance > 0.7 AND e2.importance > 0.7
            AND ABS(julianday(e1.created_at) - julianday(e2.created_at)) < 1  -- 1 day
            AND NOT EXISTS (
                SELECT 1 FROM memory_associations ma
                WHERE ma.agent_id = ? 
                AND ma.memory1_id = e1.id AND ma.memory1_type = 'episodic'
                AND ma.memory2_id = e2.id AND ma.memory2_type = 'episodic'
            )
            LIMIT 3
        """, (agent_id, agent_id))
        
        pairs = cursor.fetchall()
        
        for pair in pairs:
            self.memory_api.create_memory_association(
                agent_id, pair['id1'], 'episodic',
                pair['id2'], 'episodic',
                'rehearsal', strength=0.6
            )
            new_associations += 1
        
        return new_associations
    
    def _count_agent_memories(self, cursor: sqlite3.Cursor, agent_id: str) -> int:
        """Count total memories for an agent"""
        
        cursor.execute("""
            SELECT 
                (SELECT COUNT(*) FROM episodic_memory WHERE agent_id = ?) +
                (SELECT COUNT(*) FROM semantic_memory WHERE agent_id = ?) +
                (SELECT COUNT(*) FROM procedural_memory WHERE agent_id = ?) +
                (SELECT COUNT(*) FROM emotional_memory WHERE agent_id = ?) as total
        """, (agent_id, agent_id, agent_id, agent_id))
        
        return cursor.fetchone()['total']
    
    def _get_active_agents(self) -> List[str]:
        """Get list of recently active agents"""
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT DISTINCT agent_id FROM agents 
                WHERE last_active > datetime('now', '-24 hours')
                AND status = 'active'
            """)
            
            return [row['agent_id'] for row in cursor.fetchall()]
    
    def _get_all_agents(self) -> List[str]:
        """Get list of all agents"""
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT DISTINCT agent_id FROM agents")
            return [row['agent_id'] for row in cursor.fetchall()]
    
    def _merge_similar_semantic_memories(self, cursor: sqlite3.Cursor, agent_id: str):
        """Merge very similar semantic memories"""
        # Find concepts with high similarity (simple string matching for now)
        cursor.execute("""
            SELECT s1.id as id1, s2.id as id2, s1.concept as concept1, s2.concept as concept2
            FROM semantic_memory s1
            JOIN semantic_memory s2 ON s1.agent_id = s2.agent_id
            WHERE s1.agent_id = ? AND s1.id < s2.id
            AND (
                s1.concept LIKE s2.concept || '%' OR 
                s2.concept LIKE s1.concept || '%' OR
                s1.category = s2.category AND s1.subcategory = s2.subcategory
            )
            LIMIT 5
        """, (agent_id,))
        
        similar_pairs = cursor.fetchall()
        
        for pair in similar_pairs:
            # Merge the less important one into the more important one
            cursor.execute("""
                SELECT id, importance, confidence FROM semantic_memory 
                WHERE id IN (?, ?) ORDER BY importance DESC, confidence DESC LIMIT 1
            """, (pair['id1'], pair['id2']))
            
            primary = cursor.fetchone()
            secondary_id = pair['id2'] if primary['id'] == pair['id1'] else pair['id1']
            
            # Update associations to point to primary memory
            cursor.execute("""
                UPDATE memory_associations SET
                    memory1_id = ?, memory1_type = 'semantic'
                WHERE memory1_id = ? AND memory1_type = 'semantic' AND agent_id = ?
            """, (primary['id'], secondary_id, agent_id))
            
            cursor.execute("""
                UPDATE memory_associations SET
                    memory2_id = ?, memory2_type = 'semantic'
                WHERE memory2_id = ? AND memory2_type = 'semantic' AND agent_id = ?
            """, (primary['id'], secondary_id, agent_id))
            
            # Delete secondary memory
            cursor.execute("DELETE FROM semantic_memory WHERE id = ?", (secondary_id,))
    
    def _strengthen_frequent_associations(self, cursor: sqlite3.Cursor, agent_id: str):
        """Strengthen frequently reinforced associations"""
        cursor.execute("""
            UPDATE memory_associations SET
                strength = MIN(1.0, strength + 0.1)
            WHERE agent_id = ? AND reinforcement_count > 3
        """, (agent_id,))
    
    def _create_hierarchical_relationships(self, cursor: sqlite3.Cursor, agent_id: str):
        """Create hierarchical relationships in semantic memory"""
        # Find category-subcategory relationships
        cursor.execute("""
            SELECT s1.id as parent_id, s2.id as child_id
            FROM semantic_memory s1
            JOIN semantic_memory s2 ON s1.agent_id = s2.agent_id
            WHERE s1.agent_id = ? 
            AND s1.category = s2.concept
            AND NOT EXISTS (
                SELECT 1 FROM memory_associations ma
                WHERE ma.agent_id = ? 
                AND ma.memory1_id = s1.id AND ma.memory1_type = 'semantic'
                AND ma.memory2_id = s2.id AND ma.memory2_type = 'semantic'
                AND ma.association_type = 'hierarchical'
            )
            LIMIT 5
        """, (agent_id, agent_id))
        
        hierarchical_pairs = cursor.fetchall()
        
        for pair in hierarchical_pairs:
            self.memory_api.create_memory_association(
                agent_id, pair['parent_id'], 'semantic',
                pair['child_id'], 'semantic',
                'hierarchical', strength=0.7
            )
    
    def _update_importance_from_associations(self, cursor: sqlite3.Cursor, agent_id: str):
        """Update memory importance based on association strength"""
        cursor.execute("""
            UPDATE episodic_memory SET
                importance = MIN(1.0, importance + 0.05)
            WHERE agent_id = ? AND id IN (
                SELECT DISTINCT memory1_id FROM memory_associations 
                WHERE agent_id = ? AND memory1_type = 'episodic' 
                AND strength > ?
                UNION
                SELECT DISTINCT memory2_id FROM memory_associations 
                WHERE agent_id = ? AND memory2_type = 'episodic' 
                AND strength > ?
            )
        """, (agent_id, agent_id, self.config.STRONG_ASSOCIATION_THRESHOLD,
              agent_id, self.config.STRONG_ASSOCIATION_THRESHOLD))
    
    def get_consolidation_history(self, agent_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Get consolidation history"""
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            query = "SELECT * FROM memory_consolidation"
            params = []
            
            if agent_id:
                query += " WHERE agent_id = ?"
                params.append(agent_id)
            
            query += " ORDER BY started_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_memory_statistics(self, agent_id: str) -> Dict[str, Any]:
        """Get comprehensive memory statistics for an agent"""
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            stats = {}
            
            # Memory counts by type
            cursor.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM episodic_memory WHERE agent_id = ?) as episodic_count,
                    (SELECT COUNT(*) FROM semantic_memory WHERE agent_id = ?) as semantic_count,
                    (SELECT COUNT(*) FROM procedural_memory WHERE agent_id = ?) as procedural_count,
                    (SELECT COUNT(*) FROM emotional_memory WHERE agent_id = ?) as emotional_count,
                    (SELECT COUNT(*) FROM working_memory WHERE agent_id = ?) as working_count
            """, (agent_id, agent_id, agent_id, agent_id, agent_id))
            
            counts = cursor.fetchone()
            stats['memory_counts'] = dict(counts)
            
            # Association statistics
            cursor.execute("""
                SELECT COUNT(*) as total_associations,
                       AVG(strength) as avg_strength,
                       MAX(strength) as max_strength
                FROM memory_associations WHERE agent_id = ?
            """, (agent_id,))
            
            assoc_stats = cursor.fetchone()
            stats['association_stats'] = dict(assoc_stats)
            
            # Importance distribution
            cursor.execute("""
                SELECT 
                    AVG(importance) as avg_importance,
                    MAX(importance) as max_importance,
                    COUNT(CASE WHEN importance > 0.8 THEN 1 END) as high_importance_count
                FROM episodic_memory WHERE agent_id = ?
            """, (agent_id,))
            
            importance_stats = cursor.fetchone()
            stats['importance_stats'] = dict(importance_stats)
            
            # Recent consolidation info
            cursor.execute("""
                SELECT consolidation_type, completed_at, memories_processed
                FROM memory_consolidation 
                WHERE agent_id = ? AND status = 'completed'
                ORDER BY completed_at DESC LIMIT 1
            """, (agent_id,))
            
            last_consolidation = cursor.fetchone()
            stats['last_consolidation'] = dict(last_consolidation) if last_consolidation else None
            
            return stats
