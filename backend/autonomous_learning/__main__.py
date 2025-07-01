
"""
Main entry point for the Autonomous Learning System.
"""

import asyncio
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from scheduler.scheduler import scheduler
from config import config

async def main():
    """Main entry point for the autonomous learning system."""
    try:
        print("🤖 Starting Autonomous Learning System for AI Consciousness Development")
        print("=" * 70)
        print(f"Base Path: {config.base_path}")
        print(f"Memory Path: {config.memory_path}")
        print(f"Learning Intensity: {config.learning_intensity}")
        print(f"Max Concurrent Tasks: {config.max_concurrent_tasks}")
        print("=" * 70)
        
        # Start the scheduler (this will initialize all modules)
        await scheduler.start()
        
    except KeyboardInterrupt:
        print("\n🛑 Shutdown requested by user")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        logging.exception("Fatal error in main")
    finally:
        print("🔄 Shutting down...")

if __name__ == "__main__":
    asyncio.run(main())
