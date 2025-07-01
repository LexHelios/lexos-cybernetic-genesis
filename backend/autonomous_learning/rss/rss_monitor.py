
"""
RSS feed monitoring system for real-time content analysis and knowledge extraction.
"""

import asyncio
import aiohttp
import feedparser
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from urllib.parse import urljoin
import structlog
from bs4 import BeautifulSoup

from ..config import config, load_yaml_config
from ..utils import (
    RateLimiter, ContentHasher, RetryHandler, performance_monitor
)
from ..memory.memory_connector import MemoryConnector

logger = structlog.get_logger(__name__)

class RSSMonitor:
    """RSS feed monitoring and content analysis system."""
    
    def __init__(self):
        self.session = None
        self.rate_limiter = RateLimiter(max_tokens=60, refill_rate=1.0)
        self.content_hasher = ContentHasher()
        self.retry_handler = RetryHandler()
        
        # Load RSS configuration
        self.rss_config = load_yaml_config("rss.yaml")
        
        # Feed state
        self.feeds = {}
        self.processed_items = set()
        self.memory_connector = None
        
        # Default RSS feeds for AI/ML content
        self.default_feeds = [
            {
                'url': 'http://export.arxiv.org/rss/cs.AI',
                'name': 'ArXiv AI',
                'category': 'research',
                'priority': 1.0
            },
            {
                'url': 'http://export.arxiv.org/rss/cs.LG',
                'name': 'ArXiv Machine Learning',
                'category': 'research',
                'priority': 1.0
            },
            {
                'url': 'https://ai.googleblog.com/feeds/posts/default',
                'name': 'Google AI Blog',
                'category': 'industry',
                'priority': 0.9
            },
            {
                'url': 'https://openai.com/blog/rss.xml',
                'name': 'OpenAI Blog',
                'category': 'industry',
                'priority': 0.9
            },
            {
                'url': 'https://www.anthropic.com/news/rss.xml',
                'name': 'Anthropic News',
                'category': 'industry',
                'priority': 0.9
            },
            {
                'url': 'https://blog.research.google/feeds/posts/default',
                'name': 'Google Research Blog',
                'category': 'research',
                'priority': 0.8
            },
            {
                'url': 'https://ai.meta.com/blog/rss/',
                'name': 'Meta AI Blog',
                'category': 'industry',
                'priority': 0.8
            },
            {
                'url': 'https://www.reddit.com/r/MachineLearning/.rss',
                'name': 'Reddit ML',
                'category': 'community',
                'priority': 0.7
            }
        ]
    
    async def initialize(self):
        """Initialize RSS monitor."""
        try:
            # Create aiohttp session
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
            
            # Initialize memory connector
            self.memory_connector = MemoryConnector()
            await self.memory_connector.initialize()
            
            # Load feed configurations
            await self._load_feed_configs()
            
            logger.info("RSS monitor initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize RSS monitor: {e}")
            raise
    
    async def _load_feed_configs(self):
        """Load RSS feed configurations."""
        feeds_config = self.rss_config.get("feeds", self.default_feeds)
        
        for feed_config in feeds_config:
            feed_url = feed_config['url']
            self.feeds[feed_url] = {
                'name': feed_config.get('name', feed_url),
                'category': feed_config.get('category', 'general'),
                'priority': feed_config.get('priority', 0.5),
                'last_checked': None,
                'last_modified': None,
                'etag': None,
                'error_count': 0,
                'check_interval': feed_config.get('check_interval', 300)  # 5 minutes default
            }
        
        logger.info(f"Loaded {len(self.feeds)} RSS feeds")
    
    async def _fetch_feed(self, feed_url: str) -> Optional[Dict]:
        """Fetch and parse RSS feed."""
        try:
            await self.rate_limiter.wait_for_tokens()
            
            feed_info = self.feeds[feed_url]
            headers = {
                'User-Agent': 'AutonomousLearner/1.0 (RSS Monitor; contact@learningsystem.ai)'
            }
            
            # Add conditional headers if available
            if feed_info.get('etag'):
                headers['If-None-Match'] = feed_info['etag']
            if feed_info.get('last_modified'):
                headers['If-Modified-Since'] = feed_info['last_modified']
            
            async with self.session.get(feed_url, headers=headers) as response:
                if response.status == 304:
                    # Not modified
                    logger.debug(f"Feed not modified: {feed_info['name']}")
                    return None
                
                if response.status != 200:
                    logger.warning(f"HTTP {response.status} for feed: {feed_info['name']}")
                    feed_info['error_count'] += 1
                    return None
                
                # Parse feed
                content = await response.text()
                parsed_feed = feedparser.parse(content)
                
                # Update feed metadata
                feed_info['last_checked'] = datetime.now()
                feed_info['error_count'] = 0
                
                if 'etag' in response.headers:
                    feed_info['etag'] = response.headers['etag']
                if 'last-modified' in response.headers:
                    feed_info['last_modified'] = response.headers['last-modified']
                
                return parsed_feed
                
        except Exception as e:
            logger.error(f"Error fetching feed {feed_url}: {e}")
            self.feeds[feed_url]['error_count'] += 1
            return None
    
    async def _extract_full_content(self, entry: Dict) -> str:
        """Extract full content from RSS entry."""
        try:
            # Try different content fields
            content = ""
            
            if hasattr(entry, 'content') and entry.content:
                content = entry.content[0].value
            elif hasattr(entry, 'summary') and entry.summary:
                content = entry.summary
            elif hasattr(entry, 'description') and entry.description:
                content = entry.description
            
            # Clean HTML if present
            if content:
                soup = BeautifulSoup(content, 'html.parser')
                content = soup.get_text(separator=' ', strip=True)
            
            # If content is too short, try to fetch full article
            if len(content) < 200 and hasattr(entry, 'link'):
                full_content = await self._fetch_full_article(entry.link)
                if full_content and len(full_content) > len(content):
                    content = full_content
            
            return content
            
        except Exception as e:
            logger.error(f"Error extracting content from entry: {e}")
            return ""
    
    async def _fetch_full_article(self, url: str) -> Optional[str]:
        """Fetch full article content from URL."""
        try:
            await self.rate_limiter.wait_for_tokens()
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Remove unwanted elements
                    for element in soup(['script', 'style', 'nav', 'footer', 'aside']):
                        element.decompose()
                    
                    # Try to find main content
                    content_selectors = [
                        'article', 'main', '.content', '.post', '.entry',
                        '[role="main"]', '.article-content', '.post-content'
                    ]
                    
                    for selector in content_selectors:
                        content_elem = soup.select_one(selector)
                        if content_elem:
                            return content_elem.get_text(separator=' ', strip=True)
                    
                    # Fallback to body
                    body = soup.find('body')
                    if body:
                        return body.get_text(separator=' ', strip=True)
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching full article {url}: {e}")
            return None
    
    async def _analyze_entry_relevance(self, entry: Dict, feed_info: Dict) -> float:
        """Analyze relevance of RSS entry."""
        try:
            # Base relevance from feed priority
            relevance = feed_info['priority']
            
            # AI/ML keywords
            ai_keywords = [
                'artificial intelligence', 'machine learning', 'deep learning',
                'neural network', 'ai', 'ml', 'nlp', 'computer vision',
                'reinforcement learning', 'transformer', 'gpt', 'llm',
                'autonomous', 'robotics', 'algorithm', 'data science',
                'research', 'paper', 'model', 'training'
            ]
            
            # Analyze title and summary
            text_to_analyze = f"{getattr(entry, 'title', '')} {getattr(entry, 'summary', '')}"
            text_lower = text_to_analyze.lower()
            
            # Count keyword matches
            matches = sum(1 for keyword in ai_keywords if keyword in text_lower)
            keyword_boost = min(matches / len(ai_keywords) * 0.5, 0.4)
            
            # Category boost
            category_boosts = {
                'research': 0.3,
                'industry': 0.2,
                'community': 0.1
            }
            category_boost = category_boosts.get(feed_info['category'], 0.0)
            
            # Recency boost (newer content is more relevant)
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                published_date = datetime(*entry.published_parsed[:6])
                days_old = (datetime.now() - published_date).days
                recency_boost = max(0.2 - (days_old * 0.01), 0.0)
            else:
                recency_boost = 0.1
            
            final_relevance = min(relevance + keyword_boost + category_boost + recency_boost, 1.0)
            return final_relevance
            
        except Exception as e:
            logger.error(f"Error analyzing entry relevance: {e}")
            return 0.5
    
    async def _process_feed_entry(self, entry: Dict, feed_info: Dict) -> Optional[str]:
        """Process a single RSS feed entry."""
        try:
            # Generate unique ID for entry
            entry_id = getattr(entry, 'id', getattr(entry, 'link', ''))
            if not entry_id:
                return None
            
            entry_hash = self.content_hasher.hash_content(entry_id)
            
            # Skip if already processed
            if entry_hash in self.processed_items:
                return None
            
            self.processed_items.add(entry_hash)
            
            # Extract content
            title = getattr(entry, 'title', '')
            summary = getattr(entry, 'summary', '')
            link = getattr(entry, 'link', '')
            
            # Get full content
            full_content = await self._extract_full_content(entry)
            
            if not full_content or len(full_content) < 50:
                return None
            
            # Analyze relevance
            relevance_score = await self._analyze_entry_relevance(entry, feed_info)
            
            # Store if relevant enough
            if relevance_score >= 0.4:
                # Extract keywords from title and content
                keywords = []
                if hasattr(entry, 'tags'):
                    keywords = [tag.term for tag in entry.tags]
                
                content_hash = await self.memory_connector.store_knowledge(
                    content=full_content,
                    source_type='rss_feed',
                    source_url=link,
                    title=title,
                    summary=summary,
                    keywords=keywords,
                    relevance_score=relevance_score
                )
                
                logger.info(f"Processed RSS entry: {title[:50]}...")
                performance_monitor.record_metric('rss_entries_processed', 1)
                
                return content_hash
            
            return None
            
        except Exception as e:
            logger.error(f"Error processing RSS entry: {e}")
            return None
    
    async def _check_single_feed(self, feed_url: str):
        """Check a single RSS feed for updates."""
        try:
            feed_info = self.feeds[feed_url]
            
            # Skip if recently checked and no errors
            if (feed_info.get('last_checked') and 
                feed_info['error_count'] == 0 and
                (datetime.now() - feed_info['last_checked']).seconds < feed_info['check_interval']):
                return
            
            # Skip if too many errors
            if feed_info['error_count'] > 5:
                logger.warning(f"Skipping feed with too many errors: {feed_info['name']}")
                return
            
            # Fetch and parse feed
            parsed_feed = await self._fetch_feed(feed_url)
            if not parsed_feed:
                return
            
            # Process entries
            processed_count = 0
            for entry in parsed_feed.entries[:10]:  # Limit to 10 most recent entries
                content_hash = await self._process_feed_entry(entry, feed_info)
                if content_hash:
                    processed_count += 1
            
            if processed_count > 0:
                logger.info(f"Processed {processed_count} entries from {feed_info['name']}")
            
        except Exception as e:
            logger.error(f"Error checking feed {feed_url}: {e}")
    
    async def check_feeds(self):
        """Check all RSS feeds for updates."""
        try:
            # Create tasks for all feeds
            tasks = []
            for feed_url in self.feeds.keys():
                task = asyncio.create_task(self._check_single_feed(feed_url))
                tasks.append(task)
            
            # Wait for all tasks to complete
            await asyncio.gather(*tasks, return_exceptions=True)
            
            logger.info("RSS feed check completed")
            
        except Exception as e:
            logger.error(f"RSS feed check failed: {e}")
    
    async def add_feed(self, url: str, name: str = "", category: str = "general", priority: float = 0.5):
        """Add a new RSS feed to monitor."""
        try:
            if url not in self.feeds:
                self.feeds[url] = {
                    'name': name or url,
                    'category': category,
                    'priority': priority,
                    'last_checked': None,
                    'last_modified': None,
                    'etag': None,
                    'error_count': 0,
                    'check_interval': 300
                }
                logger.info(f"Added RSS feed: {name or url}")
            
        except Exception as e:
            logger.error(f"Error adding RSS feed: {e}")
    
    async def remove_feed(self, url: str):
        """Remove RSS feed from monitoring."""
        try:
            if url in self.feeds:
                del self.feeds[url]
                logger.info(f"Removed RSS feed: {url}")
            
        except Exception as e:
            logger.error(f"Error removing RSS feed: {e}")
    
    async def get_feed_stats(self) -> Dict[str, any]:
        """Get RSS monitoring statistics."""
        try:
            total_feeds = len(self.feeds)
            healthy_feeds = sum(1 for feed in self.feeds.values() if feed['error_count'] < 3)
            error_feeds = total_feeds - healthy_feeds
            
            return {
                'total_feeds': total_feeds,
                'healthy_feeds': healthy_feeds,
                'error_feeds': error_feeds,
                'processed_items': len(self.processed_items),
                'feeds': {
                    url: {
                        'name': info['name'],
                        'category': info['category'],
                        'last_checked': info['last_checked'].isoformat() if info['last_checked'] else None,
                        'error_count': info['error_count']
                    }
                    for url, info in self.feeds.items()
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting feed stats: {e}")
            return {}
    
    async def health_check(self) -> bool:
        """Check RSS monitor health."""
        try:
            return (
                self.session is not None and
                not self.session.closed and
                self.memory_connector is not None and
                len(self.feeds) > 0
            )
        except Exception:
            return False
    
    async def cleanup(self):
        """Cleanup RSS monitor resources."""
        try:
            if self.session and not self.session.closed:
                await self.session.close()
            
            if self.memory_connector:
                await self.memory_connector.cleanup()
                
            logger.info("RSS monitor cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during RSS monitor cleanup: {e}")
