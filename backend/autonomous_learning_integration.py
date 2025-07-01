"""
LexOS Autonomous Learning System Integration
Connects the autonomous learning capabilities with the main LexOS memory system
"""

import sys
import os
from pathlib import Path

# Add autonomous learning to Python path
sys.path.append(str(Path(__file__).parent / "autonomous_learning"))

from autonomous_learning.scheduler.scheduler import AutonomousScheduler
from autonomous_learning.memory.memory_connector import MemoryConnector
from autonomous_learning.config import Config

class LexOSAutonomousIntegration:
    """Main integration class for autonomous learning with LexOS"""
    
    def __init__(self):
        self.config = Config()
        self.scheduler = None
        self.memory_connector = None
        
    def initialize(self):
        """Initialize the autonomous learning system"""
        try:
            self.memory_connector = MemoryConnector()
            self.scheduler = AutonomousScheduler()
            return True
        except Exception as e:
            print(f"Failed to initialize autonomous learning: {e}")
            return False
            
    def start_autonomous_learning(self):
        """Start the autonomous learning processes"""
        if self.scheduler:
            self.scheduler.start()
            
    def stop_autonomous_learning(self):
        """Stop the autonomous learning processes"""
        if self.scheduler:
            self.scheduler.stop()
            
    def get_learning_status(self):
        """Get current status of autonomous learning"""
        if self.scheduler:
            return self.scheduler.get_status()
        return {"status": "not_initialized"}

# Global instance for easy access
autonomous_learning = LexOSAutonomousIntegration()
