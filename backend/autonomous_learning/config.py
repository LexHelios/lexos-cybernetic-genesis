
"""
Configuration management for the autonomous learning system.
"""

import os
import yaml
from pathlib import Path
from typing import Dict, Any
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@dataclass
class SystemConfig:
    """Main system configuration."""
    
    # Paths
    base_path: str = "/home/ubuntu/lexos-cybernetic-genesis/autonomous_learning_system"
    memory_path: str = "/home/ubuntu/lexos-cybernetic-genesis"
    data_path: str = "data"
    logs_path: str = "logs"
    config_path: str = "config"
    
    # API Keys
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    
    # System Settings
    learning_intensity: str = os.getenv("LEARNING_INTENSITY", "medium")
    max_concurrent_tasks: int = int(os.getenv("MAX_CONCURRENT_TASKS", "10"))
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Rate Limiting
    default_crawl_delay: int = int(os.getenv("DEFAULT_CRAWL_DELAY", "2"))
    max_requests_per_minute: int = int(os.getenv("MAX_REQUESTS_PER_MINUTE", "30"))
    api_rate_limit: int = int(os.getenv("API_RATE_LIMIT", "100"))
    
    # Learning Parameters
    knowledge_retention_threshold: float = 0.8
    skill_development_rate: float = 0.1
    curiosity_factor: float = 0.3
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        # Create directories if they don't exist
        for path in [self.data_path, self.logs_path, self.config_path]:
            full_path = Path(self.base_path) / path
            full_path.mkdir(parents=True, exist_ok=True)

def load_yaml_config(config_file: str) -> Dict[str, Any]:
    """Load configuration from YAML file."""
    config_path = Path(SystemConfig().base_path) / "config" / config_file
    
    if not config_path.exists():
        return {}
    
    with open(config_path, 'r') as f:
        return yaml.safe_load(f) or {}

# Global configuration instance
config = SystemConfig()
