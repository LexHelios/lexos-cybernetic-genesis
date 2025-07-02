
"""
Memory Backup and Export System for LexOS
Handles memory persistence, backup, and recovery operations
"""

import sqlite3
import json
import gzip
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from memory.api import MemoryAPI

logger = logging.getLogger(__name__)

class MemoryBackupManager:
    """Manages memory backup, export, and recovery operations"""
    
    def __init__(self, memory_api: MemoryAPI, backup_dir: str = "backend/backups"):
        self.memory_api = memory_api
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
    
    def create_full_backup(self, agent_id: Optional[str] = None) -> str:
        """Create a complete backup of memory data"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        if agent_id:
            backup_filename = f"memory_backup_{agent_id}_{timestamp}.sql.gz"
        else:
            backup_filename = f"memory_backup_full_{timestamp}.sql.gz"
        
        backup_path = self.backup_dir / backup_filename
        
        try:
            with self.memory_api.get_connection() as conn:
                # Generate SQL dump
                sql_dump = self._generate_sql_dump(conn, agent_id)
                
                # Compress and save
                with gzip.open(backup_path, 'wt', encoding='utf-8') as f:
                    f.write(sql_dump)
            
            logger.info(f"Created memory backup: {backup_path}")
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            raise
    
    def export_agent_memories(self, agent_id: str, format: str = "json") -> str:
        """Export agent memories in specified format"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        if format == "json":
            export_filename = f"agent_memories_{agent_id}_{timestamp}.json"
            export_path = self.backup_dir / export_filename
            
            memories_data = self._export_to_json(agent_id)
            
            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(memories_data, f, indent=2, default=str)
                
        elif format == "sql":
            export_filename = f"agent_memories_{agent_id}_{timestamp}.sql"
            export_path = self.backup_dir / export_filename
            
            with self.memory_api.get_connection() as conn:
                sql_dump = self._generate_sql_dump(conn, agent_id)
                
            with open(export_path, 'w', encoding='utf-8') as f:
                f.write(sql_dump)
        
        else:
            raise ValueError(f"Unsupported export format: {format}")
        
        logger.info(f"Exported agent {agent_id} memories to: {export_path}")
        return str(export_path)
    
    def import_agent_memories(self, agent_id: str, import_path: str, format: str = "json") -> Dict[str, int]:
        """Import agent memories from file"""
        import_stats = {
            'episodic': 0,
            'semantic': 0,
            'procedural': 0,
            'emotional': 0,
            'associations': 0
        }
        
        try:
            if format == "json":
                with open(import_path, 'r', encoding='utf-8') as f:
                    memories_data = json.load(f)
                
                import_stats = self._import_from_json(agent_id, memories_data)
                
            elif format == "sql":
                with open(import_path, 'r', encoding='utf-8') as f:
                    sql_content = f.read()
                
                with self.memory_api.get_connection() as conn:
                    conn.executescript(sql_content)
                    import_stats = self._count_imported_memories(conn, agent_id)
            
            else:
                raise ValueError(f"Unsupported import format: {format}")
            
            logger.info(f"Imported memories for agent {agent_id}: {import_stats}")
            return import_stats
            
        except Exception as e:
            logger.error(f"Failed to import memories: {e}")
            raise
    
    def restore_from_backup(self, backup_path: str, agent_id: Optional[str] = None) -> bool:
        """Restore memories from backup file"""
        try:
            if backup_path.endswith('.gz'):
                with gzip.open(backup_path, 'rt', encoding='utf-8') as f:
                    sql_content = f.read()
            else:
                with open(backup_path, 'r', encoding='utf-8') as f:
                    sql_content = f.read()
            
            with self.memory_api.get_connection() as conn:
                # If restoring specific agent, clear existing data first
                if agent_id:
                    self._clear_agent_memories(conn, agent_id)
                
                # Execute restore script
                conn.executescript(sql_content)
            
            logger.info(f"Restored memories from backup: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to restore from backup: {e}")
            return False
    
    def create_incremental_backup(self, agent_id: str, since: datetime) -> str:
        """Create incremental backup of changes since specified time"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"memory_incremental_{agent_id}_{timestamp}.json"
        backup_path = self.backup_dir / backup_filename
        
        incremental_data = self._get_incremental_changes(agent_id, since)
        
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(incremental_data, f, indent=2, default=str)
        
        logger.info(f"Created incremental backup: {backup_path}")
        return str(backup_path)
    
    def list_backups(self, agent_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List available backup files"""
        backups = []
        
        pattern = f"*{agent_id}*" if agent_id else "*"
        
        for backup_file in self.backup_dir.glob(f"memory_backup_{pattern}"):
            stat = backup_file.stat()
            backups.append({
                'filename': backup_file.name,
                'path': str(backup_file),
                'size': stat.st_size,
                'created': datetime.fromtimestamp(stat.st_ctime),
                'modified': datetime.fromtimestamp(stat.st_mtime)
            })
        
        return sorted(backups, key=lambda x: x['created'], reverse=True)
    
    def cleanup_old_backups(self, keep_days: int = 30) -> int:
        """Clean up backup files older than specified days"""
        cutoff_time = datetime.utcnow().timestamp() - (keep_days * 24 * 3600)
        cleaned_count = 0
        
        for backup_file in self.backup_dir.glob("memory_backup_*"):
            if backup_file.stat().st_ctime < cutoff_time:
                backup_file.unlink()
                cleaned_count += 1
                logger.info(f"Deleted old backup: {backup_file.name}")
        
        return cleaned_count
    
    def _generate_sql_dump(self, conn: sqlite3.Connection, agent_id: Optional[str] = None) -> str:
        """Generate SQL dump of memory tables"""
        cursor = conn.cursor()
        sql_lines = []
        
        # Add header
        sql_lines.append(f"-- LexOS Memory Backup")
        sql_lines.append(f"-- Generated: {datetime.utcnow().isoformat()}")
        if agent_id:
            sql_lines.append(f"-- Agent: {agent_id}")
        sql_lines.append("")
        
        # Memory tables to backup
        tables = [
            'episodic_memory',
            'semantic_memory', 
            'procedural_memory',
            'emotional_memory',
            'memory_associations',
            'memory_consolidation',
            'memory_importance_log'
        ]
        
        for table in tables:
            # Get table schema
            cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
            schema = cursor.fetchone()
            if schema:
                sql_lines.append(f"-- Table: {table}")
                sql_lines.append(f"{schema[0]};")
                sql_lines.append("")
                
                # Get data
                where_clause = f"WHERE agent_id = '{agent_id}'" if agent_id else ""
                cursor.execute(f"SELECT * FROM {table} {where_clause}")
                
                rows = cursor.fetchall()
                if rows:
                    # Get column names
                    columns = [description[0] for description in cursor.description]
                    
                    for row in rows:
                        values = []
                        for value in row:
                            if value is None:
                                values.append('NULL')
                            elif isinstance(value, str):
                                values.append(f"'{value.replace(chr(39), chr(39)+chr(39))}'")
                            else:
                                values.append(str(value))
                        
                        sql_lines.append(
                            f"INSERT INTO {table} ({', '.join(columns)}) "
                            f"VALUES ({', '.join(values)});"
                        )
                    
                    sql_lines.append("")
        
        return '\n'.join(sql_lines)
    
    def _export_to_json(self, agent_id: str) -> Dict[str, Any]:
        """Export agent memories to JSON format"""
        export_data = {
            'agent_id': agent_id,
            'export_timestamp': datetime.utcnow().isoformat(),
            'episodic_memories': [],
            'semantic_memories': [],
            'procedural_memories': [],
            'emotional_memories': [],
            'associations': [],
            'statistics': {}
        }
        
        # Export episodic memories
        episodic_memories = self.memory_api.retrieve_episodic_memories(
            agent_id, limit=10000
        )
        export_data['episodic_memories'] = episodic_memories
        
        # Export semantic memories
        semantic_memories = self.memory_api.retrieve_semantic_memory(
            agent_id, limit=10000
        )
        export_data['semantic_memories'] = semantic_memories
        
        # Export emotional patterns
        emotional_memories = self.memory_api.retrieve_emotional_patterns(
            agent_id, limit=10000
        )
        export_data['emotional_memories'] = emotional_memories
        
        # Export associations
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM memory_associations WHERE agent_id = ?
            """, (agent_id,))
            
            associations = [dict(row) for row in cursor.fetchall()]
            export_data['associations'] = associations
            
            # Export procedural memories
            cursor.execute("""
                SELECT * FROM procedural_memory WHERE agent_id = ?
            """, (agent_id,))
            
            procedural = []
            for row in cursor.fetchall():
                memory = dict(row)
                memory['procedure_steps'] = json.loads(memory['procedure_steps'] or '[]')
                memory['conditions'] = json.loads(memory['conditions'] or '{}')
                memory['tags'] = json.loads(memory['tags'] or '[]')
                memory['metadata'] = json.loads(memory['metadata'] or '{}')
                procedural.append(memory)
            
            export_data['procedural_memories'] = procedural
        
        # Add statistics
        from memory.consolidator import MemoryConsolidator
        consolidator = MemoryConsolidator(self.memory_api)
        export_data['statistics'] = consolidator.get_memory_statistics(agent_id)
        
        return export_data
    
    def _import_from_json(self, agent_id: str, memories_data: Dict[str, Any]) -> Dict[str, int]:
        """Import memories from JSON data"""
        import_stats = {
            'episodic': 0,
            'semantic': 0,
            'procedural': 0,
            'emotional': 0,
            'associations': 0
        }
        
        # Import episodic memories
        for memory in memories_data.get('episodic_memories', []):
            try:
                self.memory_api.store_episodic_memory(
                    agent_id=agent_id,
                    session_id=memory.get('session_id', 'imported'),
                    event_type=memory.get('event_type', 'imported'),
                    content=memory['content'],
                    summary=memory.get('summary'),
                    participants=memory.get('participants', []),
                    location_context=memory.get('location_context'),
                    emotional_valence=memory.get('emotional_valence', 0.0),
                    emotional_intensity=memory.get('emotional_intensity', 0.0),
                    importance=memory.get('importance', 0.5),
                    lessons_learned=memory.get('lessons_learned'),
                    tags=memory.get('tags', []),
                    metadata=memory.get('metadata', {})
                )
                import_stats['episodic'] += 1
            except Exception as e:
                logger.warning(f"Failed to import episodic memory: {e}")
        
        # Import semantic memories
        for memory in memories_data.get('semantic_memories', []):
            try:
                self.memory_api.store_semantic_memory(
                    agent_id=agent_id,
                    concept=memory['concept'],
                    definition=memory['definition'],
                    category=memory.get('category'),
                    subcategory=memory.get('subcategory'),
                    relationships=memory.get('relationships', {}),
                    confidence=memory.get('confidence', 0.5),
                    source=memory.get('source'),
                    evidence=memory.get('evidence'),
                    importance=memory.get('importance', 0.5),
                    tags=memory.get('tags', []),
                    metadata=memory.get('metadata', {})
                )
                import_stats['semantic'] += 1
            except Exception as e:
                logger.warning(f"Failed to import semantic memory: {e}")
        
        # Import procedural memories
        for memory in memories_data.get('procedural_memories', []):
            try:
                self.memory_api.store_procedural_memory(
                    agent_id=agent_id,
                    skill_name=memory['skill_name'],
                    skill_type=memory['skill_type'],
                    procedure_steps=memory['procedure_steps'],
                    conditions=memory.get('conditions', {}),
                    success_criteria=memory.get('success_criteria'),
                    proficiency_level=memory.get('proficiency_level', 0.0),
                    tags=memory.get('tags', []),
                    metadata=memory.get('metadata', {})
                )
                import_stats['procedural'] += 1
            except Exception as e:
                logger.warning(f"Failed to import procedural memory: {e}")
        
        # Import emotional memories
        for memory in memories_data.get('emotional_memories', []):
            try:
                self.memory_api.store_emotional_memory(
                    agent_id=agent_id,
                    trigger_stimulus=memory['trigger_stimulus'],
                    emotion_type=memory['emotion_type'],
                    valence=memory['valence'],
                    arousal=memory['arousal'],
                    intensity=memory['intensity'],
                    context=memory.get('context'),
                    behavioral_tendency=memory.get('behavioral_tendency'),
                    coping_strategy=memory.get('coping_strategy'),
                    tags=memory.get('tags', []),
                    metadata=memory.get('metadata', {})
                )
                import_stats['emotional'] += 1
            except Exception as e:
                logger.warning(f"Failed to import emotional memory: {e}")
        
        return import_stats
    
    def _get_incremental_changes(self, agent_id: str, since: datetime) -> Dict[str, Any]:
        """Get memory changes since specified time"""
        incremental_data = {
            'agent_id': agent_id,
            'since': since.isoformat(),
            'export_timestamp': datetime.utcnow().isoformat(),
            'changes': {
                'episodic_memories': [],
                'semantic_memories': [],
                'procedural_memories': [],
                'emotional_memories': [],
                'associations': []
            }
        }
        
        with self.memory_api.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get episodic memories created/updated since timestamp
            cursor.execute("""
                SELECT * FROM episodic_memory 
                WHERE agent_id = ? AND (
                    created_at > ? OR accessed_at > ?
                )
            """, (agent_id, since, since))
            
            incremental_data['changes']['episodic_memories'] = [
                dict(row) for row in cursor.fetchall()
            ]
            
            # Get semantic memories updated since timestamp
            cursor.execute("""
                SELECT * FROM semantic_memory 
                WHERE agent_id = ? AND (
                    created_at > ? OR updated_at > ? OR accessed_at > ?
                )
            """, (agent_id, since, since, since))
            
            incremental_data['changes']['semantic_memories'] = [
                dict(row) for row in cursor.fetchall()
            ]
            
            # Get procedural memories updated since timestamp
            cursor.execute("""
                SELECT * FROM procedural_memory 
                WHERE agent_id = ? AND (
                    created_at > ? OR updated_at > ? OR accessed_at > ?
                )
            """, (agent_id, since, since, since))
            
            incremental_data['changes']['procedural_memories'] = [
                dict(row) for row in cursor.fetchall()
            ]
            
            # Get emotional memories created since timestamp
            cursor.execute("""
                SELECT * FROM emotional_memory 
                WHERE agent_id = ? AND (
                    created_at > ? OR accessed_at > ?
                )
            """, (agent_id, since, since))
            
            incremental_data['changes']['emotional_memories'] = [
                dict(row) for row in cursor.fetchall()
            ]
            
            # Get associations created since timestamp
            cursor.execute("""
                SELECT * FROM memory_associations 
                WHERE agent_id = ? AND (
                    created_at > ? OR last_reinforced > ?
                )
            """, (agent_id, since, since))
            
            incremental_data['changes']['associations'] = [
                dict(row) for row in cursor.fetchall()
            ]
        
        return incremental_data
    
    def _clear_agent_memories(self, conn: sqlite3.Connection, agent_id: str):
        """Clear all memories for an agent"""
        cursor = conn.cursor()
        
        tables = [
            'episodic_memory',
            'semantic_memory',
            'procedural_memory', 
            'emotional_memory',
            'working_memory',
            'memory_associations',
            'memory_consolidation',
            'memory_importance_log'
        ]
        
        for table in tables:
            cursor.execute(f"DELETE FROM {table} WHERE agent_id = ?", (agent_id,))
        
        logger.info(f"Cleared all memories for agent {agent_id}")
    
    def _count_imported_memories(self, conn: sqlite3.Connection, agent_id: str) -> Dict[str, int]:
        """Count memories for an agent after import"""
        cursor = conn.cursor()
        
        counts = {}
        tables = ['episodic_memory', 'semantic_memory', 'procedural_memory', 'emotional_memory']
        
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE agent_id = ?", (agent_id,))
            counts[table.replace('_memory', '')] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM memory_associations WHERE agent_id = ?", (agent_id,))
        counts['associations'] = cursor.fetchone()[0]
        
        return counts
