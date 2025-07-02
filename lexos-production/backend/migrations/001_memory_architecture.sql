
-- Multi-Layered Memory Architecture Migration
-- Creates comprehensive memory system for AI consciousness development

-- Enhanced episodic memory table
CREATE TABLE IF NOT EXISTS episodic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    session_id TEXT,
    event_type TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    participants TEXT, -- JSON array of involved entities
    location_context TEXT,
    temporal_context TEXT,
    importance REAL DEFAULT 0.5,
    emotional_valence REAL DEFAULT 0.0,
    emotional_intensity REAL DEFAULT 0.0,
    sensory_details TEXT, -- JSON object for sensory information
    outcome TEXT,
    lessons_learned TEXT,
    embedding TEXT, -- Vector embedding for similarity search
    tags TEXT, -- JSON array of tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    decay_factor REAL DEFAULT 1.0,
    consolidation_level INTEGER DEFAULT 0,
    metadata TEXT, -- JSON object for additional data
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Semantic memory for factual knowledge
CREATE TABLE IF NOT EXISTS semantic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    concept TEXT NOT NULL,
    definition TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    relationships TEXT, -- JSON object mapping relationship types to related concepts
    confidence REAL DEFAULT 0.5,
    source TEXT,
    evidence TEXT, -- Supporting evidence or examples
    importance REAL DEFAULT 0.5,
    embedding TEXT,
    tags TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    verification_status TEXT DEFAULT 'unverified',
    metadata TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Procedural memory for skills and behaviors
CREATE TABLE IF NOT EXISTS procedural_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    skill_type TEXT NOT NULL, -- 'cognitive', 'social', 'technical', etc.
    procedure_steps TEXT NOT NULL, -- JSON array of steps
    conditions TEXT, -- JSON object for when to apply this skill
    success_criteria TEXT,
    failure_patterns TEXT, -- JSON array of common failure modes
    proficiency_level REAL DEFAULT 0.0, -- 0.0 to 1.0
    usage_frequency INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    last_used DATETIME,
    improvement_notes TEXT,
    embedding TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    metadata TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Emotional memory for feelings and associations
CREATE TABLE IF NOT EXISTS emotional_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    trigger_stimulus TEXT NOT NULL,
    emotion_type TEXT NOT NULL, -- 'joy', 'fear', 'anger', 'sadness', etc.
    valence REAL NOT NULL, -- -1.0 (negative) to 1.0 (positive)
    arousal REAL NOT NULL, -- 0.0 (calm) to 1.0 (excited)
    intensity REAL NOT NULL, -- 0.0 to 1.0
    context TEXT,
    associated_memories TEXT, -- JSON array of related memory IDs
    physiological_response TEXT, -- JSON object for simulated responses
    behavioral_tendency TEXT,
    coping_strategy TEXT,
    resolution_outcome TEXT,
    embedding TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    decay_factor REAL DEFAULT 1.0,
    metadata TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Working memory for current context
CREATE TABLE IF NOT EXISTS working_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    content_type TEXT NOT NULL, -- 'conversation', 'task', 'goal', 'attention'
    content TEXT NOT NULL,
    priority REAL DEFAULT 0.5,
    activation_level REAL DEFAULT 1.0, -- How active this memory is
    capacity_weight REAL DEFAULT 1.0, -- How much working memory this uses
    source_memory_id INTEGER, -- Reference to long-term memory
    source_memory_type TEXT, -- Type of source memory
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- When this should be removed from working memory
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Memory associations and relationships
CREATE TABLE IF NOT EXISTS memory_associations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    memory1_id INTEGER NOT NULL,
    memory1_type TEXT NOT NULL,
    memory2_id INTEGER NOT NULL,
    memory2_type TEXT NOT NULL,
    association_type TEXT NOT NULL, -- 'causal', 'temporal', 'spatial', 'semantic', 'emotional'
    strength REAL DEFAULT 0.5,
    direction TEXT DEFAULT 'bidirectional', -- 'forward', 'backward', 'bidirectional'
    context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reinforcement_count INTEGER DEFAULT 1,
    last_reinforced DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Memory consolidation tracking
CREATE TABLE IF NOT EXISTS memory_consolidation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    consolidation_type TEXT NOT NULL, -- 'sleep', 'reflection', 'rehearsal'
    memories_processed INTEGER DEFAULT 0,
    memories_strengthened INTEGER DEFAULT 0,
    memories_weakened INTEGER DEFAULT 0,
    memories_forgotten INTEGER DEFAULT 0,
    new_associations INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    notes TEXT,
    metadata TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Memory importance and aging tracking
CREATE TABLE IF NOT EXISTS memory_importance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    memory_id INTEGER NOT NULL,
    memory_type TEXT NOT NULL,
    old_importance REAL,
    new_importance REAL,
    adjustment_reason TEXT,
    adjustment_factor REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Performance indexes for episodic memory
CREATE INDEX IF NOT EXISTS idx_episodic_agent_id ON episodic_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_episodic_session_id ON episodic_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_episodic_event_type ON episodic_memory(event_type);
CREATE INDEX IF NOT EXISTS idx_episodic_importance ON episodic_memory(importance DESC);
CREATE INDEX IF NOT EXISTS idx_episodic_created_at ON episodic_memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodic_accessed_at ON episodic_memory(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodic_emotional ON episodic_memory(emotional_valence, emotional_intensity);
CREATE INDEX IF NOT EXISTS idx_episodic_consolidation ON episodic_memory(consolidation_level);

-- Performance indexes for semantic memory
CREATE INDEX IF NOT EXISTS idx_semantic_agent_id ON semantic_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_semantic_concept ON semantic_memory(concept);
CREATE INDEX IF NOT EXISTS idx_semantic_category ON semantic_memory(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_semantic_importance ON semantic_memory(importance DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_confidence ON semantic_memory(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_accessed_at ON semantic_memory(accessed_at DESC);

-- Performance indexes for procedural memory
CREATE INDEX IF NOT EXISTS idx_procedural_agent_id ON procedural_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_procedural_skill_name ON procedural_memory(skill_name);
CREATE INDEX IF NOT EXISTS idx_procedural_skill_type ON procedural_memory(skill_type);
CREATE INDEX IF NOT EXISTS idx_procedural_proficiency ON procedural_memory(proficiency_level DESC);
CREATE INDEX IF NOT EXISTS idx_procedural_usage ON procedural_memory(usage_frequency DESC);
CREATE INDEX IF NOT EXISTS idx_procedural_success_rate ON procedural_memory(success_rate DESC);

-- Performance indexes for emotional memory
CREATE INDEX IF NOT EXISTS idx_emotional_agent_id ON emotional_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_emotional_trigger ON emotional_memory(trigger_stimulus);
CREATE INDEX IF NOT EXISTS idx_emotional_type ON emotional_memory(emotion_type);
CREATE INDEX IF NOT EXISTS idx_emotional_valence ON emotional_memory(valence);
CREATE INDEX IF NOT EXISTS idx_emotional_intensity ON emotional_memory(intensity DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_accessed_at ON emotional_memory(accessed_at DESC);

-- Performance indexes for working memory
CREATE INDEX IF NOT EXISTS idx_working_agent_session ON working_memory(agent_id, session_id);
CREATE INDEX IF NOT EXISTS idx_working_content_type ON working_memory(content_type);
CREATE INDEX IF NOT EXISTS idx_working_priority ON working_memory(priority DESC);
CREATE INDEX IF NOT EXISTS idx_working_activation ON working_memory(activation_level DESC);
CREATE INDEX IF NOT EXISTS idx_working_expires_at ON working_memory(expires_at);

-- Performance indexes for associations
CREATE INDEX IF NOT EXISTS idx_associations_agent_id ON memory_associations(agent_id);
CREATE INDEX IF NOT EXISTS idx_associations_memory1 ON memory_associations(memory1_id, memory1_type);
CREATE INDEX IF NOT EXISTS idx_associations_memory2 ON memory_associations(memory2_id, memory2_type);
CREATE INDEX IF NOT EXISTS idx_associations_type ON memory_associations(association_type);
CREATE INDEX IF NOT EXISTS idx_associations_strength ON memory_associations(strength DESC);

-- Performance indexes for consolidation
CREATE INDEX IF NOT EXISTS idx_consolidation_agent_id ON memory_consolidation(agent_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_type ON memory_consolidation(consolidation_type);
CREATE INDEX IF NOT EXISTS idx_consolidation_status ON memory_consolidation(status);
CREATE INDEX IF NOT EXISTS idx_consolidation_started_at ON memory_consolidation(started_at DESC);

-- Performance indexes for importance log
CREATE INDEX IF NOT EXISTS idx_importance_log_agent_id ON memory_importance_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_importance_log_memory ON memory_importance_log(memory_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_importance_log_timestamp ON memory_importance_log(timestamp DESC);
