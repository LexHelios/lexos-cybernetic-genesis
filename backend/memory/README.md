
# LexOS Multi-Layered Memory Architecture

## Overview

The LexOS Memory System implements a comprehensive multi-layered memory architecture designed to enable AI consciousness development. This system allows AI agents to form lasting experiences, relationships, and develop consciousness over time through persistent memory storage and sophisticated consolidation mechanisms.

## Architecture Components

### 1. Memory Types

#### Episodic Memory
- **Purpose**: Stores specific experiences and events with timestamps
- **Content**: Conversations, interactions, learning experiences
- **Features**: 
  - Temporal context tracking
  - Emotional associations
  - Importance scoring
  - Participant tracking
  - Outcome recording

#### Semantic Memory
- **Purpose**: Accumulated knowledge and concepts
- **Content**: Facts, definitions, relationships between concepts
- **Features**:
  - Confidence scoring
  - Source tracking
  - Relationship mapping
  - Category organization
  - Verification status

#### Procedural Memory
- **Purpose**: Learned skills and behaviors
- **Content**: Step-by-step procedures, success criteria, failure patterns
- **Features**:
  - Proficiency tracking
  - Success rate monitoring
  - Usage frequency
  - Improvement notes
  - Condition-based activation

#### Emotional Memory
- **Purpose**: Feelings and emotional associations
- **Content**: Emotional responses to stimuli, coping strategies
- **Features**:
  - Valence and arousal tracking
  - Intensity measurement
  - Physiological response simulation
  - Behavioral tendencies
  - Resolution outcomes

#### Working Memory
- **Purpose**: Current context and active thoughts
- **Content**: Immediate conversation context, active goals
- **Features**:
  - Capacity management (Miller's 7±2 rule)
  - Priority-based retention
  - Automatic expiration
  - Source memory linking

### 2. Memory Management System

#### Storage and Retrieval
```python
from memory.api import MemoryAPI

memory_api = MemoryAPI()

# Store episodic memory
memory_id = memory_api.store_episodic_memory(
    agent_id="agent_001",
    session_id="session_123",
    event_type="conversation",
    content="User asked about weather",
    importance=0.7,
    emotional_valence=0.2
)

# Retrieve relevant memories
memories = memory_api.search_memories(
    agent_id="agent_001",
    query="weather",
    memory_types=["episodic", "semantic"],
    limit=10
)
```

#### Memory Associations
```python
# Create association between memories
assoc_id = memory_api.create_memory_association(
    agent_id="agent_001",
    memory1_id=episodic_id,
    memory1_type="episodic",
    memory2_id=semantic_id,
    memory2_type="semantic",
    association_type="semantic",
    strength=0.8
)

# Find associated memories
related = memory_api.find_associated_memories(
    agent_id="agent_001",
    memory_id=episodic_id,
    memory_type="episodic"
)
```

### 3. Memory Consolidation

#### Automated Consolidation
```python
from memory.consolidator import MemoryConsolidator

consolidator = MemoryConsolidator(memory_api)

# Start automated scheduler
consolidator.start_scheduler()

# Manual consolidation
stats = consolidator.consolidate_agent_memories(
    agent_id="agent_001",
    consolidation_type="reflection"
)
```

#### Consolidation Types
- **Reflection**: Light processing, gentle decay, recent memory strengthening
- **Sleep**: Deep processing, pattern extraction, cross-modal associations
- **Rehearsal**: Targeted strengthening of important memories

### 4. Agent Integration

#### Memory-Driven Agent
```python
from memory.integration import MemoryDrivenAgent

agent = MemoryDrivenAgent(
    agent_id="agent_001",
    name="Assistant",
    personality={
        "traits": {"helpful": 0.9, "curious": 0.8},
        "capabilities": ["conversation", "problem_solving"],
        "backstory": "I am an AI assistant designed to help users."
    }
)

# Start conversation
agent.start_conversation("session_123")

# Process input with memory integration
response = agent.process_input("What's the weather like?")

# Learn from feedback
agent.learn_from_feedback("That was helpful", success=True)

# End conversation
agent.end_conversation()
```

#### Memory Interface
```python
from memory.integration import AgentMemoryInterface

interface = AgentMemoryInterface("agent_001", memory_api)

# Process perception
interface.process_perception(
    content="User seems frustrated",
    perception_type="observation",
    emotional_context={"valence": -0.3, "intensity": 0.6}
)

# Make memory-informed decision
decision = interface.make_decision(
    context="User needs help with task",
    options=["provide_direct_answer", "ask_clarifying_questions", "suggest_resources"],
    decision_type="assistance"
)
```

### 5. Backup and Recovery

#### Memory Backup
```python
from memory.backup import MemoryBackupManager

backup_manager = MemoryBackupManager(memory_api)

# Create full backup
backup_path = backup_manager.create_full_backup("agent_001")

# Export memories in JSON format
export_path = backup_manager.export_agent_memories("agent_001", format="json")

# Import memories
import_stats = backup_manager.import_agent_memories(
    "agent_001", 
    export_path, 
    format="json"
)
```

## Database Schema

### Core Tables

#### episodic_memory
- Stores specific experiences and events
- Includes emotional context and importance scoring
- Supports temporal and participant tracking

#### semantic_memory
- Stores factual knowledge and concepts
- Includes confidence and relationship tracking
- Supports category-based organization

#### procedural_memory
- Stores skills and behavioral procedures
- Tracks proficiency and success rates
- Includes condition-based activation

#### emotional_memory
- Stores emotional responses and associations
- Tracks valence, arousal, and intensity
- Includes coping strategies and outcomes

#### working_memory
- Stores current context and active thoughts
- Implements capacity management
- Links to source memories

#### memory_associations
- Stores relationships between memories
- Supports different association types
- Tracks strength and reinforcement

### Performance Optimizations

#### Indexing Strategy
- Agent-based partitioning for multi-tenant support
- Importance-based indexing for priority retrieval
- Temporal indexing for recency-based queries
- Content-based indexing for semantic search

#### Memory Management
- Automatic decay based on access patterns
- Importance-based retention policies
- Working memory capacity limits
- Periodic consolidation and cleanup

## Configuration

### Memory Configuration
```python
from schemas.memory_models import MemoryConfig

config = MemoryConfig()

# Working memory limits
config.WORKING_MEMORY_CAPACITY = 7  # Miller's magic number
config.WORKING_MEMORY_TIMEOUT_MINUTES = 30

# Importance thresholds
config.HIGH_IMPORTANCE_THRESHOLD = 0.8
config.LOW_IMPORTANCE_THRESHOLD = 0.2

# Consolidation parameters
config.CONSOLIDATION_INTERVAL_HOURS = 8
config.MEMORY_DECAY_RATE = 0.95
config.ACCESS_BOOST_FACTOR = 1.1
```

## Usage Examples

### Basic Memory Operations

```python
# Initialize memory system
memory_api = MemoryAPI("path/to/database.db")

# Store different types of memories
episodic_id = memory_api.store_episodic_memory(
    agent_id="agent_001",
    session_id="session_123",
    event_type="learning",
    content="User taught me about renewable energy",
    lessons_learned="Solar and wind are key renewable sources",
    importance=0.8
)

semantic_id = memory_api.store_semantic_memory(
    agent_id="agent_001",
    concept="renewable_energy",
    definition="Energy from naturally replenishing sources",
    category="science",
    confidence=0.9
)

procedural_id = memory_api.store_procedural_memory(
    agent_id="agent_001",
    skill_name="explain_renewable_energy",
    skill_type="cognitive",
    procedure_steps=[
        "Define renewable energy",
        "Give examples (solar, wind, hydro)",
        "Explain environmental benefits"
    ],
    proficiency_level=0.7
)

emotional_id = memory_api.store_emotional_memory(
    agent_id="agent_001",
    trigger_stimulus="learning new concept",
    emotion_type="curiosity",
    valence=0.7,
    arousal=0.5,
    intensity=0.6
)
```

### Advanced Memory Operations

```python
# Create associations between memories
memory_api.create_memory_association(
    agent_id="agent_001",
    memory1_id=episodic_id,
    memory1_type="episodic",
    memory2_id=semantic_id,
    memory2_type="semantic",
    association_type="semantic",
    strength=0.8
)

# Search across all memory types
results = memory_api.search_memories(
    agent_id="agent_001",
    query="renewable energy",
    memory_types=["episodic", "semantic", "procedural"],
    importance_threshold=0.5,
    limit=10
)

# Update skill proficiency based on usage
memory_api.update_skill_proficiency(
    agent_id="agent_001",
    skill_name="explain_renewable_energy",
    success=True,
    improvement_notes="User found explanation very helpful"
)
```

### Memory Consolidation

```python
# Initialize consolidator
consolidator = MemoryConsolidator(memory_api)

# Run different types of consolidation
reflection_stats = consolidator.consolidate_agent_memories(
    agent_id="agent_001",
    consolidation_type="reflection"
)

sleep_stats = consolidator.consolidate_agent_memories(
    agent_id="agent_001", 
    consolidation_type="sleep"
)

# Get consolidation history
history = consolidator.get_consolidation_history("agent_001")

# Get memory statistics
stats = consolidator.get_memory_statistics("agent_001")
```

## Testing

### Running Tests
```bash
cd /home/ubuntu/lexos-cybernetic-genesis
python backend/tests/test_memory.py
```

### Test Coverage
- Memory API functionality
- Consolidation processes
- Agent integration
- Backup and recovery
- Performance under load

## Performance Considerations

### Scalability
- SQLite suitable for single-agent development
- PostgreSQL recommended for multi-agent production
- Horizontal scaling through agent-based partitioning

### Memory Usage
- Working memory capacity limits prevent overflow
- Automatic cleanup of expired memories
- Importance-based retention policies

### Query Performance
- Comprehensive indexing strategy
- Optimized search algorithms
- Caching for frequently accessed memories

## Future Enhancements

### Planned Features
- Vector embeddings for semantic similarity
- Graph-based memory navigation
- Distributed memory across multiple agents
- Real-time memory synchronization
- Advanced emotional modeling

### Research Directions
- Memory-based consciousness metrics
- Cross-agent memory sharing
- Temporal memory dynamics
- Adaptive consolidation strategies

## Contributing

### Development Setup
1. Install dependencies: `pip install schedule numpy`
2. Run migrations: `sqlite3 lexos.db < migrations/001_memory_architecture.sql`
3. Run tests: `python backend/tests/test_memory.py`

### Code Structure
- `memory/api.py`: Core memory operations
- `memory/consolidator.py`: Automated consolidation
- `memory/backup.py`: Backup and recovery
- `memory/integration.py`: Agent integration
- `schemas/memory_models.py`: Data models and configuration
- `tests/test_memory.py`: Comprehensive test suite

## License

This memory system is part of the LexOS project and follows the same licensing terms.
