
"""
Memory connector for integrating with the existing lexos-cybernetic-genesis memory system.
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
import sqlite3
import structlog

from ..config import config
from ..utils import AsyncFileHandler, content_hasher

logger = structlog.get_logger(__name__)

class MemoryConnector:
    """Interface with the existing lexos-cybernetic-genesis memory system."""
    
    def __init__(self):
        self.memory_path = Path(config.memory_path)
        self.local_db_path = Path(config.base_path) / "data" / "learning_memory.db"
        self.knowledge_index = {}
        self.connection = None
        
    async def initialize(self):
        """Initialize memory connector."""
        try:
            # Create local database for learning-specific data
            await self._setup_local_database()
            
            # Load existing memory index
            await self._load_memory_index()
            
            logger.info("Memory connector initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize memory connector: {e}")
            raise
    
    async def _setup_local_database(self):
        """Setup local SQLite database for learning data."""
        self.local_db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Create tables
        async with self._get_connection() as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content_hash TEXT UNIQUE,
                    source_type TEXT,
                    source_url TEXT,
                    title TEXT,
                    content TEXT,
                    summary TEXT,
                    keywords TEXT,
                    relevance_score REAL,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                )
            ''')
            
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS learning_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT,
                    skill_level REAL,
                    confidence REAL,
                    last_practiced TIMESTAMP,
                    practice_count INTEGER,
                    created_at TIMESTAMP
                )
            ''')
            
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_relationships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_hash TEXT,
                    target_hash TEXT,
                    relationship_type TEXT,
                    strength REAL,
                    created_at TIMESTAMP
                )
            ''')
            
            await conn.commit()
    
    async def _get_connection(self):
        """Get database connection."""
        if self.connection is None:
            self.connection = sqlite3.connect(
                self.local_db_path,
                check_same_thread=False
            )
            self.connection.row_factory = sqlite3.Row
        return self.connection
    
    async def _load_memory_index(self):
        """Load existing memory index from lexos-cybernetic-genesis."""
        try:
            # Check if memory system exists
            if not self.memory_path.exists():
                logger.warning(f"Memory path {self.memory_path} does not exist")
                return
            
            # Look for memory files
            memory_files = list(self.memory_path.glob("**/*.json"))
            
            for file_path in memory_files:
                try:
                    data = await AsyncFileHandler.read_json(file_path)
                    if data:
                        file_hash = content_hasher.hash_content(str(data))
                        self.knowledge_index[file_hash] = {
                            'path': str(file_path),
                            'data': data,
                            'last_accessed': datetime.now()
                        }
                except Exception as e:
                    logger.warning(f"Could not load memory file {file_path}: {e}")
            
            logger.info(f"Loaded {len(self.knowledge_index)} memory entries")
            
        except Exception as e:
            logger.error(f"Failed to load memory index: {e}")
    
    async def store_knowledge(
        self,
        content: str,
        source_type: str,
        source_url: str = "",
        title: str = "",
        summary: str = "",
        keywords: List[str] = None,
        relevance_score: float = 0.5
    ) -> str:
        """Store new knowledge in the memory system."""
        
        content_hash = content_hasher.hash_content(content)
        keywords_str = json.dumps(keywords or [])
        
        try:
            async with self._get_connection() as conn:
                await conn.execute('''
                    INSERT OR REPLACE INTO knowledge_entries
                    (content_hash, source_type, source_url, title, content, 
                     summary, keywords, relevance_score, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    content_hash, source_type, source_url, title, content,
                    summary, keywords_str, relevance_score,
                    datetime.now(), datetime.now()
                ))
                await conn.commit()
            
            # Also store in lexos-cybernetic-genesis format
            await self._store_in_legacy_memory(content_hash, {
                'content': content,
                'source_type': source_type,
                'source_url': source_url,
                'title': title,
                'summary': summary,
                'keywords': keywords or [],
                'relevance_score': relevance_score,
                'timestamp': datetime.now().isoformat()
            })
            
            logger.info(f"Stored knowledge: {title[:50]}...")
            return content_hash
            
        except Exception as e:
            logger.error(f"Failed to store knowledge: {e}")
            raise
    
    async def _store_in_legacy_memory(self, content_hash: str, data: Dict[str, Any]):
        """Store data in lexos-cybernetic-genesis compatible format."""
        try:
            # Create memory directory structure
            memory_dir = self.memory_path / "autonomous_learning"
            memory_dir.mkdir(parents=True, exist_ok=True)
            
            # Store as JSON file
            file_path = memory_dir / f"{content_hash}.json"
            await AsyncFileHandler.write_json(file_path, data)
            
            # Update index
            self.knowledge_index[content_hash] = {
                'path': str(file_path),
                'data': data,
                'last_accessed': datetime.now()
            }
            
        except Exception as e:
            logger.error(f"Failed to store in legacy memory: {e}")
    
    async def retrieve_knowledge(
        self,
        query: str = "",
        source_type: str = "",
        limit: int = 10,
        min_relevance: float = 0.0
    ) -> List[Dict[str, Any]]:
        """Retrieve knowledge from memory system."""
        
        try:
            async with self._get_connection() as conn:
                sql = '''
                    SELECT * FROM knowledge_entries
                    WHERE relevance_score >= ?
                '''
                params = [min_relevance]
                
                if query:
                    sql += ' AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)'
                    query_pattern = f'%{query}%'
                    params.extend([query_pattern, query_pattern, query_pattern])
                
                if source_type:
                    sql += ' AND source_type = ?'
                    params.append(source_type)
                
                sql += ' ORDER BY relevance_score DESC, created_at DESC LIMIT ?'
                params.append(limit)
                
                cursor = await conn.execute(sql, params)
                rows = await cursor.fetchall()
                
                results = []
                for row in rows:
                    result = dict(row)
                    result['keywords'] = json.loads(result['keywords'])
                    results.append(result)
                
                return results
                
        except Exception as e:
            logger.error(f"Failed to retrieve knowledge: {e}")
            return []
    
    async def update_learning_progress(
        self,
        topic: str,
        skill_level: float,
        confidence: float
    ):
        """Update learning progress for a topic."""
        
        try:
            async with self._get_connection() as conn:
                # Check if topic exists
                cursor = await conn.execute(
                    'SELECT * FROM learning_progress WHERE topic = ?',
                    (topic,)
                )
                existing = await cursor.fetchone()
                
                if existing:
                    # Update existing
                    await conn.execute('''
                        UPDATE learning_progress
                        SET skill_level = ?, confidence = ?, 
                            last_practiced = ?, practice_count = practice_count + 1
                        WHERE topic = ?
                    ''', (skill_level, confidence, datetime.now(), topic))
                else:
                    # Insert new
                    await conn.execute('''
                        INSERT INTO learning_progress
                        (topic, skill_level, confidence, last_practiced, 
                         practice_count, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        topic, skill_level, confidence, datetime.now(),
                        1, datetime.now()
                    ))
                
                await conn.commit()
                logger.info(f"Updated learning progress for: {topic}")
                
        except Exception as e:
            logger.error(f"Failed to update learning progress: {e}")
    
    async def get_learning_progress(self, topic: str = "") -> List[Dict[str, Any]]:
        """Get learning progress data."""
        
        try:
            async with self._get_connection() as conn:
                if topic:
                    cursor = await conn.execute(
                        'SELECT * FROM learning_progress WHERE topic = ?',
                        (topic,)
                    )
                else:
                    cursor = await conn.execute(
                        'SELECT * FROM learning_progress ORDER BY last_practiced DESC'
                    )
                
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Failed to get learning progress: {e}")
            return []
    
    async def create_knowledge_relationship(
        self,
        source_hash: str,
        target_hash: str,
        relationship_type: str,
        strength: float = 0.5
    ):
        """Create relationship between knowledge entries."""
        
        try:
            async with self._get_connection() as conn:
                await conn.execute('''
                    INSERT OR REPLACE INTO knowledge_relationships
                    (source_hash, target_hash, relationship_type, strength, created_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (source_hash, target_hash, relationship_type, strength, datetime.now()))
                
                await conn.commit()
                logger.info(f"Created relationship: {relationship_type}")
                
        except Exception as e:
            logger.error(f"Failed to create knowledge relationship: {e}")
    
    async def get_related_knowledge(
        self,
        content_hash: str,
        relationship_types: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Get knowledge related to a specific entry."""
        
        try:
            async with self._get_connection() as conn:
                sql = '''
                    SELECT ke.*, kr.relationship_type, kr.strength
                    FROM knowledge_relationships kr
                    JOIN knowledge_entries ke ON kr.target_hash = ke.content_hash
                    WHERE kr.source_hash = ?
                '''
                params = [content_hash]
                
                if relationship_types:
                    placeholders = ','.join(['?' for _ in relationship_types])
                    sql += f' AND kr.relationship_type IN ({placeholders})'
                    params.extend(relationship_types)
                
                sql += ' ORDER BY kr.strength DESC'
                
                cursor = await conn.execute(sql, params)
                rows = await cursor.fetchall()
                
                results = []
                for row in rows:
                    result = dict(row)
                    result['keywords'] = json.loads(result['keywords'])
                    results.append(result)
                
                return results
                
        except Exception as e:
            logger.error(f"Failed to get related knowledge: {e}")
            return []
    
    async def optimize(self):
        """Optimize memory storage and cleanup old data."""
        
        try:
            async with self._get_connection() as conn:
                # Remove low-relevance entries older than 30 days
                cutoff_date = datetime.now() - timedelta(days=30)
                
                cursor = await conn.execute('''
                    DELETE FROM knowledge_entries
                    WHERE relevance_score < 0.3 AND created_at < ?
                ''', (cutoff_date,))
                
                deleted_count = cursor.rowcount
                await conn.commit()
                
                # Vacuum database
                await conn.execute('VACUUM')
                
                logger.info(f"Memory optimization complete. Removed {deleted_count} low-relevance entries")
                
        except Exception as e:
            logger.error(f"Memory optimization failed: {e}")
    
    async def health_check(self) -> bool:
        """Check memory system health."""
        try:
            async with self._get_connection() as conn:
                cursor = await conn.execute('SELECT COUNT(*) FROM knowledge_entries')
                count = await cursor.fetchone()
                return count[0] >= 0  # Basic connectivity check
        except Exception:
            return False
    
    async def cleanup(self):
        """Cleanup resources."""
        if self.connection:
            self.connection.close()
            self.connection = None
