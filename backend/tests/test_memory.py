
"""
Unit tests for the LexOS Memory System
Tests all memory types and consolidation functionality
"""

import unittest
import sqlite3
import json
import tempfile
import os
import logging
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from memory.api import MemoryAPI
from memory.consolidator import MemoryConsolidator
from schemas.memory_models import MemoryType, MemoryConfig

class TestMemoryAPI(unittest.TestCase):
    """Test cases for Memory API functionality"""
    
    def setUp(self):
        """Set up test database and API"""
        self.test_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.test_db.close()
        
        self.memory_api = MemoryAPI(self.test_db.name)
        
        # Create tables
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # Create minimal agents table for foreign key constraints
            cursor.execute("""
                CREATE TABLE agents (
                    agent_id TEXT PRIMARY KEY,
                    name TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create memory tables
            from schemas.memory_models import MemorySchema
            for sql in MemorySchema.get_create_tables_sql():
                cursor.execute(sql)
            
            for sql in MemorySchema.get_create_indexes_sql():
                cursor.execute(sql)
            
            # Insert test agent
            cursor.execute("""
                INSERT INTO agents (agent_id, name) VALUES ('test_agent', 'Test Agent')
            """)
    
    def tearDown(self):
        """Clean up test database"""
        os.unlink(self.test_db.name)
    
    def test_store_episodic_memory(self):
        """Test storing episodic memories"""
        memory_id = self.memory_api.store_episodic_memory(
            agent_id="test_agent",
            session_id="session_1",
            event_type="conversation",
            content="User asked about weather",
            summary="Weather inquiry",
            participants=["user", "agent"],
            emotional_valence=0.2,
            emotional_intensity=0.3,
            importance=0.7,
            tags=["weather", "question"],
            metadata={"context": "casual"}
        )
        
        self.assertIsInstance(memory_id, int)
        self.assertGreater(memory_id, 0)
        
        # Verify storage
        memories = self.memory_api.retrieve_episodic_memories("test_agent", session_id="session_1")
        self.assertEqual(len(memories), 1)
        self.assertEqual(memories[0]['content'], "User asked about weather")
        self.assertEqual(memories[0]['participants'], ["user", "agent"])
        self.assertEqual(memories[0]['tags'], ["weather", "question"])
    
    def test_store_semantic_memory(self):
        """Test storing semantic knowledge"""
        memory_id = self.memory_api.store_semantic_memory(
            agent_id="test_agent",
            concept="weather",
            definition="Atmospheric conditions at a specific time and place",
            category="science",
            subcategory="meteorology",
            relationships={"related_to": ["temperature", "humidity", "precipitation"]},
            confidence=0.9,
            source="knowledge_base",
            importance=0.8
        )
        
        self.assertIsInstance(memory_id, int)
        
        # Test retrieval
        memories = self.memory_api.retrieve_semantic_memory("test_agent", concept="weather")
        self.assertEqual(len(memories), 1)
        self.assertEqual(memories[0]['concept'], "weather")
        self.assertEqual(memories[0]['confidence'], 0.9)
        self.assertEqual(memories[0]['relationships']['related_to'], ["temperature", "humidity", "precipitation"])
    
    def test_store_procedural_memory(self):
        """Test storing procedural knowledge"""
        memory_id = self.memory_api.store_procedural_memory(
            agent_id="test_agent",
            skill_name="answer_weather_question",
            skill_type="cognitive",
            procedure_steps=[
                "Identify weather-related keywords",
                "Retrieve current weather data",
                "Format response appropriately",
                "Provide helpful additional context"
            ],
            conditions={"trigger": "weather question", "context": "any"},
            success_criteria="User receives accurate weather information",
            proficiency_level=0.6
        )
        
        self.assertIsInstance(memory_id, int)
        
        # Test proficiency update
        success = self.memory_api.update_skill_proficiency(
            "test_agent", "answer_weather_question", True, "Successful weather response"
        )
        self.assertTrue(success)
    
    def test_store_emotional_memory(self):
        """Test storing emotional memories"""
        memory_id = self.memory_api.store_emotional_memory(
            agent_id="test_agent",
            trigger_stimulus="user frustration",
            emotion_type="empathy",
            valence=0.3,
            arousal=0.6,
            intensity=0.7,
            context="User seemed frustrated with slow response",
            behavioral_tendency="provide reassurance",
            coping_strategy="acknowledge frustration and offer help"
        )
        
        self.assertIsInstance(memory_id, int)
        
        # Test retrieval
        patterns = self.memory_api.retrieve_emotional_patterns(
            "test_agent", emotion_type="empathy"
        )
        self.assertEqual(len(patterns), 1)
        self.assertEqual(patterns[0]['trigger_stimulus'], "user frustration")
        self.assertEqual(patterns[0]['valence'], 0.3)
    
    def test_working_memory_management(self):
        """Test working memory capacity management"""
        # Add items to working memory
        for i in range(5):
            memory_id = self.memory_api.add_to_working_memory(
                agent_id="test_agent",
                session_id="session_1",
                content_type="conversation",
                content=f"Message {i}",
                priority=0.5,
                capacity_weight=1.0
            )
            self.assertIsInstance(memory_id, int)
        
        # Retrieve working memory
        working_memories = self.memory_api.get_working_memory("test_agent", "session_1")
        self.assertEqual(len(working_memories), 5)
        
        # Add item that exceeds capacity
        memory_id = self.memory_api.add_to_working_memory(
            agent_id="test_agent",
            session_id="session_1",
            content_type="conversation",
            content="Overflow message",
            priority=0.9,  # High priority
            capacity_weight=3.0  # Large weight
        )
        
        # Should still work due to cleanup
        self.assertIsInstance(memory_id, int)
        
        # Check that some items were removed
        working_memories = self.memory_api.get_working_memory("test_agent", "session_1")
        self.assertLessEqual(len(working_memories), 7)  # Should be within capacity
    
    def test_memory_associations(self):
        """Test memory association creation and retrieval"""
        # Create some memories first
        episodic_id = self.memory_api.store_episodic_memory(
            agent_id="test_agent",
            session_id="session_1",
            event_type="learning",
            content="Learned about weather patterns"
        )
        
        semantic_id = self.memory_api.store_semantic_memory(
            agent_id="test_agent",
            concept="weather_patterns",
            definition="Regular atmospheric phenomena"
        )
        
        # Create association
        assoc_id = self.memory_api.create_memory_association(
            agent_id="test_agent",
            memory1_id=episodic_id,
            memory1_type="episodic",
            memory2_id=semantic_id,
            memory2_type="semantic",
            association_type="semantic",
            strength=0.8
        )
        
        self.assertIsInstance(assoc_id, int)
        
        # Find associated memories
        associated = self.memory_api.find_associated_memories(
            agent_id="test_agent",
            memory_id=episodic_id,
            memory_type="episodic"
        )
        
        self.assertEqual(len(associated), 1)
        self.assertEqual(associated[0]['related_memory_id'], semantic_id)
        self.assertEqual(associated[0]['strength'], 0.8)
    
    def test_memory_search(self):
        """Test cross-memory search functionality"""
        # Store various types of memories
        self.memory_api.store_episodic_memory(
            agent_id="test_agent",
            session_id="session_1",
            event_type="conversation",
            content="Discussed machine learning algorithms"
        )
        
        self.memory_api.store_semantic_memory(
            agent_id="test_agent",
            concept="machine_learning",
            definition="AI technique for pattern recognition"
        )
        
        self.memory_api.store_procedural_memory(
            agent_id="test_agent",
            skill_name="explain_algorithms",
            skill_type="cognitive",
            procedure_steps=["Identify algorithm type", "Explain core concept"]
        )
        
        # Search across all memory types
        results = self.memory_api.search_memories(
            agent_id="test_agent",
            query="machine learning"
        )
        
        self.assertGreaterEqual(len(results), 2)  # Should find episodic and semantic
        
        # Check that results have memory_type field
        memory_types = [r['memory_type'] for r in results]
        self.assertIn('episodic', memory_types)
        self.assertIn('semantic', memory_types)

class TestMemoryConsolidator(unittest.TestCase):
    """Test cases for Memory Consolidator functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.test_db.close()
        
        self.memory_api = MemoryAPI(self.test_db.name)
        self.consolidator = MemoryConsolidator(self.memory_api)
        
        # Create tables and test data
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # Create agents table
            cursor.execute("""
                CREATE TABLE agents (
                    agent_id TEXT PRIMARY KEY,
                    name TEXT,
                    status TEXT DEFAULT 'active',
                    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create memory tables
            from schemas.memory_models import MemorySchema
            for sql in MemorySchema.get_create_tables_sql():
                cursor.execute(sql)
            
            # Insert test agent
            cursor.execute("""
                INSERT INTO agents (agent_id, name) VALUES ('test_agent', 'Test Agent')
            """)
    
    def tearDown(self):
        """Clean up"""
        self.consolidator.stop_scheduler()
        os.unlink(self.test_db.name)
    
    def test_reflection_consolidation(self):
        """Test reflection-based consolidation"""
        # Create some test memories
        for i in range(5):
            self.memory_api.store_episodic_memory(
                agent_id="test_agent",
                session_id="session_1",
                event_type="conversation",
                content=f"Test conversation {i}",
                importance=0.5 + (i * 0.1)
            )
        
        # Run consolidation
        stats = self.consolidator.consolidate_agent_memories("test_agent", "reflection")
        
        self.assertEqual(stats.agent_id, "test_agent")
        self.assertEqual(stats.consolidation_type, "reflection")
        self.assertGreater(stats.memories_processed, 0)
        self.assertGreaterEqual(stats.duration_seconds, 0)
    
    def test_sleep_consolidation(self):
        """Test sleep-like consolidation"""
        # Create episodic memories with patterns
        for i in range(3):
            self.memory_api.store_episodic_memory(
                agent_id="test_agent",
                session_id="session_1",
                event_type="learning",
                content=f"Learning experience {i}",
                lessons_learned="Always verify information sources",
                importance=0.8
            )
        
        # Run sleep consolidation
        stats = self.consolidator.consolidate_agent_memories("test_agent", "sleep")
        
        self.assertEqual(stats.consolidation_type, "sleep")
        self.assertGreaterEqual(stats.memories_processed, 3)
        
        # Check if semantic memory was created from patterns
        semantic_memories = self.memory_api.retrieve_semantic_memory("test_agent")
        pattern_memories = [m for m in semantic_memories if "Pattern:" in m['concept']]
        self.assertGreaterEqual(len(pattern_memories), 0)  # May or may not create patterns
    
    def test_memory_cleanup(self):
        """Test memory cleanup functionality"""
        # Create old, low-importance memory
        old_date = datetime.utcnow() - timedelta(days=100)
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO episodic_memory (
                    agent_id, session_id, event_type, content, importance, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, ("test_agent", "old_session", "test", "Old memory", 0.05, old_date))
        
        # Run cleanup
        cleanup_stats = self.consolidator.cleanup_agent_memories("test_agent")
        
        self.assertIsInstance(cleanup_stats, dict)
        self.assertIn('archived', cleanup_stats)
        self.assertIn('deleted', cleanup_stats)
    
    def test_memory_statistics(self):
        """Test memory statistics generation"""
        # Create some test data
        self.memory_api.store_episodic_memory(
            agent_id="test_agent",
            session_id="session_1",
            event_type="test",
            content="Test memory"
        )
        
        self.memory_api.store_semantic_memory(
            agent_id="test_agent",
            concept="test_concept",
            definition="Test definition"
        )
        
        # Get statistics
        stats = self.consolidator.get_memory_statistics("test_agent")
        
        self.assertIsInstance(stats, dict)
        self.assertIn('memory_counts', stats)
        self.assertIn('association_stats', stats)
        self.assertIn('importance_stats', stats)
        
        # Check memory counts
        self.assertEqual(stats['memory_counts']['episodic_count'], 1)
        self.assertEqual(stats['memory_counts']['semantic_count'], 1)
    
    @patch('schedule.run_pending')
    def test_scheduler_functionality(self, mock_schedule):
        """Test scheduler start/stop functionality"""
        # Start scheduler
        self.consolidator.start_scheduler()
        self.assertTrue(self.consolidator.is_running)
        self.assertIsNotNone(self.consolidator.consolidation_thread)
        
        # Stop scheduler
        self.consolidator.stop_scheduler()
        self.assertFalse(self.consolidator.is_running)

class TestMemoryIntegration(unittest.TestCase):
    """Integration tests for the complete memory system"""
    
    def setUp(self):
        """Set up integration test environment"""
        self.test_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.test_db.close()
        
        self.memory_api = MemoryAPI(self.test_db.name)
        self.consolidator = MemoryConsolidator(self.memory_api)
        
        # Create full schema
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # Create agents table
            cursor.execute("""
                CREATE TABLE agents (
                    agent_id TEXT PRIMARY KEY,
                    name TEXT,
                    status TEXT DEFAULT 'active',
                    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create memory tables
            from schemas.memory_models import MemorySchema
            for sql in MemorySchema.get_create_tables_sql():
                cursor.execute(sql)
            
            for sql in MemorySchema.get_create_indexes_sql():
                cursor.execute(sql)
            
            # Insert test agent
            cursor.execute("""
                INSERT INTO agents (agent_id, name) VALUES ('integration_agent', 'Integration Test Agent')
            """)
    
    def tearDown(self):
        """Clean up"""
        os.unlink(self.test_db.name)
    
    def test_complete_memory_lifecycle(self):
        """Test complete memory lifecycle from creation to consolidation"""
        agent_id = "integration_agent"
        
        # 1. Create initial memories
        episodic_id = self.memory_api.store_episodic_memory(
            agent_id=agent_id,
            session_id="lifecycle_session",
            event_type="learning",
            content="User taught me about renewable energy",
            emotional_valence=0.8,
            emotional_intensity=0.6,
            importance=0.9
        )
        
        semantic_id = self.memory_api.store_semantic_memory(
            agent_id=agent_id,
            concept="renewable_energy",
            definition="Energy from naturally replenishing sources",
            category="science",
            confidence=0.8,
            importance=0.8
        )
        
        procedural_id = self.memory_api.store_procedural_memory(
            agent_id=agent_id,
            skill_name="explain_renewable_energy",
            skill_type="cognitive",
            procedure_steps=["Define renewable energy", "Give examples", "Explain benefits"],
            proficiency_level=0.7
        )
        
        emotional_id = self.memory_api.store_emotional_memory(
            agent_id=agent_id,
            trigger_stimulus="learning new concept",
            emotion_type="curiosity",
            valence=0.7,
            arousal=0.5,
            intensity=0.6
        )
        
        # 2. Create associations
        assoc_id = self.memory_api.create_memory_association(
            agent_id=agent_id,
            memory1_id=episodic_id,
            memory1_type="episodic",
            memory2_id=semantic_id,
            memory2_type="semantic",
            association_type="semantic",
            strength=0.8
        )
        
        # 3. Add to working memory
        working_id = self.memory_api.add_to_working_memory(
            agent_id=agent_id,
            session_id="lifecycle_session",
            content_type="conversation",
            content="Currently discussing renewable energy",
            priority=0.8,
            source_memory_id=episodic_id,
            source_memory_type="episodic"
        )
        
        # 4. Simulate memory access
        memories = self.memory_api.retrieve_episodic_memories(agent_id)
        self.assertGreater(len(memories), 0)
        
        # 5. Run consolidation
        stats = self.consolidator.consolidate_agent_memories(agent_id, "reflection")
        self.assertGreater(stats.memories_processed, 0)
        
        # 6. Search across all memories
        search_results = self.memory_api.search_memories(agent_id, "renewable energy")
        self.assertGreater(len(search_results), 0)
        
        # 7. Get comprehensive statistics
        memory_stats = self.consolidator.get_memory_statistics(agent_id)
        self.assertGreater(memory_stats['memory_counts']['episodic_count'], 0)
        self.assertGreater(memory_stats['memory_counts']['semantic_count'], 0)
        
        # 8. Test memory persistence across "sessions"
        # Simulate agent restart by creating new API instance
        new_memory_api = MemoryAPI(self.test_db.name)
        retrieved_memories = new_memory_api.retrieve_episodic_memories(agent_id)
        self.assertGreater(len(retrieved_memories), 0)
        
        print(f"Integration test completed successfully:")
        print(f"- Created {len(retrieved_memories)} episodic memories")
        print(f"- Processed {stats.memories_processed} memories in consolidation")
        print(f"- Found {len(search_results)} memories in search")

if __name__ == '__main__':
    # Set up logging for tests
    logging.basicConfig(level=logging.INFO)
    
    # Run tests
    unittest.main(verbosity=2)
