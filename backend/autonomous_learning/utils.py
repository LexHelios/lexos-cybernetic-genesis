
"""
Utility functions for the autonomous learning system.
"""

import asyncio
import hashlib
import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin, urlparse
import aiohttp
import requests
from fake_useragent import UserAgent

logger = logging.getLogger(__name__)

class RateLimiter:
    """Token bucket rate limiter for API calls."""
    
    def __init__(self, max_tokens: int, refill_rate: float):
        self.max_tokens = max_tokens
        self.tokens = max_tokens
        self.refill_rate = refill_rate
        self.last_refill = time.time()
        self._lock = asyncio.Lock()
    
    async def acquire(self, tokens: int = 1) -> bool:
        """Acquire tokens from the bucket."""
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(self.max_tokens, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False
    
    async def wait_for_tokens(self, tokens: int = 1):
        """Wait until tokens are available."""
        while not await self.acquire(tokens):
            await asyncio.sleep(0.1)

class ContentHasher:
    """Generate consistent hashes for content deduplication."""
    
    @staticmethod
    def hash_content(content: str) -> str:
        """Generate SHA-256 hash of content."""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    @staticmethod
    def hash_url(url: str) -> str:
        """Generate hash of normalized URL."""
        parsed = urlparse(url)
        normalized = f"{parsed.netloc}{parsed.path}"
        return hashlib.md5(normalized.encode('utf-8')).hexdigest()

class UserAgentRotator:
    """Rotate user agents to avoid detection."""
    
    def __init__(self):
        self.ua = UserAgent()
        self.agents = [
            self.ua.chrome,
            self.ua.firefox,
            self.ua.safari,
            "AutonomousLearner/1.0 (contact@learningsystem.ai)"
        ]
        self.current_index = 0
    
    def get_agent(self) -> str:
        """Get next user agent in rotation."""
        agent = self.agents[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.agents)
        return agent

class RetryHandler:
    """Handle retries with exponential backoff."""
    
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
    
    async def retry_async(self, func, *args, **kwargs):
        """Retry async function with exponential backoff."""
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries:
                    delay = self.base_delay * (2 ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All {self.max_retries + 1} attempts failed")
        
        raise last_exception

class DataValidator:
    """Validate and sanitize data."""
    
    @staticmethod
    def is_valid_url(url: str) -> bool:
        """Check if URL is valid."""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage."""
        import re
        # Remove invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Limit length
        if len(filename) > 255:
            filename = filename[:255]
        return filename
    
    @staticmethod
    def extract_domain(url: str) -> str:
        """Extract domain from URL."""
        try:
            return urlparse(url).netloc
        except Exception:
            return ""

class PerformanceMonitor:
    """Monitor system performance and resource usage."""
    
    def __init__(self):
        self.start_time = time.time()
        self.metrics = {}
    
    def record_metric(self, name: str, value: float):
        """Record a performance metric."""
        if name not in self.metrics:
            self.metrics[name] = []
        self.metrics[name].append({
            'timestamp': datetime.now(),
            'value': value
        })
    
    def get_average(self, name: str, window_minutes: int = 60) -> Optional[float]:
        """Get average metric value over time window."""
        if name not in self.metrics:
            return None
        
        cutoff = datetime.now() - timedelta(minutes=window_minutes)
        recent_values = [
            m['value'] for m in self.metrics[name]
            if m['timestamp'] > cutoff
        ]
        
        return sum(recent_values) / len(recent_values) if recent_values else None

class AsyncFileHandler:
    """Handle file operations asynchronously."""
    
    @staticmethod
    async def write_json(filepath: Path, data: Dict[str, Any]):
        """Write JSON data to file asynchronously."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: filepath.write_text(json.dumps(data, indent=2))
        )
    
    @staticmethod
    async def read_json(filepath: Path) -> Dict[str, Any]:
        """Read JSON data from file asynchronously."""
        if not filepath.exists():
            return {}
        
        loop = asyncio.get_event_loop()
        content = await loop.run_in_executor(None, filepath.read_text)
        return json.loads(content)

def setup_logging(log_level: str = "INFO", log_file: Optional[str] = None):
    """Setup structured logging for the system."""
    import structlog
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard logging
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format="%(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(log_file) if log_file else logging.NullHandler()
        ]
    )

# Global instances
rate_limiter = RateLimiter(max_tokens=30, refill_rate=0.5)
content_hasher = ContentHasher()
ua_rotator = UserAgentRotator()
retry_handler = RetryHandler()
data_validator = DataValidator()
performance_monitor = PerformanceMonitor()
