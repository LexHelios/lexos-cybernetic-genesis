
"""
LexOS Multi-Layered Memory Architecture
Comprehensive memory system for AI consciousness development
"""

from .api import MemoryAPI
from .consolidator import MemoryConsolidator
from .backup import MemoryBackupManager
from .integration import AgentMemoryInterface, MemoryDrivenAgent

__version__ = "1.0.0"
__author__ = "LexOS Development Team"

__all__ = [
    "MemoryAPI",
    "MemoryConsolidator", 
    "MemoryBackupManager",
    "AgentMemoryInterface",
    "MemoryDrivenAgent"
]
